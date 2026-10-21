# Ce que le backend doit livrer ensuite

> Écrit le 16/10/2026, **revu le 18/10** après la réponse du backend et une
> nouvelle lecture de `/openapi.json` sur `lf-api-develop.up.railway.app` :
> 191 chemins, une seule opération dépréciée.
>
> **Dix des douze points du 16/10 sont livrés.** Ce document ne garde en tête
> que ce qui reste ouvert ; le reste est en bas, daté, pour ne pas rouvrir des
> sujets clos.

---

## Rectification du 18/10

Le 16/10 au soir, nous avions mesuré **174 réponses `2xx` sans schéma sur 222**
et écrit que BUG-02 n'était pas résolu malgré le classeur de l'équipe. C'était
exact à l'heure de la mesure, et faux dès le lendemain : la correction a été
poussée entre-temps.

Relevé ce jour, sur la même spec :

| Vérification | 16/10 au soir | 18/10 |
|---|---|---|
| Réponses `2xx` avec un contenu JSON **et** un schéma | 48 | **217 sur 217** |
| Dont un schéma lu sur l'exemple (`x-schema-from-example`) | 0 | 168 |
| `reheating` / `storage` typés | `object` nu | **`allOf` → `ReheatingDto` / `StorageDto`** |

Nos excuses pour le faux signalement. La leçon pour la suite : republier une
mesure sans la refaire le jour où on la cite.

---

## Ce qui reste ouvert

### 1. Les zones d'intervention se ferment à l'approbation — BLK-19

**Toujours vrai au 18/10.** `UpdateMeChefProfileDto` accepte `bio`, `city`,
`displayName`, `firstName`, `lastName`, `phone` et `serviceRadiusKm` — mais
pas `interventionZones`, qui n'existe que dans `UpdateChefApplicationDto`,
c'est-à-dire derrière le `409 APPLICATION_DECIDED`.

Le **rayon** se change donc librement après approbation, les **zones** non.
Un batch cooker qui déménage est coincé, et aucune route admin ne le dépanne.

**Ce qu'il faut :** `interventionZones` dans `UpdateMeChefProfileDto`, à côté
du rayon qui y est déjà. C'est une information publique, déjà rendue par
`GET /chefs/{id}`.

Le backend l'annonce comme prévu, sans date. Côté front, rien n'est à faire
avant.

### 2. Les langues parlées — BLK-17

`languages` est rendu, toujours vide. La vitrine affiche donc un batch cooker
sans aucune langue, et le filtre correspondant n'a rien à filtrer. Un champ sur
le profil public suffirait — sinon, nous retirons l'idée de la maquette.

### 3. Le template Brevo des emails de classement

Le statut `closed` d'un devis est livré et branché des deux côtés, mais les
emails qu'il déclenche attendent leur template. Tant qu'il manque, un client
dont la demande est classée l'apprend en revenant sur le site.

### 4. Avis et réputation — FLOW-06, hors MVP

Décision de Lab's Food : hors périmètre. `rating` et `reviewCount` restent
`null`, et les écrans affichent « Pas encore d'avis ». Rien à faire, de part
et d'autre, tant que la décision tient.

### 5. Checklist d'hygiène et mandat de débours — FLOW-05

En attente du contenu arrêté par Lab's Food et des quatre questions juridiques
du mandat. Ce sont les deux seuls « N/A » qui restent sur l'écran *Prestation*
d'un batch cooker.

---

## Livré depuis le 16/10

Ce que le backend a fermé en deux jours, et ce que le front en a fait :

| Demande | Livré | Côté front |
|---|---|---|
| **Offres de service** (BLK-23) | `/me/chef/service-offers` ×4, `serviceOffers` sur `GET /chefs/{id}`, `?offerId=` sur les créneaux, `serviceOfferId` au `POST` | Écran *Mes tarifs* reconstruit, tunnel de réservation sur les offres, prix calculés côté front supprimés |
| **Frais de courses séparé** | `shoppingFeeCents` sur les trois listes de réservations | Ligne « Courses » dans le récap, la commande et la prestation ; `shoppingByClient` envoyé |
| **Routes `/bookings*`** (BLK-14, BLK-22) | Supprimées | Plus aucun appel ; la console était déjà sur `/admin/bookings` |
| **Schémas de réponse** (BUG-02) | 217 réponses sur 217 | Génération d'un client typé encore à faire |
| **Erreurs de validation** (BUG-04) | `errors: [{ field, code, message }]` sur les `400` | `fieldErrors()` dans les deux repos ; la réservation nomme le champ refusé |
| **`reheating` / `storage`** (BUG-03) | Typés via `allOf` | Rien à changer |
| **`GET /admin/dishes`** | `imageUrl`, `allergens`, `allergensNone`, `prepTime` | Vignette et allergènes rendus depuis la ligne |
| **`GET /menus/current`** (BUG-05) | Supprimée | `/menus/week` était déjà la source |
| **Classer un devis** (BLK-20) | Statut `closed`, affectation par `assignedChefUserId` | Action « Classer sans suite » en console, statut reconnu chez le client et le batch cooker |
| **Routes fermées avant approbation** (DEM-06) | 49 opérations documentées `x-requires-approved-chef` | `ApprovalGate` le dit avant le clic |
| **Semaines de menus** (BLK-09) | `PATCH` et `DELETE /admin/menu-weeks/{id}` | Tiroir d'édition en console |
| **Minimum de 3 plats** | Décision : retiré | `MIN_DISHES` supprimé |

Et, plus tôt : messagerie, contact, rémunération (CESU, factures de commission,
liens URSSAF), agenda et disponibilités — tous exposés et branchés.
