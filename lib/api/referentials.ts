'use client'

import { useQuery } from '@tanstack/react-query'

/* ─────────────────────────────────────────────────────────────────────────────
   Référentiels de l'API — publics, sans jeton.

   Ils remplacent les listes en dur du front : régions d'intervention, régimes,
   allergènes, catégories de plat. Les codes qu'ils portent sont ceux que l'API
   attend en retour, donc les garder en double de notre côté, c'est se préparer
   une divergence silencieuse.

   Le repli sur la liste locale n'est pas un cache : c'est ce qui évite qu'un
   référentiel injoignable rende la candidature impossible.
   ───────────────────────────────────────────────────────────────────────────── */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export interface RefItem {
  code: string
  label: string
}

async function fetchRef<K extends string>(path: string, key: K): Promise<RefItem[]> {
  if (!API_URL) throw new Error("L'API n'est pas configurée.")
  const res = await fetch(`${API_URL}/referentials/${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Référentiel ${path} indisponible (${res.status}).`)
  const body = (await res.json()) as Record<K, RefItem[]>
  return body[key] ?? []
}

/** Ces référentiels changent de loin en loin : une heure de fraîcheur suffit. */
const HOUR = 60 * 60 * 1000

export function useRegions(fallback: RefItem[]) {
  const q = useQuery({
    queryKey: ['referentials', 'regions'],
    queryFn: () => fetchRef('regions', 'regions'),
    staleTime: HOUR,
  })
  return { regions: q.data ?? fallback, fromApi: q.isSuccess, isPending: q.isPending }
}

export function useDiets(fallback: RefItem[] = []) {
  const q = useQuery({
    queryKey: ['referentials', 'diets'],
    queryFn: () => fetchRef('diets', 'diets'),
    staleTime: HOUR,
  })
  return q.data ?? fallback
}

export function useAllergens(fallback: RefItem[] = []) {
  const q = useQuery({
    queryKey: ['referentials', 'allergens'],
    queryFn: () => fetchRef('allergens', 'allergens'),
    staleTime: HOUR,
  })
  return q.data ?? fallback
}

/**
 * Le libellé d'un code, ou le code lui-même.
 *
 * Les plats stockent des codes (`gluten_free`), et plusieurs écrans les
 * affichaient tels quels. Tant que le référentiel n'est pas arrivé — ou qu'il
 * ne connaît pas un code — montrer le code reste préférable à montrer un vide,
 * mais ce n'est pas ce qu'on veut lire : la fonction sert à ne plus avoir à
 * choisir au cas par cas.
 */
export function refLabel(list: RefItem[], code: string): string {
  return list.find((x) => x.code === code)?.label ?? code
}

export function useDishCategories(fallback: RefItem[] = []) {
  const q = useQuery({
    queryKey: ['referentials', 'dish-categories'],
    queryFn: () => fetchRef('dish-categories', 'categories'),
    staleTime: HOUR,
  })
  return q.data ?? fallback
}
