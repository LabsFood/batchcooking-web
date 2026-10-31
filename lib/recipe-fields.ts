/* ─────────────────────────────────────────────────────────────────────────────
   Le vocabulaire d'une recette, côté batch cooker.

   Les unités et les rayons viennent de `lib/chef/recipes.ts`, qui s'en sert
   déjà pour bâtir la liste de courses : deux listes finiraient par diverger,
   et un rayon écrit différemment casse le regroupement.

   La console admin tient le même vocabulaire, aux mêmes valeurs
   (`admin-labsfood/lib/recipe-fields.ts`). C'est nécessaire : adopter un plat
   de la maison recopie sa recette telle quelle chez le batch cooker.

   Enfin, trois contraintes de l'API qu'aucun écran ne devinerait :
   `IngredientDto` exige ses quatre champs, `ReheatingDto` exige `mode` **et**
   `minutes`, `StorageDto` exige `method` **et** `days`. Un couple incomplet
   fait échouer l'enregistrement du plat entier — d'où les gardes ici, plutôt
   qu'un 422 opaque devant un formulaire rempli.
   ───────────────────────────────────────────────────────────────────────────── */

import type { Ingredient, Recipe } from '@/lib/api/chef-catalog'

export { UNITS } from '@/lib/chef/recipes'

/**
 * Les rayons, par identifiant.
 *
 * Ce ne sont pas des libellés : `GET /chef-missions/{id}/shopping-list` groupe
 * la liste de courses **par la chaîne stockée**, et les exemples de l'API
 * utilisent `boucherie`, `fruits-legumes`. Écrire « Boucherie » d'un côté et
 * `boucherie` de l'autre, c'est se retrouver avec deux rayons pour la même
 * allée de magasin. Il n'y a pas de référentiel côté API : ces valeurs sont
 * notre convention, alignée sur ce que le backend écrit déjà.
 */
export const AISLE_LABEL: Record<string, string> = {
  'fruits-legumes': 'Fruits et légumes',
  boucherie: 'Boucherie',
  poissonnerie: 'Poissonnerie',
  cremerie: 'Crèmerie',
  'epicerie-salee': 'Épicerie salée',
  'epicerie-sucree': 'Épicerie sucrée',
  boulangerie: 'Boulangerie',
  surgeles: 'Surgelés',
  boissons: 'Boissons',
}

/** Dans l'ordre d'un parcours en magasin. */
export const AISLES = Object.keys(AISLE_LABEL)

/** Le libellé d'un rayon, ou la valeur telle quelle si elle nous est inconnue. */
export const aisleLabel = (code?: string | null) =>
  code ? (AISLE_LABEL[code] ?? code) : null

export const REHEAT_MODES: { code: string; label: string }[] = [
  { code: 'oven', label: 'Four' },
  { code: 'pan', label: 'Poêle' },
  { code: 'saucepan', label: 'Casserole' },
  { code: 'microwave', label: 'Micro-ondes' },
  { code: 'steam', label: 'Vapeur' },
  { code: 'bain-marie', label: 'Bain-marie' },
  { code: 'none', label: 'Tel quel, sans réchauffer' },
]

export const STORAGE_METHODS: { code: string; label: string }[] = [
  { code: 'fridge', label: 'Réfrigérateur' },
  { code: 'freezer', label: 'Congélateur' },
  { code: 'ambient', label: 'Température ambiante' },
]

/**
 * Le libellé d'un code, ou la valeur telle quelle.
 *
 * Les premières recettes ont pu stocker « Four » plutôt que `oven` : on affiche
 * ce qui est écrit au lieu d'afficher un vide.
 */
const labelOf = (liste: { code: string; label: string }[], valeur?: string | null) =>
  valeur ? (liste.find((x) => x.code === valeur)?.label ?? valeur) : null

export const reheatModeLabel = (mode?: string | null) => labelOf(REHEAT_MODES, mode)
export const storageMethodLabel = (m?: string | null) => labelOf(STORAGE_METHODS, m)

/** « Four · 160 °C · 15 min », ou `null` s'il n'y a rien à dire. */
export function reheatingLine(r?: Recipe['reheating']): string | null {
  if (!r?.mode) return null
  return [
    reheatModeLabel(r.mode),
    r.temperature != null ? `${r.temperature} °C` : null,
    r.minutes != null ? `${r.minutes} min` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** « Réfrigérateur · 3 jours · Boîte hermétique ». */
export function storageLine(s?: Recipe['storage']): string | null {
  if (!s?.method) return null
  return [
    storageMethodLabel(s.method),
    s.days != null ? `${s.days} jour${s.days > 1 ? 's' : ''}` : null,
    s.container || null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/* ── Les gardes avant envoi ────────────────────────────────────────────────── */

/**
 * Une ligne en cours de saisie.
 *
 * `qty` est une chaîne et non un nombre : un champ qu'on vide doit rester
 * vide, pas retomber sur zéro. La conversion se fait à l'envoi, une seule
 * fois, ici.
 */
export interface IngredientRow {
  name: string
  qty: string
  unit: string
  aisle: string
}

/** La ligne telle qu'elle existe déjà sur un plat, prête à être éditée. */
export function toRow(i: Ingredient): IngredientRow {
  return {
    name: i.name ?? '',
    qty: i.qty == null ? '' : String(i.qty),
    unit: i.unit ?? '',
    aisle: i.aisle ?? '',
  }
}

/** Les quatre champs tenus : c'est ce que l'API exige d'une ligne. */
export function ingredientReady(i: IngredientRow): boolean {
  return Boolean(
    i.name.trim() &&
      i.qty.trim() &&
      Number.isFinite(Number(i.qty)) &&
      i.unit.trim() &&
      i.aisle.trim(),
  )
}

/** Vrai dès qu'une ligne a été commencée : une ligne vierge n'est pas un oubli. */
export const ingredientStarted = (i: IngredientRow): boolean =>
  Boolean(i.name.trim() || i.qty.trim() || i.unit || i.aisle)

export function cleanIngredients(list: IngredientRow[]): Ingredient[] {
  return list.filter(ingredientReady).map((i) => ({
    name: i.name.trim(),
    qty: Number(i.qty),
    unit: i.unit.trim(),
    aisle: i.aisle.trim(),
  }))
}

export function cleanReheating(r: {
  mode: string
  temperature: string
  minutes: string
  note: string
}): NonNullable<Recipe['reheating']> | null {
  if (!r.mode || !r.minutes.trim()) return null
  return {
    mode: r.mode,
    minutes: Number(r.minutes),
    ...(r.temperature.trim() ? { temperature: Number(r.temperature) } : {}),
    ...(r.note.trim() ? { note: r.note.trim() } : {}),
  }
}

export function cleanStorage(s: {
  method: string
  days: string
  container: string
}): NonNullable<Recipe['storage']> | null {
  if (!s.method || !s.days.trim()) return null
  return {
    method: s.method,
    days: Number(s.days),
    ...(s.container.trim() ? { container: s.container.trim() } : {}),
  }
}
