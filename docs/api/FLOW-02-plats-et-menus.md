# Flux 02 — Plats, menus, publication et modération

> Conventions communes : [`README.md`](README.md).
> Écrans concernés : `/espace-chef/recettes` (chef), `/batchcookers/:id` onglet
> « Menus & recettes » (admin), vitrine publique.

## 1. Le modèle en trois objets

| Objet | Qui le crée | Ce qu'il porte |
|---|---|---|
| **Plat** (`dish`) | le batch cooker | Nom, origine, allergènes, portions, et sa **recette** |
| **Menu** (`menu`) | le batch cooker | Une composition de plats, pour une semaine ou un mois |
| **Proposition Lab's Food** (`suggestion`) | l'équipe Lab's Food | Un menu proposé, qu'un chef peut reprendre à son compte |

La recette appartient au plat. C'est elle qui produit les deux documents remis
au client : la **fiche recette standardisée** et la **liste de courses** de la
prestation. Sans recette, un plat reste affichable en vitrine mais ne génère
aucun document — d'où la distinction entre plat publiable et recette complète
(§ 3.3).

**Séparation public / interne** — la vitrine expose le nom, la description, le
pays, les allergènes, les régimes et les durées. Elle n'expose **jamais** les
ingrédients ni les étapes : c'est le savoir-faire du chef, remis au client
seulement après la prestation, sur la fiche recette.

## 2. Publication directe, contrôle a posteriori

Décision du 20/09/2026 : un plat ou un menu soumis par un batch cooker est
**public immédiatement**. L'admin contrôle ensuite et peut retirer, motif
obligatoire.

```
      chef                          API                        admin
        │                            │                           │
        │ POST /me/dishes            │  status: draft            │
        ├───────────────────────────►│                           │
        │ POST .../publish           │  contrôles automatiques   │
        ├───────────────────────────►│  status: published ───────┤ file « jamais revus »
        │                            │  (visible en vitrine)     │
        │                            │                           │
        │                            │  PATCH .../moderation     │
        │  email + motif             │◄──────────────────────────┤ suspended + motif
        │◄───────────────────────────┤  retiré de la vitrine     │
        │                            │                           │
        │ correction puis publish    │  status: published        │
        ├───────────────────────────►│                           │
```

Ce choix fait porter le risque sur les **contrôles automatiques** : ils sont la
seule barrière avant la mise en ligne. Ils sont donc bloquants (§ 3.3).

### États

| État | Visible en vitrine | Qui le pose |
|---|---|---|
| `draft` | non | le chef (création, ou dépublication volontaire) |
| `published` | oui | le chef, si les contrôles automatiques passent |
| `suspended` | non | l'admin, motif obligatoire |

Transitions autorisées : `draft → published` (chef), `published → draft`
(chef), `published → suspended` (admin), `suspended → published` (chef après
correction, **ou** admin qui lève la sanction).

Un contenu `suspended` corrigé et republié par le chef repart en `published` et
retourne en tête de la file de revue admin, marqué « republié après retrait ».

## 3. Côté batch cooker

### 3.1 Créer un plat — `POST /me/dishes`

```json
{
  "name": "Poulet rôti aux herbes",
  "description": "Poulet fermier rôti, thym et romarin, pommes de terre grenaille.",
  "country": "FR",
  "category": "plat",
  "portions": 3,
  "prepMinutes": 20,
  "cookMinutes": 55,
  "difficulty": "facile",
  "diets": ["sans-lactose"],
  "customDiets": [],
  "allergens": ["celery"],
  "customAllergens": ["sarrasin"],
  "recipe": {
    "ingredients": [
      { "name": "Poulet fermier entier", "qty": 1.4, "unit": "kg", "aisle": "boucherie" },
      { "name": "Pommes de terre grenaille", "qty": 800, "unit": "g", "aisle": "fruits-legumes" },
      { "name": "Ail", "qty": 4, "unit": "gousse", "aisle": "fruits-legumes" },
      { "name": "Beurre doux", "qty": 30, "unit": "g", "aisle": "cremerie" }
    ],
    "steps": [
      "Préchauffer le four à 200 °C.",
      "Glisser le beurre, l'ail écrasé et les herbes sous la peau du poulet.",
      "Enfourner 55 min en arrosant deux fois avec le jus."
    ],
    "reheating": { "mode": "oven", "temperature": 160, "minutes": 15, "note": "Couvrir d'un papier cuisson." },
    "storage": { "method": "fridge", "days": 3, "container": "Boîte hermétique" }
  }
}
```

**`customDiets` et `customAllergens`** viennent du bouton « Autre » des écrans
plats : le chef ajoute une valeur hors référentiel. Elles sont stockées comme
texte libre, remontées telles quelles en vitrine, et **signalées à l'admin**
dans la file de revue : une valeur libre qui revient souvent doit rejoindre le
référentiel officiel.

Les 14 allergènes réglementaires restent une énumération fermée dans
`allergens` : on ne laisse pas saisir « gluten » en texte libre à côté de
l'entrée officielle.

Réponse `201` : le plat créé, `status: "draft"`.

### 3.2 Modifier — `PATCH /me/dishes/:id`

Corps partiel, mêmes règles. Modifier un plat `published` **ne le dépublie
pas** ; en revanche, toute modification touchant les allergènes, les régimes ou
le pays le remet dans la file de revue admin avec le drapeau « modifié après
publication ». Les corrections de confort (description, durées) ne réveillent
pas la file.

### 3.3 Publier — `POST /me/dishes/:id/publish`

Contrôles automatiques, tous bloquants :

| Contrôle | Erreur si absent |
|---|---|
| `name` non vide | `VALIDATION_FAILED` |
| `country` renseigné (alimente la carte culinaire du client) | `VALIDATION_FAILED` |
| `portions ≥ 1` | `VALIDATION_FAILED` |
| **Déclaration d'allergènes explicite** : `allergens` non vide **ou** `allergensNone: true` | `ALLERGENS_REQUIRED` |
| Le chef a un dossier `validated` et `isVerified = true` | `CHEF_NOT_VERIFIED` |

Le quatrième point mérite un mot : tant qu'on ne distingue pas « aucun
allergène » d'« allergènes non renseignés », un tableau vide est ambigu. D'où le
booléen explicite `allergensNone`, que le front matérialise par une case « Ce
plat ne contient aucun des 14 allergènes ». Sans ce garde-fou, la publication
directe met en ligne des plats sans information d'allergènes.

La recette n'est **pas** exigée pour publier : un plat peut apparaître en
vitrine avant que sa fiche soit écrite. `recipeComplete` (calculé : au moins un
ingrédient et une étape) est exposé pour que le front affiche l'avertissement.

### 3.4 Menus

`POST /me/menus`, `PATCH /me/menus/:id`, `POST /me/menus/:id/publish`.

```json
{
  "title": "Semaine méditerranéenne",
  "period": "week",
  "dishIds": ["d_8f21...", "d_44ac...", "d_90bb..."]
}
```

Contrôles à la publication : titre non vide, au moins un plat, **et tous les
plats sont `published`**. Un menu ne peut pas exposer un plat en brouillon ou
suspendu. Si un plat du menu est suspendu par un admin, le menu reste en ligne
mais ce plat n'apparaît plus, et le chef est prévenu.

### 3.5 Vitrine du mois

L'écran « Vitrine du mois » assigne un menu à chaque semaine du mois.

`PUT /me/showcase/weeks`

```json
{
  "assignments": [
    { "weekStart": "2026-09-28", "menuId": "m_31fa..." },
    { "weekStart": "2026-10-05", "menuId": "m_77cd..." },
    { "weekStart": "2026-10-12", "menuId": null }
  ]
}
```

`weekStart` est toujours un lundi (`YYYY-MM-DD`). `menuId: null` signifie
« aucun menu cette semaine » : la vitrine n'affiche alors que les plats publiés.
`GET /chefs/:id/showcase?from=2026-09-01&to=2026-10-31` sert la vitrine
publique.

## 4. Côté admin

### 4.1 File de revue

`GET /admin/dishes?review=pending&sort=publishedAt:asc`

Le paramètre `review=pending` retourne les contenus publiés que personne n'a
encore examinés, plus ceux modifiés depuis leur dernière revue. C'est la
contrepartie de la publication directe : sans cette file, le contrôle a
posteriori n'existe pas.

```json
{
  "items": [
    {
      "id": "d_8f21...",
      "type": "dish",
      "name": "Poulet rôti aux herbes",
      "chef": { "id": "9a77...", "displayName": "Marie Dupont" },
      "status": "published",
      "publishedAt": "2026-09-20T14:02:11.000Z",
      "reviewState": "never-reviewed",
      "flags": ["custom-allergen"],
      "customAllergens": ["sarrasin"]
    }
  ],
  "page": 1, "perPage": 25, "total": 12
}
```

`flags` attire l'œil sur ce qui mérite un regard : `custom-allergen`,
`custom-diet`, `no-allergens-declared`, `edited-after-review`,
`republished-after-suspension`.

### 4.2 Marquer comme revu — `POST /admin/dishes/:id/review`

```json
{ "outcome": "ok", "note": "Allergène libre « sarrasin » légitime." }
```

Sort le contenu de la file sans rien changer pour le chef. C'est l'action la
plus fréquente : elle doit être à un clic.

### 4.3 Retirer un contenu — `PATCH /admin/dishes/:id/moderation`

```json
{
  "status": "suspended",
  "reason": "Les allergènes ne mentionnent pas le lait, alors que la recette contient du beurre et du parmesan. Merci de compléter la déclaration avant de republier.",
  "reasonCode": "allergens-incomplete",
  "notifyChef": true
}
```

`reason` obligatoire, 15 à 500 caractères, sinon `422 REASON_REQUIRED`. Il est
affiché tel quel au batch cooker sur la carte du plat, comme aujourd'hui pour
les pièces refusées. `reasonCode` : `allergens-incomplete`,
`inappropriate-content`, `copyright`, `misleading-origin`, `duplicate`,
`quality`, `other`.

Effets : retrait immédiat de la vitrine, retrait des menus qui le contiennent,
email au chef, ligne au journal d'audit. Les prestations déjà réservées avec ce
plat ne sont pas touchées : on ne modifie pas une commande en cours.

Même endpoint pour les menus : `PATCH /admin/menus/:id/moderation`.

**Lever une suspension** : `{ "status": "published", "reason": "..." }` par
l'admin, ou republication par le chef après correction.

### 4.4 Ce que l'admin voit d'un chef

`GET /admin/chefs/:id/dishes` et `GET /admin/chefs/:id/menus` alimentent
l'onglet « Menus & recettes » de la fiche batch cooker : l'admin consulte, y
compris la recette complète (contrairement à la vitrine publique), et agit sur
le statut. C'est ce que fait déjà l'écran admin avec des données simulées.

## 5. Vitrine publique

La page `/menu` du site ne présente plus un catalogue de plats anonyme : elle
liste **les cartes de la semaine, chef par chef**. C'est l'endpoint le plus
visible de ce flux, et le seul sans authentification.

### 5.1 `GET /menus/week` — public

Paramètres, tous facultatifs :

| Paramètre | Valeur | Effet |
|---|---|---|
| `week` | `YYYY-MM-DD` | Semaine demandée ; à défaut, la semaine en cours (lundi → dimanche) |
| `region` | code INSEE (`93`) | Ne garde que les chefs dont la zone couvre cette région |
| `city` | code INSEE commune | Plus fin que la région : la commune doit être couverte |
| `diets` | `vegetarian,gluten-free` | Le régime doit être couvert par **toute** la carte, pas par un seul plat |
| `shoppingIncluded` | `true` | Ne garde que les chefs qui proposent de faire les courses |
| `q` | texte libre | Cherche dans le nom du chef, la ville, le titre du menu et les noms de plats |

Réponse `200` :

```json
{
  "week": { "start": "2026-09-21", "end": "2026-09-27" },
  "items": [
    {
      "menuId": "m_31fa...",
      "chef": {
        "id": "9a77...",
        "displayName": "Ivy Siyaptze",
        "avatarUrl": "https://cdn.labsfood.fr/chefs/9a77.jpg",
        "city": "Nice",
        "regionCode": "93",
        "rating": 4.9,
        "reviewCount": 28,
        "sessionsDone": 30,
        "languages": ["fr", "en"],
        "badges": ["haccp", "insured"],
        "newcomer": false
      },
      "title": "Tour du monde en sept plats",
      "pitch": "Une semaine qui voyage : Vietnam, Sénégal, Tunisie, puis retour en Provence.",
      "coveredDiets": ["gluten-free"],
      "shoppingIncluded": true,
      "sessionFromCents": 15000,
      "afterTaxCreditCents": 7500,
      "slotsLeft": 2,
      "dishes": [
        {
          "id": "d_8f21...",
          "name": "Pho Bo",
          "country": "VN",
          "imageUrl": "https://cdn.labsfood.fr/dishes/d_8f21.jpg",
          "portions": 4,
          "diets": ["lactose-free"],
          "allergens": ["gluten", "soy"]
        }
      ]
    }
  ],
  "page": 1, "perPage": 12, "total": 4
}
```

Trois points qui découlent directement de l'écran :

- **`coveredDiets` est calculé par l'API**, pas par le front : c'est
  l'intersection des régimes de tous les plats du menu. Un menu « sans gluten »
  n'a de sens que si **chaque** plat l'est ; c'est aussi ce qui rend le filtre
  `diets` honnête.
- **`slotsLeft`** vient des créneaux de travail encore libres du chef sur la
  semaine (cf. agenda). Sans lui, la page ne peut pas dire « 2 créneaux
  libres », qui est le déclencheur de réservation.
- **`sessionFromCents`** est le prix **client** (net du chef + commission), pas
  le net : c'est le seul montant qu'un visiteur non connecté doit voir.
  `afterTaxCreditCents` évite que le front recalcule le crédit d'impôt.

Seuls les menus `published` d'un chef `isVerified` **et** `isActive` sortent
ici. La recette n'est jamais incluse : ni ingrédients, ni étapes (§ 8).

### 5.2 `GET /chefs/:id` — public

Fiche vitrine d'un chef : profil, badges dérivés des pièces validées, langues,
moyens de paiement acceptés, zones couvertes, plats publiés, avis. Même règle :
aucun contenu `draft` ou `suspended`, aucune recette.

### 5.3 Carte culinaire du client — `GET /me/culinary-map`

Le pays d'origine exigé sur chaque plat (§ 3.3) alimente la carte de l'accueil
client : un pays se colore dès qu'un de ses plats a été livré.

```json
{
  "total": 195,
  "explored": [
    {
      "iso3166Numeric": "250",
      "code": "FR",
      "name": "France",
      "firstTastedAt": "2026-05-24T00:00:00.000Z",
      "dishes": ["Poulet rôti aux herbes", "Bœuf bourguignon"]
    }
  ]
}
```

`iso3166Numeric` est la clé attendue par le fond de carte (world-atlas) ; le
front ne sait pas convertir un `FR` en `250`, l'API doit donc fournir les deux.
Seules les prestations **réalisées** comptent : une session annulée ne colore
aucun pays.

## 6. Propositions Lab's Food

Remplace l'ancien vocabulaire « proposées par l'IA ». Règle intangible : **rien
n'est imposé au batch cooker**, et son choix est tracé.

| Action | Endpoint | Notes |
|---|---|---|
| Lister les propositions | `GET /me/suggestions` | Aperçu seulement : nom, pays, durées, allergènes. Ni ingrédients ni étapes. |
| Reprendre une proposition | `POST /me/suggestions/:id/adopt` | Corps : `{ "consent": true }`. Sans consentement explicite, `422`. |
| Administrer le catalogue | `POST /admin/suggestions`, `PATCH /admin/suggestions/:id` | Réservé à l'équipe Lab's Food. |

`adopt` copie la proposition dans les plats du chef **en `draft`**, avec
`origin: "labs-food"`, et enregistre la preuve de consentement (qui, quand,
quelle version). Le chef reste libre de la modifier et de la retirer : c'est ce
qui distingue une proposition d'une imposition, et c'est ce que le journal doit
pouvoir démontrer.

## 7. Documents générés par la recette

### Fiche recette

`GET /chef-missions/:missionId/dishes/:dishId/recipe-sheet?portions=4`

Rend les données de la fiche standardisée : en-tête Lab's Food, plat,
allergènes, ingrédients **mis à l'échelle** des portions demandées, étapes,
réchauffage, conservation. Le rendu (HTML/PDF) est fait par le front ; si un PDF
serveur est souhaité plus tard, le même endpoint peut servir avec
`Accept: application/pdf`.

### Liste de courses

`GET /chef-missions/:missionId/shopping-list`

Agrège les recettes des plats de la prestation, met à l'échelle du foyer,
dédoublonne par (ingrédient, unité), groupe par rayon :

```json
{
  "missionId": "msn_001",
  "persons": 3,
  "groups": [
    {
      "aisle": "fruits-legumes",
      "lines": [
        { "name": "Ail", "qty": 4, "unit": "gousse", "edited": false },
        { "name": "Pommes de terre grenaille", "qty": 800, "unit": "g", "edited": false }
      ]
    },
    {
      "aisle": "boucherie",
      "lines": [{ "name": "Poulet fermier entier", "qty": 1.4, "unit": "kg", "edited": false }]
    }
  ],
  "generatedAt": "2026-09-20T15:41:02.000Z"
}
```

Le batch cooker la corrige (`PUT /chef-missions/:id/shopping-list`) : les lignes
modifiées portent `edited: true` et **survivent au recalcul**. Un
`POST .../shopping-list/reset` revient à la liste issue des recettes.

## 8. Règles d'accès

| Ressource | Chef propriétaire | Autre chef | Admin | Public |
|---|---|---|---|---|
| Plat, champs vitrine | lecture, écriture | lecture si publié | tout | lecture si publié |
| Plat, recette | lecture, écriture | aucun accès | lecture | aucun accès |
| Menu | lecture, écriture | lecture si publié | tout | lecture si publié |
| Statut de modération | lecture | aucun | écriture | aucun |
| Liste de courses d'une prestation | lecture, écriture | aucun | lecture | client concerné seulement |

Toute écriture sur un plat dont le chef n'est pas propriétaire renvoie
`403 CONTENT_NOT_OWNED`, y compris pour un autre chef authentifié.

## 9. Questions ouvertes

1. **Photos des plats** — aucun écran n'en gère aujourd'hui, mais une vitrine
   sans image se vendra mal. Même flux pré-signé que les pièces KYC, avec
   modération a posteriori ?
2. **Versionnage des recettes** — quand un chef modifie une recette déjà remise
   à des clients, la fiche déjà envoyée doit-elle rester figée ? Position
   recommandée : oui, la fiche est datée et attachée à la prestation.
3. **Plats hors catalogue** — les prestations acceptent aujourd'hui des plats
   saisis librement, sans fiche ni liste de courses. Les tolère-t-on
   durablement, ou impose-t-on le passage par le catalogue ?
4. **Doublons entre chefs** — deux batch cookers peuvent publier « Poulet rôti
   aux herbes ». Acceptable, ou dédoublonnage côté recherche ?
5. **Délai de revue** — quel délai vise-t-on entre publication et premier regard
   admin ? Cela dimensionne la file et l'équipe.
6. **Tri de la vitrine publique** — dans quel ordre listons-nous les chefs d'une
   même région ? Note, proximité, créneaux restants, rotation équitable ? Ce
   choix décide de qui reçoit les demandes, il n'est pas neutre.
7. **Semaine sans menu** — que montre la page quand un chef n'a rien publié pour
   la semaine : ses plats publiés seuls, ou rien du tout ?
