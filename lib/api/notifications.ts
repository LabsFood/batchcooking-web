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
  'shopping_list.marks_updated': 'Votre client a avancé sur la liste de courses',
  'shopping_list.reply': 'Votre batch cooker a répondu à vos commentaires',
  'allergy.conflict': 'Un plat de votre commande est à remplacer (allergie)',
  'mission.allergy_conflict': 'Un plat d’une prestation est à remplacer (allergie du client)',
  recipe_allergens_changed:
    'Les allergènes de ce plat ont changé (liste commune mise à jour) : confirmez-les à nouveau.',
  ingredient_validated: 'Votre ingrédient a rejoint la liste commune.',
  ingredient_merged: 'Votre ingrédient a été remplacé par un ingrédient de la liste commune.',
  recipes_migrated:
    'Vos recettes sont passées au nouveau format : quelques lignes sont à vérifier.',
  // Recettes lot 3 (LF-0272) : les plats sont livrés.
  'conservation.ready': 'Vos plats sont livrés : voici jusqu’à quand les manger.',
  // Recettes lot 4 (LF-0285) : les rappels de la liste de courses.
  'shopping_list.reminder_send':
    'Une prestation approche : envoyez la liste de courses à votre client.',
  'shopping_list.reminder_answer':
    'Vérifiez votre liste de courses et renvoyez-la avant demain midi.',
  'shopping_list.frozen': 'Votre liste de courses est figée : votre batch cooker fait les courses.',
  'groceries.reminder':
    'La liste est figée : faites les courses et validez-les avant la prestation.',
  // Recettes lot 6 : les courses payées à part.
  'groceries.card_needed': 'Votre batch cooker fera vos courses : enregistrez la carte qui les paiera.',
  'groceries.chef_account_needed':
    'Un client attend son Budget Courses : finalisez votre compte de paiement Stripe.',
  'groceries.hold_placed': 'Votre Budget Courses est réservé sur votre carte (empreinte).',
  'groceries.budget_guaranteed': 'Budget garanti : le client a réservé son Budget Courses.',
  'groceries.hold_failed': 'Votre carte a refusé l’empreinte : authentifiez-vous ou changez de carte.',
  'groceries.notice': 'Vos courses vont être faites : confirmez-les ou annulez-les avant l’heure limite.',
  'groceries.confirm_needed': 'Votre batch cooker attend votre réponse pour faire les courses.',
  'groceries.confirmed': 'Le client a confirmé les courses : vous pouvez les faire.',
  'groceries.awaiting_client': 'En attente du client : ne faites pas encore les courses.',
  'groceries.cancelled': 'Les courses sont annulées : le client les fait lui-même.',
  'groceries.receipts_submitted': 'Les tickets de vos courses sont déposés : 48 h pour contester une ligne.',
  'groceries.line_contested': 'Le client conteste une ligne de vos tickets.',
  'groceries.contest_decided': 'Lab’s Food a tranché une contestation de courses.',
  'groceries.captured': 'Les courses sont prélevées au centime près.',
  // Sur-mesure (15/11) : les plats express d'une prestation livrée.
  'express_dish.decide':
    'Prestation livrée : gardez ou retirez les plats express écrits pour cette demande.',
}

export const notificationTitle = (type: string) => TITRES[type] ?? 'Nouvelle notification'

/** Où mène une notification : la page où l'on agit. */
const LIENS: Record<string, (subjectId: string) => string> = {
  'shopping_list.sent': () => '/espace-client/courses',
  'shopping_list.updated': () => '/espace-client/courses',
  'shopping_list.final_received': () => '/espace-chef/prestations',
  'shopping_list.marks_updated': () => '/espace-chef/prestations',
  'shopping_list.reply': () => '/espace-client/courses',
  'allergy.conflict': (id) => `/espace-client/commandes/${id}`,
  'mission.allergy_conflict': () => '/espace-chef/prestations',
  // Le sujet est le plat : sa fiche, où l'on confirme de nouveau les allergènes.
  recipe_allergens_changed: (id) => (id ? `/espace-chef/recettes/${id}` : '/espace-chef/recettes'),
  ingredient_validated: () => '/espace-chef/ingredients',
  ingredient_merged: () => '/espace-chef/ingredients',
  recipes_migrated: () => '/espace-chef/recettes',
  'conservation.ready': () => '/espace-client/conservation',
  'shopping_list.reminder_send': () => '/espace-chef/prestations',
  'shopping_list.reminder_answer': () => '/espace-client/courses',
  'shopping_list.frozen': () => '/espace-client/courses',
  'groceries.reminder': () => '/espace-chef/prestations',
  'groceries.card_needed': (id) => `/espace-client/commandes/${id}`,
  'groceries.chef_account_needed': () => '/espace-chef/remuneration',
  'groceries.hold_placed': (id) => `/espace-client/commandes/${id}`,
  'groceries.hold_failed': (id) => `/espace-client/commandes/${id}`,
  'groceries.notice': (id) => `/espace-client/commandes/${id}`,
  'groceries.confirm_needed': (id) => `/espace-client/commandes/${id}`,
  'groceries.receipts_submitted': (id) => `/espace-client/commandes/${id}`,
  'groceries.budget_guaranteed': () => '/espace-chef/prestations',
  'groceries.confirmed': () => '/espace-chef/prestations',
  'groceries.awaiting_client': () => '/espace-chef/prestations',
  'groceries.line_contested': () => '/espace-chef/prestations',
  'express_dish.decide': () => '/espace-chef/recettes#plats-express',
}

/**
 * Lot 6 : le client et le batch cooker reçoivent ces types-là ; chacun va à sa page,
 * selon l'espace où il lit la cloche.
 */
const PARTAGES = new Set(['groceries.cancelled', 'groceries.contest_decided', 'groceries.captured'])

export const notificationHref = (
  type: string,
  subjectId = '',
  pathname = '',
): string | undefined =>
  PARTAGES.has(type)
    ? pathname.startsWith('/espace-chef')
      ? '/espace-chef/prestations'
      : `/espace-client/commandes/${subjectId}`
    : LIENS[type]?.(subjectId)

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
