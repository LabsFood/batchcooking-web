'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

/* ─────────────────────────────────────────────────────────────────────────────
   Les notifications de la cloche (module Recettes §12) — `GET /me/notifications`.

   Une notification n'est qu'un `type` et ce qu'elle concerne (`subjectType`,
   `subjectId`) : c'est l'écran qui la formule. Jamais d'allergie ni de donnée
   personnelle dedans. Dans l'application seulement : aucun e-mail.
   ───────────────────────────────────────────────────────────────────────────── */

export interface AppNotification {
  id: string
  type: string
  subjectType: string
  subjectId: string
  readAt: string | null
  createdAt: string
}

interface NotificationPage {
  data: AppNotification[]
  unreadCount: number
}

/**
 * Le titre d'une notification d'après son `type`. Chaque lot Recettes ajoute
 * les siens ici (conflit d'allergie, liste de courses…).
 */
const TITRES: Record<string, string> = {
  'shopping_list.sent': 'Votre liste de courses est prête à vérifier',
  'shopping_list.updated': 'Votre liste de courses a été mise à jour',
  'shopping_list.final_received': 'Un client a renvoyé sa liste de courses',
  'allergy.conflict': 'Un plat de votre commande est à remplacer (allergie)',
  'mission.allergy_conflict': 'Un plat d’une prestation est à remplacer (allergie du client)',
  recipe_allergens_changed:
    'Les allergènes de ce plat ont changé (liste commune mise à jour) : confirmez-les à nouveau.',
  ingredient_validated: 'Votre ingrédient a rejoint la liste commune.',
  ingredient_merged: 'Votre ingrédient a été remplacé par un ingrédient de la liste commune.',
  recipes_migrated:
    'Vos recettes sont passées au nouveau format : quelques lignes sont à vérifier.',
}

export const notificationTitle = (type: string) => TITRES[type] ?? 'Nouvelle notification'

/** Où mène une notification : la page où l'on agit. */
const LIENS: Record<string, (subjectId: string) => string> = {
  'shopping_list.sent': () => '/espace-client/courses',
  'shopping_list.updated': () => '/espace-client/courses',
  'shopping_list.final_received': () => '/espace-chef/prestations',
  'allergy.conflict': (id) => `/espace-client/commandes/${id}`,
  'mission.allergy_conflict': () => '/espace-chef/prestations',
  // Le sujet est le plat : sa fiche, où l'on confirme de nouveau les allergènes.
  recipe_allergens_changed: (id) => (id ? `/espace-chef/recettes/${id}` : '/espace-chef/recettes'),
  ingredient_validated: () => '/espace-chef/ingredients',
  ingredient_merged: () => '/espace-chef/ingredients',
  recipes_migrated: () => '/espace-chef/recettes',
}

export const notificationHref = (type: string, subjectId = ''): string | undefined =>
  LIENS[type]?.(subjectId)

export function useNotifications() {
  const apiFetch = useApiFetch()
  const { isLoaded, isSignedIn } = useAuth()
  const meKey = useMeKey()

  return useQuery({
    queryKey: [...meKey, 'notifications'],
    queryFn: () => apiFetch<NotificationPage>('/me/notifications?limit=20'),
    enabled: isLoaded && !!isSignedIn,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

/** `POST /me/notifications/{id}/read` — une fois : une notification lue le reste. */
export function useMarkNotificationRead() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<AppNotification>(`/me/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...meKey, 'notifications'] })
    },
  })
}
