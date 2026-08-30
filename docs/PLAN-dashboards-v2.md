# Plan de mise à jour — Dashboards Lab's Food (client + batch cooker)

Phase 1 du brief `BRIEF-Mise-a-jour-UI-LabsFood.md` : audit d'écart, inventaire
des modules, découpage Jira et séquencement. **Aucun code applicatif modifié.**

Repo audité : `labs-food` (front client) · branche `feat/dashboards-v2`.

---

## 0. Corrections factuelles au brief

Trois points du brief ne correspondent pas au code réel. À trancher avant le
chiffrage, sinon l'estimation sera fausse.

| # | Le brief dit | Réalité du code | Impact |
|---|---|---|---|
| **0.1** | « Un frontend existe déjà pour le dashboard client **et le dashboard batch cooker** » | **Le dashboard batch cooker n'existe pas.** Aucun répertoire `chef`/`cook`/`batch`/`pro` dans `app/`. `app/chefs/` est une page **vitrine publique**, pas un espace connecté. | **Majeur.** Ce n'est pas « mesurer un écart » côté BC, c'est **construire ~20 écrans depuis zéro**. C'est le plus gros poste du chantier. |
| **0.2** | § 6.1 : « si le code contient `avanceImmediate: boolean` sur l'utilisateur, c'est un bug de modèle » | **Aucun booléen de ce type.** Aucun modèle de paiement n'existe côté client. « Avance immédiate » n'apparaît que comme **libellé d'une carte KPI** dans `statistiques`. | Pas de dette à corriger : terrain vierge. On peut modéliser correctement (par couple client-prestataire) du premier coup. |
| **0.3** | Architecture cible client = 6 entrées | Le code a **8 entrées**, dont `Statistiques` qui **n'existe pas dans la cible**. | À arbitrer : fusionner les stats dans Accueil (« indicateurs factuels ») ou les garder en P1. |

**Bonne nouvelle** : trois briques réutilisables existent déjà — la **liste de
courses par rayons** (dans `commandes/[id]`), le module **Personnalisation**
(base du sur-mesure) et l'affichage **après crédit d'impôt** (`amountAfterTax`).
Elles font gagner du temps sur CL-05, CL-07 et § 6.3.

---

## 1. Tableau d'écart — Dashboard CLIENT

Code existant : 10 écrans sous `app/espace-client/`.

| Écran cible (§ 4.2) | État dans le code | Action | Détail |
|---|---|---|---|
| **Accueil** — carte culinaire, indicateurs, prochaine session + timeline | `page.tsx` existe | **modifier** | **Carte culinaire absente** (0 occurrence « pays »/`country`). Indicateurs et prochaine session présents. Timeline à aligner sur Confirmée → Liste de courses → Contact J-2 → Prestation. |
| **Réserver › Trouver un batch cooker** | absent | **créer** | Aucune recherche/annuaire de chef dans l'espace connecté. |
| **Réserver › Fiche batch cooker** (CL-11) | absent (vitrine publique ≠ fiche) | **créer** | Menus, note, HACCP, CESU, avance immédiate, courses + tarif, langues. |
| **Réserver › Composer ma session** | `reservation/page.tsx` (étapes plats → infos → paiement) | **modifier** | Le parcours démarre aux **plats**, pas au **choix du chef**. Or § 6.1 impose : chef d'abord, options de paiement calculées **après**. Inversion de l'ordre des étapes. |
| **Réserver › Demande sur-mesure** (CL-07) | `personnalisation/page.tsx` — formulaire + statuts | **modifier** | Le formulaire existe (personnes, plats, régimes, statuts). **Le cycle d'offre manque** : Envoyée → Vue → Acceptée / Refusée / Expirée, contre-offre, durée de validité. |
| **Réserver › Paiement** (CL-02) | étape `paiement` dans `reservation` | **modifier** | Un seul circuit implicite. **CB / avance immédiate / CESU absents** (0 occurrence CESU). Pas de restriction aux moyens acceptés par ce chef. |
| **Mes sessions › À venir / Réalisées** | `commandes/` + `commandes/[id]` | **modifier** | Statuts actuels `pending/confirmed/shopping/cooking/delivered/cancelled` → cible `En attente / Confirmée / À venir / Réalisée / Annulée / Litige`. Remappage + état **Litige**. |
| **Mes sessions › Annulées / en litige** | absent | **créer** | 0 occurrence « litige ». |
| **Ma liste de courses** (CL-05) | **embarquée** dans `commandes/[id]` (`shoppingList` par rayons) | **extraire + enrichir** | Base solide. Manque : case « J'ai déjà », export PDF, bouton « Faire mes courses » (presse-papier + enseigne), sélecteur d'enseigne, log d'usage. |
| **Messagerie** (CL-08) | `messages/page.tsx` | **modifier** | Pas de **filtrage des coordonnées**, pas de **contact chef à J-2** (0 occurrence). Anti-désintermédiation entièrement à implémenter. |
| **Mon compte › Profil & foyer** | `profil/page.tsx` | **conserver** | Foyer, régimes, allergies, goûts déjà branchés sur l'API. |
| **Mon compte › Adresses** | absent | **créer** | |
| **Mon compte › Moyens de paiement** | absent | **créer** | |
| **Mon compte › Avance immédiate** (par prestataire) | absent | **créer** | ⚠️ Liste de **rattachements par couple client-prestataire**, jamais un interrupteur global (§ 6.1). |
| **Mon compte › Notifications / Sécurité / Données** | `parametres/page.tsx` | **modifier** | Vérifier la suppression de compte RGPD (P0). |
| **Réchauffage & conservation** (CL-09) | quasi absent (1 occurrence) | **créer** | Par plat : mode/durée, frigo/congélateur, DLC, conditionnement. |
| **Menus / fiche plat** (CL-06) | `menus/page.tsx` | **modifier** | Garantir **fiche plat = composition + allergènes + pays**, jamais la recette (§ 6.5). Association plat → pays pour alimenter la carte culinaire. |
| **Statistiques** | `statistiques/page.tsx` | **à reclasser** | Hors architecture cible → fusionner dans Accueil ou repasser en P1. |

**Synthèse client** : 3 écrans conservables · 8 à modifier · 7 à créer.

---

## 2. Inventaire — Dashboard BATCH COOKER (100 % à créer)

Aucun écran n'existe. Structure cible : 5 groupes, mobile-first.

| Groupe | Écrans | Réf. | Prio |
|---|---|---|---|
| **PILOTAGE** | Accueil (alertes conformité, prochaine prestation, jauge CA vs plafond 77 700 €) | BC-01 | P0 |
| | Demandes : nouvelles + historique | BC-02 | P0 |
| | **Offres sur-mesure** : reçues · composeur · suivi | BC-03 | P0 |
| | Prestations : à venir · en cours (checklist hygiène) · historique | BC-02 | P0 |
| | Agenda : créneaux, disponibilités, zone | BC-09 | P0 (synchro P2) |
| **MON OFFRE** | Menus & recettes : mes recettes · **recettes IA** · bibliothèque · mes menus | BC-04 / BC-05 | P0 / P1 |
| | Mes tarifs — **saisie en net perçu** (§ 6.2) | BC-04 | P0 |
| | Ma vitrine : badges, langues, moyens acceptés, aperçu client | BC-10 | P0 |
| **MON ARGENT** | Revenus & paiements : solde · détail · **par moyen de paiement** · factures | BC-06 | P0 |
| | **Mode de rémunération** : commission vs abonnement 0 % | BC-07 | P0 |
| **MON DOSSIER** | Conformité : bloquants · recommandés · alertes J-60/J-30/J-7 | BC-08 | P0 |
| | Paramètres | — | P0 |
| **RELATION** | Messagerie (fil par prestation + support, envoi d'offre) | BC-11 | P0 |
| | Avis & réputation | BC-12 | P1 |
| | **Litiges & support** | BC-13 | P0 |

**+ Onboarding batch cooker (absent, ~6 étapes)** — c'est le « flow de création
de compte » manquant : candidature → droit d'exercer (A/B/C/D) → statut
d'entreprise (dont « en attente d'immatriculation ») → voie SAP (Type A / Type B)
→ vérification d'identité PSP + RIB + CGU + mandats (facturation & SEPA B2B) →
machine à états du dossier (Brouillon → En attente d'immatriculation → Pièces à
compléter → En vérification → Validé → Suspendu → Désactivé).
Réf. ON-01 → ON-07, S-06.

---

## 3. Modules → besoins backend (support du briefing)

Ce que le front devra consommer. À confronter à l'existant (`/me`,
`/me/profile`, `/admin/clients`, `/admin/users`) — **tout le reste est à créer**.

| Domaine | Endpoints attendus | Réf. |
|---|---|---|
| **Comptes & rôles** | rôle `chef` opérationnel ; onboarding BC (candidature, pièces, états) ; machine à états du dossier | ON-01→05, S-06 |
| **Référentiels** | pays ISO, 14 allergènes INCO, catégories, régimes, unités + conversions, rayons, enseignes — **éditables sans redéploiement** | S-01, AD-07 |
| **Recettes** | CRUD recette structurée + **versionnage** (versions vitrine figées) ; génération des 3 fiches dérivées ; catalogue IA + **consentement journalisé** | S-02, S-03, BC-04, AD-01→03 |
| **Journal d'audit** | append-only : acteur, recette + version, origine (chef/IA), action, consentement, contexte technique | S-04, AD-05 |
| **Offres sur-mesure** | demande client → offre BC (prix libre, conditions, validité) → cycle Envoyée/Vue/Acceptée/Refusée/Expirée → conversion en prestation | BC-03, CL-07 |
| **Prestations** | machine à états ; checklist hygiène ; liste de courses générée ; libération du contact **J-2** | BC-02, CL-03 |
| **Paiements** | 3 moyens / **2 circuits** ; split CB ; avance immédiate URSSAF (fenêtre 48 h, J+2 / J+4) ; CESU/CRCESU ; commission + **mandat SEPA B2B** | PA-01→07 |
| **Rattachement URSSAF** | ⚠️ ressource **par couple client-prestataire**, pas un flag utilisateur | § 6.1 |
| **Rémunération BC** | mode exclusif commission/abonnement, préavis, historique de facturation, états | BC-07 |
| **Conformité** | documents typés + expiration + rappels J-60/30/7 + suspension automatique | BC-08, ON-07 |
| **Messagerie** | fil par prestation + support, pièces jointes, **filtrage des coordonnées côté serveur** | BC-11, CL-08 |
| **Litiges** | ouverture, catégories, PJ, statuts Ouvert → En traitement → Résolu | BC-13 |
| **Notifications** | push / in-app / e-mail, déclencheurs demandes, offres, documents, versements, litiges | S-05 |

---

## 4. Découpage Jira (epics + séquencement)

Epics ordonnées selon le séquencement en lots (§ 5.7). Étiquette
`bloqué-décision-client` sur tout ce qui dépend du § 7.

| Ordre | Epic | Contenu | Lot |
|---|---|---|---|
| 1 | **Socle & référentiels** | S-01 → S-06, AD-07 | Lot 0 |
| 2 | **Conformité documentaire** | ON-01→05, ON-07, BC-08, AD-06 + onboarding BC | Lot 1 |
| 3 | **Recettes & IA** | BC-04 (A), BC-10, AD-01→03, AD-05, CL-06, CL-11, puis BC-04 (B) | Lot 2 |
| 4 | **Offres sur-mesure** | BC-03, CL-07 | Lot 3 |
| 5 | **Messagerie sécurisée** | BC-11, CL-08 (+ anti-désintermédiation J-2) | Lot 3 |
| 6 | **Transaction & sessions** | BC-02, BC-09, CL-02, CL-03, CL-04 | Lot 3 |
| 7 | **Paiements** | PA-01→03, PA-05, PA-06, BC-06, puis PA-04 | Lot 4 |
| 8 | **Mode de rémunération** | BC-07 | Lot 4 |
| 9 | **Liste de courses** | CL-05, PA-07 | Lot 5 |
| 10 | **Post-prestation & litiges** | CL-09, BC-05, BC-13 | Lot 5 |
| 11 | **v2** | synchro agenda, BC-12, CL-10, export comptable, i18n complet | Lot 6 |

Format story (§ 9) : titre à l'impératif · contexte en une phrase · critères
Étant donné / Quand / Alors · référence feuille de route · étiquette
`nouveau` / `modification` / `obsolète` · estimation relative.

---

## 5. Décisions client bloquantes (§ 7) — à sortir de la réunion

Rien de tout cela ne doit être codé en dur.

### ✅ Décisions prises

| Sujet | Décision | Conséquence |
|---|---|---|
| **Préavis de changement de mode** | **30 jours** (lève la contradiction 15/30 de la doc) | Valeur de configuration, pas une constante en dur (BC-07) |
| **Voie SAP** | **Type B (coopérative) en premier**, Type A plus tard | ⚠️ Modéliser **les deux voies dès maintenant** dans le référentiel ; n'exposer que la B dans l'UI. En Type B : facture SAP + attestation fiscale **masquées** (§ 3.4). Coder B en dur = refonte au moment d'ajouter A. |

### ⏳ Décisions encore attendues

1. Taux de commission · montant de l'abonnement
2. Règle de prise d'effet du changement de mode
3. **Politique d'annulation** — non spécifiée à ce jour
4. Référentiels : pays, allergènes, catégories, unités, rayons, enseignes
5. Périmètre liste de courses : presse-papier (MVP) vs envoi vers un drive

---

## 5 bis. Modèle retenu — KYC & suivi du dossier batch cooker

Contrainte de départ : **le BC ne peut pas fournir toutes ses pièces en une
fois**. Le modèle doit donc être asynchrone, reprenable, et ne jamais bloquer
inutilement.

### Un seul module, deux visages

Pas de séparation « suivi de recrutement » / « mes documents » : c'est la même
donnée à deux moments de vie. Un module unique **« Mon dossier »** dont la
présentation s'adapte à l'état :

- **avant validation** → guidée : progression, prochaine action, ce qui bloque ;
- **après validation** → maintenance : expirations, renouvellements, badges.

### Deux machines à états (et une seule est saisie)

**1. Par document** — chaque pièce évolue indépendamment :
`Manquant → Déposé → En vérification → Validé`
(+ `Refusé` **avec motif**, `Expire bientôt`, `Expiré`)

**2. Le dossier — état *calculé*, jamais saisi à la main** (S-06) :

| État dossier | Règle de dérivation |
|---|---|
| Brouillon | candidature entamée |
| En attente d'immatriculation | tout est conforme **sauf** le SIRET (branche parallèle, pas une étape) |
| Pièces à compléter | ≥ 1 document bloquant manquant ou refusé |
| En vérification | tous les bloquants déposés, en attente de revue admin |
| **Validé** | tous les bloquants validés → **peut recevoir des missions** |
| Suspendu | un bloquant a expiré, ou action admin |
| Désactivé | fin de relation |

Le BC dépose ses pièces dans l'ordre qu'il veut, sur plusieurs jours ; l'état se
recalcule seul. Aucun wizard bloquant à compléter d'un trait.

### Règle d'accès : le verrou porte sur les missions, pas sur le dashboard

Dès la création du compte, le BC accède au dashboard et peut **préparer son
offre** (profil, vitrine, recettes, tarifs). Ce qu'il ne peut pas faire tant que
le dossier n'est pas `Validé` : **apparaître dans la recherche** et **accepter
une prestation**. Il avance pendant que l'admin vérifie.

### Trois familles de documents (BC-08)

- **Bloquants** — conditionnent l'activation : identité, titre de séjour,
  immatriculation, mandats + CGU, vérification d'identité PSP.
- **Recommandés** — ne bloquent pas, alimentent les **badges** vitrine :
  RC Pro, HACCP, récépissé DDPP, casier n° 3, attestation de vigilance.
- **Conditionnels** — dépendent des choix : CESU accepté → CRCESU ;
  publics fragiles → agrément + casier ; **voie SAP → pièce attendue différente
  en Type A (déclaration NOVA) et en Type B (rattachement coopérative)**.

⚠️ La liste des pièces est donc **pilotée par la donnée** (référentiel éditable,
S-01 / AD-07), pas codée en dur.

### Boucle de revue et notifications

BC dépose → admin valide ou **refuse avec motif** (AD-06) → BC notifié (S-05) →
corrige. Le motif de refus doit être affiché explicitement sur la carte du
document. Toute action est journalisée (S-04).

Expiration : rappels **J-60 / J-30 / J-7**, puis **suspension automatique** avec
message expliquant la pièce en cause et le chemin de retour.

### Où ça s'affiche

- **Accueil BC (BC-01)** : bandeau du document le plus urgent
  (ambre = à traiter, rouge = bloquant) + score de complétude.
- **Mon dossier (BC-08)** : les trois familles, une carte par document
  (statut, échéance, motif de refus, action), et l'historique du dossier.

---

## 6. Proposition pour la démo client

Le chantier complet se chiffre en mois. Pour une démo **aujourd'hui**, le
meilleur rapport impact/temps est un **prototype UI navigable du parcours batch
cooker** (données simulées, aucun backend requis) :

1. **Onboarding BC** — 4 à 6 étapes : candidature → droit d'exercer → statut
   d'entreprise → **voie SAP (Type B)** → pièces → écran « dossier en vérification ».
2. **Mon dossier** — le modèle du § 5 bis en action : trois familles de
   documents, statuts par pièce, état du dossier calculé, motif de refus,
   alertes d'expiration. C'est l'écran qui démontre le **dépôt asynchrone**.
3. **Accueil BC** — bandeau du document le plus urgent, prochaine prestation
   avec **net**, nouvelles demandes, **jauge CA vs plafond micro**.
4. **Offres sur-mesure** — demande reçue → composeur d'offre (**prix en net
   perçu**, § 6.2) → tableau de suivi des statuts.

Ces 4 écrans racontent les ruptures 3.1 / 3.3 / 3.4 et la contrainte § 6.2, en
réutilisant le design system existant. Le reste (paiements, recettes IA,
messagerie) se démontre au tableau à partir de ce document.

**Hors périmètre démo** : tout ce qui exige le backend (paiements réels,
génération IA, machine à états serveur).

---

## 7. Liste de travail complète (UI, données simulées)

Périmètre : **module batch cooker complet** (`labs-food`) + **gestion des batch
cookers côté admin** (`admin-labsfood`), en *fake data*, sans dépendance backend.
Chaque lot est livrable et démontrable indépendamment.

### LOT A — Socle BC · *prérequis de tout le reste*

| # | Tâche | Détail |
|---|---|---|
| A1 | Route group `/espace-chef` + layout | Sidebar 5 groupes, topbar, **barre basse mobile** (mobile-first § 8) |
| A2 | Garde de rôle | `chef` → accès ; `client`/`admin` → écran de refus. Réutilise `useMe()` existant |
| A3 | Jeu de données simulées | `lib/chef-mock.ts` : prestations, demandes, offres, documents, revenus, recettes |
| A4 | Machines à états partagées | Document, dossier, offre, prestation + composants `StatusBadge` dérivés |

### LOT B — Onboarding & dossier (modèle § 5 bis)

| # | Tâche | Réf. |
|---|---|---|
| B1 | Parcours candidature 4–6 étapes, **reprenable** (voie SAP = Type B) | ON-01→05 |
| B2 | **Mon dossier** : 3 familles, statut par pièce, motif de refus, expiration | BC-08 |
| B3 | Écrans d'état : « en vérification », « pièces à compléter », « suspendu » | S-06 |
| B4 | Bandeau conformité (ambre / rouge) + score de complétude | BC-01 |

### LOT C — Pilotage

| # | Tâche | Réf. |
|---|---|---|
| C1 | **Accueil BC** : alertes, prochaine prestation (net), demandes, **jauge CA vs plafond** | BC-01 |
| C2 | Demandes : file + détail + accepter / refuser / contre-proposer | BC-02 |
| C3 | **Offres sur-mesure** : reçues → composeur (**net perçu**) → suivi des statuts | BC-03 |
| C4 | Prestations : à venir · en cours (**checklist hygiène**) · historique | BC-02 |
| C5 | Agenda : créneaux, disponibilités, zone | BC-09 |

### LOT D — Mon offre

| # | Tâche | Réf. |
|---|---|---|
| D1 | Mes recettes : liste + création structurée (allergènes bloquants, photo non bloquante) | BC-04 A |
| D2 | **Recettes IA** : aperçu **verrouillé** + consentement explicite (§ 6.4) | BC-04 B |
| D3 | Bibliothèque | BC-05 |
| D4 | Mes menus (semaine / mois) | BC-04 |
| D5 | **Mes tarifs** : saisie en net perçu → prix client + après crédit d'impôt en temps réel (§ 6.2) | BC-04 |
| D6 | Ma vitrine : badges, langues, moyens acceptés, aperçu client | BC-10 |

### LOT E — Mon argent

| # | Tâche | Réf. |
|---|---|---|
| E1 | Revenus & paiements : solde, détail par prestation, **vue par moyen de paiement**. ⚠️ **Type B → facture SAP et attestation masquées** | BC-06 |
| E2 | **Mode de rémunération** : commission vs abonnement 0 %, **préavis 30 j**, historique, états | BC-07 |

### LOT F — Relation & réglages

| # | Tâche | Réf. |
|---|---|---|
| F1 | Messagerie : fil par prestation + support, **filtrage des coordonnées**, contact **J-2** | BC-11 |
| F2 | Avis & réputation | BC-12 |
| F3 | Litiges & support | BC-13 |
| F4 | Paramètres BC | — |

### LOT G — Admin : gestion des batch cookers (`admin-labsfood`)

| # | Tâche | Réf. |
|---|---|---|
| G1 | Liste des BC + filtres par **état de dossier** et badges | AD-06 |
| G2 | Fiche BC : profil, vitrine, activité | AD-06 |
| G3 | **Revue des pièces** : consulter, valider, **refuser avec motif** | AD-06 |
| G4 | Suspension / réactivation + journal des décisions | AD-06, S-04 |

### LOT H — Mises à jour du dashboard CLIENT

Les 15 écarts du tableau § 1 (carte culinaire, moyens de paiement, sur-mesure,
liste de courses autonome, réchauffage, litiges, adresses, avance immédiate…).

---

## 8. Ce qui est réaliste — paliers proposés

Les lots ci-dessus représentent **~30 écrans**. Livrés par paliers, chacun
démontrable :

| Palier | Contenu | Ce que ça démontre |
|---|---|---|
| **1 — Démo** | A + B + C1 + C3 + G1 + G3 | Le récit complet : un BC candidate, dépose ses pièces **en plusieurs fois**, l'admin valide/refuse, le BC pilote son activité et répond à une demande sur-mesure **en net perçu**. Couvre les ruptures 3.1 / 3.4 / § 6.2 et **répond à la question KYC**. |
| **2 — Pilotage complet** | C2, C4, C5 + D5 + E2 | Cycle de prestation de bout en bout + les deux contraintes dures (net perçu, rémunération 30 j) |
| **3 — Module BC complet** | D1–D4, D6, E1, F1–F4, G2, G4 | Le module batch cooker au complet |
| **4 — Client** | LOT H | Alignement du dashboard client sur la nouvelle spec |

**Recommandation** : livrer le **palier 1** en priorité. C'est le seul qui
raconte une histoire complète et vérifiable devant le client ; les paliers 2 et 3
ajoutent de la surface, pas de la compréhension.
