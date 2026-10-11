'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { removePhoto, uploadPhoto } from './photos'

// Le trio d'envoi d'une photo vit dans `photos.ts` : plats et menus du batch
// cooker, plats et menus de la maison, photo de profil, c'est le même.
export {
  PHOTO_MIME,
  PHOTO_MAX_MB,
  PhotoError,
  checkPhoto,
  photoMessage,
  type PhotoTicket,
  type PhotoStep,
} from './photos'

/* ─────────────────────────────────────────────────────────────────────────────
   Les plats et les menus du batch cooker.

   Un plat naît en `draft` et ne devient public qu'à la publication. Un menu se
   compose de ses propres plats, dans l'ordre donné, et publier le menu publie
   les plats qu'il contient.

   La photo suit le même principe que les pièces justificatives : trois appels,
   et le fichier ne passe jamais par l'API. Le stockage refuse un transfert
   dont la taille ne correspond pas exactement à celle annoncée.
   ───────────────────────────────────────────────────────────────────────────── */

export type DishStatus = 'draft' | 'published' | 'suspended' | 'archived'
export type MenuStatus = DishStatus
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Ingredient {
  name: string
  qty: number
  unit: string
  aisle?: string
}

export interface Recipe {
  ingredients: Ingredient[]
  steps: string[]
  reheating?: { mode?: string; temperature?: number; minutes?: number; note?: string } | null
  storage?: { method?: string; days?: number; container?: string } | null
}

export interface Dish {
  id: string
  name: string
  description: string | null
  /** Code ISO 3166-1 alpha-2 — la carte culinaire du client s'appuie dessus. */
  country: string | null
  category: string | null
  imageUrl: string | null
  portions: number
  prepMinutes: number
  cookMinutes: number | null
  difficulty: Difficulty | null
  diets: string[]
  customDiets: string[]
  allergens: string[]
  /** Déclaration explicite : « vérifié, il n'y en a aucun ». */
  allergensNone: boolean
  customAllergens: string[]
  recipe: Recipe | null
  recipeComplete: boolean
  status: DishStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MenuDish {
  id: string
  name: string
  status: DishStatus
  country: string | null
  imageUrl: string | null
  portions: number
  diets: string[]
  allergens: string[]
  allergensNone: boolean
  recipeComplete: boolean
}

export interface Menu {
  id: string
  title: string
  pitch: string | null
  period: string
  status: MenuStatus
  shoppingIncluded: boolean
  /** Photo de couverture, depuis `POST /me/menus/{id}/photo/*`. */
  imageUrl?: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  dishes: MenuDish[]
}

export interface ShowcaseWeek {
  weekStart: string
  menu: { id: string; title: string; status: MenuStatus } | null
}

const DISHES = ['me', 'dishes'] as const
const MENUS = ['me', 'menus'] as const
const SHOWCASE = ['me', 'showcase', 'weeks'] as const
const SUGGESTIONS = ['me', 'suggestions'] as const
const OFFERS = ['me', 'offers'] as const

// ── Plats ───────────────────────────────────────────────────────────────────

export function useDishes() {
  const apiFetch = useApiFetch()
  return useQuery({ queryKey: DISHES, queryFn: () => apiFetch<Dish[]>('/me/dishes') })
}

/** Corps de création : seuls `name` et `prepMinutes` sont exigés. */
export interface DishInput {
  name: string
  description?: string | null
  country?: string | null
  category?: string | null
  portions?: number
  prepMinutes: number
  cookMinutes?: number | null
  difficulty?: Difficulty | null
  diets?: string[]
  customDiets?: string[]
  allergens?: string[]
  allergensNone?: boolean
  customAllergens?: string[]
  recipe?: Recipe | null
}

function useCatalogMutation<TInput, TOut>(
  run: (apiFetch: ReturnType<typeof useApiFetch>, input: TInput) => Promise<TOut>,
  keys: readonly (readonly string[])[],
) {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TInput) => run(apiFetch, input),
    onSuccess: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  })
}

export const useCreateDish = () =>
  useCatalogMutation<DishInput, Dish>(
    (f, body) => f<Dish>('/me/dishes', { method: 'POST', body }),
    [DISHES],
  )

export const useUpdateDish = () =>
  useCatalogMutation<{ id: string; patch: Partial<DishInput> }, Dish>(
    (f, { id, patch }) => f<Dish>(`/me/dishes/${id}`, { method: 'PATCH', body: patch }),
    [DISHES, MENUS],
  )

export const useDeleteDish = () =>
  useCatalogMutation<string, unknown>(
    (f, id) => f(`/me/dishes/${id}`, { method: 'DELETE' }),
    [DISHES, MENUS],
  )

/** Publier, puis dépublier : c'est la même bascule, vue des deux côtés. */
export const usePublishDish = () =>
  useCatalogMutation<{ id: string; publish: boolean }, Dish>(
    (f, { id, publish }) =>
      f<Dish>(`/me/dishes/${id}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' }),
    [DISHES, MENUS],
  )



/**
 * Photo d'un plat, en trois temps. Le stockage exige que le corps du `PUT`
 * fasse exactement la taille annoncée — on envoie donc le fichier tel quel,
 * sans recompression.
 */
export function useDishPhoto() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadPhoto<Dish>(apiFetch, `/me/dishes/${id}`, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISHES }),
  })
}

/** `POST /me/menus/{id}/photo/*` — la photo de couverture d'un menu. */
export function useMenuPhoto() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadPhoto<Menu>(apiFetch, `/me/menus/${id}`, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENUS }),
  })
}

/** `DELETE /me/menus/{id}/photo` */
export function useDeleteMenuPhoto() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removePhoto<Menu>(apiFetch, `/me/menus/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENUS }),
  })
}

export const useDeleteDishPhoto = () =>
  useCatalogMutation<string, unknown>(
    (f, id) => f(`/me/dishes/${id}/photo`, { method: 'DELETE' }),
    [DISHES],
  )

// ── Menus ───────────────────────────────────────────────────────────────────

export function useMenus() {
  const apiFetch = useApiFetch()
  return useQuery({ queryKey: MENUS, queryFn: () => apiFetch<Menu[]>('/me/menus') })
}

export interface MenuInput {
  title: string
  pitch?: string | null
  period?: string
  shoppingIncluded?: boolean
  dishIds: string[]
}

export const useCreateMenu = () =>
  useCatalogMutation<MenuInput, Menu>(
    (f, body) => f<Menu>('/me/menus', { method: 'POST', body }),
    [MENUS],
  )

export const useUpdateMenu = () =>
  useCatalogMutation<{ id: string; patch: Partial<MenuInput> }, Menu>(
    (f, { id, patch }) => f<Menu>(`/me/menus/${id}`, { method: 'PATCH', body: patch }),
    [MENUS, SHOWCASE],
  )

export const useDeleteMenu = () =>
  useCatalogMutation<string, unknown>(
    (f, id) => f(`/me/menus/${id}`, { method: 'DELETE' }),
    [MENUS, SHOWCASE],
  )

export const usePublishMenu = () =>
  useCatalogMutation<{ id: string; publish: boolean }, Menu>(
    (f, { id, publish }) =>
      f<Menu>(`/me/menus/${id}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' }),
    [MENUS, DISHES, SHOWCASE],
  )

// ── Vitrine : quel menu, quelle semaine ─────────────────────────────────────

export function useShowcaseWeeks() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: SHOWCASE,
    queryFn: () => apiFetch<{ from: string; to: string; weeks: ShowcaseWeek[] }>('/me/showcase/weeks'),
  })
}

/** `weekStart` est toujours un lundi ; `menuId: null` veut dire « pas de menu ». */
export const useSetShowcaseWeeks = () =>
  useCatalogMutation<{ weekStart: string; menuId: string | null }[], unknown>(
    (f, assignments) => f('/me/showcase/weeks', { method: 'PUT', body: { assignments } }),
    [SHOWCASE],
  )

// ── Propositions et offres Lab's Food ───────────────────────────────────────

export interface Suggestions {
  dishes: (Omit<Dish, 'recipe' | 'recipeComplete' | 'status' | 'publishedAt'> & {
    adoptedCopyId: string | null
  })[]
  menus: {
    id: string
    title: string
    pitch: string | null
    period: string
    updatedAt: string
    dishes: MenuDish[]
    adoptedCopyId: string | null
  }[]
}

export function useSuggestions() {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: SUGGESTIONS,
    queryFn: () => apiFetch<Suggestions>('/me/suggestions'),
  })
}

/**
 * Adopter crée **une copie** chez le chef : l'original reste à Lab's Food.
 *
 * `{ consent: true }` est exigé — `422 CONSENT_REQUIRED` sinon. Ce n'est pas
 * une formalité : l'API enregistre ce consentement, parce que rien n'est
 * recopié chez quelqu'un sans qu'il l'ait voulu. Le hook réclame donc le
 * consentement en argument, pour qu'on ne puisse pas l'envoyer sans l'avoir
 * demandé.
 *
 * Adopter deux fois rend la copie existante (`created: false`). Un menu
 * emporte ses plats ; un plat déjà adopté est réutilisé, pas recopié.
 */
export const useAdoptSuggestion = () =>
  useCatalogMutation<{ id: string; consent: true }, unknown>(
    (f, { id, consent }) =>
      f(`/me/suggestions/${id}/adopt`, { method: 'POST', body: { consent } }),
    [SUGGESTIONS, DISHES, MENUS],
  )

export function useOffers() {
  const apiFetch = useApiFetch()
  return useQuery({ queryKey: OFFERS, queryFn: () => apiFetch<Suggestions>('/me/offers') })
}

/**
 * Accepter exige le même consentement enregistré que l'adoption ; refuser
 * n'exige rien, et l'offre retourne à Lab's Food qui pourra la proposer
 * ailleurs. D'où le corps envoyé dans un cas et pas dans l'autre.
 */
export const useAnswerOffer = () =>
  useCatalogMutation<{ id: string; accept: boolean }, unknown>(
    (f, { id, accept }) =>
      f(
        `/me/offers/${id}/${accept ? 'accept' : 'decline'}`,
        accept ? { method: 'POST', body: { consent: true } } : { method: 'POST' },
      ),
    [OFFERS, DISHES, MENUS],
  )

// ── Affichage ───────────────────────────────────────────────────────────────

export const DISH_STATUS_LABEL: Record<DishStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  suspended: 'Suspendu',
  archived: 'Archivé',
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Exigeant',
}

/** Ce qui manque pour publier. Vide = publiable. */
export function publishBlockers(dish: Dish): string[] {
  const out: string[] = []
  if (!dish.description?.trim()) out.push('une description')
  if (!dish.country) out.push('le pays d’origine')
  if (!dish.allergensNone && dish.allergens.length === 0 && dish.customAllergens.length === 0) {
    out.push('les allergènes, ou la mention « aucun »')
  }
  if (!dish.recipeComplete) out.push('la recette')
  return out
}
