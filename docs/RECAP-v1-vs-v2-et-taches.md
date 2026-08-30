# Lab's Food — Récapitulatif v1 → v2 et découpage des tâches

Deux parties :
1. **Ce qu'on avait avant / ce qu'on a maintenant**, dashboard par dashboard.
2. **Tâches Jira**, module par module, avec la répartition **Frontend / Backend**.

État du code : branches `feat/dashboards-v2` (`labs-food`) et
`feat/auth-role-api` (`admin-labsfood`). UI livrée en **données simulées**,
aucun endpoint consommé côté modules v2.

---

## 1. Vue d'ensemble

| | Avant (v1) | Maintenant (v2) |
|---|---|---|
| **Rôles** | Aucun rôle applicatif. Un seul type d'utilisateur. | 3 rôles (`client` / `chef` / `admin`) issus de `GET /me`, gardes de route et redirection par rôle. |
| **Espace batch cooker** | **Inexistant.** | **16 écrans** + onboarding en 6 étapes. |
| **Onboarding chef** | Inexistant. | Parcours reprenable, dépôt de pièces asynchrone, machine à états du dossier. |
| **Modèle économique** | Prix de vente saisi en dur, un seul circuit d'argent. | Saisie en **net perçu**, 3 moyens de paiement / 2 circuits, 2 modes de rémunération. |
| **Offre sur-mesure** | Formulaire de demande sans réponse structurée. | Cycle d'offre complet (Envoyée → Vue → Acceptée / Refusée / Expirée) avec composeur. |
| **Conformité** | Aucune notion. | Coffre à documents typés, expirations, suspension, revue admin avec motif. |
| **Anti-désintermédiation** | Aucune. | Masquage des coordonnées en messagerie, contact chef à J-2. |
| **Admin** | Gestion clients uniquement. | + Gestion des batch cookers et revue des pièces. |

---

## 2. Dashboard CLIENT — avant / après

| Module | Avant (v1) | Après (v2) | État |
|---|---|---|---|
| Accueil | Hero + prochaine session + raccourcis | **+ Carte culinaire** (pays explorés / 195, détail par pays) | ✅ livré |
| Réserver | Parcours démarrant aux **plats** | **+ Annuaire des chefs** + fiche (badges, langues, courses) ; moyens de paiement calculés **après** le choix du chef | ✅ livré |
| Mes sessions | Statuts `pending → delivered` | Statuts alignés + états Annulée / Litige | 🟡 partiel (écran litiges client à finir) |
| Liste de courses | **Imbriquée** dans le détail de commande | **Module autonome** : rayons, « j'ai déjà », export, « Faire mes courses » (presse-papier + enseigne), sélecteur d'enseigne | ✅ livré |
| Réchauffage & conservation | Inexistant | Par plat : mode, durée, frigo/congélateur, conditionnement, astuce | ✅ livré |
| Messagerie | Fil simple | Masquage coordonnées + contact J-2 (côté chef livré ; côté client à aligner) | 🟡 partiel |
| Mon compte | Profil + paramètres | **+ Adresses**, **+ Moyens de paiement**, **+ Avance immédiate par prestataire** (§ 6.1) | ✅ livré |
| Profil & goûts | Préférences | Inchangé (déjà branché sur `/me/profile`) | ✅ conservé |
| Demande sur-mesure | Formulaire + statuts | Cycle d'offre à brancher côté client | 🟡 partiel |
| Statistiques | Écran dédié | Hors architecture cible — à fusionner dans l'accueil | ⏳ à arbitrer |

## 3. Dashboard BATCH COOKER — avant / après

**Avant : rien n'existait.** Tout ce qui suit est nouveau.

| Groupe | Écrans livrés |
|---|---|
| Onboarding | `/devenir-chef` — 6 étapes reprenables, voie SAP Type B, dépôt partiel accepté |
| Pilotage | Accueil (alerte conformité, net, jauge CA/plafond 77 700 €), Demandes, **Offres sur-mesure** (composeur en net perçu), Prestations (checklist hygiène), Agenda |
| Mon offre | Menus & recettes (+ **recettes IA verrouillées par consentement**), Mes tarifs (net → prix client → après crédit d'impôt), Ma vitrine |
| Mon argent | Revenus (détail par moyen de paiement, **factures SAP masquées en Type B**), Mode de rémunération (**préavis 30 j**) |
| Mon dossier | **Mon profil (éditable)**, Conformité (3 familles, motif de refus, expirations), Paramètres |
| Relation | Messagerie (masquage coordonnées, J-2), Avis, Litiges |

## 4. Console ADMIN — avant / après

| Module | Avant | Après | État |
|---|---|---|---|
| Clients | Mock local | Branché sur `GET/PATCH /admin/clients` | ✅ livré |
| **Batch cookers** | Inexistant | Liste (filtres par état de dossier, compteur « à revoir ») + fiche + **revue des pièces (valider / refuser avec motif)** + suspension | ✅ livré (mock) |
| Authentification | — | Login Clerk + garde de rôle admin via `/me` | ✅ livré |

---

## 5. Tâches Jira — par module, Frontend / Backend

Légende : **F** = frontend · **B** = backend · 🔴 P0 · 🟠 P1 · ⚪ P2.
Les tâches marquées ✅ ont leur UI déjà livrée en données simulées : il reste le
branchement API.

### 5.1 Socle transverse (Lot 0)

| Réf | Tâche | F | B | Prio |
|---|---|---|---|---|
| S-01 | Référentiels (pays ISO, 14 allergènes INCO, catégories, régimes, unités, rayons, enseignes) éditables sans redéploiement | Consommer + sélecteurs | **CRUD + endpoints publics** | 🔴 |
| S-02 | Modèle de recette unique + 3 fiches dérivées | Formulaire structuré | **Entité + génération des fiches** | 🔴 |
| S-03 | Versionnage des recettes (versions vitrine figées) | Affichage version | **Versioning + gel** | 🔴 |
| S-04 | Journal d'audit append-only (acteur, version, origine, consentement) | Envoi de l'événement de consentement | **Stockage immuable + export** | 🔴 |
| S-05 | Notifications push / in-app / e-mail | Centre de notifications | **Moteur + déclencheurs** | 🔴 |
| S-06 | Machine à états du dossier | ✅ dérivation côté UI faite | **Source de vérité serveur** | 🔴 |
| S-07 | i18n | Architecture des clés | Libellés traduisibles | 🟠 |
| S-08 | Séparation public / interne (recette jamais exposée) | Fiche plat sans recette | **DTO publics distincts** | 🔴 |

### 5.2 Dashboard batch cooker

| Réf | Module | Frontend | Backend | Prio |
|---|---|---|---|---|
| ON-01→05 | **Onboarding** | ✅ UI livrée → brancher | `POST /chef/apply`, upload pièces, états | 🔴 |
| BC-08 | **Conformité / Mon dossier** | ✅ UI livrée → brancher | `GET/POST /chef/documents`, expiration, rappels J-60/30/7, **suspension auto** | 🔴 |
| BC-01 | **Accueil** | ✅ UI livrée → brancher | Agrégats : alertes, prochaine prestation, CA vs plafond | 🔴 |
| BC-02 | **Demandes & prestations** | ✅ UI livrée → brancher | Cycle de vie, accepter/refuser/contre-proposer, checklist hygiène | 🔴 |
| BC-03 | **Offres sur-mesure** | ✅ UI livrée → brancher | Brief → offre (prix libre, validité) → statuts → **conversion en prestation** | 🔴 |
| BC-04 A | **Recettes chef** | ✅ UI liste → formulaire complet à finir | CRUD structuré, allergènes bloquants | 🔴 |
| BC-04 B | **Recettes IA** | ✅ verrou + consentement livrés | Catalogue IA, **écriture au journal d'audit**, agent d'adaptation au foyer | 🔴 |
| BC-04 | **Tarifs (net perçu)** | ✅ UI livrée → brancher | Stockage en net, calcul prix client + après crédit d'impôt | 🔴 |
| BC-10 | **Vitrine** | ✅ UI livrée → brancher | Badges dérivés des pièces validées, score de complétude | 🔴 |
| BC-06 | **Revenus & paiements** | ✅ UI livrée → brancher | Solde, versements, détail par moyen, **masquage Type B** | 🔴 |
| BC-07 | **Mode de rémunération** | ✅ UI livrée → brancher | Modes exclusifs, **préavis 30 j**, historique, états | 🔴 |
| BC-09 | **Agenda** | ✅ UI livrée → brancher | Créneaux, dispos, zone | 🔴 |
| BC-11 | **Messagerie** | ✅ UI livrée → brancher | Fils par prestation, **filtrage coordonnées côté serveur**, J-2 | 🔴 |
| BC-13 | **Litiges** | ✅ UI livrée → brancher | Ouverture, catégories, PJ, statuts | 🔴 |
| BC-12 | **Avis** | ✅ UI livrée → brancher | Note globale + 3 critères, réponse | 🟠 |
| BC-05 | **Bibliothèque** | À construire | Fiches réutilisables, export | 🟠 |
| — | **Profil chef** | ✅ UI livrée → brancher | `PATCH /chef/profile` | 🔴 |

### 5.3 Dashboard client

| Réf | Module | Frontend | Backend | Prio |
|---|---|---|---|---|
| CL-01 | **Accueil + carte culinaire** | ✅ UI livrée → brancher | Agrégat pays explorés (via plat → pays) | 🔴 |
| CL-02 | **Réservation** | ✅ annuaire + fiche livrés ; parcours à réordonner (chef d'abord) | Recherche chefs, dispo, devis | 🔴 |
| CL-11 | **Fiche chef** | ✅ UI livrée → brancher | DTO public chef (badges, moyens, langues, tarifs) | 🔴 |
| CL-03 | **Mes sessions** | Statuts à aligner + écran litiges | Machine à états, libération contact J-2 | 🔴 |
| CL-04 | **Message de prérequis** | À intégrer (template client, sans réécriture) | Envoi à la validation | 🔴 |
| CL-05 | **Liste de courses** | ✅ UI livrée → brancher | Génération par rayons, dédoublonnage, adaptation au foyer, log d'usage | 🔴 |
| CL-06 | **Menus & fiche plat** | Garantir composition + allergènes + pays (jamais la recette) | DTO public sans recette, association plat → pays | 🔴 |
| CL-07 | **Demande sur-mesure** | Cycle d'offre à brancher | Voir BC-03 | 🔴 |
| CL-08 | **Messagerie sécurisée** | À aligner sur la version chef | Filtrage serveur, J-2 | 🔴 |
| CL-09 | **Réchauffage & conservation** | ✅ UI livrée → brancher | Fiche dérivée de la recette | 🔴 |
| CL-12 | **Compte** (adresses, moyens, **avance immédiate par prestataire**) | ✅ UI livrée → brancher | ⚠️ **Ressource par couple client-prestataire**, CRUD adresses, tokenisation cartes, suppression RGPD | 🔴 |
| CL-10 | **Avis** | À construire | Note + critères | 🟠 |

### 5.4 Console admin

| Réf | Module | Frontend | Backend | Prio |
|---|---|---|---|---|
| AD-06 | **Gestion batch cookers** | ✅ UI livrée → brancher | `GET /admin/chefs`, revue des pièces, **refus avec motif**, suspension | 🔴 |
| AD-01→03 | **Recettes IA & modération** | À construire | Génération, validation, **jamais de publication auto** | 🔴 |
| AD-05 | **Journal de traçabilité** | À construire | Consultation, filtres, export des preuves | 🔴 |
| AD-07 | **Référentiels éditables** | À construire | CRUD | 🔴 |
| AD-08 | **Supervision paiements & litiges** | À construire | Vue consolidée | 🟠 |

### 5.5 Paiements & facturation

| Réf | Tâche | Frontend | Backend | Prio |
|---|---|---|---|---|
| PA-01 | Carte bancaire (PSP marketplace, split) | Sélecteur + statuts | **Encaissement, split, reversement** | 🔴 |
| PA-02 | Avance immédiate URSSAF | ✅ statuts par prestataire livrés | Inscription, fenêtre 48 h, J+2/J+4, contestation | 🔴 |
| PA-03 | Aiguillage Type A / B | ✅ masquage Type B livré | **Couper facture SAP + attestation en Type B** | 🔴 |
| PA-05 | Mandat SEPA B2B | ✅ dans l'onboarding | Signature, facture de commission | 🔴 |
| PA-06 | Facturation (mandat, code SAP, TVA 20 % commission) | Affichage | **Génération des documents** | 🔴 |
| PA-04 | CESU préfinancé | Statut CRCESU | Déclaration, dépôt, millésime, paiement mixte | 🟠 |
| PA-07 | Débours courses | Mandat + justificatifs | Plafond, ligne distincte | 🟠 |

---

## 6. Décisions & points ouverts

### ✅ Tranché
- **Préavis de changement de mode : 30 jours.**
- **Voie SAP : Type B (coopérative) d'abord**, Type A plus tard → référentiel de
  documents modélisé pour les deux, seule la voie B exposée.

### ⏳ En attente (bloque des stories — étiquette `bloqué-décision-client`)
1. Taux de commission · montant de l'abonnement (valeurs de démo : 10 % / 39 €)
2. Règle de prise d'effet du changement de mode
3. **Politique d'annulation** — non spécifiée
4. Contenu des référentiels (pays, allergènes, catégories, unités, rayons, enseignes)
5. Périmètre liste de courses : presse-papier (livré) vs envoi vers un drive
6. **Durée max en « Pièces à compléter »** avant relance/mise en sommeil

### 🔧 Dette technique connue
- `DEMO_MODE = true` dans `app/espace-chef/layout.tsx` : tout compte connecté
  entre. À passer à `false` quand `/me` sera fiable.
- Erreur console pré-existante `<circle> attribute cy: undefined` (présente
  aussi sur la home, hors périmètre v2).
- Connexions Apple/Google masquées en CSS — **à désactiver côté dashboard Clerk**
  pour couper réellement les endpoints OAuth.
