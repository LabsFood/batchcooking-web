'use client'

import { useMeProfile } from '@/lib/api/me-profile'
import type { ChefProfile } from '@/lib/api/types'

/* ─────────────────────────────────────────────────────────────────────────────
   Avant validation, le dossier seulement.

   L'API refuse toute écriture d'un batch cooker non vérifié (`403
   CHEF_NOT_VERIFIED`). L'espace ne lui ouvre donc que ce qu'il peut y faire :
   compléter son dossier, régler son compte, écrire au support — et lire la
   réponse, qui arrive dans la messagerie. Le reste est grisé dans le menu, et
   l'adresse d'une page fermée renvoie au dossier.

   La règle suit `isVerified`, comme l'API, et non le statut de la candidature :
   une vérification retirée referme l'espace même si la candidature reste
   approuvée. `isActive` n'y entre pas : un batch cooker vérifié mais hors ligne
   (tout juste approuvé, ou suspendu par une pièce expirée) a besoin de tout son
   espace pour revenir en ligne.
   ───────────────────────────────────────────────────────────────────────────── */

const CANDIDATE_PAGES = [
  '/espace-chef/dossier',
  '/espace-chef/parametres',
  '/espace-chef/litiges',
  '/espace-chef/messagerie',
]

/** Ce qu'un batch cooker non vérifié peut ouvrir. */
export function openToCandidate(href: string): boolean {
  return CANDIDATE_PAGES.some((p) => href === p || href.startsWith(`${p}/`))
}

export function useChefApproved() {
  const profil = useMeProfile()
  const moi =
    profil.data?.profileType === 'chef' ? (profil.data.profile as ChefProfile | null) : null

  return {
    approved: moi?.isVerified === true,
    /** Le profil a répondu. Avant, rien ne s'affiche ni ne se ferme. */
    known: profil.isSuccess,
    pending: profil.isPending,
    /** Un batch cooker que l'équipe n'a pas (ou plus) vérifié. */
    candidate: moi !== null && moi.isVerified !== true,
  }
}
