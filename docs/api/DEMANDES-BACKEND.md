# Ce qui manque à l'API pour que l'espace batch cooker soit complet

Écrit le 03/10/2026, après avoir branché la candidature, le dossier de pièces
et les décisions admin sur la pré-production (PR 38).

Chaque point part de **ce qu'un batch cooker ou un admin ne peut pas faire
aujourd'hui**, dit pourquoi, et propose le contrat minimal. L'ordre est celui
de l'urgence : les trois premiers bloquent le parcours, les suivants le rendent
désagréable.

---

## 1. Le lien de connexion n'arrive pas, et personne ne peut le renvoyer

**Ce qui se passe.** La candidature `APP-2026-0002` a été créée le 03/10
(`201`, `status: submitted`). **Aucun email n'est arrivé.** Le candidat a donc
un compte qu'il ne peut pas ouvrir, et un dossier qu'il ne peut pas compléter.

Votre propre documentation nomme ce cas sur `resend-invitation` :

> `delivered: false` means the email did not leave (email service down or not
> configured)

**Pourquoi c'est bloquant.** Personne ne peut le constater : `POST
/chef-applications` répond `201` que l'email soit parti ou non. Ni le candidat,
ni l'admin, ni nous ne savons qu'il y a un problème — on croit simplement que
la personne ne donne pas suite.

**Et le recours est fermé.** `POST /admin/chef-users/{id}/resend-invitation`
existe, mais attend le `user.id` — *« The account id (`user.id` in the approval
answer, or `GET /me`) »*. Or aucun endpoint admin ne le renvoie avant
l'approbation :

| Endpoint | Identifiants renvoyés |
|---|---|
| `GET /admin/chef-applications` | `id` de candidature seulement |
| `GET /admin/chef-applications/{id}` | `id`, `chefProfileId` — **pas de `userId`** |

Un admin qui voit un dossier figé ne peut donc pas relancer l'invitation. Le
seul chemin qui livre le `user.id` est l'approbation, impossible tant que les
pièces manquent — et elles manquent parce que le lien n'est pas arrivé.

**Ce qu'il nous faut.**

1. Vérifier la configuration d'envoi d'emails sur la pré-production.
2. Que `POST /chef-applications` dise si l'email est parti :
   ```json
   { "...": "...", "invitation": { "delivered": true, "sentAt": "2026-10-03T15:18:28.631Z" } }
   ```
   Sur `delivered: false`, nous afficherons au candidat quoi faire plutôt qu'un
   « consultez votre boîte mail » qui ne mène nulle part.
3. **Exposer `userId`** sur la candidature, en liste et en détail. Un champ, et
   le bouton « renvoyer l'invitation » devient implémentable dans la foulée.

---

## 2. Un batch cooker ne peut pas corriger ce qu'il a déclaré

**Le cas réel, rencontré en test.** Un candidat se déclare *sans entreprise*
(`legalForm: "not-registered"`). L'API ne lui demande donc pas de justificatif
d'immatriculation — c'est juste. Il obtient ensuite son immatriculation, ou
s'est trompé au moment de candidater. **Il n'a aucun moyen de le dire.**

Son dossier reste en `awaiting-registration` indéfiniment, et la seule issue
est d'écrire à l'équipe pour qu'elle corrige en base.

**Ce qui existe aujourd'hui.** `PATCH /me/chef-profile` couvre `displayName`,
`bio`, `city`, `serviceRadiusKm`, `firstName`, `lastName`, `phone` — la
vitrine. Rien de ce qui a été déclaré à la candidature :

| Champ déclaré | Modifiable ? | Conséquence quand il change |
|---|---|---|
| `company.legalForm` | **non** | change la liste des pièces demandées |
| `company.siret` | **non** | débloque `awaiting-registration` |
| `company.sap.path` / `declarationNumber` | **non** | ajoute ou retire la pièce SAP |
| `workAuthorization.status` | **non** | change les pièces conditionnelles |
| `interventionZones` | **non** | décide où le chef apparaît dans la recherche |
| `address` | **non** | sert aux déplacements et à la facturation |

Ce ne sont pas des champs cosmétiques : **chacun d'eux change ce que l'API
elle-même exige ensuite**. Les laisser figés au moment de la candidature
condamne tout batch cooker dont la situation évolue — ce qui est le cas normal,
pas l'exception.

**Ce qu'il nous faut.** Un `PATCH /me/chef-application` (ou
`PATCH /me/chef-profile` élargi) acceptant ces blocs, avec deux garanties :

- **la liste des pièces est recalculée** à la volée, et la réponse la renvoie ;
- une pièce devenue inutile n'est pas supprimée mais **neutralisée**, pour que
  l'historique reste lisible côté admin.

Et une question de politique à trancher de votre côté : **ces modifications
sont-elles libres, ou repassent-elles en revue ?** Changer son SIRET après
validation n'a pas le même poids que corriger une faute dans son adresse. Notre
avis : adresse et zones libres, forme juridique et SIRET repassent en
`reviewing`.

En attendant, l'écran affiche ces informations en lecture seule et explique
qu'il faut écrire à l'équipe. C'est un pis-aller, pas une solution.

---

## 3. Un batch cooker ne peut pas relire la pièce qu'il a envoyée

Côté admin, `GET /admin/chef-applications/{id}/documents/{type}/download-url`
existe et marche très bien. **Côté batch cooker, il n'y a pas d'équivalent.**

Celui qui a déposé sa carte d'identité il y a trois semaines ne peut pas
vérifier qu'il a envoyé le bon fichier, ni le bon côté de la pièce. Il ne peut
que la remplacer à l'aveugle — et repartir en vérification pour rien.

**Ce qu'il nous faut.** `GET /me/chef-documents/{type}/download-url`, mêmes
règles que la version admin : URL signée, courte durée, et seulement pour ses
propres pièces.

Le front l'appelle déjà. Un `404` est traité comme « pas encore disponible » et
dit tel quel à l'utilisateur ; **le jour où vous l'exposez, l'aperçu fonctionne
sans que nous touchions à quoi que ce soit.**

---

## 4. Le CORS n'autorise toujours que `GET`, `HEAD` et `POST`

Déjà signalé, toujours vrai sur les trois déploiements. Vérifié le 03/10 :

```
OPTIONS /me/dishes/abc   Origin: http://localhost:3005   méthode PATCH
→ 204   access-control-allow-methods: GET,HEAD,POST
```

Le serveur ne refuse pas : il n'annonce pas `PATCH`, et c'est le **navigateur**
qui annule la requête avant de l'envoyer. Silencieusement — d'où l'absence
d'erreur serveur à laquelle se fier, et le temps perdu à chercher.

**Attention à un faux négatif :** Swagger est servi par l'API elle-même, donc
en même origine. Il ne peut **structurellement pas** révéler ce problème. Ne
vous fiez pas à « ça marche dans Swagger ».

Nous avons contourné des deux côtés par un relais same-origin, mais c'est une
rustine : en production le site et l'API seront sur des domaines différents.

→ Ajouter `PATCH, PUT, DELETE` à `Access-Control-Allow-Methods`.

---

## 5. `pendingDocuments` ne compte pas ce qu'on croit

Sur `APP-2026-0001`, la liste renvoyait `pendingDocuments: 0` alors que **les
deux pièces bloquantes étaient `missing`**. Le champ compte donc les pièces
*en attente de décision*, pas les pièces manquantes.

Conséquence : le filtre `hasPendingDocuments` ne permet pas de retrouver les
dossiers incomplets — c'est-à-dire exactement ceux sur lesquels un admin doit
relancer. Le nom induit en erreur.

**Ce qu'il nous faut**, au choix : documenter clairement les deux notions, ou
ajouter `missingDocuments` à côté. Nous afficherons les deux.

---

## 6. L'espace chef est en lecture seule avant approbation

`PATCH /me/chef-profile` répond `403 CHEF_NOT_VERIFIED` tant que la candidature
n'est pas approuvée.

C'est défendable, mais il faut le confirmer : un candidat ne peut donc pas
préparer sa vitrine, son nom public ni sa bio pendant l'instruction, alors
qu'il a un compte et du temps devant lui. Si c'est voulu, nous grisons ces
écrans avec l'explication. Si ce n'est qu'un effet de bord, ouvrir l'édition de
la vitrine avant approbation ferait gagner du temps à tout le monde : le profil
serait prêt le jour de la validation.

---

## Récapitulatif

| # | Demande | Effet si rien n'est fait |
|---|---|---|
| 1 | Config email + `invitation.delivered` + `userId` sur la candidature | Les candidats sont perdus sans que personne le sache |
| 2 | `PATCH` des informations déclarées (statut, SIRET, SAP, situation, zones, adresse) | Tout changement de situation exige une intervention manuelle en base |
| 3 | `GET /me/chef-documents/{type}/download-url` | Le chef ne peut pas vérifier ce qu'il a envoyé |
| 4 | `PATCH, PUT, DELETE` dans le CORS | Rien n'est modifiable depuis un navigateur sans relais |
| 5 | Clarifier `pendingDocuments` ou ajouter `missingDocuments` | Le filtre admin ne trouve pas les dossiers à relancer |
| 6 | Confirmer le verrou avant approbation | Écrans grisés sans pouvoir dire si c'est voulu |

Les points 1 et 3 sont de petites additions. Le point 2 est le seul vrai
chantier, et c'est aussi celui sans lequel le produit ne tient pas dans la
durée : la situation d'un batch cooker change — il s'immatricule, il déménage,
il élargit sa zone.
