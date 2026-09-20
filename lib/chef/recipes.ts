/* ─────────────────────────────────────────────────────────────────────────────
   Recettes du batch cooker : ingrédients, réchauffage, conservation.

   Deux choses en découlent automatiquement et restent modifiables :
   — la fiche recette standardisée Lab's Food (document remis au client) ;
   — la liste de courses, mise à l'échelle du nombre de portions commandées.

   Rien n'est extrait d'un fichier importé pour l'instant : le batch cooker
   saisit sa recette, la fiche et la liste se construisent à partir de là.
   ───────────────────────────────────────────────────────────────────────────── */

export const UNITS = ['g', 'kg', 'ml', 'cl', 'l', 'pièce', 'c. à soupe', 'c. à café', 'pincée', 'botte', 'gousse'] as const
export type Unit = (typeof UNITS)[number]

/** Rayons de la liste de courses, dans l'ordre d'un parcours en magasin. */
export const AISLES = [
  'Fruits et légumes',
  'Boucherie',
  'Poissonnerie',
  'Crèmerie',
  'Épicerie salée',
  'Épicerie sucrée',
  'Boulangerie',
  'Surgelés',
  'Boissons',
] as const
export type Aisle = (typeof AISLES)[number]

export interface Ingredient {
  name: string
  /** Quantité pour `ChefDish.portions` portions. */
  qty: number
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

/** Arrondi lisible en rayon : au gramme près n'a pas de sens sur un paquet de riz. */
function roundQty(qty: number, unit: Unit): number {
  if (unit === 'g' || unit === 'ml') return qty >= 100 ? Math.round(qty / 10) * 10 : Math.round(qty)
  if (unit === 'kg' || unit === 'l') return Math.round(qty * 100) / 100
  if (unit === 'pièce' || unit === 'botte' || unit === 'gousse') return Math.ceil(qty)
  return Math.round(qty * 2) / 2
}

/**
 * Liste de courses d'un ensemble de plats, mise à l'échelle des portions
 * commandées puis dédoublonnée par ingrédient et unité.
 */
export function buildShoppingList(
  items: { recipe: Recipe; basePortions: number; portions: number }[],
): ShoppingGroup[] {
  const merged = new Map<string, ShoppingLine>()

  for (const { recipe, basePortions, portions } of items) {
    const factor = basePortions > 0 ? portions / basePortions : 1
    for (const ing of recipe.ingredients) {
      const key = `${ing.name.toLowerCase().trim()}|${ing.unit}`
      const existing = merged.get(key)
      if (existing) existing.qty += ing.qty * factor
      else merged.set(key, { name: ing.name.trim(), qty: ing.qty * factor, unit: ing.unit, aisle: ing.aisle })
    }
  }

  const groups = new Map<Aisle, ShoppingLine[]>()
  for (const line of merged.values()) {
    line.qty = roundQty(line.qty, line.unit)
    const bucket = groups.get(line.aisle)
    if (bucket) bucket.push(line)
    else groups.set(line.aisle, [line])
  }

  return AISLES.filter((a) => groups.has(a)).map((aisle) => ({
    aisle,
    lines: (groups.get(aisle) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  }))
}

/** Quantité affichée : « 1,5 kg », « 250 g », « 3 pièces ». */
export function formatQty(qty: number, unit: Unit): string {
  const n = Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0+$/, '').replace('.', ',')
  if (unit === 'pièce') return `${n} ${qty > 1 ? 'pièces' : 'pièce'}`
  if (unit === 'botte') return `${n} ${qty > 1 ? 'bottes' : 'botte'}`
  if (unit === 'gousse') return `${n} ${qty > 1 ? 'gousses' : 'gousse'}`
  if (unit === 'pincée') return `${n} ${qty > 1 ? 'pincées' : 'pincée'}`
  return `${n} ${unit}`
}

export const reheatingLabel = (r: Reheating) =>
  [r.mode, r.temperature ? `${r.temperature} °C` : null, `${r.minutes} min`].filter(Boolean).join(' · ')

export const storageLabel = (s: Storage) =>
  `${s.method} · ${s.days} jour${s.days > 1 ? 's' : ''}${s.container ? ` · ${s.container}` : ''}`

/** Une recette est complète quand elle peut produire la fiche et la liste de courses. */
export const isRecipeComplete = (r: Recipe) => r.ingredients.length > 0 && r.steps.length > 0
