# FLOW-03 — Règlement d'une prestation réalisée

Écran concerné : `/espace-client/commandes/:id/paiement` (site batchcooking).
Le client règle **après** la session, pas avant : on ne demande rien pour une
prestation qui n'a pas eu lieu.

Aujourd'hui l'écran tourne sur les mocks (`lib/client/payments.ts`). Ce document
décrit ce dont il a besoin côté API pour être branché.

---

## 1. Deux règles qui viennent du métier, pas du front

**1.1 Le client choisit parmi ce que *son* batch cooker accepte.** Chaque chef
déclare ses moyens de paiement (`acceptedPayments`). Un client dont le chef
n'accepte que la carte ne doit jamais voir l'avance immédiate proposée.

**1.2 L'avance immédiate existe par couple client–prestataire.** Le rattachement
URSSAF se fait avec **un** batch cooker. Un rattachement actif avec Ivy ne rend
pas l'avance immédiate disponible pour une prestation faite par Lina. C'est la
raison pour laquelle le statut ne peut pas être un booléen sur le compte.

Conséquence directe sur l'API : la liste des moyens proposables se calcule pour
**ce client, ce chef, cette prestation**. Le front ne doit pas la reconstituer
en croisant trois endpoints.

---

## 2. `GET /me/bookings/:id/payment-options`

Tout ce dont l'écran a besoin, en un appel.

```json
{
  "bookingId": "ord_003",
  "status": "due",
  "dueAt": "2026-10-05",
  "amounts": { "totalCents": 18000, "taxCreditCents": 9000, "currency": "eur" },
  "methods": [
    {
      "id": "urssaf",
      "available": false,
      "reasonCode": "URSSAF_LINK_PENDING",
      "reason": "Votre demande de rattachement est en cours d'instruction.",
      "dueNowCents": 9000
    },
    { "id": "card", "available": true, "dueNowCents": 18000 },
    { "id": "cesu", "available": true, "dueNowCents": 18000, "maxCesuCents": 18000 }
  ],
  "savedCards": [
    { "id": "pm_1", "brand": "visa", "last4": "4242", "expMonth": 4, "expYear": 2028, "isDefault": true }
  ]
}
```

- `status` : `not-due` (prestation pas encore réalisée), `due`, `processing`,
  `paid`, `failed`.
- **`dueNowCents` est calculé par l'API, pas par le front.** C'est le montant
  qui décide du choix du client, il ne peut pas dépendre d'une règle dupliquée
  côté navigateur. Règles appliquées : carte → total ; CESU → total − titres
  déclarés ; **avance immédiate → 0**.
- **L'avance immédiate n'encaisse rien sur le site.** Le client confirme que la
  prestation a eu lieu, et c'est tout : l'URSSAF déduit le crédit d'impôt,
  prélève le reste sur le compte du rattachement et règle le chef directement.
  La réponse porte donc un `debitedLaterCents` à côté du `dueNowCents` à zéro —
  ce n'est pas un paiement que le client fait ici, c'est ce qui partira de son
  compte ensuite. Afficher « vous réglez 90 € » lui ferait croire qu'il doit
  sortir sa carte.
- `reasonCode` attendus pour l'avance immédiate : `URSSAF_LINK_NONE`,
  `URSSAF_LINK_PENDING`, `URSSAF_LINK_REFUSED`. Le front affiche `reason`
  verbatim et propose le rattachement quand le code est `NONE`.
- Un moyen que le chef n'accepte pas **n'est pas dans la liste** (il n'est pas
  renvoyé `available: false` : le client n'a pas à savoir ce que son chef
  refuse).

---

## 2 bis. `POST /bookings/:id/settle` — avance immédiate

Pas de session Stripe : le client confirme, l'API transmet à l'URSSAF.

```json
{ "method": "urssaf" }
```

La réponse ne doit **pas** dire « payé » : rien ne l'est encore. Elle dit que la
demande est transmise, et la prestation passe en `processing`. Le passage à
`paid` vient de l'URSSAF, par webhook ou par relecture.

```json
{ "status": "processing", "debitedCents": 9000, "transmittedAt": "2026-10-01T09:12:00.000Z" }
```

Trois points à cadrer avec le backend :

1. **Que se passe-t-il si l'URSSAF refuse le prélèvement ?** Le dossier
   retombe-t-il en `due` avec les autres moyens proposés, ou reste-t-il en
   litige ?
2. **Le chef doit-il confirmer de son côté** que la prestation a eu lieu, ou la
   confirmation du client suffit-elle à déclencher le versement ?
3. **Délai indicatif** du prélèvement : le client voit « prélèvement en cours »
   et voudra savoir pendant combien de temps.

## 3. `POST /payments/checkout-session`

Corps envoyé par le front, tel qu'il est déjà construit
(`buildCheckoutPayload`) :

```json
{
  "orderId": "ord_003",
  "method": "card",
  "amountCents": 18000,
  "currency": "eur",
  "cesuDeclaredCents": 0,
  "paymentMethodId": "pm_1",
  "successUrl": "https://batchcooking.labsfood.fr/espace-client/commandes/ord_003?paiement=succes",
  "cancelUrl":  "https://batchcooking.labsfood.fr/espace-client/commandes/ord_003?paiement=annule"
}
```

Réponse attendue :

```json
{ "sessionId": "cs_live_...", "url": "https://checkout.stripe.com/c/pay/cs_live_..." }
```

Points à trancher côté backend :

- **`amountCents` envoyé par le client n'est pas une source de vérité.**
  L'API doit recalculer le montant et répondre `409 AMOUNT_MISMATCH` s'il ne
  correspond pas. Le champ sert au contrôle, pas au calcul.
- **Idempotence** : deux clics rapides ne doivent pas créer deux sessions.
  Une clé d'idempotence dérivée de `orderId` + `method` + montant suffit.
- **Circuit de l'argent** : en carte la plateforme encaisse et prélève sa
  commission (split) ; en avance immédiate et en CESU l'argent va au chef, la
  commission est prélevée après coup. Le `transfer_data` / `application_fee` de
  la session dépend donc du moyen choisi.
- **Prestation en litige** : un litige ouvert doit bloquer la création de la
  session (`409 BOOKING_DISPUTED`). L'écran annonce déjà cette règle au client.

---

## 4. Retour et confirmation

Le navigateur revient sur `successUrl` ou `cancelUrl`. **Ces URL ne prouvent
rien** : le paiement n'est confirmé que par le webhook Stripe
(`checkout.session.completed`). L'écran de détail affiche donc un message
d'attente tant que le statut n'est pas `paid`, et c'est `GET /me/bookings/:id`
qui fait foi.

Après confirmation, la prestation porte :

```json
{
  "payment": {
    "status": "paid",
    "method": "urssaf",
    "paidAt": "2026-09-29T11:04:12.000Z",
    "amountPaidCents": 9000,
    "receiptRef": "RC-2026-0119",
    "receiptUrl": "https://..."
  }
}
```

`receiptUrl` n'est pas encore affiché par le front, mais il manquera au moment
de la facturation : autant le prévoir tout de suite.

---

## 5. CESU préfinancé

Le client déclare le montant de titres remis au chef ; seul le solde passe par
Stripe. Deux questions ouvertes :

1. **Qui contrôle le montant déclaré ?** Aujourd'hui rien ne vérifie que les
   titres ont bien été remis. Le chef confirme-t-il la réception, et le
   règlement reste-t-il `processing` jusque-là ?
2. **Titres supérieurs au montant de la prestation** : le front plafonne au
   total et l'explique. Faut-il conserver le reliquat quelque part, ou est-ce
   au client de gérer ses titres ?

---

## 6. Questions ouvertes

1. **Délai de règlement** : au bout de combien de jours une prestation non
   réglée devient-elle un impayé, et que se passe-t-il alors — relance, blocage
   de nouvelle réservation, autre ?
2. **Paiement partiel** : possible, ou toujours le solde entier ?
3. **Remboursement** : à l'issue d'un litige, qui déclenche le remboursement et
   depuis quel écran ?
4. **Prestation modifiée sur place** (un plat en plus, des courses non prévues) :
   le montant dû peut-il changer après la session, et si oui le chef le
   demande-t-il depuis son espace ?
