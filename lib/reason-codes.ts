/* ─────────────────────────────────────────────────────────────────────────────
   Ce que dit l'écran quand l'API refuse (module Recettes, lots 0 à 5).

   L'API répond `{ code, message, ...détails }`. Le texte affiché se choisit
   d'après `code`, jamais d'après `message`, qui reste en anglais pour les
   développeurs. Textes repris du catalogue des popovers, à relire par le
   produit.
   ───────────────────────────────────────────────────────────────────────────── */

export const REASON_TEXT = {
  ALLERGIES_NOT_DECLARED:
    'Indiquez vos allergies, ou « aucune », pour valider un menu. Sans cette réponse, nous ne pouvons pas vérifier la sécurité du menu.',
  ALLERGEN_CONFLICT:
    'Ce plat contient un allergène que vous avez déclaré : il ne peut pas être ajouté.',
  ALLERGENS_UNVERIFIED:
    'Les allergènes de ce plat ne sont pas encore vérifiés : il ne peut pas être choisi pour l’instant.',
  HEALTH_CONSENT_REQUIRED:
    'Pour enregistrer vos allergies, acceptez le texte de consentement tel qu’il est affiché.',
  CUSTOM_ALLERGIES:
    'Une allergie écrite en toutes lettres ne se vérifie pas automatiquement : le batch cooker la lit et en tient compte lui-même.',
  RECIPE_NOT_READY: 'La fiche n’est pas prête : les éléments manquants sont listés un par un.',
  INGREDIENT_TO_VERIFY:
    'Cet ingrédient est encore à vérifier : relisez-le, puis indiquez qu’il est vérifié.',
  STEP_TYPE_MISSING:
    'Chaque étape a un type : préparation, cuisson, refroidissement ou mise en boîte.',
  ALLERGENS_REQUIRED:
    'Déclarez les allergènes du plat, ou la mention « aucun des 14 allergènes ».',
  PHOTO_MISSING:
    'Une vraie photo du plat est demandée, pas une image générée. Elle ne bloque pas encore la publication.',
  MENU_FROZEN: 'À 3 jours de la prestation, le menu est figé.',
  SHOPPING_LIST_NOT_SENT: 'Le batch cooker n’a pas encore envoyé la liste de courses.',
  SHOPPING_LIST_FROZEN: 'La date limite est passée : la liste ne peut plus être modifiée.',
  SHOPPING_LIST_UPDATED:
    'Le batch cooker vient de mettre la liste à jour : vérifiez-la, puis renvoyez-la.',
  SHOPPING_BY_CLIENT:
    'Vous faites les courses vous-même pour cette prestation : la liste ne s’envoie pas.',
  LIMIT_REACHED: 'Limite atteinte.',
  AI_FORMAT_INVALID:
    'La recette proposée ne respecte pas le format standard, même après plusieurs essais. Essayez une autre demande.',
  DUPLICATE_INGREDIENT_LINE:
    'Un même ingrédient figure sur plusieurs lignes : fusionnez-les en une seule.',
  INGREDIENT_ALREADY_LISTED: 'Cet ingrédient figure déjà dans la liste : reliez-le plutôt que de le recréer.',
  INGREDIENT_CAP_REACHED:
    'Vous avez créé beaucoup d’ingrédients ces dernières 24 heures : réessayez plus tard.',
  TIER_CANNOT_PUBLISH: 'Votre palier ne permet pas encore de publier.',
} as const

export type ReasonCode = keyof typeof REASON_TEXT

/**
 * Le texte d'un refus de l'API, d'après son `code` (le corps d'une `ApiError`).
 * `null` pour un code que l'écran ne connaît pas : il garde alors son message.
 */
export function reasonText(body: unknown): string | null {
  const b = body as { code?: unknown; max?: unknown } | null
  if (typeof b?.code !== 'string' || !(b.code in REASON_TEXT)) return null
  const texte = REASON_TEXT[b.code as ReasonCode]
  return b.code === 'LIMIT_REACHED' && typeof b.max === 'number'
    ? `${texte} ${b.max} maximum.`
    : texte
}
