/* ─────────────────────────────────────────────────────────────────────────────
   Ce qu'on montre, et ce qu'on met en sourdine.

   Le site reste entier : `/devenir-chef`, `/auth/login` et `/auth/register`
   répondent toujours, et quiconque a leur adresse — le lien reçu après une
   candidature, un favori — y accède comme avant. Ce qui disparaît, c'est
   l'**invitation** : les entrées de menu, la section d'accueil, les raccourcis.

   Masquer plutôt que supprimer, pour une raison simple : le jour où ça revient,
   il n'y a que ces deux lignes à changer. Un code supprimé puis réécrit revient
   rarement identique.
   ───────────────────────────────────────────────────────────────────────────── */

/** L'appel à candidater comme batch cooker. */
export const MONTRER_RECRUTEMENT = false

/** L'invitation à se connecter ou à créer un compte client. */
export const MONTRER_CONNEXION = false

/** Vrai quand aucune des deux portes n'est ouverte. */
export const RIEN_A_REJOINDRE = !MONTRER_RECRUTEMENT && !MONTRER_CONNEXION
