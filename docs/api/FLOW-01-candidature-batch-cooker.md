# Flux 01 — Candidature batch cooker, KYC et validation admin

> Conventions communes : [`README.md`](README.md).
> Écrans concernés : `/devenir-chef` (public), `/espace-chef/dossier` (chef),
> `/batchcookers` et `/batchcookers/:id` (console admin).

## 1. Vue d'ensemble

```
Candidat                          API                              Admin
   │                               │                                 │
   │ 1. POST /chef-applications    │                                 │
   ├──────────────────────────────►│  application: submitted         │
   │                               │  email « candidature reçue »    │
   │                               │  + lien signé (30 jours)        │
   │                               │                                 │
   │ 2. Dépôt des pièces           │                                 │
   │    (URL pré-signée, § 3)      │  documents: submitted           │
   ├──────────────────────────────►│────────────────────────────────►│ file de revue
   │                               │                                 │
   │                               │  3. Décision pièce par pièce    │
   │                               │◄────────────────────────────────┤ valid / rejected
   │  email si refus (motif)       │                                 │   + motif
   │◄──────────────────────────────┤                                 │
   │                               │                                 │
   │                               │  4. POST .../approve            │
   │                               │◄────────────────────────────────┤
   │                               │  → user Clerk + chef_profile    │
   │  email lien magique           │  → application: approved        │
   │◄──────────────────────────────┤                                 │
   │                               │                                 │
   │ 5. Première connexion         │  chef_profile.isVerified = true │
   │    → espace batch cooker      │  isActive piloté par l'admin    │
```

**Le compte n'existe pas avant l'étape 4.** Tant que la candidature est en
cours, le candidat n'est pas un utilisateur : il n'a ni ligne `users`, ni
compte Clerk. Il agit avec un jeton de candidature (§ 4).

## 2. Envoi de la candidature

### `POST /chef-applications` — public

Le corps ci-dessous est exactement ce que produit le formulaire
`/devenir-chef` (voir `lib/chef/application.ts`, fonction `buildPayload`).

```json
{
  "identity": {
    "firstName": "Marie",
    "lastName": "Dupont",
    "email": "marie.dupont@exemple.fr",
    "phone": "+33612345678"
  },
  "address": {
    "street": "12 rue des Lilas",
    "line2": null,
    "postcode": "69003",
    "city": "Lyon",
    "country": "FR"
  },
  "interventionZones": [
    {
      "regionCode": "84",
      "regionLabel": "Auvergne-Rhône-Alpes",
      "scope": "cities",
      "cities": [
        { "name": "Lyon", "dept": "69", "insee": "69123" },
        { "name": "Vénissieux", "dept": "69", "insee": "69259" }
      ]
    },
    {
      "regionCode": "11",
      "regionLabel": "Île-de-France",
      "scope": "region",
      "cities": []
    }
  ],
  "workAuthorization": {
    "status": "other",
    "details": "Étudiante étrangère autorisée à travailler à temps partiel"
  },
  "company": {
    "legalForm": "micro",
    "siret": "44306184100047",
    "sap": { "path": "type-a", "declarationNumber": "SAP443061841" }
  },
  "consent": {
    "privacyPolicy": true,
    "terms": true,
    "acceptedAt": "2026-09-20T09:12:00.000Z"
  }
}
```

### Règles de validation

| Champ | Règle | Code d'erreur |
|---|---|---|
| `identity.email` | format email, unicité parmi les candidatures non décidées **et** parmi `users.email` | `EMAIL_ALREADY_USED` |
| `identity.phone` | numéro français normalisé E.164 par le front ; l'API revalide | `VALIDATION_FAILED` |
| `address.postcode` | 5 chiffres, France métropolitaine (`01000`–`95999`, Corse incluse) | `VALIDATION_FAILED` |
| `interventionZones` | au moins une entrée ; `scope: "cities"` impose `cities` non vide ; `regionCode` dans le référentiel métropole | `VALIDATION_FAILED` |
| `workAuthorization.details` | obligatoire et ≥ 10 caractères quand `status = "other"`, interdit sinon | `VALIDATION_FAILED` |
| `company.siret` | 14 chiffres **et clé de Luhn valide**, obligatoire sauf `legalForm = "not-registered"` | `VALIDATION_FAILED` |
| `company.sap.declarationNumber` | format `SAP` + 9 chiffres, obligatoire si `path = "type-a"`, `null` sinon | `VALIDATION_FAILED` |
| `consent` | les deux booléens à `true`, `acceptedAt` conservé tel quel comme preuve | `VALIDATION_FAILED` |

### Énumérations

Valeurs fermées, telles que les envoie le formulaire. Les libellés français
restent côté front : l'API ne stocke que la clé.

| Champ | Valeurs | Libellé affiché |
|---|---|---|
| `workAuthorization.status` | `eu-citizen` | Ressortissant français ou de l'Union européenne |
| | `residence-permit` | Titre de séjour autorisant à travailler |
| | `renewal-pending` | Titre de séjour en cours de renouvellement |
| | `other` | Autre situation (impose `details`) |
| `company.legalForm` | `micro` | Micro ou auto-entrepreneur |
| | `other-company` | Autre forme d'entreprise (EI, EURL, SASU, SAS…) |
| | `not-registered` | Je n'ai pas d'entreprise |
| `company.sap.path` | `type-b` | Déclaration portée par la coopérative (défaut) |
| | `type-a` | Déclaration propre (impose `declarationNumber`) |
| `interventionZones[].scope` | `region` | Toute la région, `cities` vide |
| | `cities` | Villes précises, `cities` non vide |

La forme juridique exacte n'est pas demandée au candidat : `other-company`
couvre l'EI comme la société. L'admin la lit sur le justificatif
d'immatriculation, où elle fait foi.

Le SIRET est vérifié sur sa forme seulement. Le contrôle d'existence réelle
(API Sirene de l'INSEE) est une amélioration à part, pas un prérequis.

### Réponse `201`

```json
{
  "id": "0b8c2f1e-9d64-4c1b-8a4e-2f0d3c5a7b11",
  "reference": "APP-2026-0042",
  "status": "submitted",
  "submittedAt": "2026-09-20T09:12:03.412Z",
  "documents": [
    { "type": "identity", "label": "Pièce d'identité", "family": "blocking", "status": "missing", "required": true },
    { "type": "status-proof", "label": "Justificatif de situation", "family": "conditional", "status": "missing", "required": false },
    { "type": "registration", "label": "Justificatif d'immatriculation", "family": "blocking", "status": "missing", "required": true },
    { "type": "sap-declaration", "label": "Récépissé de déclaration SAP", "family": "conditional", "status": "missing", "required": false },
    { "type": "rc-pro", "label": "Assurance responsabilité civile professionnelle", "family": "recommended", "status": "missing", "required": false },
    { "type": "haccp", "label": "Formation hygiène alimentaire (HACCP)", "family": "recommended", "status": "missing", "required": false },
    { "type": "ddpp", "label": "Récépissé de déclaration DDPP", "family": "recommended", "status": "missing", "required": false }
  ],
  "completionUrl": "https://labsfood.fr/candidature/0b8c2f1e.../documents?token=eyJhbGciOi..."
}
```

**La liste `documents` est calculée par l'API**, pas envoyée par le front : elle
découle des réponses. C'est la même règle que `requiredDocuments()` côté front,
qu'il faudra supprimer une fois l'endpoint disponible.

| Réponse du candidat | Pièce ajoutée | Famille |
|---|---|---|
| `workAuthorization.status = "residence-permit"` | `residence-permit` | conditional |
| `workAuthorization.status = "renewal-pending"` | `renewal-receipt` | conditional |
| `workAuthorization.status = "other"` | `status-proof` | conditional |
| `workAuthorization.status = "eu-citizen"` | aucune (la pièce d'identité suffit) | — |
| `company.legalForm ≠ "not-registered"` | `registration` | blocking |
| `company.sap.path = "type-a"` | `sap-declaration` | conditional |
| toujours | `identity` | blocking |
| toujours | `rc-pro`, `haccp`, `ddpp` | recommended |

**Les pièces `conditional` et `recommended` sont facultatives à l'envoi.** Une
candidature part sans aucun document ; c'est voulu, le dossier se complète
ensuite. Seules les pièces `blocking` conditionnent la validation finale.

### Emails déclenchés

| Événement | Destinataire | Contenu |
|---|---|---|
| Candidature reçue | candidat | Accusé de réception, référence `APP-2026-0042`, lien de complétion (30 jours) |
| Nouvelle candidature | admins | Notification interne avec lien vers la fiche |

## 3. Dépôt d'une pièce (URL pré-signée)

Trois appels. Le fichier ne traverse jamais l'API.

### 3.1 `POST /chef-applications/:id/documents/:type/upload-url`

Auth : jeton de candidature (avant compte) ou jeton Clerk du chef (après).

```json
{ "fileName": "cni-recto-verso.pdf", "mimeType": "application/pdf", "sizeBytes": 842133 }
```

Contraintes rejetées en `422` : type hors `application/pdf`, `image/jpeg`,
`image/png`, `image/webp` ; taille > 10 Mo ; taille nulle.

Réponse `200` :

```json
{
  "uploadId": "up_9f2a...",
  "method": "PUT",
  "url": "https://s3.fr-par.scw.cloud/labsfood-kyc/apps/0b8c2f1e/identity/up_9f2a?X-Amz-Signature=...",
  "headers": { "Content-Type": "application/pdf" },
  "expiresAt": "2026-09-20T09:27:00.000Z"
}
```

### 3.2 `PUT <url>` — direct vers le stockage

Envoi du binaire par le navigateur. Le bucket est **privé** : aucune lecture
publique, pas d'ACL héritée.

### 3.3 `POST /chef-applications/:id/documents/:type/confirm`

```json
{ "uploadId": "up_9f2a...", "expiresOn": "2028-03-14" }
```

`expiresOn` n'est demandé que pour les pièces à échéance (`identity`,
`residence-permit`, `renewal-receipt`, `sap-declaration`, `rc-pro`, `haccp`,
`vigilance`). L'API vérifie que l'objet existe bien dans le bucket avant de
passer la pièce en `submitted` ; sinon `409 UPLOAD_NOT_CONFIRMED`.

Réponse `200` :

```json
{
  "type": "identity",
  "status": "submitted",
  "fileName": "cni-recto-verso.pdf",
  "sizeBytes": 842133,
  "submittedAt": "2026-09-20T09:14:41.002Z",
  "expiresOn": "2028-03-14",
  "version": 1
}
```

**Versionnage** — redéposer une pièce crée une version, ne l'écrase pas. Une
pièce refusée puis corrigée doit garder trace des deux dépôts et du motif de
refus. `version` s'incrémente, le fichier précédent reste dans le bucket.

### 3.4 Consultation par l'admin

`GET /admin/chef-applications/:id/documents/:type/download-url` renvoie une URL
de lecture signée, valable 5 minutes, tracée dans le journal d'audit (qui a
consulté quelle pièce, quand). Une pièce d'identité se consulte, elle ne se
télécharge pas en masse.

## 4. Jeton de candidature

Le candidat n'a pas de compte : il lui faut quand même un accès pour compléter
ses pièces et suivre son dossier.

- JWT signé par l'API, `aud: "chef-application"`, `sub: <applicationId>`,
  durée **30 jours**, révoqué à la décision (approbation ou refus).
- Transporté en `?token=` dans le lien email, puis en
  `Authorization: Bearer` par le front.
- Portée minimale : lire **sa** candidature, déposer ses pièces. Rien d'autre.
- `GET /chef-applications/:id` avec ce jeton renvoie l'état du dossier, sans
  aucune donnée interne (ni notes admin, ni file de revue).
- Expiré → `401 TOKEN_EXPIRED` ; le front propose alors
  `POST /chef-applications/:id/resend-link` (limité à 3 envois par 24 h), qui
  renvoie un lien neuf à l'adresse de la candidature, jamais à une autre.

## 5. Revue KYC côté admin

### 5.1 File de revue

`GET /admin/chef-applications?status=submitted&hasPendingDocuments=true&page=1`

```json
{
  "items": [
    {
      "id": "0b8c2f1e-9d64-4c1b-8a4e-2f0d3c5a7b11",
      "reference": "APP-2026-0042",
      "name": "Marie Dupont",
      "city": "Lyon",
      "status": "submitted",
      "dossierStatus": "reviewing",
      "pendingDocuments": 2,
      "submittedAt": "2026-09-20T09:12:03.412Z",
      "waitingSinceHours": 19
    }
  ],
  "page": 1, "perPage": 25, "total": 6
}
```

`waitingSinceHours` sert l'engagement « réponse sous 48 h ouvrées » affiché au
candidat : c'est la donnée qui permet de trier la file par urgence.

### 5.2 Décision sur une pièce

`PATCH /admin/chef-applications/:id/documents/:type` — `AdminGuard`.

Validation :

```json
{ "decision": "valid" }
```

Refus — **le motif est obligatoire** et sera lu tel quel par le candidat :

```json
{
  "decision": "rejected",
  "reason": "Document illisible : le scan est rogné en bas à droite. Merci de renvoyer la page entière, sans reflet.",
  "reasonCode": "unreadable"
}
```

`reason` : 15 caractères minimum, 500 maximum. Sans lui, `422 REASON_REQUIRED`.
`reasonCode` alimente les statistiques de refus, valeurs proposées :
`unreadable`, `expired`, `incomplete`, `wrong-document`, `name-mismatch`,
`suspected-forgery`, `other`.

Réponse `200` : la pièce à jour **et l'état du dossier recalculé**, car une
décision peut faire basculer l'ensemble.

```json
{
  "document": {
    "type": "registration",
    "status": "rejected",
    "reason": "Document illisible : le scan est rogné...",
    "decidedAt": "2026-09-20T11:04:22.881Z",
    "decidedBy": { "id": "u_admin_12", "name": "Sarah L." },
    "version": 1
  },
  "dossierStatus": "incomplete",
  "canApprove": false
}
```

Un refus déclenche un email au candidat : la pièce concernée, le motif, le lien
pour redéposer. C'est le seul texte écrit par un humain qui traverse l'API.

### 5.3 États

**Pièce** — `missing → submitted → reviewing → valid | rejected`, puis
`valid → expiring` (J-60) `→ expired`. Une pièce refusée revient à `submitted`
au dépôt suivant.

**Dossier** — jamais saisi, toujours **dérivé** des pièces :

| État | Condition |
|---|---|
| `draft` | aucune pièce déposée |
| `awaiting-registration` | tout est bon sauf `registration`, et `legalForm = "not-registered"` |
| `incomplete` | au moins une pièce `blocking` en `missing` ou `rejected` |
| `reviewing` | toutes les `blocking` déposées, au moins une en attente de décision |
| `validated` | toutes les `blocking` en `valid` (ou `expiring`) |
| `suspended` | une pièce `blocking` est passée `expired` |
| `disabled` | compte désactivé par un admin |

Le front applique déjà cette dérivation (`lib/chef/states.ts`,
`deriveDossierStatus`) : c'est la même règle, à porter côté serveur qui devient
la source de vérité.

### 5.4 Demander un complément sans refuser

`POST /admin/chef-applications/:id/request-changes`

```json
{
  "message": "Votre attestation RC Pro s'arrête au 31/12/2026. Pouvez-vous envoyer l'attestation de l'année en cours ?",
  "documentTypes": ["rc-pro"]
}
```

La candidature passe en `changes-requested`, le candidat reçoit un email, le
lien de complétion est prolongé de 30 jours. Utile quand le dossier n'est ni
refusable ni validable en l'état.

## 6. Validation finale et création du compte

### `POST /admin/chef-applications/:id/approve` — `AdminGuard`, `Idempotency-Key`

```json
{
  "isActive": false,
  "note": "Dossier complet, vitrine à activer après l'appel de bienvenue."
}
```

`isActive` décide si le batch cooker est immédiatement réservable. Par défaut
`false` : vérifié mais pas encore en ligne.

**Refusé en `409 DOCUMENT_REQUIRED`** si une pièce `blocking` n'est pas `valid`.
La validation ne se force pas : c'est ce qui garantit qu'aucun compte actif
n'existe sans pièce d'identité validée.

Effets, dans une seule transaction :

1. Création de l'utilisateur Clerk (email déjà vérifié par le parcours de
   candidature) ;
2. Création de la ligne `users` avec `role = "chef"` ;
3. Création de `chef_profiles` avec `isVerified = true`, `isActive` selon le
   corps de la requête, et les données de la candidature (nom public, ville,
   zones, voie SAP) ;
4. Copie des pièces validées depuis l'espace « candidature » vers l'espace
   « dossier chef », en conservant versions, motifs et horodatages ;
5. `application.status = "approved"`, jeton de candidature révoqué ;
6. Envoi du **lien magique** de première connexion ;
7. Écriture au journal d'audit.

Si une étape échoue, rien n'est écrit : pas de compte Clerk orphelin sans ligne
`users`. En pratique, créer l'utilisateur Clerk en dernier, après les écritures
Postgres, et compenser par une suppression Clerk en cas d'échec tardif.

Réponse `201` :

```json
{
  "application": { "id": "0b8c2f1e-...", "status": "approved", "approvedAt": "2026-09-20T11:22:10.004Z" },
  "user": { "id": "3f1c...", "clerkUserId": "user_2n...", "email": "marie.dupont@exemple.fr", "role": "chef" },
  "chefProfile": { "id": "9a77...", "displayName": "Marie Dupont", "isVerified": true, "isActive": false },
  "invitation": { "channel": "magic-link", "sentTo": "marie.dupont@exemple.fr", "expiresAt": "2026-09-27T11:22:10.004Z" }
}
```

### Lien magique

- Durée **7 jours**, usage unique, invalidé dès la première connexion réussie.
- Renvoi possible : `POST /admin/chef-users/:id/resend-invitation`, ou
  auto-service depuis la page de connexion via l'email.
- À la première connexion, le front impose la définition d'un mot de passe.
  L'API expose `hasPassword: false` sur `GET /me` pour que le front sache
  afficher cet écran.

### `GET /me` : une seule page de connexion pour deux métiers

Clients et batch cookers se connectent au même endroit. Le front ne sait donc
pas, avant la réponse de `/me`, vers quel espace envoyer la personne : il
affiche un écran d'attente (`/apres-connexion`) puis redirige vers
`/espace-chef` ou `/espace-client` selon `role`.

```json
{
  "id": "3f1c...",
  "email": "marie.dupont@exemple.fr",
  "role": "chef",
  "hasPassword": false,
  "chefProfile": { "id": "9a77...", "isVerified": true, "isActive": false }
}
```

Deux exigences en découlent :

- **`role` doit arriver vite** : tant qu'il manque, l'utilisateur regarde un
  écran d'attente. Le front abandonne au bout de 6 secondes et retombe sur
  l'espace client, ce qui donnerait un espace client à un batch cooker.
- **`GET /me` répond aussi pour un chef non encore actif** (`isActive: false`) :
  il doit pouvoir entrer dans son espace pour compléter son dossier, même si sa
  vitrine n'est pas publiée.

### Refus d'une candidature

`POST /admin/chef-applications/:id/reject`

```json
{
  "reason": "Zone d'intervention non couverte pour l'instant : nous ne travaillons pas encore en Corse.",
  "reasonCode": "out-of-area",
  "allowReapplyAfter": "2027-01-01"
}
```

Aucun compte n'est créé. Le candidat reçoit un email avec le motif et, le cas
échéant, la date à partir de laquelle il peut recandidater. Ses pièces sont
conservées 3 mois puis purgées (voir § 8).

## 7. Après la validation : le dossier vivant

Le batch cooker garde un dossier à entretenir. Mêmes règles, endpoints côté
chef :

| Action | Endpoint |
|---|---|
| Voir son dossier | `GET /me/chef-documents` |
| Déposer ou remplacer une pièce | même flux pré-signé que § 3, sur `/me/chef-documents/:type` |
| Voir l'historique des dépôts | `GET /me/chef-documents/:type/versions` |

**Alertes d'expiration** — tâche planifiée quotidienne : à J-60, J-30 et J-7
avant `expiresOn`, email au chef et passage en `expiring`. À J+0, la pièce
passe `expired` ; si elle est `blocking`, le dossier passe `suspended` et le
profil devient non réservable automatiquement (`isActive = false`), avec email
d'explication. La réactivation est automatique au dépôt d'une pièce valide.

C'est le seul cas où le système retire une vitrine sans décision humaine : il
doit donc être explicite dans l'email et réversible immédiatement.

## 8. Conservation des données

| Donnée | Durée | Déclencheur |
|---|---|---|
| Candidature refusée + pièces | 3 mois | date de refus |
| Candidature abandonnée (jamais complétée) | 6 mois | dernière activité |
| Pièces KYC d'un chef actif | durée du contrat + 5 ans | obligation légale |
| Preuve de consentement (`consent.acceptedAt`) | 5 ans | — |
| Journal d'audit | 5 ans | — |

Le consentement RGPD recueilli à la candidature couvre l'instruction du
dossier. Il ne couvre pas la prospection : prévoir un consentement distinct si
Lab's Food veut recontacter les candidats refusés.

## 9. Ce que le front devra changer

À faire côté `labs-food` une fois ces endpoints disponibles :

1. **L'écran de confirmation de `/devenir-chef` annonce aujourd'hui l'envoi des
   identifiants dès la candidature.** Avec la règle retenue (compte créé à la
   validation), ce texte est faux : il doit annoncer l'accusé de réception et
   le lien de complétion des pièces. Correction à faire dès que la décision est
   confirmée.
2. Remplacer `requiredDocuments()` (`lib/chef/application.ts`) par la liste
   renvoyée par l'API.
3. Remplacer l'upload simulé (`submitApplication`) par le flux pré-signé § 3.
4. Supprimer les référentiels en dur (`lib/chef/regions.ts`) au profit de
   `GET /referentials/regions`.
5. Brancher `/apres-connexion` sur le `role` réel (aujourd'hui résolu via
   `GET /me`, avec repli sur l'espace client au bout de 6 secondes).

## 10. Questions ouvertes

1. **Contrôle Sirene** — vérifie-t-on l'existence réelle du SIRET auprès de
   l'INSEE, ou seulement sa forme ? Cela change le taux de refus pour
   « immatriculation invalide ».
2. **Doublon d'email** — que faire si un client existant candidate comme batch
   cooker avec la même adresse ? Fusionner les rôles sur un compte, ou refuser ?
3. **Délai de rappel** — au bout de combien de jours sans dépôt relance-t-on un
   candidat, et après combien la candidature est-elle mise en sommeil ?
4. **Publics fragiles** — les pièces `approval` et `criminal-record` existent au
   référentiel mais aucun écran ne les déclenche. Quand cette option
   s'ouvre-t-elle ?
