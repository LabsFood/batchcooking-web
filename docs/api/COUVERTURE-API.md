# Ce que les fronts n'appellent pas encore

> Relevé le 21/10/2026 sur `/openapi.json` de `lf-api-develop` : **236
> opérations**. Méthode : extraction des chemins appelés dans `lib/` des deux
> repos (`batchcooking-web`, `admin-dashboard`), commentaires exclus, puis
> contre-épreuve au grep sur chaque route donnée pour absente.
>
> **Environ 206 opérations sur 236 sont branchées.** Les ~30 qui suivent ne le
> sont pas. Trois quarts d'entre elles appartiennent au même sujet : l'argent.

---

## 1. Le module « argent » de la console — 10 routes, aucune branchée

C'est le plus gros manque, et il est d'un seul tenant : **la console ne voit
rien de ce qui concerne les encaissements**. Les routes existent toutes.

| Route | Ce qu'elle permettrait |
|---|---|
| `GET /admin/cesu-payments` | Voir toutes les déclarations CESU du réseau |
| `GET /admin/cesu-payments/{id}/proof-url` | Ouvrir la preuve déposée par le client |
| `POST /admin/cesu-payments/{id}/force-settle` | Trancher à la place d'un batch cooker qui ne répond pas |
| `GET /admin/commission-invoices` | Voir les factures de commission émises |
| `POST /admin/commission-invoices/run-due` | Facturer et prélever les commissions dues d'une période |
| `POST /admin/commission-invoices/{id}/retry-debit` | Relancer un prélèvement qui a échoué |
| `GET /admin/urssaf-links` | Les demandes d'avance immédiate en attente |
| `POST /admin/urssaf-links/{id}/decision` | Y répondre (simulation URSSAF) |
| `GET /admin/urssaf-payments` | Les demandes de paiement URSSAF |
| `POST /admin/urssaf-payments/{id}/outcome` | Y répondre (simulation) |

Conséquence concrète : **personne ne peut déclencher la facturation des
commissions**, ni débloquer un paiement CESU resté en attente, ni instruire une
demande d'avance immédiate. Côté batch cooker ces objets sont visibles depuis
le 21/10 (écran *Revenus*) ; côté maison, non.

## 2. Les attestations fiscales — 3 routes

| Route | Pour qui |
|---|---|
| `GET /me/fiscal-attestations/{year}` | Le client : son total ouvrant droit au crédit d'impôt |
| `GET /admin/fiscal-attestations` | La console : tous les clients |
| `GET /admin/fiscal-attestations/{clientId}` | La console : un client |

C'est la pièce que le client attend en janvier. Aucun écran ne la propose.

## 3. Le paiement en CESU, côté client — 5 routes

| Route | Ce qui manque |
|---|---|
| `GET /chefs/{chefProfileId}/cesu-info` | Comment payer **ce** batch cooker en CESU, avant de payer |
| `POST /me/bookings/{id}/cesu-proof/upload-url` | Déposer la preuve de son virement e-CESU |
| `PUT /me/cesu-payments/{id}/proof` | La remplacer |
| `GET /me/cesu-payments/{id}/proof-url` | La relire |
| `GET /me/bookings/{id}/payment-status` | Combien reste-t-il à payer |

Le client peut déclarer un paiement CESU, mais ne peut ni téléverser sa preuve,
ni la revoir — alors que le batch cooker, lui, attend cette preuve pour
confirmer.

`POST /payments/intent` n'est pas branché non plus, mais c'est un choix :
le front utilise `POST /payments/checkout-session`. À supprimer côté API si
personne ne s'en sert.

## 4. Quatre routes isolées qui bloquent chacune un geste

| Route | Le geste impossible aujourd'hui |
|---|---|
| `POST /admin/chef-users/{id}/resend-invitation` | **Renvoyer son lien de connexion** à un batch cooker. La fiche DEM-01 est marquée résolue côté API — le bouton n'existe toujours pas dans la console. |
| `PATCH /admin/chefs/{id}/sap-external-status` | Instruire l'affiliation CRCESU et l'avance immédiate. L'écran du batch cooker annonce « instruit par l'équipe » ; l'équipe n'a pas l'écran. |
| `POST /me/chef-application/reapply` | Recandidater après un refus. |
| `DELETE /admin/users/{id}` | Supprimer un compte depuis la console. |

## 5. Le reste — sans objet ou volontaire

| Route | Pourquoi ce n'est pas un manque |
|---|---|
| `GET /health`, `GET /ready` | Sondes d'infrastructure |
| `GET /thisUser` | Debug du jeton |
| `GET /calendar/feed/{file}` | Lue par les applications de calendrier, pas par nous |
| `POST /auth/register` | Les comptes clients naissent par Clerk |
| `DELETE /me` | Suppression de compte : à arbitrer (RGPD) avant de l'exposer |
| `POST /me/quotes/{id}/accept` | **Dépréciée** — le front utilise déjà `…/offers/{offerId}/accept` |

---

## Dans l'autre sens

Aucun appel du front ne vise une route inexistante, et **aucune route dépréciée
n'est appelée**. Les six `/bookings*` supprimées le 17/10 ne sont plus citées
nulle part.
