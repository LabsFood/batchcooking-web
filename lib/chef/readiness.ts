/* ─────────────────────────────────────────────────────────────────────────────
   « Prête » (module Recettes §4.11), en mots.

   L'API calcule la liste de ce qui manque et nomme chaque point par un `code`
   et un `field` : on traduit d'après eux, jamais d'après `message`, qui reste
   en anglais pour les développeurs.
   ───────────────────────────────────────────────────────────────────────────── */

const CHAMP: Record<string, string> = {
  name: 'le nom',
  category: 'la place dans le repas',
  portions: 'le nombre de portions',
  cookMinutes: 'le temps de cuisson (0 si le plat ne cuit pas)',
  'recipe.ingredients': 'au moins un ingrédient',
  'recipe.steps': 'au moins une étape',
  'recipe.storage': 'la conservation : où, et combien de jours',
  'recipe.reheating': 'un mode de réchauffage',
  description: 'une description courte',
}

/** `recipe.steps[2]` → 2 ; null pour un autre champ. */
const rang = (field: string) => {
  const m = /\[(\d+)\]$/.exec(field)
  return m ? Number(m[1]) : null
}

/** Un point manquant, comme il s'écrit dans une liste : « le type de l’étape 2 ». */
export function problemText(p: { code: string; field: string }): string {
  const i = rang(p.field)
  switch (p.code) {
    case 'INGREDIENT_TO_VERIFY':
      return `l’ingrédient n° ${(i ?? 0) + 1}, encore à vérifier`
    case 'STEP_TYPE_MISSING':
      return `le type de l’étape ${(i ?? 0) + 1}`
    case 'ALLERGENS_REQUIRED':
      return 'les allergènes, ou la mention « aucun »'
    case 'ALLERGENS_UNVERIFIED':
      return 'la confirmation des allergènes'
    case 'PHOTO_MISSING':
      return 'une vraie photo du plat'
    default:
      return CHAMP[p.field] ?? p.field
  }
}
