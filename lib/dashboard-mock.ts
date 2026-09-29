// Mock data for the client dashboard. Decoupled from the public site mocks
// so we can iterate freely without breaking landing-page sections.

export type OrderStatus = 'pending' | 'confirmed' | 'shopping' | 'cooking' | 'delivered' | 'cancelled'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shopping: 'Liste de courses prête',
  cooking: 'En cuisine',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shopping', 'cooking', 'delivered']

/**
 * Règlement de la prestation. `due` n'apparaît qu'une fois la prestation
 * réalisée : on ne demande pas au client de régler une session qui n'a pas eu
 * lieu. En production le webhook Stripe fait foi ; ici c'est le mock.
 */
export type PaymentStatus = 'not-due' | 'due' | 'paid' | 'failed'

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  'not-due': 'Pas encore exigible',
  due: 'À régler',
  paid: 'Réglé',
  failed: 'Paiement refusé',
}

export type OrderPayment = {
  status: PaymentStatus
  method?: 'card' | 'urssaf' | 'cesu'
  paidAt?: string
  amountPaid?: number
  receiptRef?: string
  /** Date limite indicative, affichée quand le règlement est attendu. */
  dueAt?: string
  /** Message d'échec, tel que Stripe le remonte. */
  failureMessage?: string
}

export type DashboardOrder = {
  id: string
  reference: string
  date: string // ISO
  timeSlot: string
  chef: string
  /** Identifiant du batch cooker : détermine les moyens de paiement offerts. */
  chefId: string
  formula: 'Essentiel' | 'Confort' | 'Premium' | 'Sur-mesure'
  meals: { name: string; portions: number }[]
  persons: number
  amountTTC: number
  amountAfterTax: number
  status: OrderStatus
  shoppingByClient: boolean
  shoppingList?: { aisle: string; items: { name: string; qty: string }[] }[]
  notes?: string
  payment: OrderPayment
}

export const DASHBOARD_ORDERS: DashboardOrder[] = [
  {
    id: 'ord_001',
    reference: 'LF-2026-0142',
    date: '2026-05-03T09:00:00.000Z',
    timeSlot: '9h00 – 11h00',
    chef: 'Ivy Siyaptze',
    chefId: 'bc_001',
    formula: 'Confort',
    meals: [
      { name: 'Poulet rôti aux herbes', portions: 4 },
      { name: 'Risotto champignons', portions: 3 },
      { name: 'Curry lentilles corail', portions: 4 },
      { name: 'Saumon en papillote', portions: 2 },
    ],
    persons: 3,
    amountTTC: 220,
    amountAfterTax: 110,
    status: 'confirmed',
    shoppingByClient: true,
    shoppingList: [
      {
        aisle: 'Fruits & légumes',
        items: [
          { name: 'Pommes de terre', qty: '1.5 kg' },
          { name: 'Courgettes', qty: '4 unités' },
          { name: 'Champignons de Paris', qty: '500 g' },
          { name: 'Tomates cerise', qty: '2 barquettes' },
        ],
      },
      {
        aisle: 'Boucherie & poisson',
        items: [
          { name: 'Poulet fermier', qty: '1 entier (1.6 kg)' },
          { name: 'Pavés de saumon', qty: '4 pièces' },
        ],
      },
      {
        aisle: 'Épicerie',
        items: [
          { name: 'Riz arborio', qty: '500 g' },
          { name: 'Lentilles corail', qty: '500 g' },
          { name: 'Lait de coco', qty: '2 boîtes' },
        ],
      },
    ],
    notes: 'Pas trop salé pour le risotto svp.',
    payment: { status: 'not-due' },
  },
  {
    id: 'ord_002',
    reference: 'LF-2026-0119',
    date: '2026-04-19T10:00:00.000Z',
    timeSlot: '10h00 – 12h00',
    chef: 'Ivy Siyaptze',
    chefId: 'bc_001',
    formula: 'Essentiel',
    meals: [
      { name: 'Bœuf bourguignon', portions: 4 },
      { name: 'Gratin de légumes', portions: 4 },
      { name: 'Tajine d’agneau', portions: 4 },
    ],
    persons: 2,
    amountTTC: 150,
    amountAfterTax: 75,
    status: 'delivered',
    shoppingByClient: false,
    payment: {
      status: 'paid',
      method: 'urssaf',
      paidAt: '2026-04-19T13:20:00.000Z',
      amountPaid: 75,
      receiptRef: 'RC-2026-0119',
    },
  },
  {
    id: 'ord_003',
    reference: 'LF-2026-0094',
    date: '2026-03-29T09:30:00.000Z',
    timeSlot: '9h30 – 11h30',
    chef: 'Ivy Siyaptze',
    chefId: 'bc_001',
    formula: 'Sur-mesure',
    meals: [
      { name: 'Lasagnes maison', portions: 6 },
      { name: 'Soupe miso légumes', portions: 4 },
    ],
    persons: 4,
    amountTTC: 180,
    amountAfterTax: 90,
    status: 'delivered',
    shoppingByClient: true,
    payment: { status: 'due', dueAt: '2026-10-05T00:00:00.000Z' },
  },
  {
    id: 'ord_004',
    reference: 'LF-2026-0151',
    date: '2026-05-24T09:00:00.000Z',
    timeSlot: '9h00 – 11h30',
    chef: 'Ivy Siyaptze',
    chefId: 'bc_001',
    formula: 'Confort',
    meals: [
      { name: 'Pâtes pesto rouge', portions: 3 },
      { name: 'Curry de pois chiches', portions: 4 },
    ],
    persons: 3,
    amountTTC: 240,
    amountAfterTax: 120,
    status: 'pending',
    shoppingByClient: false,
    payment: { status: 'not-due' },
  },
  {
    id: 'ord_005',
    reference: 'LF-2026-0138',
    date: '2026-09-19T14:00:00.000Z',
    timeSlot: '14h00 – 16h30',
    chef: 'Lina Bertrand',
    chefId: 'bc_003',
    formula: 'Essentiel',
    meals: [
      { name: 'Gratin de légumes', portions: 4 },
      { name: 'Soupe miso légumes', portions: 4 },
    ],
    persons: 2,
    amountTTC: 180,
    amountAfterTax: 90,
    status: 'delivered',
    shoppingByClient: false,
    payment: { status: 'due', dueAt: '2026-10-03T00:00:00.000Z' },
  },
]

// ─── Personalisation requests ────────────────────────────────────────────────

export type CustomRequestStatus = 'draft' | 'submitted' | 'in-review' | 'quoted' | 'accepted' | 'declined'

export type CustomRequest = {
  id: string
  title: string
  createdAt: string
  status: CustomRequestStatus
  persons: number
  meals: number
  cuisine?: string
  diet?: string[]
  brief: string
  quote?: { amountTTC: number; amountAfterTax: number; note?: string }
}

export const CUSTOM_REQUESTS: CustomRequest[] = [
  {
    id: 'req_001',
    title: 'Brunch d’anniversaire — 8 personnes',
    createdAt: '2026-04-22T14:30:00.000Z',
    status: 'quoted',
    persons: 8,
    meals: 6,
    cuisine: 'Méditerranéen',
    diet: ['Végétarien', 'Sans-gluten'],
    brief:
      'Un brunch dimanche pour mes 30 ans, autour de 8 personnes, ambiance méditerranéenne, deux convives sans gluten et une végétarienne stricte.',
    quote: { amountTTC: 320, amountAfterTax: 160, note: 'Inclut 1h de service supplémentaire.' },
  },
  {
    id: 'req_002',
    title: 'Régime sportif — 2 semaines',
    createdAt: '2026-04-10T09:10:00.000Z',
    status: 'in-review',
    persons: 2,
    meals: 14,
    cuisine: 'Cuisine du monde',
    diet: ['High-protein'],
    brief:
      'Programme musculation phase de prise. 2200 kcal/jour, 180g de protéines. Variété de cuisines (asiatique, mexicain, libanais).',
  },
]

// ─── Chat with admin ─────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string
  from: 'me' | 'admin'
  author: string
  avatar?: string
  text: string
  at: string // ISO
  read?: boolean
}

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'm_001',
    from: 'admin',
    author: 'Ivy · Lab’s Food',
    text: 'Bonjour Sophie ! Pour samedi, je préfère arriver à 9h pétantes — ça vous va ?',
    at: '2026-04-25T14:02:00.000Z',
    read: true,
  },
  {
    id: 'm_002',
    from: 'me',
    author: 'Vous',
    text: 'Parfait pour 9h. Vous voulez la liste mise à jour avant ou après ?',
    at: '2026-04-25T14:08:00.000Z',
    read: true,
  },
  {
    id: 'm_003',
    from: 'admin',
    author: 'Ivy · Lab’s Food',
    text: 'Avant, idéalement vendredi soir — je passe commande chez le poissonnier le matin.',
    at: '2026-04-25T14:11:00.000Z',
    read: true,
  },
  {
    id: 'm_004',
    from: 'admin',
    author: 'Ivy · Lab’s Food',
    text: 'Et petite proposition : j’ajouterais un dahl coco-curcuma pour Lina, c’est doux et sans gluten. OK ?',
    at: '2026-04-26T08:32:00.000Z',
    read: false,
  },
]

// ─── Profile preferences ────────────────────────────────────────────────────

export type ProfilePrefs = {
  diets: string[]
  allergies: string[]
  dislikes: string[]
  favorites: string[]
  spiceLevel: 1 | 2 | 3 | 4 | 5
  household: { adults: number; kids: number }
  kitchenNotes: string
}

export const DEFAULT_PREFS: ProfilePrefs = {
  diets: ['Sans-porc'],
  allergies: ['Fruits à coque'],
  dislikes: ['Coriandre', 'Olives'],
  favorites: ['Risotto', 'Curry', 'Tajine'],
  spiceLevel: 3,
  household: { adults: 2, kids: 1 },
  kitchenNotes: 'Cuisine ouverte, plaque induction, four traditionnel. Pas de robot pâtissier.',
}

// ─── Stats ──────────────────────────────────────────────────────────────────

// Stats côté client : ces chiffres sont "personnels" (votre activité avec
// Lab's Food). Le total entreprise (~30 sessions) est affiché côté public.
export const DASHBOARD_STATS = {
  sessionsTotal: 4,
  mealsCooked: 18,
  hoursSaved: 32,
  moneySaved: 240, // après Avance immédiate Urssaf
  weeklyMealMix: [
    { week: 'S14', meals: 4 },
    { week: 'S15', meals: 0 },
    { week: 'S16', meals: 5 },
    { week: 'S17', meals: 0 },
    { week: 'S18', meals: 6 },
    { week: 'S19', meals: 0 },
    { week: 'S20', meals: 3 },
  ],
}
