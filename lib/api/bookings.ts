'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

/* ─────────────────────────────────────────────────────────────────────────────
   Les prestations — `GET /bookings/me`.

   Une seule route pour les deux espaces : elle rend « those they booked as a
   client, and those assigned to them as a batch cooker ». Le client y lit ses
   commandes, le batch cooker ses prestations ; c'est l'API qui sait de quel
   côté on se trouve, pas le front.

   Trois limites à connaître avant de dessiner avec :

   - **le détail n'est pas pour tout le monde.** `GET /bookings/me/bookings/{id}`
     précise « only the client who booked can open it; anyone else gets 404 ».
     Le batch cooker n'a donc pas de route de détail : il travaille avec la
     ligne de liste, plus les routes `/chef-missions/{id}/…` ;
   - **rien sur le paiement.** Un booking porte `priceCents` et c'est tout :
     pas de statut de règlement, pas de montant après crédit d'impôt, pas de
     formule. Ce que les maquettes montraient à ce sujet n'existe pas ;
   - **`POST /bookings` répond 501.** Personne ne peut encore réserver. Les
     listes ci-dessous ne se rempliront que par des données posées à la main
     côté serveur.
   ───────────────────────────────────────────────────────────────────────────── */

export interface BookingMeal {
  bookingId?: string
  mealId: string
  /** Portions commandées pour ce plat. */
  portions: number
  meal?: { id: string; name: string } | null
}

export interface ShoppingItem {
  id?: string
  shoppingListId?: string
  /** Rayon, tel que l'API le stocke : un identifiant, pas un libellé. */
  aisle: string | null
  name: string
  /** Texte libre côté booking (« 8 pièces »), à la différence des missions. */
  quantity: string | null
}

export interface BookingShoppingList {
  id: string
  bookingId?: string
  generatedAt: string | null
  items: ShoppingItem[]
}

/** Un booking, tel que les exemples de la doc le décrivent. */
export interface Booking {
  id: string
  reference: string | null
  clientId: string | null
  chefProfileId: string | null
  /** Début de la session, ISO. */
  startsAt: string | null
  endsAt: string | null
  status: string | null
  /** Centimes, TTC. */
  priceCents: number | null
  currency: string | null
  bookingMeals?: BookingMeal[] | null
  shoppingList?: BookingShoppingList | null
  client?: {
    id: string
    email: string | null
    fullName: string | null
    role?: string
  } | null
  /** Renseigné sur certaines réponses seulement. */
  chef?: {
    id?: string
    displayName?: string | null
    fullName?: string | null
  } | null
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/** Une réponse nue ou enveloppée : la route n'a pas de schéma documenté. */
function unwrap<T>(res: unknown): { data: T[]; meta: PageMeta | null } {
  if (Array.isArray(res)) return { data: res as T[], meta: null }
  if (res && typeof res === 'object') {
    const o = res as Record<string, unknown>
    for (const k of ['data', 'items', 'bookings']) {
      if (Array.isArray(o[k])) {
        return {
          data: o[k] as T[],
          meta: o.meta && typeof o.meta === 'object' ? (o.meta as PageMeta) : null,
        }
      }
    }
  }
  return { data: [], meta: null }
}

export function useMyBookings({ page, limit }: { page?: number; limit?: number } = {}) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()

  const params = new URLSearchParams()
  if (page != null) params.set('page', String(page))
  if (limit != null) params.set('limit', String(limit))
  const qs = params.toString()

  return useQuery({
    queryKey: [...meKey, 'bookings', { page: page ?? 1, limit: limit ?? 20 }],
    queryFn: async () => unwrap<Booking>(await apiFetch<unknown>(`/bookings/me${qs ? `?${qs}` : ''}`)),
  })
}

/**
 * `GET /bookings/me/bookings/{id}` — réservé au client qui a réservé.
 *
 * Noter le chemin : le segment est bien doublé côté API.
 */
export function useMyBooking(id: string | undefined) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'bookings', id],
    queryFn: () => apiFetch<Booking>(`/bookings/me/bookings/${id}`),
    enabled: !!id,
    retry: false,
  })
}

/* ── Les outils de la prestation, côté batch cooker ────────────────────────── */

export interface MissionLine {
  name: string
  qty: number
  unit: string
  /** `true` quand le batch cooker a corrigé ou ajouté la ligne. */
  edited?: boolean
}

export interface MissionGroup {
  aisle: string
  lines: MissionLine[]
}

export interface MissionShoppingList {
  missionId: string
  persons: number | null
  generatedAt: string | null
  groups: MissionGroup[]
}

/**
 * `GET /chef-missions/{id}/shopping-list` — calculée depuis les recettes de la
 * prestation, mise à l'échelle des portions commandées, groupée par rayon.
 *
 * Lisible par le batch cooker, les admins **et** le client.
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
  /** Portions auxquelles la recette est mise à l'échelle. */
  portions: number
  recipe: {
    ingredients: { name: string; qty: number; unit: string; aisle: string }[]
    steps: string[]
    reheating?: { mode?: string; temperature?: number; minutes?: number; note?: string } | null
    storage?: { method?: string; days?: number; container?: string } | null
  }
  /**
   * La prestation cuisine depuis la version épinglée au moment de la
   * réservation. `newerAvailable` dit que le batch cooker a modifié la recette
   * depuis — sans que la prestation ne bouge.
   */
  version: { pinned: number; current: number; newerAvailable: boolean }
}

/**
 * `GET /chef-missions/{id}/dishes/{dishId}/recipe-sheet` — la fiche standard,
 * ingrédients mis à l'échelle.
 *
 * Le client ne l'obtient qu'une fois la prestation faite :
 * `403 NOT_YET_AVAILABLE` avant.
 */
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
 * `POST /chef-missions/{id}/recipes/repin` — bascule la prestation sur les
 * recettes actuelles du batch cooker. Refusé une fois la prestation commencée
 * (`409`), et la liste de courses est recalculée.
 */
export const useRepinMissionRecipes = () => useMissionMutation<string>((f, id) =>
  f<MissionShoppingList>(`/chef-missions/${id}/recipes/repin`, { method: 'POST' }),
)

/* ── Mise en forme ─────────────────────────────────────────────────────────── */

/**
 * Les statuts observés dans la base. La liste n'est pas documentée : on nomme
 * ce qu'on connaît et on laisse passer le reste tel quel, plutôt que de cacher
 * un état qu'on n'attendait pas.
 */
export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shopping: 'Courses en cours',
  cooking: 'En cuisine',
  completed: 'Terminée',
  delivered: 'Terminée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
}

export const bookingStatusText = (code?: string | null) =>
  code ? (BOOKING_STATUS_LABEL[code] ?? code) : 'Statut inconnu'

/** Les statuts qui ne sont pas encore de l'historique. */
export const BOOKING_OPEN = ['pending', 'confirmed', 'shopping', 'cooking']

export const isBookingOpen = (b: Booking) => !b.status || BOOKING_OPEN.includes(b.status)

/** Total des portions commandées, tous plats confondus. */
export const bookingPortions = (b: Booking) =>
  (b.bookingMeals ?? []).reduce((n, m) => n + (m.portions ?? 0), 0)

/** Les noms des plats, quand l'API les déplie. */
export const bookingMealNames = (b: Booking) =>
  (b.bookingMeals ?? []).map((m) => m.meal?.name).filter((n): n is string => Boolean(n))

/** « 9900 » → « 99 € ». `null` reste `null`. */
export function euros(centimes?: number | null): string | null {
  if (centimes == null || !Number.isFinite(centimes)) return null
  return (centimes / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  })
}

/**
 * Le crédit d'impôt services à la personne, 50 %.
 *
 * L'API ne renvoie **pas** de montant après crédit d'impôt sur un booking —
 * seulement sur les formules et dans les totaux de la console. Ce qu'on affiche
 * ici est donc un calcul du front : il est présenté comme une estimation, pas
 * comme un montant facturé.
 */
export const afterTaxCredit = (centimes?: number | null) =>
  centimes == null ? null : Math.round(centimes / 2)

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

/** « 9 h → 12 h », depuis les deux bornes. */
export function slot(b: Booking): string | null {
  const debut = hour(b.startsAt)
  if (!debut) return null
  const fin = hour(b.endsAt)
  return fin ? `${debut} → ${fin}` : debut
}
