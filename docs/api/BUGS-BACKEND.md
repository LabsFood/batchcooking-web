# Bugs et manques à traiter côté backend

Cible testée : `https://lf-backend-lf-backend-pr-37.up.railway.app` (PR 37),
le 28/09/2026. Périmètre : candidature batch cooker + plats/menus.

Chaque point dit ce qui se passe, comment le reproduire, et ce qu'on attend.
Les commandes se collent telles quelles dans un terminal.

Légende : **P1** bloque le branchement du front · **P2** à corriger avant la
mise en prod · **P3** confort / cohérence.

---

## BUG-01 · P1 — Le CORS n'autorise pas `PATCH` ni `DELETE`

**Ce qui se passe.** Le préflight ne renvoie que trois méthodes.

```bash
curl -i -X OPTIONS \
  -H "Origin: http://localhost:3005" \
  -H "Access-Control-Request-Method: PATCH" \
  https://lf-backend-lf-backend-pr-37.up.railway.app/chef-applications
```

Réponse : `204`, avec `access-control-allow-methods: GET,HEAD,POST`.

**Pourquoi ça bloque.** Le site batchcooking appelle l'API directement depuis le
navigateur. Le navigateur voit que `PATCH` n'est pas dans la liste et **annule
la requête avant de l'envoyer**. Sont donc inutilisables depuis le front :

- `PATCH /me/profile`, `PATCH /me/chef-profile`
- `PATCH /admin/chef-applications/{id}/documents/{type}` — c'est le bouton
  « valider / refuser une pièce » de l'admin
- `PATCH /admin/meals/{id}`, `DELETE /admin/meals/{id}`
- `PATCH /admin/chefs/{id}/verification`

**Ce qu'on attend.** Ajouter `PATCH, PUT, DELETE` (et `OPTIONS`) à
`Access-Control-Allow-Methods`. La liste blanche d'origines, elle, est correcte :
`localhost:3005` et `localhost:8035` passent, une origine inconnue est rejetée.
Ne touchez pas à ça.

---

## BUG-02 · P1 — Aucune réponse 2xx n'a de schéma sur nos deux modules

**Ce qui se passe.** Dans `/openapi.json`, les réponses de succès n'ont qu'une
phrase de description, pas de `content` / `schema`. Concerné :

| Endpoint |
|---|
| `POST /chef-applications` (201) |
| `GET /me/chef-application` |
| `POST /me/chef-application/reapply` |
| `GET /me/chef-documents` |
| `POST /me/chef-documents/{type}/upload-url` |
| `GET /me/chef-documents/{type}/versions` |
| `GET /admin/chef-applications` |
| `GET /admin/chef-applications/{id}` |
| `GET /admin/chef-applications/{id}/documents/{type}/download-url` |
| `GET /admin/menu-weeks`, `POST /admin/menu-weeks` |
| `GET /menus/current` |
| `GET /referentials/regions` |

Les DTO d'**entrée** sont tous là et bien faits. Ce sont seulement les sorties
qui manquent.

**Pourquoi ça bloque.** On ne peut pas générer un client typé, et surtout on ne
connaît pas la forme de ce que vous renvoyez. Trois exemples concrets de ce
qu'on ne peut pas coder aujourd'hui :

- la file d'attente admin : la doc mentionne `waitingSinceHours` et un compte de
  pièces en attente, mais on ne sait pas comment ils s'appellent ni où ils sont
  dans l'objet ;
- le **statut dérivé du dossier** : la doc parle de « derived dossier status »
  sans donner la liste des valeurs possibles. Si on la devine, on se plante ;
- la réponse de `upload-url` : on ne sait pas si l'URL pré-signée s'appelle
  `url` ou `uploadUrl`, ni si vous renvoyez des champs de formulaire à joindre
  (cas S3 POST policy), ni le nom du `uploadId` à renvoyer au `confirm`.

**Ce qu'on attend.** Un `@ApiOkResponse({ type: XxxResponseDto })` sur chacun.
Dans l'ordre d'urgence pour nous : `upload-url`, `GET /me/chef-documents`,
`GET /admin/chef-applications`, `GET /admin/chef-applications/{id}`,
`GET /me/chef-application`.

---

## BUG-03 · P2 — Les champs nullables sont typés `object` au lieu de leur vrai type

**Ce qui se passe.** Dans la spéc, ces champs sortent en
`{"type": "object", "nullable": true}` alors que ce sont des chaînes, des
nombres ou un objet précis :

`address.line2`, `company.siret`, `company.sap.declarationNumber`,
`workAuthorization.details`, `meal.country`, `meal.calories`,
`chefProfile.bio`, `chefProfile.city`, `user.fullName`, `user.phone`,
`me.chefProfile`.

**La cause, très probablement.** Un `@ApiProperty({ nullable: true })` sans
`type`. Quand la propriété est optionnelle et nullable, NestJS ne devine plus
le type et retombe sur `object`.

```ts
// aujourd'hui
@ApiProperty({ nullable: true, description: '...' })
siret!: string | null;

// attendu
@ApiProperty({ type: String, nullable: true, description: '...' })
siret!: string | null;
```

Pour `me.chefProfile`, il faut `type: () => ChefProfileSummaryDto` plutôt qu'un
`example` en dur.

**Pourquoi ça compte.** Un générateur de client produit `line2: object`, ce qui
casse à la compilation côté TypeScript. C'est dix minutes de correction chez
vous contre du code jetable chez nous.

---

## BUG-04 · P1 — Les erreurs de validation ne sont pas exploitables par le formulaire

**Ce qui se passe.**

```bash
curl -s -X POST -H "Content-Type: application/json" -d '{}' \
  https://lf-backend-lf-backend-pr-37.up.railway.app/chef-applications
```

Réponse réelle :

```json
{ "message": ["At least one intervention zone is required.",
              "interventionZones must be an array"],
  "error": "Bad Request", "statusCode": 400 }
```

Deux problèmes séparés :

1. **Le code HTTP ne correspond pas à votre propre doc.** La spéc de cet
   endpoint annonce `422 VALIDATION_FAILED`. On reçoit `400 Bad Request`.
   Tranchez l'un ou l'autre, mais que la doc dise vrai.
2. **On ne sait pas sur quel champ replacer l'erreur.** Le formulaire de
   candidature a 6 étapes. Avec un tableau de phrases en anglais, on ne peut ni
   ramener l'utilisateur à la bonne étape, ni afficher le message sous le bon
   champ. Aujourd'hui on ne pourrait afficher qu'un « erreur de validation »
   générique, ce qui est inutilisable pour le candidat.

**Ce qu'on attend.** Le nom du champ, en notation pointée, séparé du message :

```json
{ "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "fields": [
    { "path": "company.siret", "code": "INVALID_LUHN",
      "message": "Ce SIRET n'est pas valide." },
    { "path": "interventionZones", "code": "REQUIRED",
      "message": "Au moins une zone d'intervention est requise." }
  ] }
```

Les messages en français sont un plus (on les affiche tels quels), mais le
`path` est le strict minimum. On garde notre validation zod côté front : c'est
seulement le refus serveur qu'on doit pouvoir replacer.

---

## BUG-05 · P1 — `GET /menus/current` ne renvoie pas la semaine en cours

**Ce qui se passe.** Nous sommes le **28/09/2026, semaine ISO 40 de 2026**.
L'endpoint renvoie un menu de **semaine 10 de l'année 2099**.

```bash
curl -s https://lf-backend-lf-backend-pr-37.up.railway.app/menus/current
```

```json
{ "menuWeek": { "weekNumber": 10, "year": 2099,
                "publishedAt": "2026-06-02T17:21:49.541Z",
                "meals": [ { "meal": { "name": "[demo] Meal 10", ... } } ] },
  "meals": [ { "name": "[demo] Meal 10", ... } ] }
```

La description dit « the menu published for the current calendar week ». La
requête a l'air de prendre **n'importe quel menu publié** (le dernier créé,
ou le premier trouvé), sans filtrer sur l'année et la semaine ISO du jour.

**Ce qu'on attend.** Filtrer sur l'année et la semaine ISO courantes. Et dire
explicitement ce qui se passe **quand aucun menu n'est publié pour la semaine**
— un `404`, ou un `200` avec `menuWeek: null` : il faut choisir, parce que le
front doit afficher quelque chose dans ce cas, et un menu de 2099 n'est pas une
réponse acceptable en production.

Deux remarques au passage :

- les plats sont renvoyés **deux fois** : dans `menuWeek.meals[].meal` et dans
  `meals[]` à la racine. Si c'est voulu, dites lequel est la référence ; sinon
  c'est du poids inutile sur une page publique.
- si les données de démo (`[demo] Meal 10`, année 2099) doivent rester en
  pré-prod, prévoyez au moins un menu sur la semaine réelle, sinon on ne peut
  pas tester l'écran.

---

## BUG-06 · P2 — `cities[].insee` est obligatoire mais on ne peut pas toujours le fournir

**Ce qui se passe.** `InterventionCityDto` exige `name`, `dept` **et** `insee`.

Côté front, le candidat choisit ses villes de deux façons :

- dans la liste de villes de référence affichée par région (demande explicite du
  client : « toutes les régions et toutes les villes doivent apparaître sous
  forme de liste ») → on a le nom et le département, **pas le code INSEE** ;
- par la recherche (`geo.api.gouv.fr`) → là on a le code INSEE.

Une candidature qui sélectionne une ville de la liste part donc en `400`.

**Ce qu'on attend, au choix.**

1. `insee` facultatif quand `name` + `dept` sont fournis — le plus rapide ;
2. ou vous exposez `GET /referentials/cities?region=84`, et le front n'affiche
   plus que des villes venant de chez vous. Plus propre (plus de doublons
   d'orthographe, « Saint-Étienne » vs « St-Etienne »), mais c'est un endpoint
   de plus à écrire.

Dites-nous laquelle et on s'aligne.

---

## BUG-07 · P2 — Le dépôt des pièces est impossible au moment de la candidature

**Ce qui se passe.** `CreateChefApplicationDto` n'a pas de champ `documents`, et
les seules routes d'upload (`POST /me/chef-documents/{type}/upload-url` puis
`/confirm`) **exigent un token Clerk**. Or au moment où il remplit le
formulaire, le candidat n'a pas encore de session : son compte vient d'être créé
par le POST, et son lien de connexion part par email.

Le formulaire actuel fait déposer la pièce d'identité pendant la candidature,
avec aperçu du fichier. Ce parcours ne peut pas fonctionner en l'état.

**Ce qu'on propose.** Que `POST /chef-applications` renvoie un
`applicationToken` à courte durée de vie (15 à 30 minutes, valable uniquement
pour les routes d'upload de cette candidature). Le candidat finit son dossier
dans la foulée, et le lien email reste la porte pour y revenir plus tard.

Sinon, dites-le et on déplace le dépôt des pièces après la première connexion —
mais on perdra des dossiers au passage par la boîte mail, et il faut que le
client valide ce choix.

**Question liée :** est-ce que le `ValidationPipe` est en
`forbidNonWhitelisted` ? Autrement dit, si le front envoie un champ en trop
(notre payload actuel contient encore une clé `documents`), est-ce que vous
répondez `400` ou est-ce que vous l'ignorez ? Ça change ce qu'on doit nettoyer
côté front.

---

## BUG-08 · P3 — `POST` qui répond `200` au lieu de `201`

`POST /admin/meals` et `POST /admin/menu-weeks` sont documentés en `200`, alors
qu'ils créent une ressource. `POST /chef-applications` et `POST /admin/users`,
eux, sont bien en `201`. À harmoniser — ou au moins que la doc dise ce que le
code fait vraiment, parce qu'on teste le code de retour.

---

## Manques fonctionnels (pas des bugs, mais bloquants pour les écrans)

### MANQUE-01 · P1 — Le journal d'audit n'est pas exposé

La doc dit que chaque consultation d'une pièce d'identité est écrite au journal
avant de livrer l'URL signée. Très bien — mais aucun endpoint ne permet de le
lire. L'écran admin doit pouvoir afficher qui a consulté quoi et qui a décidé
quoi, sinon le journal ne sert qu'en cas de litige.

→ `GET /admin/chef-applications/{id}/audit` : date, acteur, action, pièce, motif.

### MANQUE-02 · P2 — Filtres et compteurs de la file d'attente admin

`GET /admin/chef-applications` accepte `status`, `hasPendingDocuments`, `q`.
Il manque :

- un filtre par **zone d'intervention** (`q` couvre nom, email, ville et
  référence, mais pas les régions demandées par le candidat) ;
- les **compteurs par statut**, pour afficher les onglets de la file sans lancer
  une requête par statut.

### MANQUE-03 · P1 — Tout le modèle multi-chef des plats et menus

C'est le plus gros point, et il ne se règle pas par un correctif.

Aujourd'hui le catalogue est celui d'**une seule cuisine** : `meals` appartient à
la plateforme, le CRUD est réservé à l'admin, il n'y a **aucun `chefId`**, et
`menu-weeks` est global (une semaine ISO → une liste de plats, la même pour tout
le monde).

Le produit, tel que la page `/menu` le montre déjà, c'est **un menu par batch
cooker et par semaine**, avec modération par l'admin après publication. Il
manque donc :

| Côté | Endpoint attendu |
|---|---|
| Chef | `GET/POST/PATCH/DELETE /me/meals` — ses plats à lui |
| Chef | `GET/PUT /me/menus?week=YYYY-MM-DD` + publier / dépublier |
| Public | `GET /menus/week` — les cartes de la semaine, chef par chef, filtrables (région, ville, régimes, courses incluses, recherche) |
| Public | `GET /chefs/:id` — fiche vitrine |
| Public | `GET /meals` — catalogue public (la page `/recettes` n'a aucune source) |
| Client | `GET /me/culinary-map` — les pays déjà goûtés |
| Admin | `PATCH /admin/menus/:id/status` et `PATCH /admin/meals/:id/status` avec motif, pour modérer le contenu d'un autre chef |
| Admin | `GET /admin/menus?status=…&chefId=…` — file de modération |

Les payloads attendus sont détaillés dans `docs/api/FLOW-02-plats-et-menus.md`,
§1 à §5.

### MANQUE-04 · P2 — Le modèle `meal` n'a pas de quoi alimenter les écrans

Même sans la refonte multi-chef, il manque des choses sur le plat :

- **`country` est un texte libre** (`"Sénégal"`). La carte culinaire du client
  colore un fond de carte qui n'indexe les pays que par leur **code ISO 3166-1
  numérique** (`250` pour la France). Le front ne sait pas convertir un nom de
  pays en code. Il faut `countryIso2` **et** `countryIsoNumeric` sur le plat.
- **`dietaryTags` et `allergens` sont des tableaux de chaînes libres** — la
  pré-prod contient `["demo"]`. On filtre `/menu` par régime et on calcule le
  régime couvert par une carte entière : il faut des listes fermées, via une
  énumération ou un `GET /referentials/diets` + `/allergens`.
- **Un tableau d'allergènes vide est ambigu.** « Le chef a vérifié, il n'y en a
  pas » et « le chef n'a rien rempli » donnent aujourd'hui la même valeur. Sur
  un sujet allergène c'est un vrai risque : il faut un booléen explicite
  (`allergensNone: true`) et refuser la publication tant que ni l'un ni l'autre
  n'est renseigné.
- **`ingredients` n'est pas typé** (`{"type": "object"}`) et la pré-prod renvoie
  `[{"qty": "2", "name": "Tomate"}]` : quantité en chaîne, pas d'unité, pas de
  rayon. La liste de courses et le mandat de dépenses ont besoin de
  `{ name, qty: number, unit, aisle }`.
- **`status`** vaut `published | draft | archived` : pas de `suspended` et pas de
  champ de motif, donc pas de modération possible.
- **`menu-weeks`** n'a ni `PATCH`, ni `DELETE`, ni publication / dépublication.

---

## Résumé pour se répartir le travail

| # | Sujet | Priorité | Chez qui |
|---|---|---|---|
| BUG-01 | CORS sans `PATCH`/`DELETE` | P1 | backend |
| BUG-02 | Schémas de réponse absents | P1 | backend |
| BUG-04 | Erreurs de validation sans champ, 400 vs 422 | P1 | backend |
| BUG-05 | `/menus/current` renvoie la semaine 10 de 2099 | P1 | backend |
| BUG-07 | Upload impossible pendant la candidature | P2 | décision commune |
| BUG-06 | `insee` obligatoire | P2 | décision commune |
| BUG-03 | Champs nullables typés `object` | P2 | backend |
| BUG-08 | `POST` en 200 | P3 | backend |
| MANQUE-01 | Journal d'audit non exposé | P1 | backend |
| MANQUE-03 | Modèle multi-chef plats/menus | P1 | cadrage produit |
| MANQUE-04 | Champs manquants sur `meal` | P2 | backend |
| MANQUE-02 | Filtres et compteurs de la file admin | P2 | backend |

Les trois questions qui nous bloquent le plus, et qui demandent une réponse
avant du code : BUG-07 (où déposer les pièces), BUG-06 (`insee`), MANQUE-03
(le multi-chef, et à quel horizon).

Deux points de comportement qui ne sont pas des bugs mais qu'il faut confirmer,
parce qu'ils changent les textes du site :

- `POST /chef-applications` crée le compte **dès la soumission** et envoie un
  lien de connexion. Nos pages disent « votre compte est créé une fois votre
  dossier validé ». On aligne les textes sur votre comportement ?
- `PATCH /me/chef-profile` répond `403 CHEF_NOT_VERIFIED` avant approbation.
  Confirmé voulu ? Si oui on passe l'espace chef en mode « dossier en cours »,
  où seuls les documents et le profil de base sont modifiables.

---

## BUG-09 · P1 — Le lien de connexion n'arrive pas, et le recours est hors d'atteinte

**Ce qui se passe.** La candidature `APP-2026-0002` a bien été créée (`201`,
`status: submitted`) le 03/10/2026, mais **aucun email n'est arrivé** à
l'adresse soumise.

Votre propre documentation nomme ce cas sur
`POST /admin/chef-users/{id}/resend-invitation` :

> `delivered: false` means the email did not leave (email service down or not
> configured)

C'est l'hypothèse la plus probable sur la pré-production : le service d'envoi
n'est pas configuré. **À confirmer de votre côté** — personne d'autre ne peut
le voir, puisque rien dans la réponse de `POST /chef-applications` n'indique si
l'email est parti.

→ **Demande** : que `POST /chef-applications` renvoie l'état de l'envoi, comme
le fait `resend-invitation` (`delivered: true | false`). Sans ça, un candidat
qui ne reçoit rien est invisible : ni lui ni l'admin ne savent que son compte
existe et l'attend.

**Et le recours ne marche pas non plus.** `resend-invitation` attend le
`user.id` — « *The account id (`user.id` in the approval answer, or `GET /me`)*
». Or **aucun endpoint admin ne renvoie cet identifiant** avant l'approbation :

- `GET /admin/chef-applications` : ni `userId`, ni `chefProfileId`
- `GET /admin/chef-applications/{id}` : `chefProfileId` seulement

Un admin qui voit un dossier bloqué parce que le candidat n'a jamais reçu son
lien n'a donc **aucun moyen de le relancer**, alors que l'endpoint existe. Le
seul chemin passe par l'approbation, qui est justement impossible tant que le
candidat n'a pas déposé ses pièces — et il ne peut pas les déposer sans le
lien. La boucle est fermée.

→ **Demande** : exposer `userId` sur la candidature (liste et détail). Un champ,
et le bouton « renvoyer l'invitation » devient implémentable.
