'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import type { CatalogIngredient } from './chef-catalog'

/* ─────────────────────────────────────────────────────────────────────────────
   Les ingrédients créés par le batch cooker (Recettes §7.1).

   Quand la liste commune n'a pas le sien, le chef crée un ingrédient : il reste
   **privé et en attente** jusqu'à ce que Lab's Food le valide (il rejoint la
   liste commune), le fusionne avec une entrée existante ou le refuse. Ses
   allergènes sont exigés : ceux de la liste, ou « aucun » déclaré.

   La recherche (`GET /ingredients?search=`) vit avec les plats, dans
   `chef-catalog.ts` : elle rend la liste commune et vos entrées en attente.
   ───────────────────────────────────────────────────────────────────────────── */

/** Un ingrédient du chef, tel que `GET /me/ingredients` le rend. */
export interface MyIngredient extends CatalogIngredient {
  /** Quand il a été fusionné : l'entrée commune qui l'a remplacé. */
  mergedInto: { id: string; name: string } | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Corps de création. `allergens` ou `allergensNone: true` : l'un des deux est
 * exigé (`422 ALLERGENS_REQUIRED` sinon).
 */
export interface MyIngredientInput {
  name: string
  /** Un code de `GET /referentials/aisles`. */
  aisle: string
  allergens?: string[]
  allergensNone?: boolean
  aliases?: string[]
  /** Les régimes calculés (`GET /referentials/computed-diets`). */
  diets?: string[]
  seasonMonths?: number[]
  isBasic?: boolean
}

const MINE = ['me', 'ingredients'] as const

/** `GET /me/ingredients` : tout ce que le chef a créé, quel que soit son statut. */
export function useMyIngredients() {
  const apiFetch = useApiFetch()
  return useQuery({ queryKey: MINE, queryFn: () => apiFetch<MyIngredient[]>('/me/ingredients') })
}

/**
 * `POST /me/ingredients` (batch cooker vérifié).
 * `409 INGREDIENT_ALREADY_LISTED { ingredient: { id, name } }` : la liste l'a
 * déjà, à relier plutôt qu'à recréer. `429 INGREDIENT_CAP_REACHED` : 50 par 24 h.
 */
export function useCreateIngredient() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MyIngredientInput) =>
      apiFetch<MyIngredient>('/me/ingredients', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE })
      qc.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}

/**
 * `PATCH /me/ingredients/{id}` : seulement une entrée encore en attente
 * (`422 INGREDIENT_NOT_PENDING`), et jamais sans allergènes (`422 ALLERGENS_REQUIRED`).
 *
 * L'API reporte le changement sur les plats du chef qui l'utilisent, et leur
 * version lue avance : la liste des plats se relit, sans quoi un plat ouvert
 * depuis le cache afficherait aussitôt un faux conflit.
 */
export function useUpdateIngredient() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<MyIngredientInput> }) =>
      apiFetch<MyIngredient>(`/me/ingredients/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MINE })
      qc.invalidateQueries({ queryKey: ['ingredients'] })
      qc.invalidateQueries({ queryKey: ['me', 'dishes'] })
    },
  })
}
