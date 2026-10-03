'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'

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

export interface PhotoTicket {
  uploadId: string
  method: string
  url: string
  headers: Record<string, string>
  expiresAt: string
}

export const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp']
export const PHOTO_MAX_MB = 5

export function checkPhoto(file: File): string | null {
  if (!PHOTO_MIME.includes(file.type)) {
    return 'Format non accepté. Choisissez un JPG, un PNG ou un WebP.'
  }
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
    return `Image trop lourde. La limite est de ${PHOTO_MAX_MB} Mo.`
  }
  if (file.size === 0) return 'Ce fichier est vide.'
  return null
}

/**
 * Photo d'un plat, en trois temps. Le stockage exige que le corps du `PUT`
 * fasse exactement la taille annoncée — on envoie donc le fichier tel quel,
 * sans recompression.
 */
export function useDishPhoto() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const ticket = await apiFetch<PhotoTicket>(`/me/dishes/${id}/photo/upload-url`, {
        method: 'POST',
        body: { mimeType: file.type, sizeBytes: file.size, fileName: file.name },
      })
      const res = await fetch(ticket.url, {
        method: ticket.method || 'PUT',
        headers: ticket.headers ?? { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error(`Le transfert de l’image a échoué (${res.status}).`)
      return apiFetch<Dish>(`/me/dishes/${id}/photo/confirm`, {
        method: 'POST',
        body: { uploadId: ticket.uploadId },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: DISHES }),
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

/** Adopter crée **une copie** chez le chef : l'original reste à Lab's Food. */
export const useAdoptSuggestion = () =>
  useCatalogMutation<string, unknown>(
    (f, id) => f(`/me/suggestions/${id}/adopt`, { method: 'POST' }),
    [SUGGESTIONS, DISHES, MENUS],
  )

export function useOffers() {
  const apiFetch = useApiFetch()
  return useQuery({ queryKey: OFFERS, queryFn: () => apiFetch<Suggestions>('/me/offers') })
}

export const useAnswerOffer = () =>
  useCatalogMutation<{ id: string; accept: boolean }, unknown>(
    (f, { id, accept }) =>
      f(`/me/offers/${id}/${accept ? 'accept' : 'decline'}`, { method: 'POST' }),
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
