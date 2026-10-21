# -*- coding: utf-8 -*-
"""Critères d'acceptation utilisateur — un par ligne, prêts à importer.

Le statut n'est pas une intention : il vient de l'inventaire des 236 opérations
de la spec, croisé avec les routes réellement appelées par les deux fronts.

  Livré       l'écran existe et lit l'API
  À brancher  la route existe, l'écran reste à faire
  Simulé      l'écran existe mais lit des données écrites en dur
  Bloqué      aucune route côté API
  Hors MVP    écarté par Lab's Food

Relevé du 21/10/2026. Régénérer : python build-uac.py
"""
import csv
import io
import os
from collections import Counter

ENTETES = [
    "Module", "Thème", "Réf.", "Critère d'acceptation", "Comment le vérifier",
    "Écran", "Route API", "Statut", "Validé", "Remarque",
]

PAS_DE_FORMULE = "Bloqué en pratique : aucun batch cooker n'a publié de formule (21/10)"

# (thème, réf, critère, vérification, écran, route, statut, remarque)
VISITEUR = [
    ("Carte de la semaine", "V-01", "Je peux voir les menus de la semaine.", "Ouvrir /menu : les cartes correspondent à la semaine en cours.", "/menu", "GET /menus/week", "Livré", ""),
    ("Carte de la semaine", "V-02", "Je peux filtrer par région, ville, régime et semaine.", "Choisir une région puis un régime : le nombre de cartes change, le filtre est dans l'URL.", "/menu", "GET /menus/week?region&city&diets&week", "Livré", ""),
    ("Carte de la semaine", "V-03", "Je peux chercher un plat ou un batch cooker par mot-clé.", "Taper un mot dans la recherche : les cartes se réduisent.", "/menu", "GET /menus/week?q", "Livré", ""),
    ("Carte de la semaine", "V-04", "Je vois dès l'accueil les plats réellement proposés cette semaine.", "Ouvrir / : la section montre des plats publiés et le batch cooker qui les cuisine.", "/", "GET /menus/week", "Livré", "Branché le 21/10"),
    ("Batch cookers", "V-05", "Je peux ouvrir la carte d'un batch cooker et voir ses plats.", "Cliquer « Voir sa carte » : plats, régimes, allergènes, zones et badges.", "/menu", "GET /chefs/{id}", "Livré", ""),
    ("Batch cookers", "V-06", "Je peux consulter sa vitrine publique.", "Ouvrir sa page : présentation, zones, semaines proposées.", "/chefs/{id}", "GET /chefs/{id}/showcase", "À brancher", "La fiche lit GET /chefs/{id} ; les semaines de la vitrine ne sont pas affichées"),
    ("Batch cookers", "V-07", "Je sais s'il accepte le CESU préfinancé.", "Un badge « CESU accepté » apparaît sur sa carte et sa fiche.", "/menu", "GET /menus/week (acceptsCesu)", "Livré", "Branché le 18/10"),
    ("Batch cookers", "V-08", "Je vois à partir de quel prix il intervient.", "La carte affiche « à partir de X € ».", "/menu", "GET /chefs/{id} (sessionFromCents)", "Livré", "Vide tant qu'aucune formule n'est publiée"),
    ("Candidature", "V-09", "Je peux déposer une candidature pour devenir batch cooker.", "Remplir /devenir-chef jusqu'au bout : une référence de candidature s'affiche.", "/devenir-chef", "POST /chef-applications", "Livré", ""),
    ("Candidature", "V-10", "Je reçois par email le lien qui ouvre mon espace.", "Déposer une candidature et vérifier la réception.", "email", "Clerk", "Livré", "Fragile : la console peut renvoyer le lien depuis le 21/10"),
    ("Candidature", "V-11", "Je peux déposer mes pièces avant d'avoir un compte.", "Suivre le lien reçu et téléverser une pièce.", "/devenir-chef", "—", "Bloqué", "BUG-07 : aucune route de dépôt avant création du compte"),
    ("Compte", "V-12", "Je peux créer un compte client et me connecter.", "S'inscrire, se déconnecter, se reconnecter.", "/auth", "Clerk + GET /me", "Livré", "POST /auth/register non utilisé : les comptes naissent par Clerk"),
    ("Information", "V-13", "Je peux écrire à l'équipe depuis le site.", "Envoyer le formulaire : un accusé s'affiche, le message arrive en console.", "/contact", "POST /contact-messages", "Livré", ""),
    ("Information", "V-14", "Je comprends l'avantage fiscal et ce que je paierai vraiment.", "Lire /avantage-fiscal : le crédit d'impôt de 50 % est expliqué avec un exemple.", "/avantage-fiscal", "— (contenu)", "Livré", "Contenu éditorial"),
    ("Information", "V-15", "Je trouve les réponses aux questions courantes.", "Ouvrir la FAQ et déplier une question.", "/faq", "— (contenu)", "Livré", "Contenu écrit en dur, aucune route"),
    ("Information", "V-16", "Je peux lire les avis des clients.", "Ouvrir la section avis.", "/menu", "—", "Hors MVP", "rating et reviewCount restent null"),
    ("Information", "V-17", "Je sais que le site est en construction avant de m'inscrire.", "Ouvrir n'importe quelle page : le bandeau est en haut, espaces connectés compris.", "toutes", "—", "Livré", "Posé le 21/10"),
]

CLIENT = [
    ("Compte & profil", "C-01", "Je peux me connecter et retrouver mon espace.", "Se connecter : l'espace client s'ouvre sur mon nom.", "/espace-client", "GET /me", "Livré", ""),
    ("Compte & profil", "C-02", "Je renseigne mes goûts, mes allergies et ce que je n'aime pas.", "Modifier le profil, recharger : les choix sont conservés.", "/espace-client/profil", "GET/PATCH /me/profile", "Livré", ""),
    ("Compte & profil", "C-03", "Je laisse une note pour la cuisine (équipement, habitudes).", "Écrire une note : le batch cooker la voit sur la prestation.", "/espace-client/profil", "PATCH /me/profile", "Livré", ""),
    ("Compte & profil", "C-04", "Je peux changer ma photo de profil.", "Téléverser une image : elle apparaît dans la barre du haut.", "/espace-client/profil", "POST /me/avatar/upload-url puis /confirm", "Livré", "Menu du compte et page profil"),
    ("Compte & profil", "C-05", "Je peux retirer ma photo de profil.", "Supprimer la photo : l'initiale revient.", "/espace-client/profil", "DELETE /me/avatar", "Livré", ""),
    ("Compte & profil", "C-06", "Je peux changer mon mot de passe et mon email.", "Modifier depuis les paramètres.", "/espace-client/parametres", "Clerk", "Simulé", "Écran sur données écrites en dur"),
    ("Compte & profil", "C-07", "Je peux supprimer mon compte.", "Demander la suppression : le compte ne permet plus de se connecter.", "/espace-client/parametres", "DELETE /me", "Livré", "Branché le 21/10, avec la liste des prestations bloquantes"),
    ("Trouver", "C-08", "Je parcours la carte de la semaine et je coche mes plats.", "Ouvrir une carte, cocher des plats : la sélection suit jusqu'à la réservation.", "/espace-client/menus", "GET /menus/week", "Livré", ""),
    ("Trouver", "C-09", "Je filtre les cartes comme sur le site public.", "Filtrer par régime : la liste se réduit.", "/espace-client/menus", "GET /menus/week", "Livré", ""),
    ("Réserver", "C-10", "Je choisis une formule : durée, prix, courses comprises ou non.", "Les formules du batch cooker s'affichent à l'étape « Quand et où ».", "/espace-client/reservation", "GET /chefs/{id} (serviceOffers)", "Livré", PAS_DE_FORMULE),
    ("Réserver", "C-11", "Je ne vois que des créneaux réellement libres.", "Les jours sans créneau sont éteints, les heures viennent de l'API.", "/espace-client/reservation", "GET /chefs/{id}/availability", "Livré", PAS_DE_FORMULE),
    ("Réserver", "C-12", "Je vois le prix exact avant de réserver, suppléments compris.", "Ajouter une personne et un plat : le total change et correspond au montant facturé.", "/espace-client/reservation", "GET /service-offers/{id}/price", "Livré", "Branché le 21/10"),
    ("Réserver", "C-13", "Je renseigne l'adresse, le nombre de personnes et mes consignes.", "Saisir puis réserver : tout se retrouve sur la commande.", "/espace-client/reservation", "POST /me/bookings", "Livré", ""),
    ("Réserver", "C-14", "Je peux réserver une session.", "Aller au bout : la prestation est créée « à régler » et apparaît dans Mes commandes.", "/espace-client/reservation", "POST /me/bookings", "Livré", PAS_DE_FORMULE),
    ("Réserver", "C-15", "Je peux corriger ma réservation tant qu'elle n'est pas payée.", "Changer l'adresse ou le nombre de personnes : les montants se recalculent.", "/espace-client/commandes/{id}", "PATCH /me/bookings/{id}", "Livré", ""),
    ("Payer", "C-16", "Je vois comment je peux payer cette prestation.", "Ouvrir le règlement : carte, CESU, avance immédiate selon ce que le batch cooker accepte.", "/espace-client/commandes/{id}/paiement", "GET /me/bookings/{id}/payment-options", "Livré", ""),
    ("Payer", "C-17", "Je peux payer par carte.", "Régler : la page Stripe s'ouvre, le statut passe à confirmée.", "/espace-client/commandes/{id}/paiement", "POST /payments/checkout-session", "Livré", "Dépend des clés Stripe côté API"),
    ("Payer", "C-18", "Je peux déclarer un règlement en CESU préfinancé.", "Choisir CESU, saisir l'émetteur : le batch cooker doit confirmer.", "/espace-client/commandes/{id}/paiement", "POST /payments/cesu", "Livré", ""),
    ("Payer", "C-19", "Je peux déposer la preuve de mon virement e-CESU.", "Téléverser le justificatif depuis la commande.", "/espace-client/commandes/{id}/paiement", "POST /me/bookings/{id}/cesu-proof/upload-url", "À brancher", ""),
    ("Payer", "C-20", "Je peux relire ou remplacer la preuve déposée.", "Rouvrir la commande : la preuve est consultable.", "/espace-client/commandes/{id}", "GET/PUT /me/cesu-payments/{id}/proof", "À brancher", ""),
    ("Payer", "C-21", "Je sais combien il me reste à payer.", "Ouvrir une commande partiellement réglée : le reste à payer s'affiche.", "/espace-client/commandes/{id}", "GET /me/bookings/{id}/payment-status", "À brancher", ""),
    ("Payer", "C-22", "Je peux demander l'avance immédiate auprès d'un batch cooker.", "Demander le rattachement depuis le règlement.", "/espace-client/commandes/{id}/paiement", "POST /me/urssaf-links", "Livré", ""),
    ("Payer", "C-23", "Je suis l'état de mes rattachements URSSAF.", "Compte → Avance immédiate : date de demande, réponse, motif de refus.", "/espace-client/compte", "GET /me/urssaf-links", "Livré", "Branché le 21/10"),
    ("Payer", "C-24", "Je peux régler avec l'avance immédiate.", "Choisir l'avance : je ne paie que la moitié.", "/espace-client/commandes/{id}/paiement", "POST /bookings/{id}/settle", "Livré", ""),
    ("Suivre", "C-25", "Je suis l'avancement de ma prestation, étape par étape.", "Reçue, confirmée, courses, en cuisine, livrée.", "/espace-client/commandes/{id}", "GET /me/bookings/{id}", "Livré", ""),
    ("Suivre", "C-26", "Je vois les photos prises pendant la session.", "Ouvrir une prestation terminée : les photos du batch cooker s'affichent.", "/espace-client/commandes/{id}", "GET /me/bookings/{id} (photos)", "Livré", "Branché le 21/10"),
    ("Suivre", "C-27", "Je peux accepter ou refuser un report proposé.", "Répondre à une proposition : l'horaire change ou reste.", "/espace-client/commandes/{id}", "PATCH /me/bookings/{id}/reschedule", "Livré", ""),
    ("Suivre", "C-28", "Je peux proposer moi-même un autre horaire.", "Proposer une date : le batch cooker doit l'accepter.", "/espace-client/commandes/{id}", "POST /me/bookings/{id}/reschedule", "À brancher", "Seule la réponse est branchée"),
    ("Suivre", "C-29", "Je peux annuler tant que rien n'est payé.", "Annuler : le créneau est libéré, le batch cooker prévenu.", "/espace-client/commandes/{id}", "PATCH /me/bookings/{id}", "Livré", ""),
    ("Suivre", "C-30", "Je peux mettre ma prestation dans mon agenda.", "Cliquer « Ajouter à mon agenda » : le .ics s'ouvre.", "/espace-client/commandes/{id}", "GET /me/bookings/{id}/calendar.ics", "Livré", ""),
    ("Échanger", "C-31", "Je peux écrire à mon batch cooker et lire ses réponses.", "Envoyer un message, voir la réponse arriver.", "/espace-client/messages", "GET/POST /me/conversations", "Livré", ""),
    ("Échanger", "C-32", "Je peux joindre une photo ou un document.", "Joindre un fichier, le rouvrir depuis la conversation.", "/espace-client/messages", "POST .../attachments/upload-url", "Livré", ""),
    ("Échanger", "C-33", "Je peux écrire à l'équipe Lab's Food.", "Ouvrir une conversation de support.", "/espace-client/messages", "POST /me/conversations/support", "Livré", ""),
    ("Échanger", "C-34", "Je vois le nombre de messages non lus.", "La pastille de la navigation correspond aux conversations non lues.", "espace client", "GET /me/conversations/unread-count", "Livré", ""),
    ("Sur-mesure", "C-35", "Je peux déposer une demande sur-mesure.", "Décrire l'occasion, le nombre de convives, la date souhaitée.", "/espace-client/personnalisation", "POST /quotes", "Livré", ""),
    ("Sur-mesure", "C-36", "Je suis l'avancement de ma demande.", "Les statuts : envoyée, en étude, offre reçue, acceptée, classée.", "/espace-client/personnalisation", "GET /me/quotes", "Livré", ""),
    ("Sur-mesure", "C-37", "Je peux accepter ou refuser une offre chiffrée.", "Accepter : la prestation est créée et inscrite aux deux agendas.", "/espace-client/personnalisation", "POST .../offers/{id}/accept", "Livré", ""),
    ("Sur-mesure", "C-38", "Je peux retirer ma demande.", "Retirer : elle n'attend plus de réponse.", "/espace-client/personnalisation", "DELETE /me/quotes/{id}", "Livré", ""),
    ("Fiscal", "C-39", "Je récupère mon attestation fiscale annuelle.", "Compte → Attestation fiscale : choisir l'année, lire le montant ouvrant droit.", "/espace-client/compte", "GET /me/fiscal-attestations/{year}", "Livré", "Branché le 21/10"),
    ("Pratique", "C-40", "Mon tableau de bord montre ma vraie prochaine session.", "La session affichée est celle de Mes commandes.", "/espace-client", "GET /me/bookings", "Livré", "Branché le 21/10"),
    ("Pratique", "C-41", "Mes statistiques reflètent mes prestations réelles.", "Comparer le nombre de sessions avec Mes commandes.", "/espace-client/statistiques", "GET /me/bookings", "Livré", "Branché le 21/10"),
    ("Pratique", "C-42", "Je vois les pays que ma cuisine a explorés.", "Ouvrir la carte culinaire : les pays correspondent aux plats cuisinés.", "/espace-client", "GET /me/culinary-map", "Simulé", "La route existe, la carte lit un jeu de données écrit en dur"),
    ("Pratique", "C-43", "Je vois la liste de courses de ma prestation.", "Les ingrédients sont rangés par rayon.", "/espace-client/courses", "GET /chef-missions/{id}/shopping-list", "Simulé", ""),
    ("Pratique", "C-44", "Je sais comment conserver et réchauffer chaque plat.", "Chaque plat indique sa méthode et sa durée.", "/espace-client/conservation", "réchauffe / conservation des plats", "Simulé", "Les données existent sur les plats"),
    ("Pratique", "C-45", "Je retrouve les batch cookers avec qui j'ai déjà cuisiné.", "La liste correspond à mes prestations passées.", "/espace-client/chefs", "GET /me/bookings + /chefs/{id}", "Simulé", ""),
    ("Payer", "C-46", "Je trouve le numéro NAN de mon batch cooker pour déclarer mes titres CESU.", "Le numéro s'affiche sur l'écran de règlement CESU.", "/espace-client/commandes/{id}/paiement", "GET /me/bookings/{id}/payment-options (crcesuNan)", "Livré", "La route publique /chefs/{id}/cesu-info reste non utilisée"),
    ("Pratique", "C-47", "Je gère mes adresses et mes moyens de paiement.", "Ajouter une adresse, retirer une carte.", "/espace-client/compte", "—", "Bloqué", "Aucune route ; les cartes sont chez Stripe"),
]

CHEF = [
    ("Dossier", "B-01", "Je dépose les pièces de mon dossier.", "Téléverser chaque pièce : son état passe à « déposée ».", "/espace-chef/dossier", "POST /me/chef-documents/{type}/upload-url", "Livré", ""),
    ("Dossier", "B-02", "Je sais où en est l'instruction, pièce par pièce.", "L'écran dit ce qui manque, ce qui est refusé et pourquoi.", "/espace-chef/dossier", "GET /me/chef-documents", "Livré", ""),
    ("Dossier", "B-03", "Je peux relire une pièce que j'ai envoyée.", "Ouvrir l'aperçu d'une pièce déposée.", "/espace-chef/dossier", "GET /me/chef-documents/{type}/preview-url", "Livré", ""),
    ("Dossier", "B-04", "Je peux remplacer une pièce refusée ou expirée.", "Redéposer : une nouvelle version remplace l'ancienne.", "/espace-chef/dossier", "GET /me/chef-documents/{type}/versions", "Livré", ""),
    ("Dossier", "B-05", "Je corrige les informations de ma candidature.", "Modifier une réponse tant que le dossier n'est pas tranché.", "/espace-chef/dossier", "PATCH /me/chef-application", "Livré", "Se ferme à l'approbation (409)"),
    ("Dossier", "B-06", "Après un refus, je peux redéposer une candidature.", "Corriger et renvoyer son dossier.", "/espace-chef/dossier", "POST /me/chef-application/reapply", "À brancher", ""),
    ("Dossier", "B-07", "Avant approbation, je sais ce que je ne peux pas encore faire.", "Chaque écran qui écrit l'annonce avant le clic.", "espace chef", "x-requires-approved-chef", "Livré", "Branché le 18/10"),
    ("Profil & vitrine", "B-08", "Je modifie ma présentation, ma ville et mon rayon.", "Changer la bio, enregistrer, recharger : le texte est conservé et visible en public.", "/espace-chef/vitrine", "PATCH /me/chef-profile", "Livré", ""),
    ("Profil & vitrine", "B-09", "Je peux changer ma photo de profil.", "Téléverser une image : elle apparaît sur ma vitrine.", "/espace-chef/vitrine", "POST /me/avatar/upload-url puis /confirm", "Livré", "Menu du compte, avec la mention qu'elle devient publique"),
    ("Profil & vitrine", "B-10", "Je modifie mes zones d'intervention après approbation.", "Changer sa zone et l'enregistrer.", "/espace-chef/vitrine", "PATCH /me/chef-profile", "Bloqué", "BLK-19 : le champ n'existe plus après approbation"),
    ("Profil & vitrine", "B-11", "Je déclare les langues que je parle.", "Ajouter une langue : elle apparaît sur ma vitrine.", "/espace-chef/vitrine", "—", "Bloqué", "BLK-17 : aucun champ en écriture"),
    ("Profil & vitrine", "B-12", "Je choisis le menu montré chaque semaine.", "Affecter un menu à une semaine : la vitrine publique suit.", "/espace-chef/vitrine", "PUT /me/showcase/weeks", "Livré", ""),
    ("Profil & vitrine", "B-13", "Je vois ma vitrine telle qu'un client la voit.", "Ouvrir l'aperçu public.", "/espace-chef/vitrine", "GET /chefs/{id}/showcase", "À brancher", "Aucun écran n'appelle la route publique"),
    ("Catalogue", "B-14", "Je crée, modifie et supprime mes plats.", "Créer un plat, le corriger, le supprimer.", "/espace-chef/recettes", "POST/PATCH/DELETE /me/dishes", "Livré", ""),
    ("Catalogue", "B-15", "Je publie et dépublie un plat.", "Publier : il apparaît sur la carte publique. Dépublier : il disparaît.", "/espace-chef/recettes", "POST /me/dishes/{id}/publish", "Livré", ""),
    ("Catalogue", "B-16", "J'ajoute ou retire la photo d'un plat.", "Téléverser une image, puis la retirer.", "/espace-chef/recettes", "POST .../photo/upload-url, DELETE .../photo", "Livré", ""),
    ("Catalogue", "B-17", "Je renseigne la recette : ingrédients, réchauffe, conservation.", "Saisir les quatre champs d'un ingrédient : la liste de courses s'en sert.", "/espace-chef/recettes/{id}", "PATCH /me/dishes/{id}", "Livré", ""),
    ("Catalogue", "B-18", "Je compose, modifie et supprime mes menus.", "Créer un menu à partir de mes plats, en retirer un, le supprimer.", "/espace-chef/recettes", "POST/PATCH/DELETE /me/menus", "Livré", ""),
    ("Catalogue", "B-19", "Je publie un menu et je lui donne une couverture.", "Publier, téléverser la couverture : elle s'affiche sur la carte.", "/espace-chef/recettes", "POST /me/menus/{id}/publish, .../photo", "Livré", ""),
    ("Catalogue", "B-20", "J'adopte une suggestion Lab's Food.", "Adopter un plat proposé : il entre dans mon catalogue comme une copie à moi.", "/espace-chef/recettes", "GET /me/suggestions, POST .../adopt", "Livré", ""),
    ("Catalogue", "B-21", "J'accepte ou je refuse un plat qui m'est réservé.", "Accepter une offre Lab's Food : le plat devient le mien.", "/espace-chef/recettes", "GET /me/offers, POST .../accept|decline", "Livré", ""),
    ("Agenda", "B-22", "Je déclare ma semaine type.", "Poser des créneaux par jour : les clients ne réservent que dedans.", "/espace-chef/agenda", "PUT /chef/availability", "Livré", ""),
    ("Agenda", "B-23", "Je ferme une journée entière.", "Fermer un jour avec un motif : plus aucun créneau n'y est proposé.", "/espace-chef/agenda", "PUT /chef/availability (exceptions)", "Livré", ""),
    ("Agenda", "B-24", "Je bloque quelques heures un jour donné.", "Bloquer 14h–16h : personne ne peut réserver dessus.", "/espace-chef/agenda", "POST /chef/agenda/blocks", "Livré", ""),
    ("Agenda", "B-25", "Je vois mon agenda au jour, à la semaine, au mois et à l'année.", "Parcourir les quatre échelles : prestations, demandes et blocs y figurent.", "/espace-chef/agenda", "GET /chef/agenda, /summary", "Livré", ""),
    ("Agenda", "B-26", "Je vérifie ce qu'un client voit comme créneaux libres.", "Les créneaux correspondent à mes horaires moins mes prestations.", "/espace-chef/agenda", "GET /chef/availability/slots", "Livré", ""),
    ("Agenda", "B-27", "Je publie mes prestations dans mon calendrier personnel.", "Activer le flux, coller le lien : les prestations apparaissent.", "/espace-chef/agenda", "POST /chef/calendar-feed", "Livré", ""),
    ("Formules", "B-28", "Je crée mes formules : nom, durée, prix, courses.", "Créer une offre : elle apparaît dans le tunnel de réservation.", "/espace-chef/tarifs", "POST /me/chef/service-offers", "Livré", "Branché le 18/10"),
    ("Formules", "B-29", "Je modifie, désactive ou supprime une formule.", "Désactiver : les clients ne la voient plus, l'historique reste.", "/espace-chef/tarifs", "PATCH/DELETE /me/chef/service-offers/{id}", "Livré", "409 OFFER_IN_USE expliqué à l'écran"),
    ("Prestations", "B-30", "Je vois mes prestations à venir, en cours et passées.", "Filtrer par état : les listes correspondent.", "/espace-chef/prestations", "GET /chef/bookings", "Livré", ""),
    ("Prestations", "B-31", "Je vois le client, l'adresse, les convives, les plats et les allergies.", "Ouvrir une prestation : tout y est, sauf le téléphone avant 48 h.", "/espace-chef/prestations", "GET /chef/bookings/{id}", "Livré", ""),
    ("Prestations", "B-32", "Je fais avancer la prestation étape par étape.", "Pointer l'arrivée, passer en cuisine, marquer livrée : le client voit l'étape changer.", "/espace-chef/prestations", "PATCH /chef/bookings/{id}", "Livré", ""),
    ("Prestations", "B-33", "Je dépose et je retire des photos de session.", "Téléverser une photo, la supprimer.", "/espace-chef/prestations", "POST/DELETE /chef/bookings/{id}/photos", "Livré", ""),
    ("Prestations", "B-34", "Je propose un autre horaire au client.", "Choisir un de mes créneaux libres : le client reçoit la proposition.", "/espace-chef/prestations", "POST /chef/bookings/{id}/reschedule", "Livré", "Branché le 18/10"),
    ("Prestations", "B-35", "Je réponds à un report proposé par le client.", "Accepter ou retirer : l'horaire change ou reste.", "/espace-chef/prestations", "PATCH /chef/bookings/{id}/reschedule", "Livré", ""),
    ("Prestations", "B-36", "J'ouvre la fiche recette d'un plat de la prestation.", "Ouvrir la fiche : ingrédients, étapes, réchauffe.", "/espace-chef/prestations", "GET /chef-missions/{id}/dishes/{dishId}/recipe-sheet", "Livré", ""),
    ("Prestations", "B-37", "Je consulte et je corrige la liste de courses.", "Modifier une quantité, revenir à la liste calculée.", "/espace-chef/prestations", "GET/PUT /chef-missions/{id}/shopping-list", "Livré", ""),
    ("Prestations", "B-38", "Je réépingle les recettes d'une prestation sur mes versions à jour.", "Réépingler : la fiche suit mes dernières recettes.", "/espace-chef/prestations", "POST /chef-missions/{id}/recipes/repin", "Livré", ""),
    ("Prestations", "B-39", "Je peux réserver moi-même pour un de mes clients.", "Créer une prestation depuis mon espace.", "/espace-chef/prestations", "POST /chef/bookings", "À brancher", ""),
    ("Argent", "B-40", "Je confirme ou je refuse un règlement en CESU.", "Confirmer la réception des titres : la prestation est soldée côté client.", "/espace-chef/revenus", "POST /me/chef/cesu-payments/{id}/confirm|reject", "Livré", "Branché le 21/10"),
    ("Argent", "B-41", "Je vois les factures de commission et leurs prélèvements.", "Lire une facture, repérer un prélèvement échoué.", "/espace-chef/revenus", "GET /me/chef/commission-invoices", "Livré", "Branché le 21/10"),
    ("Argent", "B-42", "Je sais ce que j'ai encaissé cette année et ce mois-ci.", "Les montants correspondent aux prestations réglées.", "/espace-chef/revenus", "GET /chef/bookings", "Livré", "Branché le 21/10"),
    ("Argent", "B-43", "Je déclare ma voie SAP : NOVA à mon nom, ou coopérative.", "Choisir la voie, saisir le numéro : mon espace l'affiche.", "/espace-chef/remuneration", "GET/PATCH /me/chef-profile/sap", "Livré", "Branché le 21/10"),
    ("Argent", "B-44", "Je connecte mon compte Stripe pour être payé.", "Ouvrir l'onboarding Stripe, revenir : l'état passe à « virements activés ».", "/espace-chef/remuneration", "POST .../stripe-connect/link", "Livré", ""),
    ("Argent", "B-45", "Je signe le mandat de prélèvement de la commission.", "Lancer la signature : l'état du mandat passe à actif.", "/espace-chef/remuneration", "POST .../sepa-mandate/setup-intent", "Livré", ""),
    ("Argent", "B-46", "Je suis l'instruction de mon affiliation CESU et de l'avance immédiate.", "Les deux statuts s'affichent, en lecture seule.", "/espace-chef/remuneration", "GET /me/chef-profile/sap", "Livré", ""),
    ("Sur-mesure", "B-47", "Je vois les demandes qui me sont confiées.", "La liste correspond à ce que la console m'a affecté.", "/espace-chef/offres", "GET /me/chef/quotes", "Livré", ""),
    ("Sur-mesure", "B-48", "Je chiffre une demande avec mon net et mes conditions.", "Envoyer une offre : le client la reçoit avec le prix TTC.", "/espace-chef/offres", "POST /me/chef/quotes/{id}/offers", "Livré", ""),
    ("Sur-mesure", "B-49", "Je retire une offre envoyée, ou je décline la demande.", "Retirer : le client ne peut plus l'accepter.", "/espace-chef/offres", "POST .../withdraw, .../decline", "Livré", ""),
    ("Échanger", "B-50", "J'écris à mes clients et je reçois leurs réponses.", "Envoyer un message depuis une prestation.", "/espace-chef/messagerie", "GET/POST /me/conversations", "Livré", ""),
    ("Échanger", "B-51", "J'écris à l'équipe Lab's Food.", "Ouvrir une conversation de support.", "/espace-chef/messagerie", "POST /me/conversations/support", "Livré", ""),
    ("Échanger", "B-52", "Je lis les avis laissés par mes clients.", "Ouvrir Avis.", "/espace-chef/avis", "—", "Hors MVP", ""),
    ("Échanger", "B-53", "Je signale un litige sur une prestation.", "Ouvrir un litige.", "/espace-chef/litiges", "—", "Bloqué", "Aucune route"),
    ("Échanger", "B-54", "Je règle mes notifications et mes préférences.", "Changer une préférence et la retrouver au retour.", "/espace-chef/parametres", "—", "Simulé", "Aucune route de préférences"),
]

ADMIN = [
    ("Pilotage", "A-01", "Je vois l'activité du réseau d'un coup d'œil.", "Les chiffres du tableau de bord correspondent aux listes.", "/", "GET /admin/dashboard", "Livré", ""),
    ("Candidatures", "A-02", "Je vois les candidatures à instruire, filtrées par état.", "Filtrer : le compte correspond.", "/candidatures", "GET /admin/chef-applications", "Livré", ""),
    ("Candidatures", "A-03", "J'ouvre une candidature et je lis ses réponses.", "Identité, entreprise, zones, autorisation de travail.", "/candidatures/{id}", "GET /admin/chef-applications/{id}", "Livré", ""),
    ("Candidatures", "A-04", "Je consulte une pièce justificative.", "Ouvrir le document : le lien est signé et la consultation tracée.", "/candidatures/{id}", "GET .../documents/{type}/download-url", "Livré", ""),
    ("Candidatures", "A-05", "J'accepte ou je refuse une pièce, avec un motif.", "Refuser avec motif : le candidat le lit dans son espace.", "/candidatures/{id}", "PATCH .../documents/{type}", "Livré", ""),
    ("Candidatures", "A-06", "Je demande des corrections sans refuser le dossier.", "Demander : le candidat voit ce qu'on attend.", "/candidatures/{id}", "POST .../request-changes", "Livré", ""),
    ("Candidatures", "A-07", "J'approuve une candidature : le compte est créé.", "Approuver : le batch cooker reçoit son lien de connexion.", "/candidatures/{id}", "POST .../approve", "Livré", ""),
    ("Candidatures", "A-08", "Je refuse une candidature avec un motif.", "Refuser : le candidat est prévenu et peut redéposer.", "/candidatures/{id}", "POST .../reject", "Livré", ""),
    ("Candidatures", "A-09", "Je renvoie son lien de connexion à un batch cooker.", "Cliquer « Renvoyer le lien » : l'écran dit si l'email est parti.", "/batchcookers/{id}", "POST /admin/chef-users/{id}/resend-invitation", "Livré", "Branché le 21/10"),
    ("Batch cookers", "A-10", "Je retrouve un batch cooker et je vois son état.", "Filtrer par état : vérifié, en ligne, suspendu.", "/batchcookers", "GET /admin/chefs, /counts", "Livré", ""),
    ("Batch cookers", "A-11", "J'ouvre sa fiche : profil, zones, contenus, prestations.", "Chaque onglet montre des données réelles.", "/batchcookers/{id}", "GET /admin/chefs/{id}", "Livré", ""),
    ("Batch cookers", "A-12", "Je mets sa vitrine en ligne ou hors ligne.", "Basculer : il apparaît ou disparaît de la semaine publique.", "/batchcookers/{id}", "PATCH /admin/chefs/{id}/verification", "Livré", ""),
    ("Batch cookers", "A-13", "Je note son affiliation CRCESU et son avance immédiate.", "Enregistrer un statut : son espace l'affiche.", "/batchcookers/{id}", "PATCH /admin/chefs/{id}/sap-external-status", "Livré", "Écriture seule : la fiche ne rend pas la valeur courante"),
    ("Batch cookers", "A-14", "Je consulte ses plats et ses menus.", "Les deux onglets listent son contenu publié et en brouillon.", "/batchcookers/{id}", "GET /admin/chefs/{id}/dishes|menus", "Livré", ""),
    ("Batch cookers", "A-15", "Je vois ses prestations sans quitter sa fiche.", "L'onglet Prestations liste les siennes, paginées.", "/batchcookers/{id}", "GET /admin/bookings?chefId", "Livré", ""),
    ("Clients & comptes", "A-16", "Je retrouve un client et j'ouvre sa fiche.", "Rechercher par nom ou email.", "/clients", "GET /admin/clients", "Livré", ""),
    ("Clients & comptes", "A-17", "Je corrige le profil d'un client.", "Modifier ses préférences ou ses allergies.", "/clients/{id}", "PATCH /admin/clients/{id}", "Livré", ""),
    ("Clients & comptes", "A-18", "Je crée un compte pour quelqu'un.", "Créer : le compte Clerk et la ligne sont créés.", "/utilisateurs", "POST /admin/users", "Livré", ""),
    ("Clients & comptes", "A-19", "Je change le rôle d'un compte.", "Passer quelqu'un en admin : la console s'ouvre pour lui.", "/utilisateurs", "PATCH /admin/users/{id}/role", "Livré", ""),
    ("Clients & comptes", "A-20", "Je supprime un compte et je sais ce que ça entraîne.", "Confirmation, puis compte Clerk supprimé ou ligne anonymisée.", "/batchcookers/{id}, /clients/{id}", "DELETE /admin/users/{id}", "Livré", "Branché le 21/10"),
    ("Clients & comptes", "A-21", "Je retire la photo de profil de quelqu'un.", "Supprimer une photo inappropriée.", "/utilisateurs", "DELETE /admin/users/{id}/avatar", "À brancher", ""),
    ("Catalogue", "A-22", "Je gère les plats de la maison.", "Créer, modifier, supprimer un plat Lab's Food.", "/menus", "POST/PATCH/DELETE /admin/meals", "Livré", ""),
    ("Catalogue", "A-23", "Je donne une photo à un plat ou un menu de la maison.", "Téléverser, puis retirer.", "/menus", "POST /admin/meals/{id}/photo/...", "Livré", ""),
    ("Catalogue", "A-24", "Je compose les menus de la maison.", "Créer un menu, le publier, le retirer.", "/menus", "POST/PATCH/DELETE /admin/menus", "Livré", ""),
    ("Catalogue", "A-25", "Je compose l'ardoise d'une semaine, je la corrige ou la supprime.", "Ajouter un plat, déplacer la semaine, supprimer l'ardoise.", "/menus", "POST/PATCH/DELETE /admin/menu-weeks", "Livré", "Branché le 16/10"),
    ("Catalogue", "A-26", "Je règle les formules proposées aux clients.", "Modifier une formule : le tunnel l'applique.", "/formules", "GET/PATCH /admin/formules", "Livré", ""),
    ("Catalogue", "A-27", "Je réserve un plat ou un menu à un batch cooker précis.", "Offrir : lui seul le voit dans ses suggestions.", "/menus", "POST/DELETE /admin/meals|menus/{id}/offer", "Livré", ""),
    ("Modération", "A-28", "Je vois ce qui attend une relecture, avec ses drapeaux.", "La file liste les contenus et ce qui mérite un regard.", "/moderation", "GET /admin/dishes", "Livré", ""),
    ("Modération", "A-29", "Je marque un contenu comme relu.", "Marquer : il sort de la file.", "/moderation", "POST /admin/dishes|menus/{id}/review", "Livré", ""),
    ("Modération", "A-30", "Je suspends un contenu publié, avec motif.", "Suspendre : il disparaît des vitrines, l'auteur est prévenu.", "/moderation", "PATCH .../moderation", "Livré", ""),
    ("Modération", "A-31", "Je vois les régimes et allergènes tapés à la main.", "La liste des valeurs libres permet de repérer les doublons.", "/moderation", "GET /admin/dishes/custom-values", "Livré", ""),
    ("Réservations", "A-32", "Je retrouve une réservation par statut, client, batch cooker ou date.", "Filtrer : le compte affiché correspond.", "/reservations", "GET /admin/bookings", "Livré", "Branché le 16/10"),
    ("Réservations", "A-33", "J'ouvre une réservation et je vois ce que paie le client.", "Prestation, courses, total, après crédit d'impôt, encaissé.", "/reservations/{id}", "GET /admin/bookings/{id}", "Livré", ""),
    ("Réservations", "A-34", "Je corrige une réservation ou je change son statut.", "Modifier l'adresse, l'horaire, le statut : c'est tracé.", "/reservations/{id}", "PATCH /admin/bookings/{id}", "Livré", ""),
    ("Réservations", "A-35", "Je régénère la liste de courses d'une prestation.", "Régénérer : elle repart des plats de la réservation.", "/reservations/{id}", "POST .../shopping-list/regenerate", "Livré", ""),
    ("Réservations", "A-36", "Je règle les suppléments par personne et par plat.", "Changer le prix : le tunnel client l'applique aussitôt.", "/reservations", "GET/PUT /admin/settings/booking-supplements", "Livré", "Branché le 21/10"),
    ("Devis", "A-37", "Je vois les demandes sur-mesure et leur état.", "Filtrer par statut : sans batch cooker, offre envoyée, classée.", "/demandes", "GET /admin/quotes", "Livré", ""),
    ("Devis", "A-38", "J'affecte une demande à un batch cooker vérifié.", "Affecter : il la voit dans son espace et reçoit un email.", "/demandes", "PATCH /admin/quotes/{id}", "Livré", ""),
    ("Devis", "A-39", "Je chiffre une offre au nom d'un batch cooker.", "Saisir son net : le prix client et le crédit d'impôt s'affichent avant l'envoi.", "/demandes", "POST /admin/quotes/{id}/offers", "Livré", ""),
    ("Devis", "A-40", "Je classe une demande sans suite.", "Classer : l'offre en attente est retirée, les deux parties prévenues.", "/demandes", "PATCH /admin/quotes/{id} (closed)", "Livré", "Branché le 18/10"),
    ("Devis", "A-41", "Je règle le taux de commission.", "Changer le taux : il vaut pour les prochaines offres.", "/demandes", "GET/PATCH /admin/settings/commission", "Livré", ""),
    ("Échanges", "A-42", "Je traite les messages du formulaire de contact.", "Lire, classer, répondre : le visiteur reçoit la réponse.", "/contact", "GET/POST /admin/contact-messages", "Livré", ""),
    ("Échanges", "A-43", "J'ouvre une conversation de support avec quelqu'un.", "Écrire depuis sa fiche : la conversation apparaît des deux côtés.", "/messagerie", "POST /admin/conversations/support", "Livré", ""),
    ("Échanges", "A-44", "Je surveille les conversations signalées.", "Un échange signalé remonte, et je peux lever le signalement.", "/messagerie", "POST /admin/conversations/{id}/dismiss-flag", "Livré", ""),
    ("Argent", "A-45", "Je vois toutes les déclarations CESU du réseau.", "Lister, filtrer par état.", "/transactions", "GET /admin/cesu-payments", "À brancher", ""),
    ("Argent", "A-46", "J'ouvre la preuve déposée par un client.", "Ouvrir le justificatif depuis la déclaration.", "/transactions", "GET /admin/cesu-payments/{id}/proof-url", "À brancher", ""),
    ("Argent", "A-47", "Je solde un CESU à la place d'un batch cooker qui ne répond pas.", "Forcer le règlement : la prestation est soldée.", "/transactions", "POST .../force-settle", "À brancher", ""),
    ("Argent", "A-48", "Je vois les factures de commission émises.", "Lister par période et par batch cooker.", "/transactions", "GET /admin/commission-invoices", "À brancher", ""),
    ("Argent", "A-49", "Je lance la facturation des commissions dues.", "Déclencher : les factures sont émises et prélevées.", "/transactions", "POST .../run-due", "À brancher", "Rien ne facture aujourd'hui"),
    ("Argent", "A-50", "Je relance un prélèvement échoué.", "Relancer depuis la facture concernée.", "/transactions", "POST .../retry-debit", "À brancher", ""),
    ("Argent", "A-51", "J'instruis les demandes d'avance immédiate.", "Répondre à une demande de rattachement.", "/transactions", "GET /admin/urssaf-links, POST .../decision", "À brancher", ""),
    ("Argent", "A-52", "Je réponds aux demandes de paiement URSSAF.", "Simuler la réponse de l'URSSAF sur un paiement.", "/transactions", "GET /admin/urssaf-payments, POST .../outcome", "À brancher", ""),
    ("Argent", "A-53", "Je consulte les attestations fiscales des clients.", "Ouvrir l'attestation d'un client pour une année.", "/clients/{id}", "GET /admin/fiscal-attestations", "À brancher", ""),
    ("Argent", "A-54", "Je suis les encaissements et les versements du réseau.", "Ouvrir Transactions : les lignes correspondent aux paiements réels.", "/transactions", "voir A-45 à A-53", "Simulé", "Écran sur données écrites en dur"),
    ("Référentiels", "A-55", "Les listes de régimes, allergènes, catégories et régions viennent de l'API.", "Un ajout côté API se voit dans les formulaires sans redéploiement.", "tous", "GET /referentials/*", "Livré", ""),
    ("Échanges", "A-56", "Je modère les avis déposés par les clients.", "Ouvrir Avis.", "/avis", "—", "Hors MVP", ""),
]

MODULES = [
    ("Visiteur — site public", VISITEUR),
    ("Client", CLIENT),
    ("Batch cooker", CHEF),
    ("Admin — console", ADMIN),
]

ICI = os.path.dirname(os.path.abspath(__file__))
sortie = os.path.join(ICI, "07-uac.csv")
with io.open(sortie, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f, delimiter=";", lineterminator="\r\n", quoting=csv.QUOTE_MINIMAL)
    w.writerow(ENTETES)
    for module, lignes in MODULES:
        for theme, ref, critere, verif, ecran, route, statut, remarque in lignes:
            role = module.split(" —")[0].lower()
            w.writerow([
                module, theme, ref,
                f"En tant que {role}, {critere[0].lower()}{critere[1:]}",
                verif, ecran, route, statut, "FALSE", remarque,
            ])

total = sum(len(l) for _, l in MODULES)
print("écrit :", sortie)
print(total, "critères")
for module, lignes in MODULES:
    c = Counter(x[6] for x in lignes)
    print(f"  {module:26} {len(lignes):3}  " + " · ".join(f"{k} {v}" for k, v in sorted(c.items())))
globale = Counter(x[6] for _, l in MODULES for x in l)
print("  " + "TOTAL".ljust(26) + f" {total:3}  " + " · ".join(f"{k} {v}" for k, v in sorted(globale.items())))
