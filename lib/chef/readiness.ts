/* ─────────────────────────────────────────────────────────────────────────────
   « Prête » (module Recettes §4.11), en mots.

   L'API calcule la liste de ce qui manque et nomme chaque point par un `code`
   et un `field` : on traduit d'après eux, jamais d'après `message`, qui reste
   en anglais pour les développeurs.

   Le même `field` sert à retrouver le champ à l'écran (`fieldTarget`) : un seul
   endroit connaît la correspondance entre un chemin de l'API et un id du DOM.
   ───────────────────────────────────────────────────────────────────────────── */

const CHAMP: Record<string, string> = {
  name: 'le nom',
  category: 'la place dans le repas',
  portions: 'le nombre de portions',
  cookMinutes: 'le temps de cuisson (0 si le plat ne cuit pas)',
  'recipe.ingredients': 'au moins un ingrédient (un visible par le client pour publier)',
  'recipe.steps': 'au moins une étape',
  'recipe.storage': 'la conservation : où, et combien de jours',
  'recipe.storage.freezable': 'si le plat se congèle, oui ou non',
  'recipe.storage.freezerMonths': 'la durée de congélation, en mois',
  'recipe.storage.thawing': 'la façon de décongeler le plat',
  'recipe.reheating': 'un mode de réchauffage',
  'recipe.reheating.note': 'les consignes de réchauffage',
  description: 'une description courte',
}

/** `recipe.steps[2]` → 2 ; null pour un autre champ. */
const rang = (field: string) => {
  const m = /\[(\d+)\](?:\.\w+)?$/.exec(field)
  return m ? Number(m[1]) : null
}

/** Le détail d'une ligne d'ingrédient en faute : `recipe.ingredients[3].qty` → qty. */
const detailLigne = (field: string) => /^recipe\.ingredients\[\d+\]\.(\w+)$/.exec(field)?.[1] ?? null

const DETAIL_LIGNE: Record<string, string> = {
  name: 'le nom',
  qty: 'la quantité',
  unit: 'l’unité',
  aisle: 'le rayon',
}

/** Un point manquant, comme il s'écrit dans une liste : « le type de l’étape 2 ». */
export function problemText(p: { code: string; field: string }): string {
  const i = rang(p.field)
  const n = (i ?? 0) + 1
  switch (p.code) {
    case 'INGREDIENT_TO_VERIFY':
      return `l’ingrédient n° ${n}, encore à vérifier`
    case 'INGREDIENT_NOT_LINKED':
      return `l’ingrédient n° ${n}, à relier à la liste commune (choisissez-le dans les suggestions, ou créez-le)`
    case 'INGREDIENT_INCOMPLETE':
      return `l’ingrédient n° ${n}, dont les allergènes ne sont pas encore renseignés dans la liste commune`
    case 'STEP_TYPE_MISSING':
      return `le type de l’étape ${n}`
    case 'ALLERGENS_REQUIRED':
      return 'les allergènes, ou la mention « aucun »'
    case 'ALLERGENS_UNVERIFIED':
      return 'la confirmation des allergènes'
    case 'DECLARED_DIET_NOT_ALLOWED':
      return 'le régime halal ou casher déclaré : il demande des ingrédients sans porc, tous reliés à la liste commune'
    case 'PHOTO_MISSING':
      return 'une vraie photo du plat'
    case 'NO_COMMON_SEASON':
      return 'les saisons : les ingrédients n’ont aucun mois en commun, choisissez les mois à la main'
    case 'FRIDGE_LONG':
      return 'une conservation très longue au réfrigérateur : vérifiez qu’elle est sûre'
    case 'VALIDATION_FAILED': {
      const detail = detailLigne(p.field)
      if (detail) return `${DETAIL_LIGNE[detail] ?? detail} de l’ingrédient n° ${n}`
      return CHAMP[p.field] ?? p.field
    }
    default:
      return CHAMP[p.field] ?? p.field
  }
}

/**
 * L'id du champ à l'écran pour un `field` de l'API, ou null s'il n'y en a pas.
 *
 * `shownRows` ramène le rang d'une ligne de l'API (ligne enregistrée) à la
 * ligne affichée : la liste peut avoir des lignes incomplètes que l'API n'a
 * jamais reçues. Sans lui, le rang est pris tel quel.
 */
export function fieldTarget(field: string, shownRows?: number[]): string | null {
  const line = /^recipe\.ingredients\[(\d+)\](?:\.(\w+))?$/.exec(field)
  if (line) {
    const k = Number(line[1])
    const row = shownRows ? shownRows[k] : k
    if (row === undefined) return 'ingredients'
    const part = line[2] === 'qty' || line[2] === 'unit' || line[2] === 'aisle' ? line[2] : 'name'
    return `ingredient-${row}-${part}`
  }
  const step = /^recipe\.steps\[(\d+)\]/.exec(field)
  if (step) return `step-${step[1]}-type`
  switch (field) {
    case 'name':
      return 'dish-name'
    case 'description':
      return 'dish-description'
    case 'category':
      return 'dish-category'
    case 'portions':
      return 'dish-portions'
    case 'cookMinutes':
      return 'dish-cook'
    case 'imageUrl':
      return 'dish-photo'
    case 'classification':
      return 'dish-seasons'
    case 'declaredDiets':
      return 'dish-declared-diets'
    case 'allergens':
      return 'dish-allergens'
    case 'recipe.ingredients':
      return 'ingredients'
    case 'recipe.steps':
      return 'steps'
    case 'recipe.storage':
      return 'storage-method'
    case 'recipe.storage.freezable':
      return 'storage-freezable'
    case 'recipe.storage.freezerMonths':
      return 'storage-months'
    case 'recipe.storage.thawing':
      return 'storage-thawing'
    case 'recipe.reheating':
      return 'reheat-modes'
    case 'recipe.reheating.note':
      return 'reheat-note'
    default:
      return null
  }
}

/** Fait défiler jusqu'au champ et lui donne le focus (le premier champ actif d'un bloc). */
export function focusField(id: string): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const target = el.matches('input, select, textarea, button')
    ? el
    : (el.querySelector<HTMLElement>(
        'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)',
      ) ?? el)
  if (target === el && !el.matches('input, select, textarea, button')) {
    el.setAttribute('tabindex', '-1')
  }
  target.focus({ preventScroll: true })
}
