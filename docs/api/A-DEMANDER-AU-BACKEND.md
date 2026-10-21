# Ce qu'il faut demander au backend

Relevé du 21/10/2026, contre le code de `LF-BackEnd` — pas contre une mémoire
ni contre la documentation. Chaque demande dit **où** je l'ai vérifiée, pour
qu'on puisse me contredire avec un fichier plutôt qu'avec un souvenir.

Cinq demandes seulement. Le reste de ce qui manque au produit est de notre
côté : 19 critères d'acceptation sont marqués « À brancher », ce qui veut dire
que la route existe et que l'écran reste à écrire. Ce n'est pas au backend de
les porter.

> **Trois blocages de la feuille `03-bugs-blocages` sont à clore**, vérification
> faite : BUG-07 (dépôt des pièces avant compte), et les deux entrées sur le
> dépôt de candidature. `POST /chef-applications` crée le compte en même temps
> que la candidature et envoie un lien de connexion ; le dépôt des pièces
> s'ouvre derrière ce lien. Rien ne manque.
> Source : `apps/src/modules/chef-onboarding/chef-applications.controller.ts:57`.

---

## 1. Lire les statuts SAP qu'on vient d'écrire — *bloquant pour la console*

`PATCH /admin/chefs/{id}/sap-external-status` écrit `crcesuAffiliationStatus`
et `urssafTiersPrestationStatus`. `GET /admin/chefs/{id}` ne les renvoie pas :
sa réponse porte `sapPath` et `sapDeclarationNumber`, rien d'autre.

La console écrit donc un statut qu'elle ne peut pas relire. Concrètement,
l'admin qui rouvre la fiche ne sait pas ce qu'il a déclaré la semaine dernière,
et ne peut pas vérifier qu'un batch cooker est bien affilié avant de le mettre
en ligne.

**Demande :** ajouter les deux champs à la réponse de `GET /admin/chefs/{id}`.
C'est une lecture, pas un nouveau comportement.

> Vérifié : `modules/users/admin-chefs.controller.ts:49` (exemple `CHEF_DETAIL`)
> contre `modules/users/users.controller.ts:344` (la route d'écriture).

---

## 2. Changer les zones d'intervention après l'approbation

`PATCH /me/chef-profile` accepte `displayName`, `bio`, `city`,
`serviceRadiusKm`. Les zones en sont exclues **volontairement** — elles ont été
vérifiées sur pièces pendant la candidature, et le `ValidationPipe` tourne en
`forbidNonWhitelisted` : un corps qui les porte est refusé, pas ignoré.

Côté admin, il n'existe pas davantage de route : `/admin/chefs/{id}` n'a que
`verification` et `sap-external-status`.

Résultat : un batch cooker qui déménage, ou qui veut couvrir une ville de plus,
n'a aucun chemin — ni lui, ni nous. Avec trois batch cookers réels aujourd'hui,
ça se règle en base ; à trente, non.

**Demande :** une route admin `PATCH /admin/chefs/{id}/zones`, qui reprend la
forme de `interventionZones` de la candidature. Côté admin plutôt que côté
chef, pour garder le contrôle sur pièces — sauf si vous préférez rouvrir le
champ au batch cooker avec un repassage en vérification.

> Vérifié : `modules/users/dto/chef-profile.dto.ts:15-62`, et la liste des
> routes `admin/chefs` dans `modules/users/users.controller.ts`.

---

## 3. Les langues parlées

`GET /chefs/{id}` renvoie `languages: []`, écrit en dur dans le service de
vitrine, avec le commentaire « `rating`, `reviewCount` et `languages` sont vides
jusqu'à ce que ça existe ». Aucun champ en écriture nulle part.

C'est un critère de choix réel pour un client qui cherche quelqu'un avec qui
parler dans sa cuisine, et la vitrine a déjà la place.

**Demande :** un champ `languages: string[]` sur le profil batch cooker,
modifiable par `PATCH /me/chef-profile`, rendu par la vitrine publique. Un
référentiel comme pour les régimes serait mieux qu'un texte libre.

> Vérifié : `modules/dishes/vitrine.service.ts:332`,
> `modules/dishes/public-vitrine.controller.ts:121`.

---

## 4. Avis et litiges : décision attendue, pas forcément développement

Deux écrans existent et attendent : `/espace-chef/avis` côté batch cooker,
`/avis` côté console. Aucun module `reviews` ni `disputes` dans l'API, et
`rating` / `reviewCount` sont nuls par construction.

Nous les avons classés « hors MVP » dans le document d'acceptation. Ce n'est pas
une demande de développement : **c'est une décision à prendre**, parce que tant
qu'elle ne l'est pas, ces deux pages restent des coquilles que personne n'ose
supprimer.

**Demande :** nous dire si c'est planifié ou abandonné. Si c'est abandonné, nous
retirons les deux écrans et les deux entrées de navigation.

> Vérifié : aucun module `reviews` / `disputes` dans `apps/src/modules/`.

---

## 5. Préférences de notification

Les deux écrans *Paramètres* (client et batch cooker) proposent de régler les
emails, les SMS, le récapitulatif hebdomadaire. Rien n'est enregistré : aucune
route ne porte ces préférences. Ce sont des interrupteurs qui ne commandent
rien — c'est la forme de mensonge d'interface qui coûte le plus cher en
confiance.

**Demande :** soit un objet `notificationPreferences` sur `/me/profile`, soit
nous dire que l'envoi est non négociable — auquel cas nous retirons les
interrupteurs et écrivons ce que la plateforme envoie, et quand.

> Vérifié : aucune route `notification` / `preferences` dans `apps/src/modules/`.

---

## Ce qui n'est **pas** une demande backend

Pour éviter les allers-retours, voici ce que j'ai vérifié et qui est de notre
côté :

| Ce qu'on pourrait croire manquant | La réalité |
|---|---|
| Le foyer du client (adultes, enfants) | `PATCH /me/profile` l'accepte : `householdAdults` 1–20, `householdKids` 0–20. Branché le 21/10. |
| L'adresse de service du client | `PATCH /me/profile` accepte `addressPostalCode` et ses voisins. À brancher chez nous. |
| La liste de courses côté client | `GET /chef-missions/{id}/shopping-list` est lisible « par le batch cooker, les admins **et le client** ». Branché le 21/10. |
| La conservation et la réchauffe des plats | `GET /chef-missions/{id}/dishes/{dishId}/recipe-sheet` les porte, lisible par le client **après** la prestation (`403 NOT_YET_AVAILABLE` avant). À brancher chez nous. |
| La photo de profil | `POST /me/avatar/upload-url` + `/confirm`, `DELETE /me/avatar`. Branché. |
| La suppression de compte | `DELETE /me` et `DELETE /admin/users/{id}`. Branché le 21/10. |
| Le numéro NAN pour payer en CESU | `GET /me/bookings/{id}/payment-options` le porte déjà. Affiché. |
| La vitrine publique d'un batch cooker | `GET /chefs/{id}/showcase` existe ; nous ne l'appelons pas encore. |

---

## Et une chose qui n'est pas technique du tout

**Aucun batch cooker n'a publié de formule.** Les trois comptes réels ont
`serviceOffers: []`. Sans formule, `GET /chefs/{id}/availability` répond
`404 OFFER_NOT_FOUND`, et `POST /me/bookings` — qui exige un `serviceOfferId` —
est hors d'atteinte.

Autrement dit : **personne ne peut réserver aujourd'hui**, et ce n'est ni un
bug du front ni un manque de l'API. Le tunnel se dégrade honnêtement (« pas
réservable en ligne »), mais il restera fermé tant que les trois batch cookers
n'auront pas créé une formule depuis `/espace-chef/tarifs`. C'est le geste le
plus rentable de la semaine, et il ne demande aucun développement.
