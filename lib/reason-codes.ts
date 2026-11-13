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
  RECIPE_CONFLICT:
    'Cette recette a été modifiée ailleurs (un autre onglet, ou Lab’s Food a mis à jour un ingrédient). Rechargez pour voir la dernière version.',
  INGREDIENT_NOT_LINKED:
    'Des ingrédients ne sont pas reliés à la liste commune : reliez-les avant de confirmer les allergènes.',
  INGREDIENT_ALREADY_LISTED: 'Cet ingrédient figure déjà dans la liste : reliez-le plutôt que de le recréer.',
  INGREDIENT_CAP_REACHED:
    'Vous avez créé beaucoup d’ingrédients ces dernières 24 heures : réessayez plus tard.',
  INGREDIENT_NOT_PENDING:
    'Cet ingrédient a été validé ou remplacé entre-temps : rechargez la page.',
  TIER_CANNOT_PUBLISH: 'Votre palier ne permet pas encore de publier.',
  ADDRESS_NOT_FOUND:
    'Cette adresse est introuvable dans ce code postal. Vérifiez le numéro et le nom de la rue.',
  ADDRESS_CITY_MISMATCH:
    'Cette ville ne correspond pas au code postal. Choisissez la commune dans la liste.',
  CONTRACT_CONSENT_REQUIRED:
    'Cochez les cases demandées pour commander : elles valent acceptation du contrat.',
  WITHDRAWAL_NOT_CONCLUDED:
    'Cette prestation n’est pas encore payée : vous pouvez l’annuler sans frais.',
  WITHDRAWAL_ALREADY_SENT: 'Votre rétractation a déjà été envoyée.',
  BOOKING_CANCELLED: 'Cette prestation est annulée.',
  WITHDRAWAL_PERIOD_OVER: 'Le délai de rétractation de 14 jours est passé.',
  WITHDRAWAL_EXECUTED:
    'La prestation a été entièrement réalisée à votre demande : le droit de rétractation ne s’applique plus.',
  CHANGED_MEANWHILE: 'La prestation vient de changer : rechargez la page et réessayez.',
  DOCUMENT_NOT_FOUND: 'Ce document n’est pas disponible pour cette prestation.',
  GEO_UNAVAILABLE:
    'La vérification de l’adresse est momentanément indisponible. Réessayez dans quelques minutes.',
} as const

/** Les allergènes d'un ingrédient sont exigés (ou « aucun ») : la phrase du dialogue, de la page et de leurs refus. */
export const INGREDIENT_ALLERGENS_REQUIRED_TEXT =
  'Cochez ses allergènes, ou indiquez qu’il n’en contient aucun.'

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
