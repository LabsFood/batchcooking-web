# FLOW-07 — Rémunération du batch cooker

> **Document v1**, rédigé le 11/10/2026. Aucune route n'existe, et aucun
> arbitrage non plus : le taux de commission lui-même n'est pas fixé. Ce
> document sert donc autant à poser les questions qu'à décrire des endpoints.
> À relire avec le métier **et** la comptabilité.

Écrans concernés : `/espace-chef/remuneration`, `/espace-chef/revenus`,
`/admin/transactions` — les trois sur maquette.

---

## 1. Ce qui bloque, et ce n'est pas technique

Trois décisions manquent, et aucune ligne de code ne peut les remplacer.

**1.1 Le taux de commission.** Le front affiche 10 % en maquette, marqué comme
valeur de démonstration. Est-ce un taux unique, par formule, dégressif avec le
volume, négocié par batch cooker ?

**1.2 Qui encaisse.** Deux circuits possibles, et ils ne demandent pas la même
API :

- **Lab's Food encaisse, puis reverse.** La plateforme est intermédiaire ;
  il faut des versements, un calendrier, un suivi d'impayé, et probablement un
  statut d'établissement de paiement ou un prestataire qui le porte.
- **Le batch cooker encaisse directement**, Lab's Food facture sa commission.
  Beaucoup plus simple côté plateforme, mais l'avance immédiate URSSAF et le
  crédit d'impôt changent de nature. Voir
  [`FLOW-03`](FLOW-03-paiement-prestation.md) § 1.

**1.3 Le rythme des versements.** À la prestation, à la semaine, au mois ?
Avec quel délai après la session, et que se passe-t-il si un litige est ouvert
entre-temps ?

Tant que ces trois points ne sont pas tranchés, les écrans restent en maquette.
Les brancher sur un modèle provisoire coûterait plus cher que d'attendre.

---

## 2. Le minimum utile, avant tout module de paiement

Même sans circuit d'encaissement, deux choses manquent et sont simples.

### 2.1 La part du batch cooker sur une prestation

Une réservation porte `priceCents` — ce que paie le client — et rien d'autre.
C'est pourtant le premier chiffre qu'un batch cooker cherche.

```json
{ "priceCents": 9900, "commissionCents": 990, "commissionRate": 0.1, "netCents": 8910 }
```

À rendre sur `GET /bookings/me` et sur le détail d'une prestation. **Les trois
montants, pas seulement le taux** : un front qui multiplie lui-même finit par
afficher un centime d'écart avec la comptabilité.

### 2.2 Un cumul

```
GET /me/earnings?from=&to=
```

```json
{
  "from": "2026-10-01",
  "to": "2026-10-31",
  "sessionsCount": 12,
  "grossCents": 118800,
  "commissionCents": 11880,
  "netCents": 106920,
  "byMonth": [{ "month": "2026-10", "sessionsCount": 12, "netCents": 106920 }]
}
```

Cela suffirait à sortir `/espace-chef/revenus` de la maquette, sans rien
décider sur les versements. `GET /me/stats` existe déjà et rend des totaux :
peut-être est-ce là qu'il faut ajouter ces champs plutôt que créer une route.

---

## 3. Quand le circuit sera tranché

### 3.1 Les versements

```
GET /me/payouts?page=&limit=
```

```json
{
  "id": "…",
  "reference": "PAY-2026-0031",
  "status": "paid",
  "amountCents": 106920,
  "periodFrom": "2026-10-01",
  "periodTo": "2026-10-31",
  "paidAt": "2026-11-05T09:00:00.000Z",
  "bookingIds": ["…"],
  "statementUrl": "https://…"
}
```

Statuts : `scheduled`, `processing`, `paid`, `failed`, `held` (litige en cours).
`held` n'est pas un luxe : sans lui, un litige se traduit par un versement qu'il
faut récupérer après coup.

`statementUrl` — le relevé en PDF — manquera au moment de la comptabilité du
batch cooker : autant le prévoir tout de suite. Lien signé, courte durée, comme
les pièces justificatives.

### 3.2 Les coordonnées bancaires

Aucune route ne les porte, et elles ne doivent pas transiter par Lab's Food en
clair. Le chemin attendu est le même que pour le paiement : un prestataire
(Stripe Connect ou équivalent) détient l'IBAN, l'API ne stocke qu'un
identifiant de compte et un état d'onboarding.

```json
{ "payoutAccount": { "status": "verified", "last4": "4242", "onboardingUrl": null } }
```

`status` : `none`, `pending`, `verified`, `restricted`. Un batch cooker
`restricted` ne peut pas être payé : l'écran doit le dire, et pourquoi.

### 3.3 La console

```
GET /admin/payouts?status=&chefId=&page=&limit=
GET /admin/transactions?from=&to=&page=&limit=
```

`/admin/transactions` est l'écran le plus loin d'exister : il suppose le circuit
d'encaissement entier. Il attend le § 1.2.

---

## 4. Questions ouvertes

1. **Le taux de commission** : unique, par formule, dégressif ? (§ 1.1)
2. **Qui encaisse** ? (§ 1.2) — la réponse conditionne tout le reste.
3. **Le rythme des versements** et le délai après la prestation ? (§ 1.3)
4. **Les frais** : qui paie les frais du prestataire de paiement ?
5. **Les débours** (courses avancées par le batch cooker, voir
   [`FLOW-05`](FLOW-05-deroule-prestation.md) § 5) passent-ils dans le même
   versement que sa rémunération, ou à part ? À part, probablement : ce n'est
   pas un revenu, c'est un remboursement, et la comptabilité les distingue.
6. **La facturation** : Lab's Food émet-il une facture au nom du batch cooker
   (auto-facturation), ou le batch cooker émet-il la sienne ?
7. **Un litige** gèle-t-il la prestation seule, ou tout le versement de la
   période ?
