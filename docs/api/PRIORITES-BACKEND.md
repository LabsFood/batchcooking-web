# Ce que le backend doit livrer ensuite

> Écrit le 16/10/2026, après avoir branché l'agenda, le déroulé d'une
> prestation et les semaines de menus. **Chaque point ci-dessous a été
> revérifié le 16/10 au soir sur `/openapi.json` de
> `lf-api-develop.up.railway.app`** : 195 chemins, 8 opérations dépréciées. Les
> chiffres cités sont mesurés, pas supposés.

Chaque point part de ce qu'un utilisateur **ne peut pas faire aujourd'hui**,
nomme l'écran qui attend, et propose le contrat minimal. L'ordre est celui de
l'urgence, pas de la difficulté.

Les identifiants `BLK-xx` / `BUG-xx` renvoient au classeur de pilotage
(`docs/pilotage/pilotage-labs-food.xlsx`, onglet *Bugs & blocages*).

---

## Déjà branché depuis le 16/10 — ne pas casser

Ces routes sont arrivées récemment et sont **consommées en production du
front** depuis aujourd'hui :

| Route | Écran |
|---|---|
| `GET /chef/agenda`, `/summary`, `POST` et `DELETE /chef/agenda/blocks` | Agenda du batch cooker |
| `GET` et `PUT /chef/availability` | Semaine type |
| `GET /chef/availability/slots` | Carte « Ce qu'un client voit » |
| `GET /chefs/{id}/availability` | Étape « Quand et où » de la réservation |
| `GET /me/bookings/{id}/calendar.ics` | Bouton « Ajouter à mon agenda » |
| `PATCH` et `DELETE /admin/menu-weeks/{id}` | Tiroir d'une semaine, console admin |
| `/chef/bookings*`, `/me/bookings*` | Prestations (chef) et commandes (client) |

---

## 1. Les offres de service d'un batch cooker — BLK-23, P1

**Ce qui se passe.** Aucune route ne liste, ne crée ni ne modifie les offres
d'un batch cooker. `GET /chefs/{id}` ne les rend pas, et
`GET /chefs/{id}/availability` prend « l'offre active la plus chère » sans que
personne ne puisse en créer une.

**Ce qui est bloqué.** Le tunnel public tout entier : c'est la **durée** de
l'offre qui fait le créneau et le **prix** qui fait le montant. En attendant :

- `app/espace-client/reservation` affiche un prix écrit en dur (`BASE_PRICE`) ;
- l'écran *Tarifs* du batch cooker n'a rien où écrire ;
- `GET /chef/availability/slots` oblige le front à **deviner** une durée (on
  propose 2 h / 3 h / 4 h / 5 h à la main, faute de mieux) ;
- `POST /me/bookings` ne peut pas être rattaché à une offre.

**Contrat minimal.**

```http
GET    /me/chef/service-offers
POST   /me/chef/service-offers
PATCH  /me/chef/service-offers/{id}
DELETE /me/chef/service-offers/{id}
```

```json
{
  "id": "uuid",
  "name": "Session 4 heures",
  "durationMinutes": 240,
  "priceCents": 18000,
  "shoppingIncluded": true,
  "shoppingFeeCents": 1500,
  "active": true
}
```

Et, côté public, les offres actives sur `GET /chefs/{id}` :

```json
{ "serviceOffers": [{ "id": "…", "name": "…", "durationMinutes": 240, "priceCents": 18000 }] }
```

`POST /me/bookings` accepte alors `offerId`, et c'est l'API qui fixe durée et
prix — le front cesse de les calculer.

---

## 2. Les zones d'intervention se ferment à l'approbation — BLK-19, P1

**Ce qui se passe.** `PATCH /me/chef-application` existe bien, mais répond
`409 APPLICATION_DECIDED` dès que le dossier est approuvé. La seule route
ouverte ensuite, `PATCH /me/chef-profile`, **exclut explicitement les zones**,
et aucune route admin ne les écrit (`PATCH /admin/chefs/{id}` n'existe pas).

**Ce qui est bloqué.** Un batch cooker approuvé qui déménage, ou qui veut
élargir son rayon, ne peut rien faire — ni lui, ni un admin pour lui.

**Le détail qui montre l'oubli.** `UpdateMeChefProfileDto` accepte
`serviceRadiusKm` — le **rayon** se change donc librement après approbation.
Ce sont les **zones** qui manquent, et elles n'existent que dans
`UpdateChefApplicationDto`, c'est-à-dire derrière le `409`.

**Contrat minimal.** Ajouter `interventionZones` à `UpdateMeChefProfileDto`,
à côté du rayon qui y est déjà. C'est une information publique, déjà rendue
par `GET /chefs/{id}` : elle a sa place sur le profil, pas dans la
candidature.

---

## 3. Supprimer les six routes dépréciées `/bookings*` — BLK-14, P1 (sécurité)

**Ce qui se passe.** `GET /bookings` rend **toutes les prestations de tout le
monde** — nom, ville, adresse, horaire — à n'importe quel compte connecté.
Elle est marquée `deprecated` dans la spec, mais elle répond toujours.

**Ce qui change.** Le front n'y touche plus depuis le 16/10 : tout passe par
`/me/bookings`, `/chef/bookings` et `/admin/bookings`. Les six opérations
peuvent partir :

```
GET|POST /bookings
GET      /bookings/me
GET      /bookings/me/bookings/{id}
GET      /bookings/admin/bookings/{id}
POST     /bookings/admin/bookings/{id}/shopping-list/regenerate
```

Et, tant qu'elles vivent, `GET /bookings` devrait déjà exiger le rôle admin.

> Les deux autres opérations dépréciées, `GET /menus/current` et
> `POST /me/quotes/{id}/accept`, ne sont plus appelées par le front non plus.

---

## 4. Rendre la spec exploitable — BUG-02 et BUG-04, P1

Ces deux points bloquent la même chose : **générer un client typé** depuis
`/openapi.json` au lieu d'écrire les types à la main, et afficher une erreur
utile à l'utilisateur.

1. **Schémas de réponse manquants** (BUG-02) : **174 des 222 réponses `2xx`**
   n'ont aucun `content.schema` — mesuré le 16/10 sur la spec de `develop`.
   Un générateur produit `unknown` pour les trois quarts des routes, et c'est
   pour cela que les types sont encore écrits à la main dans `lib/api/`.
   *Le classeur partagé donne ce point pour terminé : il ne l'est pas sur
   `develop`.*
2. **Erreurs de validation illisibles** (BUG-04) : `message` est un tableau de
   phrases anglaises qu'il faut parser pour savoir quel champ est en cause.
   Un tableau structuré suffirait :

```json
{
  "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "errors": [{ "field": "siret", "code": "LENGTH", "message": "14 chiffres attendus" }]
}
```

---

## 5. Les deux champs qui restent `object` — BUG-03, P2

**Trois cinquièmes sont faits** : `calories`, `country` et `cookTime` sont
désormais typés avec `nullable: true`. Merci.

Restent `reheating` et `storage`, toujours `object` **sans `properties`** : un
client généré les reçoit opaques. Leur forme est connue et stable, elle tient
en deux lignes — `reheating { mode, minutes }`, `storage { method, days }` —
et c'est elle que le formulaire de plat envoie déjà.

---

## 6. `GET /admin/dishes` ne rend que douze champs — P2

**Ce qui se passe.** La file de modération reçoit une ligne sans `imageUrl`,
sans allergènes, sans temps de préparation. Conséquences vues en vrai :

- une vignette qui ne se remplissait jamais (retirée) ;
- un badge « allergènes non déclarés » qui s'affichait sur **toutes** les
  lignes, puisque le tableau arrivait vide (remplacé par les `flags` que l'API
  calcule, qui, eux, sont justes).

**Contournement en place.** Le tiroir va chercher la fiche complète chez son
auteur (`GET /admin/chefs/{id}/dishes`) — un appel de plus par ouverture.

**Ce qu'on demande.** Soit `imageUrl` + `allergens` + `allergensNone` sur la
ligne, soit une mention dans la spec disant que c'est une liste légère et que
le détail se lit ailleurs. L'un ou l'autre, mais écrit.

---

## 7. Avis et réputation — FLOW-06, P2

`rating` et `reviewCount` sont **toujours `null`** sur un batch cooker, et
aucune route ne permet de déposer ni de lire un avis. Les écrans publics
montrent donc un batch cooker sans aucune preuve sociale, et l'étoile de la
maquette n'a rien à afficher.

Contrat proposé dans [`FLOW-06-avis-et-reputation.md`](FLOW-06-avis-et-reputation.md).

---

## 8. Moyens de paiement acceptés, et langues parlées — BLK-16 / BLK-17, P2

Le profil d'un batch cooker ne porte ni les moyens de paiement qu'il accepte
(CESU préfinancé, virement, carte), ni ses langues parlées. Les deux sont
affichés dans la maquette de sa vitrine, et le CESU change ce que le client
paiera réellement : c'est au moins une information de parcours, pas un
ornement.

---

## 9. `GET /menus/current` — BUG-05, à confirmer

La route est maintenant marquée **`deprecated`** dans la spec, et la semaine
publique se lit sur `GET /menus/week`, que le front utilise déjà. Le bug est
donc résolu par disparition — reste à savoir si elle part pour de bon ou si
elle revient corrigée, pour qu'on sache quoi en faire.

---

## 10. Affecter un devis à un batch cooker — BLK-20, P3

La console peut lire et répondre à un devis, mais ne peut pas le **confier**
à un batch cooker, et le seul statut de clôture disponible veut dire « le
client a refusé ». Il manque l'affectation et un statut de clôture maison
distinct du refus client.

---

## 11. Dire quelles routes sont fermées avant approbation — DEM-06, P3

L'espace batch cooker est en lecture seule tant que le dossier n'est pas
approuvé, mais la liste des routes qui répondent `403` n'est écrite nulle
part : l'écran découvre le refus au moment du clic. Une liste, même dans la
spec, suffirait à l'annoncer avant.

---

## 12. Les deux « N/A » qui restent sur une prestation — FLOW-05, P3

La checklist d'hygiène et le mandat de débours (avec ses justificatifs) n'ont
aucune route. Ce sont les deux seuls endroits de l'écran *Prestation* du batch
cooker où l'on affiche encore **N/A**.

---

## Ce qui n'est plus un manque

À jour au 16/10, pour éviter de rouvrir des sujets clos :

- **Messagerie** (BLK-05) : `/me/conversations*` et `/admin/conversations*`
  existent et sont branchés.
- **Contact** (BLK-02) : `POST /contact-messages` et la console admin existent.
- **Rémunération** (BLK-06) : CESU, factures de commission et liens URSSAF
  sont exposés et branchés.
- **Réservation** (BLK-21, BLK-22) : `POST /me/bookings` crée, `/admin/bookings`
  filtre, pagine et exige le rôle admin.
- **Semaines de menus** (BLK-09) : `PATCH` et `DELETE` sont arrivés, et la
  console les utilise.
- **Agenda** (FLOW-04) : livré et branché.
