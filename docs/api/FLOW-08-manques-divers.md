# FLOW-08 — Les manques qui n'ont pas besoin d'un document entier

> **Document v1**, rédigé le 11/10/2026, relevé sur la spec en ligne
> (`/openapi.json`, 123 chemins). Chaque point est petit, aucun ne mérite son
> propre flux, et tous bloquent quelque chose de visible à l'écran.
> Les cinq premiers sont des trous à combler ; le dernier est un module entier
> dont personne ne m'a encore décrit le métier.

---

## 1. `POST /bookings` répond 501

**C'est le plus gros manque du produit.** Un client peut choisir un batch
cooker, cocher ses plats, arriver au bout du tunnel de réservation — et rien ne
s'enregistre. Tout ce qui est en aval (prestations, listes de courses, fiches
recettes, messagerie attachée à une prestation, avis) attend des réservations
qui ne peuvent pas naître.

La route existe et valide déjà son corps (`400`/`422` sur un corps invalide) :
il manque l'écriture. Voir aussi
[`FLOW-04`](FLOW-04-agenda-et-disponibilites.md) § 4.3 pour les conflits de
créneau qu'elle devra renvoyer.

---

## 2. `GET /bookings` rend toute la base

Admin, sans pagination, sans filtre — ni par batch cooker, ni par statut, ni par
date. Trois écrans la consomment et trient côté navigateur : la vue d'ensemble,
la liste des réservations, et l'onglet « Ses prestations » d'une fiche de batch
cooker. Ça tient aujourd'hui, ça ne tiendra pas.

```
GET /bookings?page=&limit=&status=&chefProfileId=&from=&to=
```

Et **la route est annoncée « admin only » alors que tout compte connecté peut
l'appeler** : la description de l'API le dit elle-même. N'importe quel client
connecté peut lire toutes les réservations de tous les autres — nom, email,
date, montant. C'est le point le plus urgent de ce document après le § 1.

---

## 3. Les zones d'intervention sont figées à l'approbation

La route existe, et elle accepte les zones : `PATCH /me/chef-application` prend
bien `interventionZones`. Mais elle n'est ouverte *« while the candidature is
`submitted` or `changes-requested` »* — approuvée, elle répond
`409 APPLICATION_DECIDED`.

Et il n'y a pas de porte de secours : `PATCH /me/chef-profile`, la seule route
ouverte à un batch cooker approuvé, écrit noir sur blanc que les zones sont
fixées à l'approbation ; `PATCH /admin/chefs/{id}` n'existe pas, et
`GET /admin/chefs/{id}` ne fait que lire « the zones covered city by city ».

Donc : un candidat change ses zones quand il veut, un batch cooker approuvé ne
peut plus, et personne ne peut le faire à sa place. Celui qui déménage ou veut
ajouter une commune après trois mois n'a que `city` et `serviceRadiusKm` — son
rayon de déplacement.

Deux chemins possibles :

- ouvrir `interventionZones` sur `PATCH /me/chef-profile` — le plus simple, et
  cohérent avec le reste de la vitrine ;
- une route admin (`PATCH /admin/chefs/{id}/zones`) si le métier veut garder la
  main, avec une demande depuis l'espace chef.

En attendant, l'écran affiche « modification N/A » et renvoie vers la
messagerie. C'est honnête, ce n'est pas satisfaisant.

---

## 4. Un devis ne s'affecte pas, et ne se classe pas

Sur `GET /admin/quotes`, `assignedChefUserId` est **lisible mais non
modifiable** : aucun champ de `UpdateQuoteAdminDto` ne l'écrit. La console
affiche donc une affectation qu'elle ne peut pas faire.

Et le seul statut de fin est `declined` — « le client a refusé ». Une demande
morte (client injoignable, hors zone, hors budget) ne peut être classée qu'en
mentant sur qui a renoncé. Il manque un statut de clôture côté maison :
`closed`, `abandoned`, au choix du métier.

```
PATCH /admin/quotes/{id}   { assignedChefUserId, status: "closed", closeReason }
```

---

## 5. Le rayon des ingrédients n'a pas de référentiel

La liste de courses d'une prestation groupe **par la chaîne stockée** dans
`aisle`. Les exemples de l'API écrivent des identifiants (`boucherie`,
`fruits-legumes`), et le front s'est aligné dessus le 11/10 — avant quoi il
écrivait des libellés français, ce qui donnait deux rayons pour la même allée.

Rien ne garantit cet alignement : `aisle` est du texte libre, 60 caractères.
Un `GET /referentials/aisles`, comme pour les régimes et les allergènes, et le
problème disparaît. Même remarque pour `units` : le `README` de ce dossier les
annonçait tous les deux, ils n'ont jamais été exposés.

---

## 6. Kossam

Trois écrans existent en maquette dans la console (`/admin/kossam` et le détail
d'une commande), et **aucune route ne leur correspond**. Le modèle mock parle de
commandes, de statuts de livraison et de paiement.

Je n'ai pas de quoi écrire des requirements ici : il me manque le métier. Ce
qu'il faudrait savoir avant d'ouvrir un `FLOW-09` :

1. Qu'est-ce que Kossam vend exactement, et à qui ?
2. Est-ce le même client que le batch cooking, avec le même compte ?
3. Qui livre, et comment le statut de livraison remonte-t-il ?
4. Le paiement passe-t-il par le même circuit que les prestations ?
5. Est-ce dans le périmètre de la v1 du produit, ou derrière ?

Tant que ces réponses manquent, les écrans Kossam restent des maquettes — et
devraient probablement être retirés de la navigation pour ne pas promettre un
module qui n'existe pas.

---

## 7. Divergences entre ce dossier et l'API réelle

Le `README` de ce dossier a été écrit le 20/09, avant l'API. Deux conventions
qu'il annonce ne sont pas celles qui ont été livrées — ce document fait foi sur
ces deux points :

| `README` | API réelle |
|---|---|
| `?page=1&perPage=25`, réponse `{ items, page, perPage, total }` | `?page=1&limit=25`, réponse `{ data, meta: { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }` |
| `GET /referentials/document-types`, `aisles`, `units` | Jamais exposés. Seuls `regions`, `diets`, `allergens`, `dish-categories` existent |

Un troisième point n'est pas une divergence mais un manque généralisé :
**presque aucune réponse `2xx` n'a de schéma** dans la spec, seulement des
exemples. Le front lit donc chaque champ sous plusieurs noms plausibles, ou se
fie aux exemples — c'est ainsi que `isActive` est resté invisible pendant
plusieurs jours alors qu'il était bien renvoyé. Un schéma par réponse vaut mieux
que n'importe lequel des documents de ce dossier.
