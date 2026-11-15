/* ─────────────────────────────────────────────────────────────────────────────
   Recettes du batch cooker : ingrédients, réchauffage, conservation.

   Deux choses en découlent automatiquement et restent modifiables :
   — la fiche recette standardisée Lab's Food (document remis au client) ;
   — la liste de courses, mise à l'échelle du nombre de portions commandées.

   Rien n'est extrait d'un fichier importé pour l'instant : le batch cooker
   saisit sa recette, la fiche et la liste se construisent à partir de là.
   ───────────────────────────────────────────────────────────────────────────── */

import { AISLES, TO_TASTE, displayQuantity, roundForDisplay } from '@/lib/recipe-fields'

// Les unités (14 codes) et les rayons viennent de `lib/recipe-fields.ts` : une
// seule liste, celle de l'API, pour la saisie comme pour la liste de courses.

/** Un code d'unité (`g`, `clove`, `to_taste`…). */
export type Unit = string
/** Un code de rayon (`fruits-legumes`…). */
export type Aisle = string

export interface Ingredient {
  name: string
  /** Quantité pour `ChefDish.portions` portions ; `null` pour « selon le goût ». */
  qty: number | null
  unit: Unit
  aisle: Aisle
}

export const REHEAT_MODES = ['Four', 'Poêle', 'Casserole', 'Micro-ondes', 'Bain-marie', 'Sans réchauffage'] as const
export type ReheatMode = (typeof REHEAT_MODES)[number]

export interface Reheating {
  mode: ReheatMode
  /** Température en °C — vide pour un micro-ondes ou une poêle. */
  temperature?: number
  minutes: number
  /** Conseil libre : couvrir, ajouter un fond d'eau… */
  note?: string
}

export const STORAGE_METHODS = ['Réfrigérateur', 'Congélateur', 'Température ambiante'] as const
export type StorageMethod = (typeof STORAGE_METHODS)[number]

export interface Storage {
  method: StorageMethod
  /** Durée de conservation en jours. */
  days: number
  /** Contenant conseillé. */
  container?: string
}

/** Recette complète d'un plat. Facultative tant que le plat est en brouillon. */
export interface Recipe {
  ingredients: Ingredient[]
  steps: string[]
  reheating: Reheating
  storage: Storage
}

export const EMPTY_RECIPE: Recipe = {
  ingredients: [],
  steps: [],
  reheating: { mode: 'Four', temperature: 160, minutes: 15 },
  storage: { method: 'Réfrigérateur', days: 3, container: 'Boîte hermétique' },
}

// ── Liste de courses ────────────────────────────────────────────────────────

export interface ShoppingLine {
  name: string
  qty: number
  unit: Unit
  aisle: Aisle
  /** Vrai quand la ligne a été corrigée à la main : le recalcul la laisse en place. */
  edited?: boolean
}

export interface ShoppingGroup {
  aisle: Aisle
  lines: ShoppingLine[]
}

/**
 * Liste de courses d'un ensemble de plats, mise à l'échelle des portions
 * commandées puis dédoublonnée par ingrédient et unité. On additionne les
 * quantités exactes et l'on n'arrondit qu'à la fin (§4.12). Une ligne « selon
 * le goût » n'a pas de nombre : elle reste dans la liste, sans quantité.
 */
export function buildShoppingList(
  items: { recipe: Recipe; basePortions: number; portions: number }[],
): ShoppingGroup[] {
  const merged = new Map<string, ShoppingLine>()

  for (const { recipe, basePortions, portions } of items) {
    const factor = basePortions > 0 ? portions / basePortions : 1
    for (const ing of recipe.ingredients) {
      const key = `${ing.name.toLowerCase().trim()}|${ing.unit}`
      const qty = ing.unit === TO_TASTE || ing.qty == null ? 0 : ing.qty * factor
      const existing = merged.get(key)
      if (existing) existing.qty += qty
      else merged.set(key, { name: ing.name.trim(), qty, unit: ing.unit, aisle: ing.aisle })
    }
  }

  const groups = new Map<Aisle, ShoppingLine[]>()
  for (const line of merged.values()) {
    line.qty = roundForDisplay(line.qty, line.unit)
    const bucket = groups.get(line.aisle)
    if (bucket) bucket.push(line)
    else groups.set(line.aisle, [line])
  }

  // Les rayons connus dans l'ordre du magasin, puis ceux que la liste ne connaît pas.
  const order = [...AISLES, ...[...groups.keys()].filter((a) => !AISLES.includes(a))]
  return order
    .filter((a) => groups.has(a))
    .map((aisle) => ({
      aisle,
      lines: (groups.get(aisle) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
}

/** Quantité affichée : « 1,5 kg », « 250 g », « 3 pièces », « selon le goût ». */
export const formatQty = (qty: number, unit: Unit) =>
  displayQuantity(unit === TO_TASTE ? null : qty, unit)

export const reheatingLabel = (r: Reheating) =>
  [r.mode, r.temperature ? `${r.temperature} °C` : null, `${r.minutes} min`].filter(Boolean).join(' · ')

export const storageLabel = (s: Storage) =>
  `${s.method} · ${s.days} jour${s.days > 1 ? 's' : ''}${s.container ? ` · ${s.container}` : ''}`

/** Une recette est complète quand elle peut produire la fiche et la liste de courses. */
export const isRecipeComplete = (r: Recipe) => r.ingredients.length > 0 && r.steps.length > 0
