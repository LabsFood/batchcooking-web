'use client'

import { useMutation } from '@tanstack/react-query'
import { ApiError } from './client'
import { useApiFetch } from './client'

/* ─────────────────────────────────────────────────────────────────────────────
   Supprimer son propre compte — `DELETE /me`.

   Ce que l'API fait, dans l'ordre : le compte Clerk est supprimé, donc la
   connexion devient impossible. La ligne en base part avec lui, **sauf** si
   des prestations passées la référencent : elle reste alors vidée de son nom,
   de son email et de son téléphone (`outcome: 'anonymised'`), et la vitrine
   d'un batch cooker passe hors ligne.

   Et ce qu'elle refuse : tant qu'une prestation n'est ni terminée ni annulée,
   `409 USER_HAS_OPEN_BOOKINGS` — et elle **dit lesquelles**, la plus proche
   d'abord. C'est la différence entre « réessayez plus tard » et « annulez
   celle du 3 novembre » : on affiche la liste.
   ───────────────────────────────────────────────────────────────────────────── */

export interface Deletion {
  outcome: 'deleted' | 'anonymised'
}

/** Une prestation qui empêche la suppression, telle que le 409 la décrit. */
export interface BlockingBooking {
  id: string
  reference?: string | null
  status?: string
  startsAt?: string
  /** De quel côté la personne était sur cette prestation. */
  role?: 'client' | 'chef'
}

export function useDeleteMyAccount() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: () => apiFetch<Deletion>('/me', { method: 'DELETE' }),
  })
}

/** Les prestations listées par un refus, ou `null` si ce n'est pas ce refus-là. */
export function blockingBookings(error: unknown): BlockingBooking[] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  const corps = error.body as { code?: string; bookings?: BlockingBooking[] } | null
  if (corps?.code !== 'USER_HAS_OPEN_BOOKINGS') return null
  return corps.bookings ?? []
}

/**
 * Les trois autres refus que l'API nomme, dits en français. Aucun n'est de la
 * faute de la personne qui clique : la phrase le dit, et dit quoi faire.
 */
export function deletionMessage(error: unknown): string {
  const code =
    error instanceof ApiError
      ? ((error.body as { code?: string } | null)?.code ?? null)
      : null

  switch (code) {
    case 'LAST_ADMIN':
      return 'Vous êtes le dernier administrateur : la plateforme n’en aurait plus aucun.'
    case 'CLERK_NOT_CONFIGURED':
      return 'La suppression des comptes n’est pas configurée sur ce serveur. Écrivez-nous et nous le ferons.'
    case 'CLERK_DELETE_FAILED':
      return 'Le service de connexion a refusé la suppression. Rien n’a été modifié : réessayez dans un instant.'
    default:
      return error instanceof ApiError && error.message
        ? error.message
        : 'Le compte n’a pas été supprimé.'
  }
}
