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
const TITRES: Record<string, string> = {}

export const notificationTitle = (type: string) => TITRES[type] ?? 'Nouvelle notification'

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
