/* ─────────────────────────────────────────────────────────────────────────────
   Tarifs du batch cooker.

   Règle structurante : il saisit son **net perçu**, jamais le prix de vente.
   Le prix client et le reste à charge après crédit d'impôt sont calculés.

   La base est modifiable (nombre de repas et nombre de personnes) : c'est elle
   qui donne le nombre de portions annoncé au client — « 4 repas pour
   3 personnes, soit 12 portions ».
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Taux de repli, le temps que `GET /pricing-rules` réponde. Le taux en vigueur
 * est réglé par l'équipe Lab's Food : les écrans le lisent via `usePricingRules`.
 */
export const COMMISSION_RATE = 0.15
export const TAX_CREDIT_RATE = 0.5

/** Plancher imposé sur le forfait courses. En dessous : uniquement la gratuité. */
export const SHOPPING_FEE_MIN = 6

export interface ChefPricing {
  /** Base de la formule : nombre de repas et de personnes, tous deux modifiables. */
  baseMeals: number
  basePersons: number
  baseNet: number
  extraMealNet: number
  extraPersonNet: number
  /** Le chef propose de faire les courses. */
  shoppingOffered: boolean
  /** Courses offertes au client : le forfait passe à 0 et le plancher ne s'applique pas. */
  shoppingFree: boolean
  shoppingFeeNet: number
}

export const DEFAULT_PRICING: ChefPricing = {
  baseMeals: 4,
  basePersons: 3,
  baseNet: 180,
  extraMealNet: 8,
  extraPersonNet: 15,
  shoppingOffered: true,
  shoppingFree: false,
  shoppingFeeNet: 25,
}

/** Prix payé par le client : net du chef + commission Lab's Food. */
export const toClientPrice = (net: number, rate: number = COMMISSION_RATE) => net / (1 - rate)

export const afterTaxCredit = (clientPrice: number) => clientPrice * (1 - TAX_CREDIT_RATE)

export const portions = (p: Pick<ChefPricing, 'baseMeals' | 'basePersons'>) => p.baseMeals * p.basePersons

/** « 4 repas pour 3 personnes, soit 12 portions » — le vocabulaire du client. */
export function baseLabel(p: Pick<ChefPricing, 'baseMeals' | 'basePersons'>): string {
  const meals = `${p.baseMeals} repas`
  const people = `${p.basePersons} personne${p.basePersons > 1 ? 's' : ''}`
  return `${meals} pour ${people}, soit ${portions(p)} portions`
}

/** Forfait courses effectivement facturé (0 si offert). */
export const effectiveShoppingFee = (p: ChefPricing) =>
  !p.shoppingOffered ? 0 : p.shoppingFree ? 0 : p.shoppingFeeNet

/** Total net d'une session de base, courses comprises. */
export const sessionNet = (p: ChefPricing) => p.baseNet + effectiveShoppingFee(p)

export function pricingError(p: ChefPricing): string | null {
  if (p.baseMeals < 1) return 'La base compte au moins un repas.'
  if (p.basePersons < 1) return 'La base compte au moins une personne.'
  if (p.baseNet <= 0) return 'Indiquez ce que vous touchez pour une session de base.'
  if (p.shoppingOffered && !p.shoppingFree && p.shoppingFeeNet < SHOPPING_FEE_MIN) {
    return `Le forfait courses est d’au moins ${SHOPPING_FEE_MIN} €. Pour ne rien facturer, cochez « J’offre les courses ».`
  }
  return null
}

export const euros = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`
