# Ce qui manque à l'API

Relevé du 24/10/2026 contre `https://lf-api-develop.up.railway.app/openapi.json`
— v1.3.0, 195 chemins.

Livré depuis le 21/10, vérifié : statuts SAP sur `GET /admin/chefs/{id}`,
`PATCH /admin/chefs/{id}/zones`, `languages` + `GET /referentials/languages`.

| # | Route | Problème | Type |
|---|---|---|---|
| 1 | `GET /me/profile` · `PATCH /me/profile` | 5 champs écrits, jamais rendus | **Bloquant** |
| 2 | `GET /admin/clients/{id}` · `GET /admin/clients` | les mêmes 5 champs, + `avatarUrl` | **Bloquant** |
| 3 | `GET /admin/clients/{id}` | `200` corps vide sur id inconnu, au lieu de `404` | Haute |
| 4 | `PATCH /me/profile` | pas de préférences de notification | Basse |
| 5 | — | pas d'avis, pas de litiges | Décision |

---

## 1. `ClientProfileDto` — 5 champs acceptés en écriture, rendus par aucune lecture

**Routes concernées :** `GET /me/profile` (champ `profile`), réponse de
`PATCH /me/profile`, et `GET /admin/clients` (champ `clientProfile` de chaque
ligne) — les trois sérialisent `ClientProfileDto`.

**Acceptés par** `PATCH /me/profile` et `PATCH /admin/clients/{id}` :

```
householdAdults, householdKids, addressStreet, addressCity, addressPostalCode
```

**Rendus par :** rien. `ClientProfileDto` s'arrête à `kitchenNotes` et `status`.

### Aujourd'hui

```json
// GET /me/profile → profile
{
  "id": "…", "userId": "…",
  "dietaryPreferences": [], "allergies": [], "dislikes": [], "favorites": [],
  "spiceLevel": 3, "kitchenNotes": null, "status": "active"
}
```

### Attendu

```json
{
  "id": "…", "userId": "…",
  "dietaryPreferences": [], "allergies": [], "dislikes": [], "favorites": [],
  "spiceLevel": 3, "kitchenNotes": null, "status": "active",

  "householdAdults": 3,
  "householdKids": 2,
  "addressStreet": "12 rue de la Paix",
  "addressCity": "Paris",
  "addressPostalCode": "75002"
}
```

`null` quand le champ n'a jamais été renseigné.

**Impact :** un client règle son foyer à 3 adultes, enregistre, recharge — et
retrouve la valeur par défaut. L'écriture a eu lieu (le batch cooker voit
`householdAdults` dans son `clientCard`), mais la personne qui l'a saisie ne
peut pas le vérifier.

**Validation :** `PATCH /me/profile { "householdAdults": 3 }` puis
`GET /me/profile` renvoie `householdAdults: 3`.

---

## 2. `AdminClientDto` — les mêmes 5 champs, plus `avatarUrl`

**Route concernée :** `GET /admin/clients/{id}`.

Même ajout que le point 1 — `AdminClientDto` est un schéma distinct qui a la
même lacune.

**Et un sixième champ :** `avatarUrl`. Il est sur `CurrentUserDto`, donc présent
dans `user`, mais la console affiche la photo du client sur sa fiche : si elle
est déjà dans `user`, rien à faire, nous la lirons là. À confirmer de votre
côté que c'est bien le cas sur cette route.

**Impact :** la fiche client de la console affiche « — » à Adresse et à Foyer
pour tout le monde, y compris pour les clients qui les ont renseignés. Un admin
qui prépare une intervention ne peut pas lire l'adresse de la session.

**Validation :** `GET /admin/clients/{id}` d'un client dont le foyer est
renseigné renvoie `householdAdults` et `addressCity`.

---

## 3. `GET /admin/clients/{id}` — `404` au lieu de `200` vide

**Aujourd'hui**, documenté dans le spec : « An unknown id answers `200` with an
empty body. »

**Attendu**, comme partout ailleurs chez vous :

```http
HTTP/1.1 404 Not Found

{ "code": "CLIENT_NOT_FOUND", "message": "No client profile with this id." }
```

**Pourquoi :** un corps vide sur un `200` est une réponse valide pour un client
HTTP. Chez nous le `null` a traversé l'adaptateur et la page affichait
« Chargement impossible » suivie d'une erreur JavaScript, au lieu de « Client
introuvable ». Absorbé côté front, donc plus bloquant — mais le prochain
consommateur retombera dedans.

**Si d'autres routes ont le même comportement**, elles nous intéressent aussi :
nous n'avons audité que celle-ci.

---

## 4. `PATCH /me/profile` — préférences de notification

**Absent de `develop` :** aucune route contenant `notification` ni
`preference`, et le corps de `PATCH /me/profile` porte uniquement
`dietaryPreferences`, `allergies`, `dislikes`, `favorites`, `spiceLevel`,
`kitchenNotes`, `addressStreet`, `addressCity`, `addressPostalCode`,
`householdAdults`, `householdKids`, `firstName`, `lastName`, `phone`.

Le seul `notify` du spec est `notifyChef`, sur les réservations — sans rapport.

**Forme proposée**, sur le même `PATCH` plutôt qu'une route à part :

```json
{
  "notificationPreferences": {
    "email": true,
    "sms": false,
    "weeklyDigest": true
  }
}
```

rendu par `GET /me/profile` au même endroit.

**Alternative acceptable :** répondez « les envois sont transactionnels et non
négociables ». Nous retirerons les interrupteurs des deux écrans *Paramètres*
et écrirons à la place ce que la plateforme envoie et quand. Un faux réglage
coûte plus cher qu'une absence de réglage.

---

## 5. Avis et litiges — décision attendue

Aucun module `reviews` ni `disputes`. `rating` et `reviewCount` sont `null` par
construction sur toutes les vitrines.

Trois écrans attendent : `/espace-chef/avis`, `/espace-chef/litiges`, et `/avis`
dans la console.

**Ce qu'on demande :** une ligne de réponse, pas du développement.

- *planifié* → nous les gardons en « bientôt » ;
- *abandonné* → nous retirons les trois écrans et leurs entrées de navigation ;
- *à spécifier* → nous écrivons une proposition de contrat, vous tranchez.

---

## Hors API : le certificat de `lf-api.labsfood.fr`

Le domaine pointe vers Railway, mais Railway y sert le certificat joker
`*.up.railway.app` — il n'a jamais été déclaré comme domaine personnalisé,
donc aucun certificat n'a été émis pour lui. Tout appel HTTPS vers ce nom
échoue en `ERR_TLS_CERT_ALTNAME_INVALID`.

Sans conséquence aujourd'hui : nos deux fronts pointent sur
`lf-api-develop.up.railway.app`. Mais c'est la cible par défaut du proxy de la
console, et le jour où un déploiement part sans la variable d'environnement,
plus rien ne charge — avec une erreur qui ne ressemblera pas à sa cause.
