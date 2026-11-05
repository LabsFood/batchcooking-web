# Idées produit : augmenter la valeur perçue (chef et client)

Six fonctionnalités proposées, plus quatre pistes complémentaires, évaluées selon
**quatre axes de valeur perçue**. Pour chacune : sa facilité d'intégration dans le code
**actuel** (LF-BackEnd, batchcooking-web, admin-dashboard), sa valeur perçue, et ce que
l'utilisateur serait prêt à payer pour l'avoir.

> Rédigé le 05/11/2026 à partir du schéma Prisma et des écrans existants. Les montants
> de « consentement à payer » sont des **hypothèses à tester** (test de prix,
> Van Westendorp, entretiens), pas des mesures.

---

## 1. Grille de notation

### Les 4 axes (0 à 5 chacun, notés pour le bénéficiaire principal)

| Axe | Question posée | 0 | 5 |
|---|---|---|---|
| **T** · Gain de temps | Combien de temps ou de charge mentale ça enlève ? | rien | des heures par semaine, ou une décision quotidienne en moins |
| **P** · Hausse du profit | Ça fait gagner plus (chef) ou rapporte plus (client) ? | rien | plus de prestations ou de marge, mesurable |
| **D** · Baisse des dépenses | Ça fait dépenser moins ? | rien | une économie chiffrée et visible |
| **R** · Baisse du risque | Ça réduit un risque (sanitaire, litige, oubli, fiscal) ? | rien | ça évite un incident grave ou un litige |

### Valeur perçue (/100)

```
Valeur perçue = (T + P + D + R) / 20 × 60    → le bénéfice réel
              + Fréquence / visibilité × 4    → (0-5) vu tous les jours ou une fois par an ?
              + Différenciation × 4           → (0-5) la concurrence l'a-t-elle déjà ?
```

### Intégration (1 à 5)

| Note | Signification |
|---|---|
| 5 | Données et écrans déjà là : surtout du front, au plus un endpoint |
| 4 | Données là, un module back à écrire |
| 3 | Données partielles : il faut compléter le modèle ou la saisie des chefs |
| 2 | Donnée externe à intégrer (référentiel tiers) + cadre réglementaire |
| 1 | Refonte ou dépendance externe lourde |

### Priorité

```
Priorité = Valeur perçue × Intégration / Effort (jours-homme)
```

C'est un score proche de RICE : il favorise ce qui rapporte beaucoup de valeur perçue
pour peu de travail, sans éliminer les gros chantiers à forte valeur.

---

## 2. Synthèse et classement

| Rang | Fonctionnalité | Pour | T | P | D | R | Valeur /100 | Intég. /5 | Effort | **Priorité** | Prêt à payer (hypothèse) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Compteur d'économies (ROI) | Client | 3 | 0 | 5 | 1 | 55 | 5 | 3 j | **92** | 0 € direct : levier de conversion et de réabonnement |
| 2 | Planificateur de calendrier familial | Client | 4 | 0 | 3 | 5 | 72 | 5 | 4 j | **90** | 2-4 €/mois isolé ; mieux inclus, sert la montée en gamme |
| 3 | Messages prédéfinis logistiques | Chef | 4 | 1 | 1 | 4 | 54 | 5 | 4 j | **68** | 0-3 €/mois : attendu, à inclure |
| 4 | Liste d'achat multi-clients | Chef | 5 | 4 | 3 | 3 | **85** | 4 | 7 j | **49** | **10-20 €/mois** (offre Pro) |
| 5 | Optimisation des ingrédients | Chef | 4 | 3 | 4 | 2 | 67 | 3 | 8 j | **25** | 5-10 €/mois (offre Pro) |
| 6 | Impact nutritionnel | Client | 1 | 0 | 1 | 3 | 39 | 2 | 20 j | **4** | 3-6 €/mois, sur un segment santé |

**Lecture**

- **Le plus rentable à court terme** : ROI et planificateur. Les données existent, les
  écrans `statistiques` et `conservation` de l'espace client sont déjà là, il reste à les
  enrichir. Faisables dans le même sprint.
- **La plus forte valeur perçue** : la liste d'achat multi-clients (85/100). C'est la
  seule qui fait gagner de l'argent au chef chaque semaine. Elle justifie une offre
  payante, sous réserve du mandat de débours (voir § 3.5).
- **À reporter** : le calculateur nutritionnel. Valeur réelle mais de niche, aucune donnée
  nutritionnelle hors `Meal.calories`, et un cadre réglementaire (Nutri-Score, allégations
  santé, données de santé) à sécuriser d'abord.

### Ordre de livraison conseillé

| Lot | Contenu | Effort cumulé | Pourquoi |
|---|---|---|---|
| **Lot A** (client, gratuit) | ROI + planificateur | ~7 j | Effet immédiat sur la conversion et la rétention, quasiment aucun risque technique |
| **Lot B** (chef, socle) | Messages prédéfinis | ~4 j | Réduit les prestations ratées et les litiges, prépare le terrain du Lot C |
| **Lot C** (chef, « Pro ») | Liste multi-clients + optimisation des ingrédients | ~15 j | Le cœur d'une offre payante chef ; à lancer une fois la règle de débours tranchée |
| **Lot D** (client, premium) | Nutrition v1 (« équilibre de la semaine ») | ~8 j | Après validation juridique ; version complète (macros) ensuite |

---

## 3. Détail par fonctionnalité

### 3.1 Planificateur de calendrier familial (client)

**L'idée** : un tableau de bord où toute la famille voit d'un coup d'œil **quel plat
réchauffer, comment, et quel jour de la semaine**.

**Ce qui existe déjà**

- `Meal.reheating` et `Meal.storage` (JSON) et leur copie figée par version
  `MealRecipeVersion.reheating` / `.storage` : les modes de réchauffage et les durées de
  conservation sont saisis par le chef, et figés pour chaque prestation via
  `BookingMeal.recipeVersion`.
- `Booking.startsAt` : le jour de la prestation, point de départ des durées de
  conservation.
- L'écran `app/espace-client/conservation` (CL-09) affiche déjà réchauffage, frigo,
  congélateur et conditionnement, mais **sur mock** (`DISH_CARE` de `lib/client/mock`).

**Ce qu'il faut faire**

1. Brancher `conservation` sur les recettes figées de la dernière prestation
   (`BookingMeal` → `MealRecipeVersion`).
2. Calculer le planning : chaque plat est placé sur un jour de la semaine **par date
   limite croissante** (le plus fragile en premier). Ce qui dépasse la durée frigo part
   au congélateur avec un rappel « à sortir la veille ».
3. Vue semaine (lundi → dimanche, midi/soir) ; le client peut déplacer un plat, sans
   jamais dépasser sa durée de conservation.
4. Bonus à faible coût : export `.ics` (le module `calendar` gère déjà des flux),
   version imprimable « à coller sur le frigo », notification « à consommer aujourd'hui »
   (module `notifications` + Brevo).

**Axes** — T 4 (plus de « qu'est-ce qu'on mange ce soir ? ») · P 0 · D 3 (moins de plats
jetés car oubliés) · R **5** (sécurité alimentaire : on ne mange plus un plat hors délai)

**Valeur perçue 72/100** — utilisé tous les jours, vu par toute la famille, pas seulement
par le payeur : c'est l'écran qui rend le service visible entre deux prestations.

**Intégration 5/5 · Effort ~4 j** (front + au plus un endpoint de lecture).

**Point de vigilance** : la qualité dépend de la saisie de `reheating`/`storage` par le
chef. Il faut rendre ces champs obligatoires pour qu'une recette soit « Prête », comme
`allergensVerifiedAt` l'est déjà pour la réservation.

**Consentement à payer** : faible isolé (2-4 €/mois). Fort comme **argument de montée
en gamme** : réservé ou mis en avant dans les formules intermédiaire et haute
(220 € et 320 € TTC), il aide à faire passer un client de la formule à 150 €.

---

### 3.2 Compteur d'économies / ROI (client)

**L'idée** : dans l'espace client, comparer le coût des sessions de batch cooking au
budget qu'un foyer aurait dépensé en plats à emporter, et au gaspillage évité, **avec la
source officielle de chaque chiffre**.

**Ce qui existe déjà**

- `app/espace-client/statistiques` calcule déjà, sur les vraies réservations, les
  sessions, les portions (`bookingPortions`), les heures gagnées (forfait de 2 h par
  session) et le crédit d'impôt (`amountTtc - amountAfterTax`).
- `ClientProfile.householdAdults` / `householdKids` : la taille du foyer.

**Ce qu'il faut faire**

1. Trois tuiles de plus : **coût net par portion**, **économie vs plats à emporter**,
   **gaspillage évité**.
2. Les valeurs de référence (et leur source, leur année, leur lien) vont dans
   `PlatformSetting`, modifiables dans la console admin. Pas de chiffre en dur dans le
   front.
3. Un panneau « Comment on calcule » qui affiche chaque hypothèse et sa source. Le client
   peut remplacer la valeur par défaut par **son propre budget** (« je dépense environ X €
   par semaine en livraison »).

**Calcul proposé**

```
Coût net par portion   = Σ amountAfterTax / Σ portions            (données réelles)
Économie vs emporter   = Σ portions × prix moyen d'un repas à emporter − Σ amountAfterTax
Gaspillage évité       = (nb de personnes du foyer) × (coût annuel du gaspillage
                          par personne) × (part des semaines couvertes) × taux d'évitement
```

Exemple d'affichage (illustratif) : formule à 220 € TTC, soit 110 € après crédit d'impôt,
pour 20 portions → **5,50 € la portion**, à comparer au prix moyen d'un repas à emporter
déclaré par le client ou par défaut.

**Sources à citer** (vérifier la dernière édition avant mise en production)

| Donnée | Source | Valeur relevée |
|---|---|---|
| Part de l'alimentation dans le budget | Insee, *Les dépenses des ménages en France en 2017*, enquête Budget de famille ([insee.fr/fr/statistiques/4648335](https://www.insee.fr/fr/statistiques/4648335)) | 15,6 % du budget hors tabac et alcool ; la hausse depuis 2011 vient surtout de la restauration hors domicile ([Insee Première n° 1749](https://www.insee.fr/fr/statistiques/4127596)) |
| Gaspillage des ménages (quantité) | ADEME, *Pertes et gaspillages alimentaires : l'état des lieux et leur gestion par étapes de la chaîne alimentaire* (2016) ([copie ARS Normandie](https://www.normandie.ars.sante.fr/sites/default/files/2017-02/1._ADEME_-_Etude_pertes_et_gaspillages_alimentaires.pdf)) | ≈ 30 kg/personne/an au domicile, dont ≈ 7 kg encore emballés |
| Gaspillage des ménages (coût) | ADEME / Verdicité, étude foyers témoins (2015) | ≈ 159 €/personne/an, soit 7,7 % des dépenses alimentaires du foyer |

> **Règle de crédibilité** : seuls les chiffres Insee et ADEME portent la mention
> « source officielle ». Le prix moyen d'un repas à emporter n'a pas de statistique
> publique directe : il est affiché comme **« hypothèse Lab's Food »** ou remplacé par la
> valeur du client. Une économie présentée comme certaine alors qu'elle repose sur une
> hypothèse exposerait à un grief de **pratique commerciale trompeuse**.

**Axes** — T 3 (déjà en partie présent) · P 0 · D **5** (c'est le sujet) · R 1

**Valeur perçue 55/100** — vue surtout au moment du réabonnement, mais c'est elle qui
transforme « 220 € » en « 5,50 € la portion, X € économisés ». Différenciante : peu de
concurrents chiffrent le crédit d'impôt et le gaspillage évité ensemble.

**Intégration 5/5 · Effort ~3 j.**

**Consentement à payer** : **0 €**. Elle doit rester gratuite : c'est un argument de
vente, à réutiliser aussi sur la page publique `avantage-fiscal` et dans la console
admin (économie moyenne par client).

---

### 3.3 Algorithme d'optimisation des ingrédients (chef)

**L'idée** : aider le chef à composer des menus dont les plats **partagent les mêmes
ingrédients de base** (un oignon, une crème, un bouquet d'herbes qui servent trois
plats).

**Ce qui existe déjà**

- `Meal.ingredients` (JSON) et le référentiel `CatalogIngredient` (nom, alias,
  régimes, mois de saison), avec un rattachement ligne par ligne.
  `Meal.classification` passe à « non calculé » tant qu'une ligne n'est pas rattachée.
- `Menu` / `MenuDish` : la composition des menus, et `ChefShowcaseWeek` pour la vitrine.

**Ce qu'il faut faire**

1. Un **score de mutualisation** par menu : part des ingrédients communs à au moins deux
   plats, pondérée par la quantité.
2. Dans l'éditeur de menu (`espace-chef/offres` / `vitrine`) : « Ajouter un plat qui
   réutilise *crème, échalote, coriandre* », classé par recouvrement, puis par saison
   (`seasonMonths`), régimes compatibles et allergènes du client.
3. Un indicateur « restes probables » : les ingrédients achetés pour un seul plat dans
   un conditionnement plus grand que la quantité utilisée.

**Axes (chef)** — T 4 (une mise en place commune, moins d'articles) · P 3 (moins de
pertes, plus de prestations par jour) · D 4 (côté client via les courses) · R 2

**Valeur perçue 67/100.**

**Intégration 3/5 · Effort ~8 j.** Le recouvrement est calculable dès aujourd'hui sur
les lignes rattachées au référentiel. Il n'y a ni prix ni unité d'achat dans
`CatalogIngredient` (« pas d'unités d'achat dans cette version ») : impossible d'afficher
une économie **en euros** sans enrichir le référentiel. La v1 parle en nombre d'articles
et en restes évités.

**Consentement à payer** : 5-10 €/mois, dans une offre « Chef Pro » avec le § 3.5.

---

### 3.4 Calculateur d'impact nutritionnel (client)

**L'idée** : un tableau de bord de l'apport nutritionnel des plats préparés, à la
semaine, au mois et à l'année, pour valoriser l'aspect santé de l'offre.

**Ce qui existe déjà** : `Meal.calories` (par portion, optionnel, saisi en admin).
Rien d'autre : ni macros, ni fibres, ni sel, ni données nutritionnelles dans
`CatalogIngredient`.

**Ce qu'il faut faire**

1. Rattacher `CatalogIngredient` à la table **Ciqual de l'ANSES** (référence officielle
   française, ouverte).
2. Exprimer chaque ligne de recette en grammes : conversions d'unités (« 1 botte »,
   « 2 c. à s. »), rendement à la cuisson.
3. Calculer par portion, puis agréger par `BookingMeal.portions` sur la période.

**Cadre à sécuriser avant de coder**

- **Nutri-Score** : le logo est encadré par le règlement d'usage de Santé publique France
  (enregistrement préalable) et conçu pour des produits préemballés. Ne pas afficher le
  logo officiel sur des plats faits maison sans validation juridique. La v1 affiche un
  **profil nutritionnel estimé**.
- **Allégations santé** (règlement CE 1924/2006) : pas de « bon pour la santé » sans
  allégation autorisée.
- **Données de santé** : rester au niveau du foyer, sans profil individuel. Les
  allergies sont déjà traitées comme données de santé (consentement
  `healthConsentAt`), il ne faut pas élargir ce périmètre sans analyse RGPD.

**v1 recommandée (~8 j)** : « équilibre de la semaine » (légumes / protéines /
féculents, variété des cuisines, kcal estimées), sans macros ni logo.
**v2 (~12 j de plus)** : macros Ciqual.

**Axes** — T 1 · P 0 · D 1 · R 3 (santé sur le long terme)

**Valeur perçue 39/100** — forte pour un segment (parents, sportifs, régimes médicaux),
faible pour la majorité.

**Intégration 2/5 · Effort ~20 j** (version complète).

**Consentement à payer** : 3-6 €/mois, sur le segment santé uniquement. Bon candidat
pour une option premium plutôt que pour le socle.

---

### 3.5 Générateur de recettes et liste d'achat multi-clients (chef)

**L'idée** : si le chef a trois clients la même semaine avec des menus proches, l'outil
**additionne les quantités** pour un seul passage chez le grossiste, au marché ou au
drive, **tout en gardant la répartition par client**.

**Ce qui existe déjà**

- `ShoppingList` / `ShoppingItem` par réservation, avec rayon (`aisle`), quantité
  numérique (`qty`) et unité (`unit`), lignes modifiées ou barrées par le chef
  (`edited`, `removed`) et réponses du client (`clientMarks` : « je l'ai déjà »).
- Les règles dans `shopping-lists/domain/shopping-list.rules.ts`.
- `Booking.shoppingByClient` : on sait qui fait les courses.

**Ce qu'il faut faire**

1. `GET /me/chef/shopping?from=…&to=…` : regroupe les listes des réservations du chef
   sur la période, **après** application des marques client, par (ingrédient du
   référentiel, unité), avec le détail par client.
2. Écran « Ma tournée de courses » : une liste par rayon, chaque ligne
   « 1,2 kg oignons — Martin 400 g · Durand 500 g · Leroy 300 g », cases à cocher.
3. Export imprimable et PDF ; panier drive plus tard (aucune API standard).

**Contrainte bloquante : le mandat de débours.** Les courses doivent être refacturées
**au centime près, sans marge**, sur une ligne distincte (RG-31, voir
`docs/api/MANDAT-DE-DEBOURS-ANALYSE.md`). Un achat groupé brouille la preuve. Deux
options à trancher :

- **a.** un ticket de caisse par client (passage en caisse séparé) : simple, sûr, mais
  moins pratique ;
- **b.** un ticket unique, avec une clé de répartition au prorata des quantités, que
  l'outil calcule et joint à chaque débours : plus pratique, mais à valider par
  l'expert-comptable.

Tant que ce n'est pas tranché, livrer la **liste agrégée** (le gain de temps) sans la
répartition des montants.

**Axes (chef)** — T **5** (un trajet au lieu de trois) · P 4 (plus de clients par
semaine sans plus de logistique) · D 3 (prix de gros, carburant) · R 3 (moins
d'oublis, débours traçables)

**Valeur perçue 85/100** — la plus haute. Utilisée chaque semaine et directement
convertible en euros. Rien d'équivalent chez les plateformes généralistes.

**Intégration 4/5 · Effort ~7 j.** Le seul point dur technique : normaliser les unités
(`quantity` reste une chaîne libre quand `qty`/`unit` sont vides).

**Consentement à payer : 10-20 €/mois.** Calcul : 3 clients par semaine, 2 trajets
évités × 45 min ≈ 1,5 h/semaine ≈ 6 h/mois. Valorisé à 25 €/h, cela fait ≈ 150 €/mois
de valeur. En capter 10 % donne ≈ 15 €/mois. À comparer à la commission actuelle de
15 % (`PlatformSetting`, 1 500 points de base) : alternative possible, une commission
réduite pour les chefs qui prennent l'offre Pro.

---

### 3.6 Messages prédéfinis dans la messagerie (chef)

**L'idée** : valider en deux clics les détails logistiques récurrents avec le client :
accès, digicode, stationnement, matériel disponible.

**Ce qui existe déjà**

- La messagerie complète : `Conversation` unique par paire client/chef, `Message`,
  pièces jointes, notifications Brevo.
- `ClientProfile.kitchenNotes`, déjà saisi dans `espace-client/profil`.
- La détection de coordonnées (`contactFlaggedAt`) : les modèles ne doivent pas la
  déclencher.

**Ce qu'il faut faire**

1. **Modèles** : un jeu fourni par Lab's Food (« Je confirme ma venue le {date} à
   {heure} », « Pouvez-vous me donner le code d'accès ? ») plus les modèles personnels
   du chef, avec des variables tirées de la réservation.
2. **Checklist logistique structurée** : un message spécial auquel le client répond par
   cases (four oui/non, plaques induction/gaz, robot, nombre de boîtes de conservation,
   place au congélateur, accès, stationnement). Les réponses sont enregistrées dans le
   profil client (version structurée de `kitchenNotes`) : **demandé une fois, réutilisé
   à chaque prestation**, et visible dans la fiche de prestation du chef.
3. Envoi automatique proposé à J-3 si la checklist n'est pas remplie.

**Axes (chef)** — T 4 · P 1 · D 1 · R **4** (évite d'arriver sans code, sans plaques
compatibles ou sans boîtes : prestation ratée, litige). Côté client : T 2 · R 3.

**Valeur perçue 54/100** — fonctionnalité attendue, peu différenciante, mais elle évite
les incidents qui coûtent le plus cher en avis négatifs (`espace-chef/litiges`).

**Intégration 5/5 · Effort ~4 j** (modèles seuls : ~2 j).

**Consentement à payer** : 0-3 €/mois. À inclure pour tous ; les modèles personnalisés
illimités peuvent rejoindre l'offre Pro.

---

## 4. Pistes complémentaires

Même grille, notées plus sommairement.

| Idée | Pour | T | P | D | R | Valeur | Intég. | Effort | Commentaire |
|---|---|---|---|---|---|---|---|---|---|
| **Tournées par quartier** : suggérer au chef des créneaux voisins (même ville, même jour) | Chef | 4 | 4 | 3 | 1 | ~64 | 4 | ~5 j | `Booking.addressCity` / `addressPostalCode` et l'agenda existent ; complète bien le § 3.5 |
| **Estimation du budget courses avant la prestation** (fourchette de débours) | Client | 1 | 0 | 3 | 4 | ~44 | 3 | ~6 j | Rassure sur le débours au centime ; dépend des prix du référentiel (comme le § 3.3) |
| **Photo-checklist de fin de prestation** (cuisine rangée, plats étiquetés) | Chef + client | 1 | 1 | 0 | 5 | ~41 | 5 | ~3 j | `BookingPhoto` existe ; preuve en cas de litige, rassure le client |
| **Réservation récurrente** (« même formule toutes les 2 semaines, menus selon mes goûts ») | Client + chef | 4 | 4 | 1 | 2 | ~65 | 3 | ~10 j | `favorites` / `dislikes` du profil + `ChefShowcaseWeek` ; le plus fort levier de chiffre d'affaires récurrent |

---

## 5. Packaging conseillé

| Offre | Contenu | Prix (hypothèse) | Rôle |
|---|---|---|---|
| **Client – socle** | ROI, planificateur, checklist logistique | inclus | Conversion et rétention |
| **Client – Foyer+** | Nutrition, réservation récurrente prioritaire | 3-6 €/mois ou intégré à la formule à 320 € | Montée en gamme |
| **Chef – socle** | Messages prédéfinis, photo-checklist | inclus | Moins d'incidents |
| **Chef – Pro** | Liste multi-clients, optimisation ingrédients, tournées par quartier, modèles illimités | 14,90 €/mois, ou commission réduite | Nouveau revenu, fidélise les meilleurs chefs |

## 6. Avant de lancer

1. **Tester les prix avant de développer le Lot C** : quelques entretiens chefs avec une
   maquette de la liste multi-clients et la question des 4 prix (Van Westendorp).
2. **Trancher le débours groupé** (option a ou b du § 3.5) avec l'expert-comptable.
3. **Valider le cadre nutrition** (Nutri-Score, allégations) avant toute ligne de code
   du § 3.4.
4. **Mesurer** : taux de réabonnement (ROI, planificateur), nombre de clients par chef
   et par semaine (liste multi-clients), part des prestations avec checklist remplie et
   taux de litige (messages prédéfinis).
5. Une fois arbitré, reporter les lots retenus dans `docs/pilotage/01-backlog.csv`
   (une ligne design + une ligne intégration par action, selon la convention du
   classeur).
