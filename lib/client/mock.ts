/* ─────────────────────────────────────────────────────────────────────────────
   Données simulées des nouveaux modules du dashboard client (spec v2).

   Couvre : carte culinaire (CL-01), liste de courses autonome (CL-05),
   réchauffage & conservation (CL-09), moyens de paiement et rattachements
   URSSAF (CL-12 / § 6.1), litiges (CL-03), annuaire des batch cookers (CL-02).
   ───────────────────────────────────────────────────────────────────────────── */

const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()

// ── Carte culinaire (CL-01) ─────────────────────────────────────────────────

export interface ExploredCountry {
  code: string
  name: string
  flag: string
  /**
   * Code ISO 3166-1 numerique, sous forme de chaine.
   * C'est la cle utilisee par world-atlas pour identifier un pays sur la carte.
   */
  iso: string
  dishes: string[]
  firstAt: string
}

/** Total de pays reconnus — la carte affiche « explorés / 195 ». */
export const TOTAL_COUNTRIES = 195

export const EXPLORED_COUNTRIES: ExploredCountry[] = [
  { code: 'FR', iso: '250', name: 'France', flag: '🇫🇷', dishes: ['Poulet rôti aux herbes', 'Bœuf bourguignon'], firstAt: iso(-120) },
  { code: 'IT', iso: '380', name: 'Italie', flag: '🇮🇹', dishes: ['Risotto aux champignons', 'Lasagnes'], firstAt: iso(-90) },
  { code: 'IN', iso: '356', name: 'Inde', flag: '🇮🇳', dishes: ['Curry de lentilles corail'], firstAt: iso(-60) },
  { code: 'MA', iso: '504', name: 'Maroc', flag: '🇲🇦', dishes: ['Tajine de légumes'], firstAt: iso(-45) },
  { code: 'JP', iso: '392', name: 'Japon', flag: '🇯🇵', dishes: ['Saumon teriyaki'], firstAt: iso(-30) },
  { code: 'MX', iso: '484', name: 'Mexique', flag: '🇲🇽', dishes: ['Chili sin carne'], firstAt: iso(-14) },
  { code: 'TH', iso: '764', name: 'Thaïlande', flag: '🇹🇭', dishes: ['Pad thaï'], firstAt: iso(-7) },
]

// ── Liste de courses (CL-05) ────────────────────────────────────────────────

export interface ShoppingItem {
  id: string
  name: string
  qty: string
  aisle: string
}

export const SHOPPING_AISLES = [
  'Fruits & légumes',
  'Boucherie & poisson',
  'Crémerie',
  'Épicerie',
  'Surgelés',
]

export const SHOPPING_LIST: ShoppingItem[] = [
  { id: 's1', name: 'Pommes de terre', qty: '1,5 kg', aisle: 'Fruits & légumes' },
  { id: 's2', name: 'Courgettes', qty: '4 unités', aisle: 'Fruits & légumes' },
  { id: 's3', name: 'Champignons de Paris', qty: '500 g', aisle: 'Fruits & légumes' },
  { id: 's4', name: 'Tomates cerise', qty: '2 barquettes', aisle: 'Fruits & légumes' },
  { id: 's5', name: 'Poulet fermier', qty: '1 entier (1,6 kg)', aisle: 'Boucherie & poisson' },
  { id: 's6', name: 'Pavés de saumon', qty: '4 pièces', aisle: 'Boucherie & poisson' },
  { id: 's7', name: 'Crème fraîche', qty: '20 cl', aisle: 'Crémerie' },
  { id: 's8', name: 'Parmesan', qty: '150 g', aisle: 'Crémerie' },
  { id: 's9', name: 'Riz arborio', qty: '500 g', aisle: 'Épicerie' },
  { id: 's10', name: 'Lentilles corail', qty: '400 g', aisle: 'Épicerie' },
  { id: 's11', name: 'Lait de coco', qty: '2 boîtes', aisle: 'Épicerie' },
  { id: 's12', name: 'Petits pois', qty: '300 g', aisle: 'Surgelés' },
]

/** Référentiel d'enseignes — configurable côté admin (S-01 / AD-07). */
export const STORES = [
  { id: 'carrefour', name: 'Carrefour Drive', url: 'https://www.carrefour.fr/drive' },
  { id: 'leclerc', name: 'E.Leclerc Drive', url: 'https://www.leclercdrive.fr' },
  { id: 'auchan', name: 'Auchan Drive', url: 'https://www.auchan.fr/drive' },
  { id: 'intermarche', name: 'Intermarché Drive', url: 'https://www.intermarche.com' },
]

// ── Réchauffage & conservation (CL-09) ──────────────────────────────────────

export interface DishCare {
  id: string
  dish: string
  reheatMode: string
  reheatTime: string
  fridgeDays: number
  freezerMonths: number | null
  container: string
  tip?: string
}

export const DISH_CARE: DishCare[] = [
  { id: 'c1', dish: 'Poulet rôti aux herbes', reheatMode: 'Four 180 °C', reheatTime: '12–15 min', fridgeDays: 3, freezerMonths: 2, container: 'Boîte hermétique', tip: 'Ajoutez une cuillère de bouillon pour éviter le dessèchement.' },
  { id: 'c2', dish: 'Risotto aux champignons', reheatMode: 'Poêle à feu doux', reheatTime: '5–7 min', fridgeDays: 2, freezerMonths: null, container: 'Boîte hermétique', tip: 'Détendez avec un peu de bouillon ou de crème.' },
  { id: 'c3', dish: 'Curry de lentilles corail', reheatMode: 'Casserole', reheatTime: '6–8 min', fridgeDays: 4, freezerMonths: 3, container: 'Bocal en verre' },
  { id: 'c4', dish: 'Saumon en papillote', reheatMode: 'Four 160 °C', reheatTime: '8–10 min', fridgeDays: 2, freezerMonths: 1, container: 'Papillote d’origine', tip: 'À consommer en priorité — produit de la mer.' },
]

// ── Moyens de paiement & rattachements URSSAF (CL-12 / § 6.1) ───────────────

export interface PaymentCard {
  id: string
  brand: string
  last4: string
  expiry: string
  isDefault: boolean
}

export const PAYMENT_CARDS: PaymentCard[] = [
  { id: 'pm_1', brand: 'Visa', last4: '4242', expiry: '04/28', isDefault: true },
  { id: 'pm_2', brand: 'Mastercard', last4: '8210', expiry: '11/26', isDefault: false },
]

export type UrssafStatus = 'active' | 'pending' | 'none' | 'refused'

export const URSSAF_STATUS_LABEL: Record<UrssafStatus, string> = {
  active: 'Rattachement actif',
  pending: 'Demande en cours',
  none: 'Non rattaché',
  refused: 'Refusé',
}

/**
 * ⚠️ Le rattachement à l'avance immédiate existe **par couple
 * client-prestataire** — jamais comme booléen global sur le compte (§ 6.1).
 */
export interface UrssafLink {
  chefId: string
  chefName: string
  status: UrssafStatus
  since?: string
}

export const URSSAF_LINKS: UrssafLink[] = [
  { chefId: 'bc_001', chefName: 'Ivy Siyaptze', status: 'active', since: iso(-60) },
  { chefId: 'bc_003', chefName: 'Lina Bertrand', status: 'pending' },
  { chefId: 'bc_002', chefName: 'Marc Lefèvre', status: 'none' },
]

// ── Adresses (CL-12) ────────────────────────────────────────────────────────

export interface Address {
  id: string
  label: string
  street: string
  postalCode: string
  city: string
  accessCode?: string
  isDefault: boolean
}

export const ADDRESSES: Address[] = [
  { id: 'ad_1', label: 'Domicile', street: '15 rue de la Buffa', postalCode: '06000', city: 'Nice', accessCode: 'B1234', isDefault: true },
  { id: 'ad_2', label: 'Résidence secondaire', street: '8 avenue des Mimosas', postalCode: '06400', city: 'Cannes', isDefault: false },
]

// ── Litiges (CL-03) ─────────────────────────────────────────────────────────

export type ClientDisputeStatus = 'open' | 'processing' | 'resolved'

export const CLIENT_DISPUTE_STATUS_LABEL: Record<ClientDisputeStatus, string> = {
  open: 'Ouvert',
  processing: 'En traitement',
  resolved: 'Résolu',
}

export interface ClientDispute {
  id: string
  reference: string
  chef: string
  category: string
  openedAt: string
  status: ClientDisputeStatus
}

export const CLIENT_DISPUTES: ClientDispute[] = [
  { id: 'cd_1', reference: 'LF-2026-0094', chef: 'Ivy Siyaptze', category: 'Prestation incomplète', openedAt: iso(-8), status: 'processing' },
]

// ── Annuaire des batch cookers (CL-02 / CL-11) ──────────────────────────────

export interface ChefListing {
  id: string
  name: string
  city: string
  zone: string
  rating: number
  reviews: number
  languages: string[]
  badges: string[]
  acceptedPayments: ('card' | 'urssaf' | 'cesu')[]
  shoppingIncluded: boolean
  shoppingFee: number
  basePrice: number
  specialties: string[]
}

export const CHEF_LISTINGS: ChefListing[] = [
  { id: 'bc_001', name: 'Ivy Siyaptze', city: 'Nice', zone: '30 km', rating: 4.8, reviews: 37, languages: ['Français', 'Anglais'], badges: ['HACCP', 'Assuré'], acceptedPayments: ['card', 'urssaf', 'cesu'], shoppingIncluded: true, shoppingFee: 25, basePrice: 200, specialties: ['Méditerranéen', 'Africain'] },
  { id: 'bc_003', name: 'Lina Bertrand', city: 'Antibes', zone: '15 km', rating: 4.6, reviews: 21, languages: ['Français'], badges: ['HACCP'], acceptedPayments: ['card', 'urssaf'], shoppingIncluded: false, shoppingFee: 0, basePrice: 180, specialties: ['Végétarien', 'Italien'] },
  { id: 'bc_002', name: 'Marc Lefèvre', city: 'Cannes', zone: '20 km', rating: 4.4, reviews: 12, languages: ['Français', 'Italien'], badges: ['Assuré'], acceptedPayments: ['card'], shoppingIncluded: true, shoppingFee: 20, basePrice: 165, specialties: ['Français', 'Bistrot'] },
]

export const PAYMENT_LABEL: Record<'card' | 'urssaf' | 'cesu', string> = {
  card: 'Carte bancaire',
  urssaf: 'Avance immédiate',
  cesu: 'CESU préfinancé',
}
