'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiBlob, useApiFetch } from './client'
import { useMeKey } from './keys'
import { pushPhoto } from './photos'
import type { Reheating } from './chef-catalog'
import type { AllergyCheck, AllergyReason } from './types'

export { PHOTO_MIME, checkPhoto, photoMessage } from './photos'

/* ─────────────────────────────────────────────────────────────────────────────
   Les prestations.

   Le 16/10 l'API a séparé les points de vue, et déprécié les six routes
   `/bookings*` sur lesquelles cet écran tournait :

     GET  /bookings/me                    → GET /me/bookings  ou  /chef/bookings
     GET  /bookings/me/bookings/{id}      → GET /me/bookings/{id}
     POST /bookings                       → POST /me/bookings

   C'est mieux ainsi : `/bookings/me` servait le client **et** le batch cooker,
   et il fallait deviner de quel côté on se trouvait. Désormais `/me/bookings`
   est la vue du client, `/chef/bookings` celle du batch cooker — avec ce que
   lui seul doit voir : sa part nette, la commission, les allergies du client.

   Le cycle de vie, qui tient tout le reste :

     pending ──(paiement)──> confirmed ──> shopping ──> cooking ──> delivered
                                                          │            │
                                     (arrivedAt)──────────┘     completed

   `pending` tient le créneau **72 h** ; passé ce délai, l'API annule. Le
   passage à `cooking` est le pointage d'arrivée : il enregistre `arrivedAt`,
   et n'est possible qu'à partir de deux heures avant le début.
   ───────────────────────────────────────────────────────────────────────────── */

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'shopping'
  | 'cooking'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export interface BookingMeal {
  mealId: string
  name?: string | null
  portions: number
  /** Version de recette épinglée quand le menu a été écrit (lot 3). */
  recipeVersion?: number | null
  /** Lot 3 : les allergènes du plat à ce moment-là, gardés pour cette prestation. `null` : pas encore figés. */
  allergensSnapshot?: string[] | null
  pinnedAt?: string | null
}

export interface BookingPhoto {
  id: string
  url: string
  caption?: string | null
  createdAt?: string
}

export interface Reschedule {
  id: string
  proposedBy: 'client' | 'chef'
  from: string
  to: string
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired'
  expiresAt: string | null
  decidedAt: string | null
}

/** Une prestation, telle que `/me/bookings` et `/chef/bookings` la rendent. */
export interface Booking {
  id: string
  reference: string | null
  status: BookingStatus
  startsAt: string
  endsAt: string
  /** Jour de calendrier, `YYYY-MM-DD` — déjà en heure de Paris. */
  bookingDate?: string | null
  /** « 09:00-12:00 », calculé par l'API dans le bon fuseau. */
  timeSlot?: string | null
  persons?: number | null
  addressLine?: string | null
  city?: string | null
  notes?: string | null
  shoppingByClient?: boolean | null
  /** Centimes — la prestation seule, sans les courses. */
  priceCents: number
  /**
   * Le frais de courses, séparé depuis le 17/10.
   *
   * Facturé seulement si l'offre inclut les courses **et** que le client ne
   * les fait pas lui-même. Il ouvre droit au crédit d'impôt : il se montre
   * sur sa propre ligne, jamais fondu dans le prix.
   */
  shoppingFeeCents?: number | null
  /** Les suppléments, à part du prix de la formule : personnes et plats en plus. */
  extraPersonsCents?: number | null
  extraMealsCents?: number | null
  /** Recettes lot 4 : le batch cooker a confirmé les courses, et le total du ticket s'il l'a saisi. */
  groceriesValidatedAt?: string | null
  groceriesAmountCents?: number | null
  /** Ce que le client paie : prestation + courses. */
  amountTtc: number
  /** Après crédit d'impôt — **calculé par l'API**, plus par nous. */
  amountAfterTax: number
  currency: string
  /** Pointage d'arrivée du batch cooker. */
  arrivedAt?: string | null
  createdAt?: string
  mealsCount?: number | null
  client?: { id: string; name: string | null; avatarUrl?: string | null } | null
  chef?: {
    id: string
    displayName: string | null
    legalIdentity?: import('./contract').ChefLegalIdentity | null
  } | null
  serviceOffer?: { id: string; name: string | null } | null
  formule?: { id: string; name: string | null } | null
  /** Moyens que ce client peut utiliser avec ce batch cooker. */
  paymentMethods?: string[] | null
  paidCents?: number | null
  /** Vue batch cooker seulement. */
  netCents?: number | null
  collectedNetCents?: number
  commissionCents?: number | null
  /** Vrai tant que la prestation n'est pas entièrement payée. */
  commissionEstimated?: boolean | null
  meals?: BookingMeal[] | null
  photos?: BookingPhoto[] | null
  reschedule?: Reschedule | null
  /** Vue batch cooker : ce que le client ne peut pas manger. */
  allergies?: string[] | null
  diets?: string[] | null
  /** Recettes lot 1 : `verified` seulement quand plus rien n'est à vérifier à la main. */
  allergyCheck?: AllergyCheck
  allergyCheckReasons?: AllergyReason[]
  /** Détail seulement : les plats qui contiennent un allergène du client, à remplacer. */
  allergyConflicts?: { mealId: string; allergens: string[] }[]
  /** Lot 3 : à 72 h du début, les plats ne se modifient plus (`MENU_FROZEN`). Calculé par l'API. */
  menuFrozen?: boolean
  frozenSince?: string
  /** CGV V1, détail seulement : les cases cochées et la conclusion. */
  contract?: import('./contract').BookingContract
  /** CGV V1, vue client : le droit de rétractation. */
  withdrawal?: import('./contract').BookingWithdrawal | null
  /** Liste : la date d'envoi de la rétractation. */
  withdrawnAt?: string | null
  /** CGV V1, vue client : les documents du contrat. */
  documents?: { kind: import('./contract').BookingDocumentKind; filename: string }[]
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages?: number
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

export interface BookingQuery {
  page?: number
  limit?: number
  status?: BookingStatus
  /** Début au plus tôt / au plus tard, ISO. */
  from?: string
  to?: string
  /** `/chef/bookings` seulement. */
  clientId?: string
}

function unwrap(res: unknown): { data: Booking[]; meta: PageMeta | null } {
  if (Array.isArray(res)) return { data: res as Booking[], meta: null }
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>
    for (const k of ['data', 'items', 'bookings']) {
      if (Array.isArray(o[k])) {
        return {
          data: o[k] as Booking[],
          meta: o.meta && typeof o.meta === 'object' ? (o.meta as PageMeta) : null,
        }
      }
    }
  }
  return { data: [], meta: null }
}

function search(q: BookingQuery): string {
  const p = new URLSearchParams()
  if (q.page != null) p.set('page', String(q.page))
  if (q.limit != null) p.set('limit', String(q.limit))
  if (q.status) p.set('status', q.status)
  if (q.from) p.set('from', q.from)
  if (q.to) p.set('to', q.to)
  if (q.clientId) p.set('clientId', q.clientId)
  const s = p.toString()
  return s ? `?${s}` : ''
}

/* ── Côté client ───────────────────────────────────────────────────────────── */

/** `GET /me/bookings` — mes commandes, la plus récente d'abord. */
export function useMyBookings(q: BookingQuery = {}) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'bookings', q],
    queryFn: async () => unwrap(await apiFetch<unknown>(`/me/bookings${search(q)}`)),
  })
}

export function useMyBooking(id: string | undefined) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'booking', id],
    queryFn: () => apiFetch<Booking>(`/me/bookings/${id}`),
    enabled: !!id,
    retry: false,
  })
}

export interface NewBooking {
  serviceOfferId: string
  startsAt: string
  formuleId?: string
  persons?: number
  addressLine?: string
  addressCity?: string
  addressPostalCode?: string
  notes?: string
  shoppingByClient?: boolean
  meals?: { mealId: string; portions?: number }[]
  /** CGV V1 : les cases cochées, exigées à partir du 21/11/2026. */
  consents?: import('./contract').ContractConsents
}

/**
 * `POST /me/bookings` — réserver.
 *
 * La prestation naît `pending` : **c'est le paiement qui la confirme**, et le
 * créneau n'est tenu que 72 h. Le créneau doit être libre
 * (`GET /chefs/{id}/availability`), et l'API le revérifie — `409` sinon.
 */
export function useCreateBooking() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (body: NewBooking) =>
      apiFetch<Booking>('/me/bookings', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...meKey, 'bookings'] }),
  })
}

export interface BookingPatch {
  startsAt?: string
  persons?: number
  addressLine?: string
  addressCity?: string
  addressPostalCode?: string
  notes?: string
  shoppingByClient?: boolean
  meals?: { mealId: string; portions?: number }[]
  /** `cancelled` tant que rien n'est payé ; `completed` après livraison. */
  status?: 'cancelled' | 'completed'
}

/** `PATCH /me/bookings/{id}` — les détails ne se changent que sur un `pending`. */
export function useUpdateMyBooking() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BookingPatch }) =>
      apiFetch<Booking>(`/me/bookings/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: (b) => {
      qc.setQueryData([...meKey, 'booking', b.id], b)
      qc.invalidateQueries({ queryKey: [...meKey, 'bookings'] })
    },
  })
}

/* ── Côté batch cooker ─────────────────────────────────────────────────────── */

/** `GET /chef/bookings` — mes prestations, la plus proche d'abord. */
export function useChefBookings(q: BookingQuery = {}) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'chef-bookings', q],
    queryFn: async () => unwrap(await apiFetch<unknown>(`/chef/bookings${search(q)}`)),
  })
}

export function useChefBooking(id: string | undefined) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'chef-booking', id],
    queryFn: () => apiFetch<Booking>(`/chef/bookings/${id}`),
    enabled: !!id,
    retry: false,
  })
}

/** Les transitions que le batch cooker peut poser lui-même. */
export type ChefTransition =
  | 'shopping'
  | 'cooking'
  | 'delivered'
  | 'completed'
  | 'cancelled'

/**
 * `POST /{me|chef}/bookings/{id}/meals/replace` — remplace un plat en conflit
 * avec une allergie déclarée après la validation du menu. Seulement ce plat-là,
 * et même sur un menu figé.
 */
export function useReplaceConflictingMeal(side: 'client' | 'chef') {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: ({ id, from, to }: { id: string; from: string; to: string }) =>
      apiFetch<Booking>(`/${side === 'client' ? 'me' : 'chef'}/bookings/${id}/meals/replace`, {
        method: 'POST',
        body: { from, to },
      }),
    onSuccess: (b) => {
      qc.setQueryData([...meKey, side === 'client' ? 'booking' : 'chef-booking', b.id], b)
      qc.invalidateQueries({ queryKey: [...meKey, side === 'client' ? 'bookings' : 'chef-bookings'] })
    },
  })
}

/**
 * `PATCH /chef/bookings/{id}` — faire avancer la prestation.
 *
 * Seul le statut : le reste appartient au client. `cooking` **est** le
 * pointage d'arrivée — l'API écrit `arrivedAt` — et n'est accepté qu'à partir
 * de deux heures avant le début.
 */
export function useAdvanceBooking() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ChefTransition }) =>
      apiFetch<Booking>(`/chef/bookings/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: (b) => {
      qc.setQueryData([...meKey, 'chef-booking', b.id], b)
      qc.invalidateQueries({ queryKey: [...meKey, 'chef-bookings'] })
      qc.invalidateQueries({ queryKey: [...meKey, 'agenda'] })
    },
  })
}

/* ── Les photos d'une prestation ───────────────────────────────────────────── */

/**
 * Le trio habituel — ticket, transfert direct, confirmation — avec une
 * légende facultative. Le fichier ne passe jamais par l'API.
 *
 * Noter les chemins : le ticket est sur `…/photos/upload-url`, mais la
 * confirmation sur `…/photos` tout court, et non `…/photo/confirm` comme pour
 * un plat.
 */
export function useAddBookingPhoto() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()

  return useMutation({
    mutationFn: ({ id, file, caption }: { id: string; file: File; caption?: string }) =>
      pushPhoto<Booking>(apiFetch, file, {
        ticketPath: `/chef/bookings/${id}/photos/upload-url`,
        confirmPath: `/chef/bookings/${id}/photos`,
        extra: caption?.trim() ? { caption: caption.trim() } : undefined,
      }),
    onSuccess: (_b, { id }) => {
      qc.invalidateQueries({ queryKey: [...meKey, 'chef-booking', id] })
      qc.invalidateQueries({ queryKey: [...meKey, 'chef-bookings'] })
    },
  })
}

export function useRemoveBookingPhoto() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: ({ id, photoId }: { id: string; photoId: string }) =>
      apiFetch<unknown>(`/chef/bookings/${id}/photos/${photoId}`, { method: 'DELETE' }),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: [...meKey, 'chef-booking', id] })
      qc.invalidateQueries({ queryKey: [...meKey, 'chef-bookings'] })
    },
  })
}

/* ── Déplacer une prestation ───────────────────────────────────────────────── */

/**
 * Une prestation confirmée se déplace quand un côté propose et l'autre
 * confirme. Rien ne bouge dans les 48 dernières heures — ni l'horaire actuel,
 * ni le nouveau. Sans réponse, la prestation garde son heure.
 */
export function useProposeReschedule(side: 'client' | 'chef') {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  const racine = side === 'chef' ? '/chef/bookings' : '/me/bookings'
  return useMutation({
    mutationFn: ({ id, startsAt }: { id: string; startsAt: string }) =>
      apiFetch<Reschedule>(`${racine}/${id}/reschedule`, {
        method: 'POST',
        body: { startsAt },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKey }),
  })
}

export function useAnswerReschedule(side: 'client' | 'chef') {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  const racine = side === 'chef' ? '/chef/bookings' : '/me/bookings'
  return useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string
      /** `withdrawn` n'est permis qu'à celui qui a proposé. */
      decision: 'accepted' | 'declined' | 'withdrawn'
    }) =>
      apiFetch<Reschedule>(`${racine}/${id}/reschedule`, {
        method: 'PATCH',
        body: { decision },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: meKey }),
  })
}

/* ── Mettre la prestation dans son calendrier ──────────────────────────────── */

/**
 * `GET /me/bookings/{id}/calendar.ics`
 *
 * La route exige le jeton, donc un simple lien ne suffit pas : on récupère le
 * fichier avec le client authentifié, puis on le remet au navigateur. Le
 * client bas niveau rend le texte brut quand ce n'est pas du JSON — c'est
 * exactement ce cas.
 *
 * Retélécharger la même prestation **met à jour le même événement** dans
 * l'agenda : l'`UID` du fichier ne change pas.
 */
export function useBookingIcs() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: async ({ id, reference }: { id: string; reference?: string | null }) => {
      const ics = await apiFetch<string>(`/me/bookings/${id}/calendar.ics`)
      if (typeof ics !== 'string' || !ics.includes('BEGIN:VCALENDAR')) {
        throw new Error("Le fichier reçu n'est pas un calendrier.")
      }
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${reference ?? 'prestation'}.ics`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

/* ── Les créneaux libres d'un batch cooker ─────────────────────────────────── */

export interface ServiceOffer {
  id: string
  name: string | null
  durationMinutes: number
  priceCents: number
}

export interface ChefSlots {
  /** L'offre dont la durée a servi au calcul. */
  offer: ServiceOffer | null
  durationMinutes: number | null
  /** `false` : aucun horaire posé — tout créneau libre peut être demandé. */
  scheduled: boolean
  /** Débuts possibles, ISO, sur une grille de 30 minutes. */
  slots: string[]
}

/**
 * `GET /chefs/{id}/availability` — publique.
 *
 * Les créneaux sont déjà nets : horaires déclarés, moins les prestations,
 * moins les blocs. L'API ne dit jamais **ce qui** occupe un créneau. Sans
 * `offerId`, c'est l'offre active la plus chère qui sert de référence, et
 * c'est elle qu'il faudra réserver.
 *
 * Fenêtre de 31 jours au plus, `to` exclu.
 */
export function useChefSlots(
  chefId: string | undefined,
  { from, to, offerId }: { from?: string; to?: string; offerId?: string } = {},
) {
  const apiFetch = useApiFetch()
  const p = new URLSearchParams()
  if (from) p.set('from', from)
  if (to) p.set('to', to)
  if (offerId) p.set('offerId', offerId)

  return useQuery({
    queryKey: ['chefs', chefId, 'availability', { from, to, offerId: offerId ?? '' }],
    queryFn: () => apiFetch<ChefSlots>(`/chefs/${chefId}/availability?${p.toString()}`),
    enabled: !!chefId && !!from && !!to,
    retry: false,
    staleTime: 60_000,
  })
}

/* ── Les règles de prix, pour un aperçu ────────────────────────────────────── */

export interface PricingRules {
  /** Points de base : `1500` = 15 %. */
  commissionBps: number
  taxCreditBps: number
  /** Recettes lot 6 : le plafond du Budget Courses et le forfait courses conseillé, en centimes. */
  groceries?: { budgetMaxCents: number; recommendedShoppingFeeMinCents: number }
}

/**
 * `GET /pricing-rules` — pour afficher un prix pendant qu'on le tape.
 *
 * Un aperçu, rien de plus : les montants qui comptent sont ceux que l'API
 * renvoie sur l'offre ou la réservation.
 */
export function usePricingRules() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: ['pricing-rules'],
    queryFn: () => apiFetch<PricingRules>('/pricing-rules'),
    staleTime: 60 * 60 * 1000,
  })
}

/** net → prix client, d'après les règles de la plateforme. */
export const clientPriceFromNet = (netCents: number, r: PricingRules) =>
  Math.round((netCents * 10000) / (10000 - r.commissionBps))

/** prix client → reste à charge après crédit d'impôt. */
export const afterTaxFromClientPrice = (clientCents: number, r: PricingRules) =>
  Math.round((clientCents * (10000 - r.taxCreditBps)) / 10000)

/* ── Les outils de la prestation (inchangés) ───────────────────────────────── */

export interface MissionLine {
  name: string
  qty: number
  unit: string
  /** `true` quand le batch cooker a corrigé ou ajouté la ligne. */
  edited?: boolean
  /** Réponse du client : il l'a déjà, le batch cooker ne l'achète pas. */
  alreadyHave?: boolean
  /** Réponse du client : son commentaire sur la ligne. */
  comment?: string | null
  /** Facultative dans toutes les recettes qui la demandent : affichée avec un badge. */
  optional?: true
}

/**
 * L'échange autour de la liste (Recettes §10.7, quand le batch cooker fait les
 * courses). Calculé par l'API, jamais par nous : `preparing` (pas encore
 * envoyée), `sent`, `update_sent` (renvoyée depuis la dernière réponse du
 * client), `final_received`, `frozen` (après `deadline`, midi la veille).
 */
export type ShoppingListStatus =
  | 'preparing'
  | 'sent'
  | 'update_sent'
  | 'final_received'
  | 'frozen'

export interface MissionGroup {
  aisle: string
  lines: MissionLine[]
}

export interface MissionShoppingList {
  missionId: string
  persons: number | null
  generatedAt: string | null
  groups: MissionGroup[]
  /** Le client fait les courses lui-même : pas d'aller-retour de la liste. */
  shoppingByClient?: boolean
  deadline?: string
  status?: ShoppingListStatus
  /** Nombre d'envois par le batch cooker. Renvoyé avec la réponse du client. */
  version?: number
  sentAt?: string | null
  finalReceivedAt?: string | null
  /** Recettes lot 4 : « Courses faites », et le total du ticket s'il a été saisi. */
  groceries?: Groceries
}

export interface Groceries {
  validatedAt: string | null
  /** Centimes. À titre d'information : aucun paiement des courses pour l'instant. */
  amountCents: number | null
}

/**
 * `GET /chef-missions/{id}/shopping-list` — calculée depuis les recettes de la
 * prestation, mise à l'échelle des portions, groupée par rayon. Lisible par le
 * batch cooker, les admins **et** le client.
 */
export function useMissionShoppingList(missionId: string | undefined) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'mission', missionId, 'shopping-list'],
    queryFn: () => apiFetch<MissionShoppingList>(`/chef-missions/${missionId}/shopping-list`),
    enabled: !!missionId,
  })
}

function useMissionMutation<TInput>(
  run: (apiFetch: ReturnType<typeof useApiFetch>, input: TInput) => Promise<MissionShoppingList>,
) {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (input: TInput) => run(apiFetch, input),
    onSuccess: (liste) => {
      qc.setQueryData([...meKey, 'mission', liste.missionId, 'shopping-list'], liste)
      qc.invalidateQueries({ queryKey: [...meKey, 'mission', liste.missionId] })
    },
  })
}

/**
 * `PUT /chef-missions/{id}/shopping-list` — la liste entière, telle qu'on la
 * veut. Ce qui diffère des recettes est gardé comme correction et **survit à
 * chaque recalcul** ; une ligne calculée qu'on retire est barrée.
 */
export const useSaveMissionShoppingList = () =>
  useMissionMutation<{ id: string; lines: Required<MissionLine & { aisle: string }>[] }>(
    (f, { id, lines }) =>
      f<MissionShoppingList>(`/chef-missions/${id}/shopping-list`, {
        method: 'PUT',
        body: { lines: lines.map(({ name, qty, unit, aisle }) => ({ name, qty, unit, aisle })) },
      }),
  )

/** `POST /chef-missions/{id}/shopping-list/reset` — abandonne les corrections. */
export const useResetMissionShoppingList = () =>
  useMissionMutation<string>((f, id) =>
    f<MissionShoppingList>(`/chef-missions/${id}/shopping-list/reset`, { method: 'POST' }),
  )

/**
 * `POST /chef-missions/{id}/shopping-list/send` — envoie la liste au client, ou
 * la renvoie après une correction qu'il doit voir. Jusqu'à midi la veille.
 */
export const useSendMissionShoppingList = () =>
  useMissionMutation<string>((f, id) =>
    f<MissionShoppingList>(`/chef-missions/${id}/shopping-list/send`, { method: 'POST' }),
  )

export interface ShoppingMark {
  name: string
  unit: string
  alreadyHave: boolean
  comment?: string
}

/**
 * `POST /me/bookings/{id}/shopping-list/submit` — la liste finale du client :
 * ce qu'il a déjà et ses commentaires, pour la `version` qu'il a sous les yeux.
 * Renvoyable jusqu'à midi la veille. `SHOPPING_LIST_UPDATED` : le batch cooker
 * l'a renvoyée entre-temps, il faut la relire.
 */
export const useSubmitShoppingList = () =>
  useMissionMutation<{ id: string; version: number; marks: ShoppingMark[] }>(
    (f, { id, version, marks }) =>
      f<MissionShoppingList>(`/me/bookings/${id}/shopping-list/submit`, {
        method: 'POST',
        body: { version, marks },
      }),
  )

export interface RecipeSheetDish {
  id: string
  name: string
  country: string | null
  category: string | null
  diets: string[]
  customDiets: string[]
  allergens: string[]
  allergensNone: boolean
  customAllergens: string[]
}

export interface MissionRecipeSheet {
  missionId: string
  dish: RecipeSheetDish
  portions: number
  recipe: {
    ingredients: { name: string; qty: number; unit: string; aisle: string }[]
    /** §4.5 : `type` est un code de `GET /referentials/step-types`, ou null. */
    steps: { order: number; text: string; type: string | null; durationMinutes: number | null }[]
    /** Les consignes du jour : le réchauffage ne fait pas partie de la version. */
    reheating?: Reheating | null
    storage?: { method?: string; days?: number; container?: string | null } | null
  }
  /**
   * La prestation cuisine la version épinglée à la réservation.
   * `newerAvailable` dit que la recette a changé depuis, sans que la
   * prestation ne bouge.
   */
  version: { pinned: number; current: number; newerAvailable: boolean }
  /**
   * Ce que le batch cooker a écrit de CE plat dans CETTE prestation : comment
   * le réchauffer, comment le garder. À côté des consignes de la recette, sans
   * les remplacer. Absent d'une API d'avant le 10/11.
   */
  notes?: { reheating: string | null; storage: string | null }
}

/** Les statuts où le batch cooker peut écrire ses notes : il cuisine, ou c'est fait. */
export const DISH_NOTES_OPEN: BookingStatus[] = ['cooking', 'delivered', 'completed']

export interface DishNotes {
  reheatingNote: string | null
  storageNote: string | null
}

/**
 * `PUT /chef-missions/{id}/dishes/{dishId}/notes` — les notes du batch cooker
 * sur un plat de la prestation. Un champ absent reste, un champ vide s'efface.
 * `409 PRESTATION_NOT_STARTED` avant qu'il soit en cuisine.
 */
export function useSaveDishNotes() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: ({
      missionId,
      dishId,
      notes,
    }: {
      missionId: string
      dishId: string
      notes: Partial<DishNotes>
    }) =>
      apiFetch<DishNotes>(`/chef-missions/${missionId}/dishes/${dishId}/notes`, {
        method: 'PUT',
        body: notes,
      }),
    onSuccess: (_saved, { missionId }) =>
      qc.invalidateQueries({ queryKey: [...meKey, 'mission', missionId, 'recipe-sheet'] }),
  })
}

export function useMissionRecipeSheet(
  missionId: string | undefined,
  dishId: string | undefined,
  portions?: number,
) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'mission', missionId, 'recipe-sheet', dishId, portions ?? 'booked'],
    queryFn: () =>
      apiFetch<MissionRecipeSheet>(
        `/chef-missions/${missionId}/dishes/${dishId}/recipe-sheet${
          portions != null ? `?portions=${portions}` : ''
        }`,
      ),
    enabled: !!missionId && !!dishId,
    retry: false,
  })
}

/**
 * `POST /chef-missions/{id}/groceries/validate` — « Courses faites » (lot 4). Le
 * montant du ticket est facultatif ; confirmer de nouveau le remplace.
 */
export function useValidateGroceries() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: ({ missionId, amountCents }: { missionId: string; amountCents: number | null }) =>
      apiFetch<{ missionId: string; groceries: Groceries }>(
        `/chef-missions/${missionId}/groceries/validate`,
        { method: 'POST', body: { amountCents } },
      ),
    onSuccess: (_saved, { missionId }) => {
      qc.invalidateQueries({ queryKey: [...meKey, 'mission', missionId] })
      qc.invalidateQueries({ queryKey: [...meKey, 'bookings'] })
    },
  })
}

/* ── Conservation (Recettes lot 3) ──────────────────────────────────────────── */

/** La date « à manger avant » d'un plat, telle que l'API la calcule. */
export interface EatBefore {
  /** `YYYY-MM-DD` : celle du batch cooker si posée, sinon celle proposée. */
  date: string | null
  /** Jour de la prestation + jours au frais de la recette figée. */
  proposed: string | null
  setByChef: boolean
  setAt: string | null
  fridgeDays: number | null
  /** Au-delà du seuil réglé dans la console (4 jours par défaut) : une alerte, jamais un blocage. */
  fridgeAlert: boolean
}

export interface ConservationDish {
  mealId: string
  name: string
  storage: {
    method: string | null
    days: number | null
    container: string | null
    freezable: boolean | null
    freezerMonths: number | null
    thawing: string | null
  } | null
  reheating: Reheating | null
  notes: { storage: string | null; reheating: string | null }
  eatBefore: EatBefore
}

export interface DateChange {
  mealId: string
  value: string | null
  changedAt: string
  /** Le batch cooker ne lit que le rôle ; la console, aussi le nom. */
  changedBy: { role: 'chef' | 'admin' | null; id?: string | null; name?: string | null }
}

export interface ConservationSheet {
  bookingId: string
  startsAt: string
  status: BookingStatus
  fridgeAlertDays: number
  /** Du plus court au plus long délai. */
  dishes: ConservationDish[]
  /** Batch cooker et console seulement. */
  history?: DateChange[]
}

/**
 * `GET /chef-missions/{id}/conservation` — le client la lit une fois les plats
 * livrés (`409 CONSERVATION_NOT_READY` avant) ; le batch cooker à tout moment.
 */
export function useConservation(missionId: string | undefined, enabled = true) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'mission', missionId, 'conservation'],
    queryFn: () => apiFetch<ConservationSheet>(`/chef-missions/${missionId}/conservation`),
    enabled: !!missionId && enabled,
    retry: false,
  })
}

/** `PUT /chef-missions/{id}/dishes/{dishId}/eat-before` — `null` revient à la date proposée. */
export function useSetEatBefore() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: ({
      missionId,
      dishId,
      date,
    }: {
      missionId: string
      dishId: string
      date: string | null
    }) =>
      apiFetch<ConservationDish>(`/chef-missions/${missionId}/dishes/${dishId}/eat-before`, {
        method: 'PUT',
        body: { date },
      }),
    onSuccess: (_saved, { missionId }) =>
      qc.invalidateQueries({ queryKey: [...meKey, 'mission', missionId, 'conservation'] }),
  })
}

/** `GET /chef-missions/{id}/conservation.pdf` — même accès que la fiche. */
export function useConservationPdf() {
  const apiBlob = useApiBlob()
  return useMutation({
    mutationFn: async ({ missionId, day }: { missionId: string; day: string }) => {
      const pdf = await apiBlob(`/chef-missions/${missionId}/conservation.pdf`)
      const url = URL.createObjectURL(pdf)
      const a = document.createElement('a')
      a.href = url
      a.download = `conservation-${day}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

/** `POST /chef-missions/{id}/recipes/repin` — refusé dès que la prestation a commencé. */
export const useRepinMissionRecipes = () =>
  useMissionMutation<string>((f, id) =>
    f<MissionShoppingList>(`/chef-missions/${id}/recipes/repin`, { method: 'POST' }),
  )

/* ── Mise en forme ─────────────────────────────────────────────────────────── */

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'À régler',
  confirmed: 'Confirmée',
  shopping: 'Courses en cours',
  cooking: 'En cuisine',
  delivered: 'Livrée',
  completed: 'Terminée',
  cancelled: 'Annulée',
  disputed: 'En litige',
}

export const bookingStatusText = (s?: string | null) =>
  s ? (BOOKING_STATUS_LABEL[s as BookingStatus] ?? s) : 'Statut inconnu'

/**
 * La famille d'état d'une prestation, pour son étiquette (`.status` dans
 * `globals.css`). Chaque écran avait sa table de couleurs : la même prestation
 * était verte sur une page et grise sur l'autre.
 *
 * En attente : à traiter. En cours : tout va bien. Finie : neutre, c'est de
 * l'histoire. Annulée ou en litige : rouge.
 */
const BOOKING_STATUS_TONE: Record<BookingStatus, string> = {
  pending: 'status-warn',
  confirmed: 'status-ok',
  shopping: 'status-ok',
  cooking: 'status-ok',
  delivered: '',
  completed: '',
  cancelled: 'status-bad',
  disputed: 'status-bad',
}

export const bookingStatusTone = (s?: string | null) =>
  s ? (BOOKING_STATUS_TONE[s as BookingStatus] ?? '') : ''

/** Ce qui n'est pas encore de l'historique. */
export const BOOKING_OPEN: BookingStatus[] = [
  'pending',
  'confirmed',
  'shopping',
  'cooking',
  'delivered',
]

export const isBookingOpen = (b: Booking) => BOOKING_OPEN.includes(b.status)

/** La transition suivante que le batch cooker peut poser, s'il y en a une. */
export function nextTransition(b: Booking): {
  status: ChefTransition
  label: string
  hint: string
} | null {
  switch (b.status) {
    case 'confirmed':
      return {
        status: 'shopping',
        label: 'Je commence les courses',
        hint: 'Le client voit que sa prestation est lancée.',
      }
    case 'shopping':
      return {
        status: 'cooking',
        label: 'Je suis arrivé(e)',
        hint: "L'heure est enregistrée par l'API et fait foi. Possible à partir de deux heures avant le début.",
      }
    case 'cooking':
      return {
        status: 'delivered',
        label: 'Les plats sont livrés',
        hint: 'Le client peut alors clôturer la prestation.',
      }
    case 'delivered':
      return {
        status: 'completed',
        label: 'Clôturer la prestation',
        hint: 'Chacun des deux côtés peut la clôturer.',
      }
    default:
      return null
  }
}

export const bookingPortions = (b: Booking) =>
  (b.meals ?? []).reduce((n, m) => n + (m.portions ?? 0), 0)

export const bookingMealNames = (b: Booking) =>
  (b.meals ?? []).map((m) => m.name).filter((n): n is string => Boolean(n))

/** « 9900 » → « 99 € ». `null` reste `null`. */
export function euros(centimes?: number | null): string | null {
  if (centimes == null || !Number.isFinite(centimes)) return null
  return (centimes / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  })
}

export const longDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null

export const shortDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null

export const hour = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null

/**
 * « 9 h → 12 h ». L'API renvoie déjà `timeSlot` calculé dans le bon fuseau :
 * on le préfère, et on retombe sur les deux bornes s'il manque.
 */
export function slot(b: Booking): string | null {
  if (b.timeSlot) return b.timeSlot.replace('-', ' → ')
  const debut = hour(b.startsAt)
  if (!debut) return null
  const fin = hour(b.endsAt)
  return fin ? `${debut} → ${fin}` : debut
}

/* ── Réserver pour un de ses clients ───────────────────────────────────────── */

export interface ChefBookingInput {
  serviceOfferId: string
  startsAt: string
  clientId: string
  persons?: number
  addressLine?: string
  addressCity?: string
  addressPostalCode?: string
  notes?: string
  shoppingByClient?: boolean
  extraMeals?: number
  meals?: { mealId: string; portions: number }[]
}

/**
 * `POST /chef/bookings` — proposer une prestation à un client qu'on connaît
 * déjà : quelqu'un avec qui on a une prestation passée ou une conversation.
 *
 * Elle naît `pending`, sur une de mes offres, à une heure où je suis libre.
 * **Le client l'accepte en la payant**, dans les 72 heures — ce n'est donc pas
 * une réservation imposée, c'est une proposition qui tient le créneau.
 */
export function useCreateChefBooking() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (input: ChefBookingInput) =>
      apiFetch<Booking>('/chef/bookings', { method: 'POST', body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...meKey, 'chef-bookings'] })
      qc.invalidateQueries({ queryKey: [...meKey, 'agenda'] })
    },
  })
}
