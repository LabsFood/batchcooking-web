# API Lab's Food — conventions communes

> Document de travail à destination de l'équipe backend (NestJS + Fastify).
> Rédigé le 20/09/2026 à partir des écrans réellement construits côté front
> (site public, espace batch cooker, console admin).

## Index

| Flux | Document | État |
|---|---|---|
| Candidature batch cooker, KYC, validation admin, création du compte | [`FLOW-01-candidature-batch-cooker.md`](FLOW-01-candidature-batch-cooker.md) | Livré côté API |
| Plats, menus, publication et modération | [`FLOW-02-plats-et-menus.md`](FLOW-02-plats-et-menus.md) | Livré côté API |
| Règlement d'une prestation réalisée | [`FLOW-03-paiement-prestation.md`](FLOW-03-paiement-prestation.md) | **Rien côté API** |
| Agenda du batch cooker, disponibilités vues par le client | [`FLOW-04-agenda-et-disponibilites.md`](FLOW-04-agenda-et-disponibilites.md) | **v1 — rien côté API** |
| Déroulé d'une prestation : arrivée, checklist, photos, débours, compte rendu | [`FLOW-05-deroule-prestation.md`](FLOW-05-deroule-prestation.md) | **v1 — partiel** |
| Avis et réputation | [`FLOW-06-avis-et-reputation.md`](FLOW-06-avis-et-reputation.md) | **v1 — rien côté API** |
| Rémunération du batch cooker | [`FLOW-07-remuneration-batch-cooker.md`](FLOW-07-remuneration-batch-cooker.md) | **v1 — rien, et non arbitré** |
| Les manques qui n'ont pas besoin d'un document entier | [`FLOW-08-manques-divers.md`](FLOW-08-manques-divers.md) | **v1** |
| **Ce que le backend doit livrer ensuite, par ordre d'urgence** | [`PRIORITES-BACKEND.md`](PRIORITES-BACKEND.md) | À jour au 16/10/2026 |

> Les documents marqués **v1** ont été rédigés le 11/10/2026 à partir des
> écrans construits, et attendent une relecture backend et métier. Ils
> décrivent ce dont le front a besoin, pas ce qui est décidé. `FLOW-08` § 7
> relève deux conventions annoncées ci-dessous que l'API livrée ne suit pas :
> c'est `FLOW-08` qui fait foi sur ces deux points.

## Décisions structurantes

Ces quatre points ont été arbitrés avec le client le 20/09/2026. Tout le reste
en découle.

1. **Le compte du batch cooker est créé à la validation du dossier par l'admin**,
   pas à l'envoi de la candidature. Avant cela, le candidat n'a pas de compte :
   il complète ses pièces via un lien signé reçu par email.
2. **Les identifiants arrivent par lien magique** : pas de mot de passe en clair
   transporté par email. Le batch cooker définit son mot de passe depuis son
   espace, après sa première connexion.
3. **Les documents transitent par URL pré-signée** : l'API délivre l'URL, le
   navigateur pousse le fichier vers le stockage objet, puis confirme à l'API.
   L'API ne reçoit jamais le binaire.
4. **Les plats et menus sont publiés directement**, avec contrôle a posteriori :
   l'admin peut retirer un contenu déjà en ligne, motif obligatoire.

## Conventions

**Base URL** — `https://lf-api.labsfood.fr`. Les chemins ci-dessous sont
relatifs à cette racine.

**Langue** — clés et valeurs d'énumération en anglais (`residence-permit`),
libellés destinés à l'affichage en français, rendus par le front. L'API
n'envoie pas de texte d'interface, à une exception près : le motif de refus
d'un document, écrit par l'admin, est affiché tel quel au batch cooker.

**Authentification** — jeton Clerk en `Authorization: Bearer <token>`.
Trois niveaux d'accès :

| Niveau | Garde | Utilisé par |
|---|---|---|
| Public | — | Formulaire de candidature, consultation des vitrines |
| Candidat | Jeton de candidature signé (voir FLOW-01 § 4) | Dépôt de pièces avant création du compte |
| Chef | Clerk + `users.role = chef` | Espace batch cooker |
| Admin | Clerk + `users.role = admin` (`AdminGuard`) | Console d'administration |

**Format des erreurs** — celui déjà produit par le `ValidationPipe` global
(`whitelist`, `forbidNonWhitelisted`) :

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": ["siret must be 14 digits", "consent.terms must be true"],
  "code": "VALIDATION_FAILED"
}
```

Le champ `code` est une chaîne stable que le front peut tester ; `message` est
destiné aux logs et au développement, jamais affiché tel quel à l'utilisateur.
Codes utilisés dans ces flux : `VALIDATION_FAILED`, `APPLICATION_NOT_FOUND`,
`APPLICATION_ALREADY_DECIDED`, `TOKEN_EXPIRED`, `DOCUMENT_REQUIRED`,
`REASON_REQUIRED`, `UPLOAD_NOT_CONFIRMED`, `CONTENT_NOT_OWNED`,
`ALLERGENS_REQUIRED`.

**Dates** — ISO 8601 UTC (`2026-09-20T09:12:00.000Z`). Les jours de calendrier
sans notion d'heure (validité d'un titre de séjour) sont en `YYYY-MM-DD`.

**Montants** — entiers en centimes d'euro, champ suffixé `Cents`
(`baseNetCents: 18000`). Aucun flottant pour de l'argent.

**Identifiants** — uuid v4 pour les ressources, sauf les références lisibles
destinées au support et aux documents (`LF-2026-0142`).

**Idempotence** — les endpoints qui créent une ressource à partir d'une action
utilisateur (envoi de candidature, décision admin) acceptent un en-tête
`Idempotency-Key`. Rejouer la même clé renvoie la réponse d'origine plutôt que
de créer un doublon. Indispensable ici : une double soumission de candidature
crée deux dossiers à instruire.

**Pagination** — `?page=1&perPage=25`, réponse enveloppée :

```json
{ "items": [], "page": 1, "perPage": 25, "total": 137 }
```

**Traçabilité** — toute décision admin (validation, refus, retrait d'un
contenu, création de compte) écrit une ligne dans un journal append-only :
acteur, ressource et version, action, motif, horodatage, IP. Ce journal est la
preuve en cas de contestation ; il n'est jamais modifié ni supprimé.

## Référentiels partagés

À exposer en lecture (`GET /referentials/...`) pour que le front cesse de les
embarquer en dur. Aujourd'hui ils sont dupliqués dans `lib/chef/` côté front.

| Référentiel | Contenu | Utilisé par |
|---|---|---|
| `regions` | 13 régions métropolitaines, code INSEE + villes de référence | Candidature, vitrine |
| `document-types` | Types de pièces, famille, conditions d'apparition | Candidature, dossier chef, revue admin |
| `allergens` | 14 allergènes réglementaires INCO | Plats |
| `diets` | Régimes alimentaires | Plats, profils clients |
| `aisles` | Rayons de la liste de courses | Recettes |
| `units` | Unités de mesure | Recettes |

Les communes hors liste de référence sont résolues par
[geo.api.gouv.fr](https://geo.api.gouv.fr) côté navigateur ; l'API reçoit le
nom, le code département et le code INSEE de la commune choisie.
