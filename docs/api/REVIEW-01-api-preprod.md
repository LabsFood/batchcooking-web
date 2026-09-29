# Revue de l'API de pré-production — modules Candidature et Plats/Menus

Spéc lue : `https://lf-backend-lf-backend-pr-37.up.railway.app/docs`
(`/openapi.json`, OpenAPI 3.0.0), le 28/09/2026. Endpoints publics testés en
direct, endpoints protégés lus sur la spéc uniquement.

Périmètre : **module 1** candidature batch cooker (`/devenir-chef`, dossier côté
admin) et **module 2** plats & menus. Le reste (bookings, quotes, CMS, clients)
n'est pas revu ici.

Base URL temporaire des deux fronts : `https://lf-backend-lf-backend-pr-37.up.railway.app`
(à remettre sur `https://lf-api.labsfood.fr` après la recette).

---

## 0. Ce qui est déjà aligné

Le module 1 est implémenté de très près sur `FLOW-01`. Correspondances exactes,
rien à changer :

- `POST /chef-applications` accepte le payload que le formulaire construit
  déjà : `identity`, `address`, `interventionZones[]`, `workAuthorization`,
  `company` (dont `sap.path` / `declarationNumber`), `consent`.
- Les trois statuts professionnels sont les bons : `micro`, `other-company`,
  `not-registered`, SIRET exigé sauf dans le dernier cas, clé de Luhn vérifiée.
- Les quatre situations de droit au travail sont les bonnes, `details` exigé et
  ≥ 10 caractères sur `other`.
- Les pièces supprimées à la demande du client (mandat SEPA, vérification d'id
  PSP, CGU, rattachement coopérative, affiliation CRCESU) **ne sont plus dans
  l'énumération**. Les pièces bloquantes sont `identity` + `registration`,
  comme côté front.
- `GET /referentials/regions` renvoie exactement nos 13 régions et nos codes
  INSEE (vérifié en direct). `lib/chef/regions.ts` peut être remplacé sans
  ajustement de code.
- Upload : URL pré-signée par type, MIME `pdf/jpeg/png/webp`, 10 Mo — identique
  au front. Versions conservées, refus avec motif de 15 à 500 caractères lu
  verbatim par le candidat, `download-url` de 5 minutes journalisée.
- `approve` refuse tant qu'une pièce bloquante n'est pas valide
  (`DOCUMENT_REQUIRED`), et `PATCH /admin/chefs/:id/verification` refuse
  `isVerified: true` hors approbation de candidature. Exactement la garantie
  qu'on voulait.
- `GET /me` porte `role` et `chefProfile` même quand `isActive: false` : la page
  `/apres-connexion` fonctionne telle quelle.

---

## 1. Blocages techniques (à corriger avant tout branchement)

### 1.1 CORS : seules les méthodes `GET, HEAD, POST` sont autorisées

Vérifié par préflight sur la pré-prod :

```
OPTIONS /chef-applications   Origin: http://localhost:3005
→ 204  access-control-allow-methods: GET,HEAD,POST
```

La liste blanche d'origines est bonne (`localhost:3005`, `localhost:8035`
acceptées, origine inconnue rejetée), mais **`PATCH` et `DELETE` sont absents**.
Le site batchcooking appelle l'API directement depuis le navigateur : tout
`PATCH` échoue au préflight, donc `PATCH /me/profile`,
`PATCH /me/chef-profile`, et côté admin `PATCH .../documents/{type}`,
`PATCH /admin/meals/{id}`, `DELETE /admin/meals/{id}`.

→ **Demande backend** : ajouter `PATCH, PUT, DELETE` à `Access-Control-Allow-Methods`.
Faute de quoi le front batchcooking devra passer par un proxy same-origin
comme le fait déjà l'admin (`/lf-api/*`), ce qui est une rustine.

### 1.2 Aucun schéma de réponse sur les deux modules

Toutes les réponses 2xx des endpoints candidature, documents et menus n'ont
qu'une `description`, pas de `content`/`schema` :

`POST /chef-applications` (201), `GET /me/chef-application`,
`GET /me/chef-documents`, `.../{type}/versions`, `.../upload-url`,
`GET /admin/chef-applications`, `GET /admin/chef-applications/{id}`,
`.../download-url`, `GET /admin/menu-weeks`, `POST /admin/menu-weeks`,
`GET /menus/current`, `GET /referentials/regions`.

Conséquence : impossible de générer un client typé, et le front devrait
deviner la forme de la file d'attente admin, du dossier, des statuts dérivés
et des motifs de refus.

→ **Demande backend** : exposer les DTO de réponse (`@ApiOkResponse({ type })`).
Prioritaires pour nous : `GET /admin/chef-applications` (+ `waitingSinceHours`,
`pendingDocumentsCount`), `GET /admin/chef-applications/{id}`,
`GET /me/chef-application`, `GET /me/chef-documents`, `.../upload-url`.

### 1.3 Champs nullables typés `object` au lieu de leur type réel

Sur la spéc : `address.line2`, `company.siret`, `sap.declarationNumber`,
`workAuthorization.details`, `meal.country`, `meal.calories`,
`chefProfile.bio`, `chefProfile.city`, `user.fullName`, `user.phone`,
`me.chefProfile` sont déclarés `{"type": "object", "nullable": true}` alors que
ce sont des `string` / `number` / un objet précis.

Cause probable : `@ApiProperty({ required: false, nullable: true })` sans
`type`. Codegen et validation de contrat s'en trouvent faussés.

→ **Demande backend** : ajouter `type` (et le type de l'objet pour `chefProfile`).

### 1.4 Les erreurs de validation sortent en 400, la doc annonce 422

Testé avec un corps vide :

```
POST /chef-applications  {}
→ 400 {"message":["At least one intervention zone is required.",
                   "interventionZones must be an array"],
       "error":"Bad Request","statusCode":400}
```

La spéc documente `422 VALIDATION_FAILED`. Le message est un tableau de
phrases en anglais, sans nom de champ exploitable : le front ne peut pas
repositionner l'erreur sur le bon champ ni sur la bonne étape du stepper.

→ **Demande backend** : trancher 400 ou 422, et renvoyer les erreurs par champ,
par exemple `{ code: 'VALIDATION_FAILED', fields: { 'company.siret': 'INVALID_LUHN' } }`.
Le front garde sa validation zod locale ; c'est le rejet serveur qui doit être
replaçable.

---

## 2. Module 1 — écarts de flux à arbitrer

### 2.1 Le compte est créé **à la soumission**, pas à la validation admin

`POST /chef-applications` crée dès l'envoi : utilisateur Clerk sans mot de
passe, ligne `users` en `role: chef`, profil chef `isVerified/isActive: false`,
et envoie un lien de connexion unique valable 7 jours.

`FLOW-01` et les textes actuels du site disent l'inverse : « votre compte est
créé une fois votre dossier validé ». C'est écrit sur `/devenir-chef`, sur la
page d'inscription et dans la section « Nous rejoindre ».

Le choix du backend est défendable — il rend possible le dépôt de pièces et le
suivi du dossier avant décision. Mais il faut trancher, car il change la
promesse faite au candidat.

→ **Question** : on aligne les textes du front sur le comportement backend
(« votre espace est ouvert tout de suite, en lecture seule, le temps de
l'instruction ») ? C'est ce que je recommande. Sinon c'est le backend qui doit
différer la création.

### 2.2 Les pièces ne peuvent plus être déposées pendant la candidature

`CreateChefApplicationDto` **n'a pas de champ `documents`**, et la spéc précise
que la liste des pièces est calculée par l'API. Le dépôt passe par
`POST /me/chef-documents/{type}/upload-url` puis `/confirm`, **qui exigent un
token Clerk**.

Or le stepper actuel fait déposer la pièce d'identité à l'étape « Pièces »,
avant l'envoi, avec aperçu. Le candidat n'a pas encore de session à ce
moment-là.

Trois issues possibles :

1. **Front adapté** : la candidature n'envoie que le JSON ; l'écran de
   confirmation dit « ouvrez le lien reçu par email pour déposer vos pièces »,
   et l'étape « Pièces » devient la liste de ce qui sera demandé. Le moins de
   travail backend, mais on perd des dossiers au passage par la boîte mail.
2. **Backend** : `POST /chef-applications` renvoie un `applicationToken`
   court-lived qui autorise les uploads juste après l'envoi, sans email.
3. **Backend** : `POST /chef-applications` en `multipart/form-data`, comme le
   prévoyait `FLOW-01`.

→ **Question** : laquelle ? Je recommande la 2 : le candidat finit son dossier
dans la foulée, et le lien email reste la porte pour y revenir.

### 2.3 `interventionZones[].cities[].insee` est obligatoire

Côté front, `insee` n'est connu que pour les villes trouvées par la recherche
`geo.api.gouv.fr`. Les villes de référence de nos listes par région (celles que
le client a demandé d'afficher « sous forme de liste ») n'en ont pas.

→ **Question** : soit `insee` devient facultatif quand `name` + `dept` sont
fournis, soit vous exposez `GET /referentials/cities?region=84` et le front
n'affiche plus que des villes du référentiel. La seconde est plus propre et
évite les doublons d'orthographe — mais c'est un endpoint de plus.

### 2.4 `vigilance` dans l'énumération des pièces, absent du front

L'énumération contient `vigilance` (attestation URSSAF), que le formulaire ne
demande pas.

→ **Question** : dans quel cas est-elle demandée ? Si l'API la calcule, le front
doit rendre la liste **retournée par l'API** plutôt que sa liste locale — ce
qui est de toute façon la bonne cible (`requiredDocuments()` ne resterait qu'un
aperçu avant envoi).

### 2.5 L'espace chef est en lecture seule avant approbation

`PATCH /me/chef-profile` répond `403 CHEF_NOT_VERIFIED` tant que la candidature
n'est pas approuvée. L'espace chef actuel laisse éditer vitrine, tarifs,
agenda, recettes dès la connexion.

→ **Question** : confirmé comme voulu ? Si oui je passe l'espace chef en mode
« dossier en cours » : seuls « Mes documents » et le profil de base sont
actionnables, le reste en aperçu désactivé avec l'explication.

### 2.6 Manque pour l'écran admin « dossier »

Au-delà des schémas (1.2) :

- **Journal d'audit** exposé (`GET /admin/chef-applications/{id}/audit`) : qui a
  consulté quelle pièce, qui a décidé quoi et quand. La spéc dit que la
  consultation est journalisée, mais rien ne permet de l'afficher.
- **Filtre par région / zone** dans `GET /admin/chef-applications` (`q` couvre
  nom, email, ville, référence, pas la zone d'intervention).
- **Compteurs par statut** pour les onglets de la file : aujourd'hui il faut une
  requête par statut.
- **Statut dérivé du dossier** : la spéc y fait référence (« derived dossier
  status ») sans donner l'énumération. Il nous faut la liste exacte des valeurs
  et la règle de dérivation, pour ne pas la réinventer côté front.

### 2.7 Pas de reprise de candidature côté front

`POST /me/chef-application/reapply` existe, avec `allowReapplyAfter` et
`REAPPLY_TOO_EARLY`. Aucun écran ne le propose aujourd'hui.

→ À construire dans l'espace chef, une fois le flux tranché (2.1).

---

## 3. Module 2 — l'écart est structurel

Le module catalogue est resté sur **le modèle d'une seule cuisine** :

- `meals` appartient à la plateforme, CRUD réservé à l'admin
  (`/admin/meals`). Aucun champ `chefId`.
- `menu-weeks` est **global** : une semaine ISO, une liste de plats, pour tout
  le monde. `GET /menus/current` renvoie un menu unique (vérifié : un menu de
  démo, semaine 10 de 2099).
- `/admin/formules` est l'ancienne tarification globale.

Le produit tel qu'il est aujourd'hui — et tel que la page `/menu` le montre —
c'est **un menu par batch cooker et par semaine**, avec modération a posteriori
par l'admin. Rien de cela n'existe dans l'API.

Manquent, côté chef :

| Besoin | Endpoint attendu |
|---|---|
| Ses plats à lui | `GET/POST/PATCH/DELETE /me/meals` |
| Son menu de la semaine | `GET/PUT /me/menus?week=YYYY-MM-DD`, publier / dépublier |
| Sa vitrine | `GET/PATCH /me/showcase` |

Côté public :

| Besoin | Endpoint attendu |
|---|---|
| Les cartes de la semaine, chef par chef, filtrables (région, ville, régimes, courses incluses, recherche) | `GET /menus/week` |
| Fiche vitrine d'un chef | `GET /chefs/:id` |
| Carte culinaire du client | `GET /me/culinary-map` |

Côté admin :

| Besoin | Endpoint attendu |
|---|---|
| Modérer le menu ou le plat d'un autre chef, avec motif | `PATCH /admin/menus/:id/status`, `PATCH /admin/meals/:id/status` (`suspended` + motif) |
| File de modération | `GET /admin/menus?status=…&chefId=…` |

Les trois sont détaillés dans `FLOW-02`, §1 à §5, avec les payloads.

### 3.1 Écarts de champs sur `meal`, même dans le modèle actuel

- **`country` est un texte libre** (`"Sénégal"`). La carte culinaire du client a
  besoin d'un code ISO 3166-1 (alpha-2 **et** numérique : le fond de carte
  world-atlas n'indexe que le numérique, et le front ne sait pas convertir).
  `continent` en énumération ne suffit pas.
- **`dietaryTags` et `allergens` sont des tableaux de chaînes libres** (la
  pré-prod contient `["demo"]`). Les filtres de `/menu` et le calcul du régime
  couvert par une carte entière demandent des référentiels fermés
  (`GET /referentials/diets` + `/allergens`, ou des énumérations).
- **Aucun allergène ≠ tableau vide** : il faut une déclaration explicite
  (`allergensNone: true`) pour distinguer « le chef a vérifié, il n'y en a pas »
  de « le chef n'a pas rempli ». C'est un contrôle bloquant à la publication
  dans `FLOW-02` §3.
- **`ingredients` n'est pas typé** (`{type: object}`), et la pré-prod renvoie
  `[{qty: "2", name: "Tomate"}]` : quantité en chaîne, pas d'unité, pas de
  rayon. La liste de courses et le mandat de dépenses ont besoin de
  `{ name, qty: number, unit, aisle }`.
- **`status`** vaut `published | draft | archived` : pas de `suspended`, donc
  pas de modération possible, et pas de champ de motif.
- **`menu-weeks`** n'a ni `PATCH` ni `DELETE` ni publication / dépublication, et
  `POST` répond 200 au lieu de 201.
- Pas de **catalogue public de plats** (`GET /meals`) : la page `/recettes` n'a
  pas de source.

→ **Question de cadrage, la plus importante du lot** : le module plats/menus
est-il prévu en refonte multi-chef, et sur quel horizon ? Tant qu'elle n'est pas
là, `/menu`, `/recettes`, la vitrine chef et la carte culinaire restent sur les
mocks — je ne peux brancher que le module 1.

---

## 4. Ce que je propose de faire, une fois vos réponses

1. Pointer les deux fronts sur la base URL de pré-production (fait, réversible).
2. Brancher le module 1 de bout en bout sur le site batchcooking :
   `GET /referentials/regions` à la place du référentiel en dur, soumission
   réelle, dépôt des pièces selon l'arbitrage 2.2, suivi du dossier.
3. Brancher le dossier côté admin : file d'attente, détail, décision par pièce,
   demande de compléments, approbation, refus, relance d'invitation.
4. Laisser le module 2 sur les mocks et compléter le contrat manquant dans
   `FLOW-02` jusqu'à arbitrage du §3.

Rien n'est branché pour l'instant : cette revue est là pour être confirmée avec
le backend d'abord.
