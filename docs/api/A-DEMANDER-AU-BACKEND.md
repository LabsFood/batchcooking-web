# Demandes du front à l'API

> **Relevé du 24/10/2026** contre `https://lf-api-develop.up.railway.app/openapi.json`
> (v1.3.0, 195 chemins) — l'API que les deux fronts appellent réellement.
>
> **Demandes 1, 2 et 3 : livrées, vérifiées, merci.** La demande 5 n'est pas
> sur `develop` au 24/10 — si elle est partie sur une autre branche, dites-nous
> où. Deux demandes s'ajoutent, nées de ce relevé : n° 6 (cinq champs
> acceptés en écriture et jamais rendus en lecture) et n° 7 (un id inconnu
> répond `200` au lieu de `404`).
>
> Les textes des demandes 1 à 3 sont conservés tels quels, barrés en tête,
> pour que la recette reste lisible.

Document à l'attention de l'équipe `LF-BackEnd`. Il remplace, pour ce qui reste
ouvert, `DEMANDES-BACKEND.md` (03/10), `PRIORITES-BACKEND.md` (16-18/10) et
`BUGS-BACKEND.md` (28/09), tous passés à l'historique.

**Cinq demandes, dont une seule bloque un écran livré.** Tout ce que le front a
encore à brancher est de notre côté et ne figure pas ici : 19 écrans restent à
écrire sur des routes qui existent déjà, ce n'est pas votre sujet.

Chaque demande cite le fichier de `LF-BackEnd` où nous l'avons vérifiée, au
commit du 21/10. Si l'un de ces relevés est faux, le fichier cité est le bon
endroit pour nous contredire.

| # | Demande | Nature | État au 24/10 |
|---|---|---|---|
| 1 | Statuts SAP externes sur `GET /admin/chefs/{id}` | Lecture d'un champ existant | ✅ **Livrée** |
| 2 | Modifier les zones après approbation | Nouvelle route | ✅ **Livrée** (`PATCH /admin/chefs/{id}/zones`) |
| 3 | Les langues parlées du batch cooker | Nouveau champ | ✅ **Livrée**, référentiel compris |
| 4 | Avis et litiges : planifiés ou abandonnés ? | Décision produit | ⏳ en attente |
| 5 | Préférences de notification | Nouveau champ, ou décision | ❌ absente de `develop` |
| 6 | Rendre l'adresse et le foyer, acceptés en écriture | Lecture de champs existants | 🆕 **Bloquant** |
| 7 | `404` sur un id inconnu, au lieu de `200` vide | Code de retour | 🆕 Haute |

### Ce qu'on a vérifié pour 1, 2 et 3

| Demande | Preuve dans le spec en ligne |
|---|---|
| 1 | `GET /admin/chefs/{id}` renvoie bien `crcesuAffiliationStatus` et `urssafTiersPrestationStatus` |
| 2 | `PATCH /admin/chefs/{id}/zones` existe |
| 3 | `languages` est dans le corps de `PATCH /me/chef-profile` **et** dans `GET /chefs/{id}` ; `GET /referentials/languages` existe |

Nous branchons les trois côté front dans la foulée.

### Pour la 5

Rien dans le spec en ligne : ni route `notification`, ni route `preference`,
ni champ de ce nom dans `PATCH /me/profile` (qui porte `dietaryPreferences`,
`allergies`, `dislikes`, `favorites`, `spiceLevel`, `kitchenNotes`,
`addressStreet`, `addressCity`, `addressPostalCode`, `householdAdults`,
`householdKids`, `firstName`, `lastName`, `phone`). Le seul `notify` du spec
est `notifyChef`, sur les réservations — sans rapport.

Soit elle n'est pas déployée sur `develop`, soit elle a pris une forme que nous
n'avons pas reconnue : dans ce cas, le nom du champ ou de la route nous suffit.

---

## ~~1. Rendre les statuts SAP externes sur `GET /admin/chefs/{id}`~~ — livrée le 24/10

### Le problème

La console écrit ces deux statuts :

```http
PATCH /admin/chefs/{id}/sap-external-status
{ "crcesuAffiliationStatus": "active" }
```

et ne peut pas les relire. `GET /admin/chefs/{id}` renvoie `sapPath` et
`sapDeclarationNumber`, qui sont sur `chefProfile` — mais pas
`crcesuAffiliationStatus` ni `urssafTiersPrestationStatus`, qui sont sur la
relation `sapProfile`, absente du `select`.

L'admin qui rouvre une fiche ne voit donc pas ce qu'il a consigné la semaine
précédente. Ces deux démarches se font hors plateforme — l'affiliation CRCESU
et le rattachement à l'avance immédiate arrivent par courrier — et la console
est le seul endroit où leur réponse est notée. Un statut qu'on écrit sans
pouvoir le relire n'est pas consigné, il est perdu.

Conséquences concrètes :

- impossible de vérifier qu'un batch cooker est affilié avant de le mettre en
  ligne, donc avant qu'un client lui remette des titres CESU ;
- deux admins peuvent consigner la même démarche sans que rien ne le montre ;
- le batch cooker, lui, **voit** son propre statut (`GET /me/chef-profile/sap`
  le rend). L'admin qui l'a saisi ne le voit pas : exactement l'inverse de ce
  qu'on attendrait.

### Ce qu'on demande

Deux champs de plus dans la réponse de `GET /admin/chefs/{id}` :

```json
{
  "sapPath": "type-b",
  "sapDeclarationNumber": null,
  "crcesuAffiliationStatus": "not_started",
  "urssafTiersPrestationStatus": "pending"
}
```

Valeurs : l'enum Prisma `SapExternalStatus` — `not_started`, `pending`,
`active` — avec `not_started` par défaut quand aucune ligne `sapProfile`
n'existe, exactement comme le fait déjà `chef-cesu-info.ts:73`.

Aucune migration, aucun nouveau comportement : la donnée est en base, elle sait
déjà se sérialiser, et la route qui l'écrit existe depuis le 16/10.

### Où c'est vérifié

| Constat | Fichier |
|---|---|
| Le `select` du détail n'inclut pas `sapProfile` | `modules/users/admin-chefs.service.ts:150-183` (`async get`, `CHEF_SELECT`) |
| La réponse documentée n'a que `sapPath` / `sapDeclarationNumber` | `modules/users/admin-chefs.controller.ts:49` (`CHEF_DETAIL`) |
| La route d'écriture existe | `modules/users/users.controller.ts:344` |
| Le même champ est déjà rendu au batch cooker | `modules/users/dto/sap-profile.dto.ts:209` |
| Le défaut `not_started` est déjà écrit ailleurs | `modules/payments/chef-cesu-info.ts:73` |

### Comment on saura que c'est fait

`GET /admin/chefs/{id}` sur un batch cooker dont on vient de passer
`crcesuAffiliationStatus` à `active` renvoie `active`, et `not_started` sur un
batch cooker qui n'a jamais eu de ligne `sapProfile`.

*Critère d'acceptation concerné : **A-13** — « En tant qu'admin, je note son
affiliation CRCESU et son avance immédiate ».*

---

## ~~2. Modifier les zones d'intervention après l'approbation~~ — livrée le 24/10

### Le problème

Les zones sont fixées à l'approbation de la candidature et plus rien ne les
change — ni le batch cooker, ni un admin.

Côté batch cooker, `PATCH /me/chef-profile` n'accepte que `displayName`, `bio`,
`city` et `serviceRadiusKm`. L'exclusion est délibérée et documentée : les
zones « ont été vérifiées sur pièces pendant la candidature ». Comme le
`ValidationPipe` tourne en `forbidNonWhitelisted`, un corps qui les porte est
refusé, pas filtré en silence — donc même un contournement côté front est
impossible, ce qui est bien.

Côté admin, il n'y a pas de route non plus : `/admin/chefs/{id}` n'expose que
`verification` et `sap-external-status`.

Un batch cooker qui déménage, qui veut couvrir une ville de plus, ou qui s'est
trompé dans sa candidature n'a donc aucun chemin. Avec trois batch cookers
réels, ça se règle en base. À trente, non — et c'est la demande qui nous
remonte le plus vite une fois le recrutement lancé.

### Ce qu'on demande

Une route admin, pour garder la vérification sur pièces :

```http
PATCH /admin/chefs/{id}/zones
{
  "interventionZones": [
    {
      "regionCode": "84",
      "regionLabel": "Auvergne-Rhône-Alpes",
      "scope": "cities",
      "cities": [{ "name": "Lyon", "dept": "69", "insee": "69123" }]
    }
  ]
}
```

C'est exactement `InterventionZoneDto` de la candidature : même forme, mêmes
validations, rien à inventer côté front. La réponse peut être la fiche complète,
comme `PATCH /admin/chefs/{id}/verification` le fait déjà.

**Si vous préférez l'ouvrir au batch cooker** — avec un repassage en
vérification, ou une limite au nombre de changements — dites-le : la console
n'est pas un meilleur endroit par principe, c'est juste celui qui demande le
moins de nouveau comportement.

### Où c'est vérifié

| Constat | Fichier |
|---|---|
| Les champs modifiables par le batch cooker | `modules/users/dto/chef-profile.dto.ts:15-62` |
| La forme attendue des zones | `modules/chef-onboarding/dto/create-chef-application.dto.ts:91-135` |
| Aucune autre route `admin/chefs/{id}/…` | `modules/users/users.controller.ts`, `modules/users/admin-chefs.controller.ts` |

### Comment on saura que c'est fait

Une zone ajoutée par la console apparaît sur `GET /admin/chefs/{id}`, sur la
vitrine publique du batch cooker, et dans les filtres de `GET /menus/week`.

*Critère concerné : **B-10** — aujourd'hui marqué « Bloqué ».*

---

## ~~3. Les langues parlées du batch cooker~~ — livrée le 24/10

### Le problème

`GET /chefs/{id}` renvoie `languages: []`, écrit en dur dans le service de
vitrine, avec votre propre commentaire : « `rating`, `reviewCount` et
`languages` sont vides jusqu'à ce que ça existe ». Aucun champ en écriture
nulle part.

C'est un critère de choix réel — on fait entrer quelqu'un dans sa cuisine pour
quatre heures — et la vitrine a déjà la place pour l'afficher.

### Ce qu'on demande

Un champ `languages: string[]` sur le profil batch cooker, modifiable par
`PATCH /me/chef-profile` et rendu par `GET /chefs/{id}` et
`GET /chefs/{id}/showcase`.

Un référentiel, comme pour les régimes et les allergènes, vaudrait mieux qu'un
texte libre : sinon nous aurons « Anglais », « anglais », « EN » et « English »
dans la même liste, et aucun filtre possible. Si
`GET /referentials/languages` est trop lourd pour maintenant, des codes ISO 639-1
validés côté API nous suffisent.

### Où c'est vérifié

`modules/dishes/vitrine.service.ts:332`,
`modules/dishes/public-vitrine.controller.ts:121`.

### Comment on saura que c'est fait

Une langue déclarée par le batch cooker apparaît sur sa vitrine publique.

*Critère concerné : **B-11** — aujourd'hui marqué « Bloqué ».*

---

## 4. Avis et litiges : planifiés ou abandonnés ?

### Le problème

Il n'existe ni module `reviews` ni module `disputes` dans `apps/src/modules/`,
et `rating` / `reviewCount` sont nuls par construction sur toutes les vitrines.

Côté front, trois écrans attendent cette décision : `/espace-chef/avis`,
`/espace-chef/litiges` et `/avis` dans la console. Ce sont aujourd'hui des
coquilles que personne n'ose supprimer, parce que personne ne sait si elles
sont en retard ou hors sujet.

Nous avons retiré de l'accueil public la note « 4,9/5 » et le nombre d'avis :
afficher une note qu'aucune donnée ne soutient est une promesse qu'on ne tient
pas.

### Ce qu'on demande

Pas du développement — **une réponse**. Trois issues possibles :

1. *c'est planifié* : donnez-nous un horizon, nous gardons les écrans en
   « bientôt » et arrêtons de les compter comme manquants ;
2. *c'est abandonné* : nous retirons les trois écrans et leurs entrées de
   navigation dans la semaine ;
3. *c'est à spécifier ensemble* : nous écrivons une proposition de contrat (qui
   note, quand, ce qui est modérable) et vous la tranchez.

### Comment on saura que c'est fait

Une ligne dans votre réponse. C'est tout.

*Critères concernés : **B-52**, **B-53**, **A-56** — marqués « Hors MVP » et
« Bloqué » faute de décision.*

---

## 5. Préférences de notification

### Le problème

Les deux écrans *Paramètres* — client et batch cooker — proposent de régler les
emails, les SMS et le récapitulatif hebdomadaire. Rien n'est enregistré :
aucune route ne porte ces préférences. Ce sont des interrupteurs qui ne
commandent rien, c'est-à-dire la forme de mensonge d'interface qui coûte le
plus cher en confiance — et elle coûte plus cher encore quand la personne
croyait avoir coupé les SMS.

### Ce qu'on demande

Au choix :

- un objet sur `GET` / `PATCH /me/profile`, par exemple
  `notificationPreferences: { email: boolean, sms: boolean, weeklyDigest: boolean }`,
  avec la liste des catégories que vous voulez rendre optionnelles ;
- ou bien la réponse « les envois sont transactionnels et non négociables » —
  auquel cas nous retirons les interrupteurs et écrivons à la place ce que la
  plateforme envoie, et quand. C'est une réponse parfaitement acceptable, et
  nous préférons l'écrire que laisser un faux réglage.

### Où c'est vérifié

Aucune route `notification` ni `preferences` dans `apps/src/modules/`.

*Critère concerné : **B-54** — marqué « Simulé ».*

---

## 6. Rendre l'adresse et le foyer, que vous acceptez déjà en écriture

### Le problème

Cinq champs sont **acceptés en écriture et jamais rendus en lecture** :

| Champ | Écriture | Lecture |
|---|---|---|
| `householdAdults` | `PATCH /me/profile` ✅ · `PATCH /admin/clients/{id}` ✅ | ❌ nulle part |
| `householdKids` | idem | ❌ |
| `addressStreet` | idem | ❌ |
| `addressCity` | idem | ❌ |
| `addressPostalCode` | idem | ❌ |

Ni `GET /me/profile`, ni la réponse du `PATCH` lui-même, ni `GET /admin/clients/{id}`
ne les renvoient : `ClientProfileDto` et `AdminClientDto` s'arrêtent à
`kitchenNotes` et `status`.

Conséquence côté client : il règle son foyer à 3 adultes, enregistre, recharge
la page — et retrouve la valeur par défaut. L'écriture a bien eu lieu (le batch
cooker voit `householdAdults` dans son `clientCard`), mais la personne qui l'a
saisie ne peut pas le vérifier. De son point de vue, le réglage ne tient pas.

Conséquence côté console : la fiche client affiche « — » à Adresse et à Foyer
pour tout le monde, y compris pour les clients qui les ont renseignés. Un admin
qui prépare une intervention ne peut pas lire l'adresse de la session depuis la
fiche.

### Ce qu'on demande

Ajouter ces cinq champs à `ClientProfileDto` et à `AdminClientDto`. C'est la
même demande que la n° 1 : vous stockez la donnée, vous l'acceptez en écriture,
il manque la lecture.

### Comment on saura que c'est fait

Un foyer enregistré par le client se retrouve sur `GET /me/profile` après
rechargement, et sur la fiche client de la console.

---

## 7. Répondre `404` sur un id inconnu, au lieu de `200` avec un corps vide

### Le problème

`GET /admin/clients/{id}` documente : « An unknown id answers `200` with an
empty body. » Un corps vide sur un `200` n'est pas une absence pour un client
HTTP : c'est une réponse valide. Chez nous, ce `null` a traversé l'adaptateur
et la page a affiché « Chargement impossible » suivie d'une erreur JavaScript,
là où elle devait afficher « Client introuvable ».

Nous l'absorbons désormais côté front — ce n'est donc plus bloquant. Mais c'est
le genre de contrat qui refera la même chose au prochain écran, et chez le
prochain consommateur de l'API.

### Ce qu'on demande

`404` avec un `code`, comme partout ailleurs chez vous :

```json
{ "code": "CLIENT_NOT_FOUND", "message": "No client profile with this id." }
```

Si d'autres routes ont le même comportement, elles nous intéressent aussi : nous
n'avons audité que celle-ci.

---

## Trois blocages à clore de votre côté

Vérification faite, ces entrées de notre feuille de pilotage ne correspondent à
aucun manque de l'API. Nous les avons déjà fermées chez nous ; si elles sont
encore ouvertes dans votre suivi, elles peuvent l'être aussi.

**BUG-07 — « dépôt des pièces impossible avant d'avoir un compte ».** Faux :
`POST /chef-applications` crée le compte en même temps que la candidature et
envoie un lien de connexion valable 7 jours. Le dépôt des pièces s'ouvre
derrière ce lien, via `/me/chef-documents`. Le parcours est complet.
*Source : `modules/chef-onboarding/chef-applications.controller.ts:57-78`.*

**BLK-14 — « `GET /bookings` lisible par n'importe quel compte connecté ».**
Corrigé chez vous le 23/09, et notre relevé contraire portait sur un instantané
périmé. Nos trois commentaires de code qui l'affirmaient ont été corrigés.

**BUG-02** — notre mesure portait également sur un instantané périmé. La
rectification est datée dans `PRIORITES-BACKEND.md`.

---

## Et une chose qui ne dépend pas de vous

Les trois batch cookers réels ont `serviceOffers: []`. Sans formule publiée,
`GET /chefs/{id}/availability` répond `404 OFFER_NOT_FOUND` et
`POST /me/bookings`, qui exige un `serviceOfferId`, est hors d'atteinte.

**Personne ne peut réserver aujourd'hui**, et ce n'est ni un bug du front ni un
manque de l'API : c'est trois formules à créer depuis `/espace-chef/tarifs`.
Nous le signalons ici seulement pour que la question ne vous revienne pas comme
une régression.
