# Couverture de l'API — ce qui est branché, ce qui ne l'est pas

Relevé du 24/10/2026 contre `https://lf-api-develop.up.railway.app/openapi.json`
(v1.3.0, 195 chemins, **238 opérations**), croisé avec les deux fronts.

> Méthode : un script compare les opérations du spec aux chemins appelés dans
> `labs-food` et `admin-labsfood`, en résolvant les constantes et les
> interpolations. Il se trompe dans les deux sens — un helper générique comme
> `${base}/photo/upload-url` lui échappe, un littéral voisin d'un `method:
> 'POST'` lui fait voir un appel qui n'existe pas. **Chaque route listée
> ci-dessous comme non utilisée a donc été revérifiée à la main.**

| | Opérations |
|---|---|
| Exposées par l'API | 238 |
| Appelées par un front | ~207 |
| **Jamais appelées** | **30** |

---

## 1. Jamais appelées — et c'est voulu (8)

Rien à faire : ces routes ne s'adressent pas à nous.

| Route | Pourquoi |
|---|---|
| `GET /health` · `GET /ready` | Sondes d'infrastructure, lues par Railway |
| `GET /thisUser` | Outil de débogage du token |
| `GET /calendar/feed/{file}` | Lue par Google Agenda et Apple Calendrier, pas par le site |
| `POST /auth/register` | Les comptes clients naissent par Clerk ; le `/auth/register` du front est une page, pas un appel |
| `POST /me/quotes/{id}/accept` | **Dépréciée** — on utilise `…/offers/{offerId}/accept` |
| `POST /payments/intent` | On utilise `POST /payments/checkout-session`, qui gère la page Stripe |
| `GET /me/chef/quotes/{id}` | La liste `GET /me/chef/quotes` porte déjà tout le détail |
| `GET /chefs/{id}/cesu-info` | Le NAN arrive déjà par `GET /me/bookings/{id}/payment-options` |

---

## 2. Jamais appelées — le module n'existe pas encore (16)

**Tout l'argent au-delà du paiement par carte.** C'est le plus gros manque du
produit, et il est entièrement de notre côté : les seize routes existent et
fonctionnent.

### Console — CESU (3)

| Route | Écran à écrire |
|---|---|
| `GET /admin/cesu-payments` | Liste de toutes les déclarations CESU du réseau |
| `GET /admin/cesu-payments/{id}/proof-url` | Ouvrir le justificatif déposé par le client |
| `POST /admin/cesu-payments/{id}/force-settle` | Solder à la place d'un batch cooker qui ne répond pas |

### Console — commissions (3)

| Route | Écran à écrire |
|---|---|
| `GET /admin/commission-invoices` | Liste des factures de commission |
| `POST /admin/commission-invoices/run-due` | Lancer la facturation d'une période — **rien ne facture aujourd'hui** |
| `POST /admin/commission-invoices/{id}/retry-debit` | Relancer un prélèvement échoué |

### Console — URSSAF (4)

| Route | Écran à écrire |
|---|---|
| `GET /admin/urssaf-links` | Demandes de rattachement à l'avance immédiate |
| `POST /admin/urssaf-links/{id}/decision` | Y répondre (simulation de l'URSSAF) |
| `GET /admin/urssaf-payments` | Demandes de paiement |
| `POST /admin/urssaf-payments/{id}/outcome` | Y répondre |

### Console — attestations fiscales (2)

| Route | Écran à écrire |
|---|---|
| `GET /admin/fiscal-attestations` | Totaux crédit d'impôt, tous clients |
| `GET /admin/fiscal-attestations/{clientId}` | Celui d'un client, depuis sa fiche |

### Espace client — preuve e-CESU et reste à payer (4)

| Route | Écran à écrire |
|---|---|
| `POST /me/bookings/{id}/cesu-proof/upload-url` | Déposer la preuve du virement e-CESU |
| `PUT /me/cesu-payments/{id}/proof` | La remplacer |
| `GET /me/cesu-payments/{id}/proof-url` | La relire |
| `GET /me/bookings/{id}/payment-status` | « Il vous reste X € à régler » |

---

## 3. Jamais appelées — livrées le 24/10, à brancher cette semaine (2)

| Route | Écran |
|---|---|
| `PATCH /admin/chefs/{id}/zones` | Modifier les zones depuis la fiche batch cooker |
| `GET /referentials/languages` | Alimenter le champ « langues parlées » de la vitrine |

---

## 4. Jamais appelées — l'écran n'a jamais été écrit (4)

| Route | Écran manquant |
|---|---|
| `POST /chef/bookings` | Un batch cooker réserve pour un de ses clients |
| `POST /me/chef-application/reapply` | Redéposer une candidature après un refus |
| `GET /chefs/{id}/showcase` | La vitrine publique, telle que le client la voit |
| `DELETE /admin/users/{id}/avatar` | Retirer la photo de profil de quelqu'un |

---

## 5. Ce qui manque côté **backend** (5)

Détail, JSON attendu et tests de validation dans [MANQUES-API.md](MANQUES-API.md).

| # | Route | Manque | Gravité |
|---|---|---|---|
| 1 | `GET`/`PATCH /me/profile` | `householdAdults`, `householdKids`, `addressStreet`, `addressCity`, `addressPostalCode` écrits mais jamais rendus | **Bloquant** |
| 2 | `GET /admin/clients/{id}` | les mêmes cinq champs | **Bloquant** |
| 3 | `GET /admin/clients/{id}` | `200` corps vide sur id inconnu, au lieu de `404` | Haute |
| 4 | `PATCH /me/profile` | pas de préférences de notification | Basse |
| 5 | — | pas d'avis, pas de litiges — décision attendue | Décision |

---

## 6. Ce qui manque côté **front**

### Écrans à écrire sur des routes qui existent (les 23 ci-dessus)

Le module argent (16) pèse à lui seul les deux tiers. Il se découpe en quatre
chantiers indépendants : CESU console, commissions, URSSAF, attestations.

### Écrans qui affichent des données écrites en dur (6)

| Écran | Ce qu'il faudrait lire |
|---|---|
| `/espace-client` — carte culinaire | `GET /me/culinary-map` (la route existe) |
| `/espace-client/conservation` | `GET /chef-missions/{id}/dishes/{dishId}/recipe-sheet`, lisible par le client **après** la prestation |
| `/espace-client/chefs` — mes batch cookers | `GET /me/bookings` + `GET /chefs/{id}` |
| `/espace-client/parametres` | Identité par Clerk ; les notifications attendent la demande n° 4 |
| `/espace-chef/parametres` | idem |
| `/transactions` (console) | Les 16 routes du module argent |

### Dette connue

- `lib/chef/mock.ts` : ~120 lignes mortes. Deux tentatives de nettoyage
  automatique ont cassé le fichier ; à faire à la main.
- `lib/client/mock.ts` : `SHOPPING_LIST` et `SHOPPING_AISLES` ne servent plus
  depuis que la page Courses lit l'API.
- Aucun client typé généré depuis `/openapi.json` : les types sont écrits à la
  main dans `lib/api/types.ts`, et c'est exactement ce qui a laissé passer le
  changement de forme de `GET /admin/clients`.

---

## 7. Dans l'autre sens

**Aucun appel du front ne vise une route inexistante.** Les routes supprimées
par le backend le 17/10 ne sont plus citées nulle part, et la seule opération
dépréciée du spec (`POST /me/quotes/{id}/accept`) n'est pas appelée.
