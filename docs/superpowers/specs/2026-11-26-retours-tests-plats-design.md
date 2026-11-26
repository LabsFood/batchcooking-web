# Retours de tests du 26/11 : Mes plats, saisonnalité, phrase sur-mesure, PDF de la fiche recette

Petite évolution sur deux dépôts, sans changement de contrat d'API ni de base :

- site (batchcooking-web), points 1 à 3 : branche `feat/retours-tests-plats`, partie de
  `origin/develop` (b7534db), dans `LabsFood/batchcooking-web-retours` ;
- API (LF-BackEnd), point 4 : branche `fix/fiche-recette-ingredients`, partie de
  `origin/develop` (eea2f71), dans `LabsFood/LF-BackEnd-retours`.

## Pourquoi

Trois retours de la recette utilisateur :

1. Espace chef › Menus et recettes › Mes plats : « mettre une barre de recherche pour
   retrouver facilement le plat et proposer un affichage en liste ».
2. Réservation : « le client ne doit pas voir la saisonnalité du plat quand il réserve ».
3. Sous les formules : reformuler la phrase pour dire aussi que le client peut proposer
   les repas qu'il souhaite manger.
4. PDF de la fiche recette (« Velouté de butternut ») : « problème d'affichage des
   ingrédients de la recette ».

## 1. Mes plats : recherche, filtre statut, vue en liste

Fichier : `app/espace-chef/recettes/page.tsx` (`DishesTab`, `DishCard`).

**Barre d'outils**, entre la ligne « 12 plats, dont 0 publié » et la liste :

- un champ « Rechercher un plat… » qui cherche dans le nom, la description et le pays,
  comme le `DishPicker` de la même page ;
- des pastilles de filtre : Tous · Brouillons · Publiés · À compléter, chacune avec son
  nombre ;
- un bouton à deux positions : Cartes / Liste.

**Vue Liste, en lignes compactes** (choix du 26/11) : une ligne par plat, avec la photo en
miniature, le nom, le statut (point de couleur + libellé), les pastilles « Prête · version
N » ou « Pas encore Prête » et « Allergènes à confirmer », puis les boutons Modifier et
Publier (ou Dépublier). Un menu « ⋯ » contient Dupliquer et Supprimer. Les gestes sont les
mêmes qu'en vue Cartes, avec les mêmes confirmations et les mêmes messages.

```
🔍 Rechercher un plat…        [Tous 12] [Brouillons 12] [Publiés 0] [À compléter 11]   [▦ Cartes][☰ Liste]
──────────────────────────────────────────────────────────────────────────────
[img] Couscous végétarien · Brouillon     Pas encore Prête · Allergènes à confirmer
                                                    [Modifier] [Publier] [⋯]
──────────────────────────────────────────────────────────────────────────────
[img] Crème dessert au chocolat · Brouillon   Prête · version 1
                                                    [Modifier] [Publier] [⋯]
```

La vue Cartes ne change pas.

### Approches envisagées pour la vue Liste

| Approche | Pour | Contre |
|---|---|---|
| **Ligne compacte + menu « ⋯ » (retenue)** | Une douzaine de plats à l'écran, et la ligne reste lisible sur téléphone | Dupliquer et Supprimer demandent un clic de plus |
| Tableau en colonnes (Nom, Statut, Fiche, Portions, Temps) | Les plats se comparent d'un coup d'œil | Sur téléphone, il faut faire défiler de côté ou masquer des colonnes |
| Ligne avec tous les boutons visibles | Aucun geste caché | Lignes chargées, et la liste perd son intérêt |

### Choix laissés à l'implémentation (mes décisions, à corriger si besoin)

- **Recherche sans accents ni majuscules** : « vegetarien » trouve « Couscous végétarien ».
  Le `DishPicker` ne gère aujourd'hui que les majuscules. Il gardera son comportement :
  cette évolution ne touche pas les cartes de menu.
- **« À compléter »** : les plats non archivés auxquels il manque quelque chose pour être
  publiés ou réservés (`publishBlockers(d)` non vide). Cela inclut un plat publié dont les
  allergènes sont à reconfirmer.
- Les plats suspendus n'ont pas de pastille à eux : ils apparaissent dans « Tous ».
- La recherche et le filtre se combinent. Quand l'un des deux est actif, la ligne d'en-tête
  dit aussi « N plats trouvés ». Si rien ne correspond, un message « Aucun plat ne
  correspond » s'affiche avec un bouton « Tout afficher » qui vide la recherche et remet le
  filtre sur Tous.
- **Le choix Cartes / Liste est retenu d'une visite à l'autre**, par navigateur et par
  compte, avec la même mécanique que `lib/onboarding/reduit.ts` (clé portant l'id Clerk,
  repli en mémoire en navigation privée). La recherche et le filtre, eux, repartent à zéro
  à chaque visite.
- Sur téléphone, les boutons d'une ligne passent sous le nom.
- Dans la vue Liste, « Publier » est un bouton à contour, pas un bouton plein. Les
  guidelines (`docs/ui-ux-guidelines.md` § 4) veulent un seul bouton plein par vue, ici
  « Nouveau plat » : douze boutons ambre empilés ne se liraient plus.
- Une ligne de plat non publié qui ne peut pas encore l'être dit, sur une ligne,
  « Pour publier, il manque … ». Sans cela, le bouton Publier serait désactivé sans
  explication.
- On ne change pas la photo depuis la liste : on le fait depuis la vue Cartes ou la fiche.
- Les filtres et la bascule Cartes / Liste utilisent le composant `Onglets`, comme toute
  bascule de vue des espaces (guidelines § 8).
- La barre d'outils n'apparaît pas quand le chef n'a encore aucun plat : l'état vide actuel
  reste tel quel.

## 2. Saisonnalité masquée côté client

Fichier : `components/menu/ChefMenuBrowser.tsx`, vers la ligne 2123. On retire la pastille
des mois (« janv., févr., sept., oct., nov., déc. ») de la carte du plat. Ce composant sert
la page menu publique (`app/menu`), « Mes menus » côté client et la réservation : les trois
sont couverts. C'est le seul affichage des saisons côté client.

Côté batch cooker, rien ne change : la fiche recette montre toujours « Vos mois » et
« Calculées », et le chef peut les corriger (choix du 26/11 : côté client seulement).
L'API continue d'envoyer `seasonMonths`, qui n'est simplement plus affiché.

## 3. Phrase sous les formules

Fichier : `components/menu/FormulePicker.tsx`.

- Avant : « Plus de plats que la formule ? C'est une **demande sur-mesure**. »
- Après : « Envie d'autres plats, ou de plus de plats ? Proposez vos repas dans une
  **demande sur-mesure**. »

Le lien vers `/espace-client/personnalisation` reste sur « demande sur-mesure ». La phrase
dit vrai : le formulaire sur-mesure a un nombre de plats et un champ « Le brief » où le
client décrit ce qu'il veut manger.

## 4. PDF de la fiche recette : ingrédients lisibles

Dépôt LF-BackEnd, fichier `apps/src/modules/dishes/recipe-document.ts` (module « Fiche
recette » de Daniel, lot 2) et son test `recipe-document.spec.ts`. Le PDF est servi par
`GET /me/dishes/:id/recipe.pdf`.

**Cause.** `ingredientText` assemble toute la liste en un seul bloc de texte, que
`section()` écrit dans une seule police, une seule taille et une seule couleur. Le nom d'un
groupe (« Velouté », « Finition ») s'imprime exactement comme un ingrédient : on le lit
comme une ligne sans quantité. Les lignes sans groupe passent en tête, seules et sans titre,
et aucune ligne n'a de puce.

**Correctif** (choix du 26/11 : titres + puces, lignes sans groupe à la fin) :

```
INGRÉDIENTS
Velouté                                   ← Montserrat Bold, marine, espace avant
• 1100 g Butternut, épluchée, en cubes de 3 cm
• 1 pièce Oignon jaune, émincé
• 1 gousse Ail, hachée
• 1 c. à soupe Huile de tournesol

Finition
• 200 ml Lait de coco, bien secoué
• 1 c. à café Sel fin

Autres
• 20 g Epice plein sud
```

- Le titre « Ingrédients » (étiquette terracotta) ne change pas.
- Chaque groupe est écrit sous son nom, en gras et en marine, dans l'ordre où il apparaît
  dans la recette. Les lignes sans groupe viennent **à la fin**, sous le titre « Autres ».
- Chaque ingrédient commence par une puce « • », avec un retrait suspendu : une ligne longue
  revient à la ligne sous le texte, pas sous la puce.
- Le texte de chaque ligne ne change pas (`ingredientLine` : quantité, nom, préparation,
  précision, « (facultatif) », « (quantité fixe) », texte d'origine d'une ligne à vérifier).
- **Mes décisions** : si aucune ligne n'a de groupe, la liste n'a pas de titre « Autres »
  (simple liste à puces). Un titre de groupe ne reste jamais seul en bas de page : si la
  place manque pour le titre et sa première ligne, les deux passent à la page suivante.
- Écart avec la règle d'origine (« lignes sans groupe en premier », commentaire du code et
  test) : à signaler à Daniel dans la PR.

**Test.** Le test existant de l'ordre des groupes est mis à jour : les groupes d'abord, puis
« Autres » et les lignes sans groupe. Nouveaux cas : une recette sans aucun groupe n'a pas
de titre « Autres », et chaque ingrédient est précédé d'une puce. Les tests lisent le texte
du PDF (`textOf`), comme les tests actuels.

## Hors périmètre

- Les onglets « Mes menus » et « Propositions Lab's Food » ne changent pas.
- Aucun changement de contrat d'API ni de base de données.
- Pas de tri (par nom, par date) : il n'a pas été demandé.
- Pour le PDF : les autres sections (panneau, étapes, conservation) ne changent pas.

## Vérification

batchcooking-web n'a pas de lanceur de tests. La vérification passe par `npm run typecheck`,
`npm run lint` et `npm run build`, puis par un contrôle à l'écran (site lancé en local
contre l'API DEV) :

- recherche avec et sans accents, recherche sans résultat, puis « Tout afficher » ;
- chaque filtre ;
- bascule Cartes / Liste, et choix retenu après rechargement ;
- Publier, Dupliquer et Supprimer depuis une ligne ;
- affichage sur téléphone (375 px) ;
- carte d'un plat saisonnier dans la réservation, sans les mois ;
- nouvelle phrase sous les formules.

Pour l'API (point 4) : tests Jest du module (`recipe-document.spec.ts`), lint, puis un PDF
généré pour une recette proche de « Velouté de butternut » (un ingrédient sans groupe, deux
groupes, une ligne longue), ouvert et regardé.
