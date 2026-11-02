# Mandat de débours — réponses

Réponses du 31/10/2026 à `MANDAT-DE-DEBOURS-QUESTIONS.md`, croisées avec le modèle
de mandat (`6'.Template mandat de débours.docx`). Le détail technique est dans le
lot 6 du plan du module Recettes.

Le modèle de mandat va encore changer. Chaque mandat signé garde la version du
modèle : le plafond et les clauses se lisent depuis cette version, jamais depuis
une constante.

---

## Ce qui bloquait

**B2 — Le silence vaut-il engagement ?** Oui, mais l'engagement vient du mandat
signé, pas du silence seul. L'article 8 du modèle stipule que le silence vaut
confirmation (le Code civil, art. 1120, l'admet quand les circonstances le
prévoient). Le juridique doit encore confirmer que la clause tient face à un
consommateur.

- Le message avant les courses part **dans l'application et par e-mail** (Brevo).
  C'est le seul signal du module en double canal. Il donne la date des courses,
  l'heure limite et un bouton « Annuler les courses ».
- **L'heure limite** est choisie par le chef, jamais plus tôt qu'un délai minimum
  réglé dans la console (2 h au départ). Elle remplace les 30 minutes de RG-38.
  L'horloge du serveur fait foi.
- **Le silence ne vaut confirmation que si Brevo a confirmé la remise de l'e-mail
  avant l'heure limite.** Rebond, ou pas de confirmation : il faut un clic du
  client. Le chef voit « en attente du client » et ne fait pas les courses.
- On annule par le bouton, pas par un message libre dans la conversation.

**C2 — Refus des courses après T−48h.** La prestation est maintenue. Le client
achète lui-même les ingrédients de la liste finale ; il n'y a rien à rembourser.

**A1 — Le forfait courses.** Il devient les **frais de débours** : le temps du
chef pour faire les courses. C'est un service, sur la facture, éligible au
crédit d'impôt. Les ingrédients sont payés à part, au réel. *(Décidé le 28/10.)*

**C1 — Annuel ou par prestation.** Par prestation, avec un montant maximum.
*(Décidé le 28/10.)*

## Les autres réponses

**A2, A3, D1 — Attestation, commission, séparation.** Chaque paiement porte un
motif : `service` (prestation et frais de débours) ou `courses` (ingrédients).
Le reste à payer, l'index CESU et l'attestation ne comptent que `service`. Les
courses ne figurent ni sur la facture ni sur l'attestation, et la plateforme ne
prend aucune commission dessus. *(Décidé le 28/10.)*

**A5 — Tolérance de dépassement.** Aucune. Le plafond est strict : le client ne
paie jamais au-delà du maximum signé (`GROCERIES_ABOVE_MANDATE`).

**B1 — Niveau de signature.** Code reçu par e-mail via la revérification Clerk,
plus notre propre preuve : réservation, montant maximum, empreinte du document,
date, identifiant de revérification, IP, navigateur. *(Décidé le 28/10.)*

**C3 — Courses lancées avant T−48h.** Blocage strict : l'API refuse
(`GROCERY_RUN_TOO_EARLY`) et l'écran dit quand les courses ouvrent.

**C5 — Ticket mixte.** Réglé par l'article 3 du modèle : un ticket mixte est
accepté si les articles du client y sont identifiés, et seuls ceux-là sont
facturés.

**C6 — Le plafond ne bloque rien en magasin.** D'accord. Le plafond strict
s'affiche au chef avant qu'il parte ; au-delà, rien n'est refacturé.

**C7 — Litiges.** À la main pour commencer, via le statut `disputed` existant.
*(Décidé le 28/10.)*

**D2 — Identité du client.**

- Date et lieu de naissance : demandés à la signature, gardés sur la ligne du
  mandat (seulement pour les clients qui en signent un), préremplis au mandat
  suivant.
- Adresse : déjà lisible. `GET /me/profile` renvoie le profil client complet,
  dont `addressStreet`, `addressCity` et `addressPostalCode`. La demande n° 1
  semble réglée ; à vérifier de ton côté.
- IBAN : collecté et conservé par Stripe (Checkout SEPA, comme le mandat SEPA des
  chefs). On ne garde que les identifiants Stripe et les 4 derniers chiffres. Les
  courses restent payées par carte tant que le produit n'a pas décidé du
  prélèvement.

**D3 — File de tâches différées.** Même modèle que les rappels du lot 4
(réservation de la ligne par `UPDATE`) : chaque échéance survit à un redémarrage
et ne s'exécute qu'une fois.

**D4 — PDF et archivage.** Le rendu existe déjà côté chef :
`LF-BackEnd/apps/src/modules/payments/sepa-mandate-document.ts` (pdfkit, PDF/A).
Le mandat de débours suit le même modèle, rangé dans le bucket privé
`labsfood-kyc` et lisible dans les documents du client.

**D6 — Accusé de remise.** Retenu. Journal par canal : `messageId` Brevo,
événements de remise et de rebond reçus par un webhook Brevo (à créer : aucun
n'existe), création et lecture de la notification dans l'application.

## La liste de courses côté client

Ta proposition est retenue. Amender et confirmer la liste (cocher « J'ai déjà »,
commenter, renvoyer la liste finale) se construit **juste après le lot 0**, sur
sa propre branche, avant les lots 1 à 3.

## Encore ouvert

| # | Question | Qui répond |
|---|---|---|
| B2 | La clause de silence de l'article 8 tient-elle face à un consommateur ? | Juridique |
| A4 | Durée de conservation des mandats et des tickets | Expert-comptable |
| B3 | Qui porte l'impayé | Juridique |
| C4 | Substitution d'un ingrédient sans redemander | Produit |
| D5 | Préférences de notification | Produit |
| — | Prélèvement SEPA des courses | Produit |
| — | Montant estimé des courses dans le message avant les courses | Produit |
