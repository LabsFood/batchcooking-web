/* ─────────────────────────────────────────────────────────────────────────────
   Données simulées du module batch cooker (démo — aucun backend requis).

   Le référentiel de documents est volontairement piloté par la donnée : les
   deux voies SAP y figurent, seule la voie active est affichée. Ajouter le
   Type A plus tard ne demandera aucune refonte de l'UI.
   ───────────────────────────────────────────────────────────────────────────── */

import type {
  DocDefinition,
  DocState,
  MissionStatus,
  OfferStatus,
  PaymentMethod,
  PayoutMode,
  PayoutModeStatus,
  SapPath,
} from './states'

// ── Référentiel des pièces ──────────────────────────────────────────────────

export const DOC_DEFINITIONS: DocDefinition[] = [
  // Bloquants — conditionnent l'activation du compte
  { id: 'identity', label: "Pièce d'identité", family: 'blocking', hint: 'CNI ou passeport en cours de validité', expires: true },
  { id: 'residence', label: 'Titre de séjour', family: 'blocking', hint: 'Si ressortissant hors UE', expires: true },
  { id: 'registration', label: "Justificatif d'immatriculation", family: 'blocking', hint: 'Extrait SIRENE / avis SIRET' },
  { id: 'psp-kyc', label: "Vérification d'identité PSP", family: 'blocking', hint: 'Contrôle réglementaire du prestataire de paiement' },
  { id: 'cgu', label: 'CGU + mandat de facturation', family: 'blocking', hint: 'Signature électronique' },
  { id: 'sepa-b2b', label: 'Mandat SEPA B2B', family: 'blocking', hint: 'Prélèvement de la commission sur le compte pro' },

  // Conditionnels — dépendent de la voie SAP et des options
  { id: 'sap-nova', label: 'Déclaration SAP (NOVA)', family: 'conditional', hint: 'Déclaration propre auprès de NOVA', condition: { sapPath: 'type-a' }, expires: true },
  { id: 'sap-coop', label: 'Rattachement à la coopérative', family: 'conditional', hint: "Attestation d'affiliation — voie Type B", condition: { sapPath: 'type-b' } },
  { id: 'crcesu', label: 'Affiliation CRCESU', family: 'conditional', hint: 'Requis pour accepter le CESU préfinancé', condition: { acceptsCesu: true } },
  { id: 'approval', label: 'Agrément publics fragiles', family: 'conditional', condition: { vulnerablePublics: true }, expires: true },
  { id: 'criminal-record', label: 'Casier judiciaire n° 3', family: 'conditional', condition: { vulnerablePublics: true }, expires: true },

  // Recommandés — ne bloquent pas, alimentent les badges vitrine
  { id: 'rc-pro', label: 'Assurance RC Pro', family: 'recommended', expires: true, badge: 'Assuré' },
  { id: 'haccp', label: 'Formation HACCP', family: 'recommended', expires: true, badge: 'HACCP' },
  { id: 'ddpp', label: 'Récépissé DDPP', family: 'recommended', badge: 'Déclaré DDPP' },
  { id: 'vigilance', label: 'Attestation de vigilance', family: 'recommended', expires: true },
]

// ── Profil du batch cooker connecté ─────────────────────────────────────────

export interface ChefProfile {
  name: string
  city: string
  sapPath: SapPath
  acceptsCesu: boolean
  vulnerablePublics: boolean
  registered: boolean
  acceptedPayments: PaymentMethod[]
  languages: string[]
  rating: number
  reviewsCount: number
  shoppingIncluded: boolean
  shoppingFee: number
}

export const CHEF_PROFILE: ChefProfile = {
  name: 'Ivy Siyaptze',
  city: 'Nice',
  sapPath: 'type-b', // décision client : on démarre en Type B (coopérative)
  acceptsCesu: true,
  vulnerablePublics: false,
  registered: true,
  acceptedPayments: ['card', 'urssaf', 'cesu'],
  languages: ['Français', 'Anglais'],
  rating: 4.8,
  reviewsCount: 37,
  shoppingIncluded: true,
  shoppingFee: 25,
}

// ── État du dossier ─────────────────────────────────────────────────────────

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString()

export const CHEF_DOCS: DocState[] = [
  { definitionId: 'identity', status: 'valid', expiresAt: iso(540), submittedAt: iso(-40) },
  { definitionId: 'registration', status: 'valid', submittedAt: iso(-38) },
  { definitionId: 'cgu', status: 'valid', submittedAt: iso(-38) },
  { definitionId: 'sepa-b2b', status: 'valid', submittedAt: iso(-38) },
  { definitionId: 'psp-kyc', status: 'reviewing', submittedAt: iso(-2) },
  { definitionId: 'sap-coop', status: 'valid', submittedAt: iso(-30) },
  { definitionId: 'crcesu', status: 'submitted', submittedAt: iso(-1) },
  { definitionId: 'haccp', status: 'expiring', expiresAt: iso(24), submittedAt: iso(-700) },
  { definitionId: 'rc-pro', status: 'valid', expiresAt: iso(200), submittedAt: iso(-160) },
  {
    definitionId: 'ddpp',
    status: 'rejected',
    submittedAt: iso(-6),
    rejectionReason: 'Document illisible — merci de renvoyer un scan complet, non rogné.',
  },
  { definitionId: 'vigilance', status: 'missing' },
]

// ── Demandes reçues ─────────────────────────────────────────────────────────

/**
 * Demande reçue par le batch cooker.
 *
 * Le client règle **à l'issue de la prestation** et choisit son moyen de
 * paiement à ce moment-là : aucune information de paiement n'est donc portée
 * par la demande.
 */
export interface ChefRequest {
  id: string
  client: string
  city: string
  address: string
  date: string
  timeSlot: string
  persons: number
  /** Plats souhaités par le client. */
  dishes: string[]
  allergies: string[]
  diets: string[]
  /** Message libre du client. */
  description: string
  shoppingByChef: boolean
  amountTTC: number
  commission: number
  net: number
  respondBefore: string
  status: ChefRequestStatus
}

/** Cycle de vie d'une demande, côté batch cooker. */
export type ChefRequestStatus =
  | 'new'
  | 'accepted'
  | 'declined'
  | 'counter-offered'
  | 'cancelled'

export const CHEF_REQUEST_STATUS_LABEL: Record<ChefRequestStatus, string> = {
  new: 'Nouvelle',
  accepted: 'Acceptée',
  declined: 'Refusée',
  'counter-offered': 'Contre-proposition envoyée',
  cancelled: 'Annulée par le client',
}

export const CHEF_REQUESTS: ChefRequest[] = [
  {
    id: 'req_001',
    client: 'Sophie M.',
    city: 'Nice 06000',
    address: '15 rue de la Buffa, 06000 Nice — 3e étage, code 4512',
    date: iso(6),
    timeSlot: '9h00 – 11h30',
    persons: 3,
    dishes: ['Poulet rôti aux herbes', 'Risotto champignons', 'Curry lentilles corail', 'Saumon en papillote'],
    allergies: ['Fruits à coque'],
    diets: ['Sans-porc'],
    description:
      "Bonjour ! Je cherche 4 plats pour la semaine, plutôt légers le soir. Ma fille de 6 ans mange avec nous, donc rien de trop épicé. J'ai une plaque à induction et un four classique.",
    shoppingByChef: true,
    amountTTC: 240,
    commission: 24,
    net: 216,
    respondBefore: iso(1),
    status: 'new',
  },
  {
    id: 'req_002',
    client: 'Thomas R.',
    city: 'Cannes 06400',
    address: '8 avenue des Mimosas, 06400 Cannes',
    date: iso(9),
    timeSlot: '10h00 – 12h00',
    persons: 2,
    dishes: ['Tajine de légumes', 'Wok de nouilles sautées', 'Chili sin carne'],
    allergies: [],
    diets: ['Végétarien'],
    description:
      'Nous sommes végétariens tous les deux et aimons découvrir des cuisines du monde. Pas de contrainte particulière côté matériel.',
    shoppingByChef: false,
    amountTTC: 180,
    commission: 18,
    net: 162,
    respondBefore: iso(2),
    status: 'new',
  },
  {
    id: 'req_003',
    client: 'Camille F.',
    city: 'Antibes 06600',
    address: '22 chemin des Oliviers, 06600 Antibes',
    date: iso(-12),
    timeSlot: '9h30 – 11h30',
    persons: 4,
    dishes: ['Lasagnes maison', 'Soupe de potiron', 'Gratin dauphinois', 'Salade de quinoa', 'Compote de pommes'],
    allergies: ['Lactose'],
    diets: [],
    description: 'Famille de 4, deux enfants en bas âge. Merci de prévoir des portions généreuses.',
    shoppingByChef: true,
    amountTTC: 300,
    commission: 30,
    net: 270,
    respondBefore: iso(-14),
    status: 'accepted',
  },
  {
    id: 'req_004',
    client: 'Marc D.',
    city: 'Nice 06200',
    address: '4 boulevard Gambetta, 06200 Nice',
    date: iso(-20),
    timeSlot: '14h00 – 16h00',
    persons: 2,
    dishes: ['Bœuf bourguignon', 'Purée maison'],
    allergies: [],
    diets: [],
    description: 'Deux plats simples pour la semaine.',
    shoppingByChef: false,
    amountTTC: 140,
    commission: 14,
    net: 126,
    respondBefore: iso(-22),
    status: 'declined',
  },
]

// ── Offres sur-mesure ───────────────────────────────────────────────────────

export interface CustomBrief {
  id: string
  client: string
  occasion: string
  wishes: string[]
  persons: number
  allergies: string[]
  budgetHint: number
  date: string
  receivedAt: string
}

export interface ChefOffer {
  id: string
  briefId: string
  client: string
  occasion: string
  net: number
  clientPrice: number
  afterTaxCredit: number
  validUntil: string
  status: OfferStatus
  sentAt: string
}

export const CUSTOM_BRIEFS: CustomBrief[] = [
  { id: 'brf_001', client: 'Laure P.', occasion: 'Dîner d’anniversaire', wishes: ['Cuisine italienne', 'Dessert maison'], persons: 6, allergies: ['Gluten'], budgetHint: 320, date: iso(14), receivedAt: iso(-1) },
  { id: 'brf_002', client: 'Karim B.', occasion: 'Batch semaine végétarien', wishes: ['Végétarien', 'Épicé'], persons: 2, allergies: [], budgetHint: 190, date: iso(10), receivedAt: iso(-3) },
]

export const CHEF_OFFERS: ChefOffer[] = [
  { id: 'off_001', briefId: 'brf_003', client: 'Nadia L.', occasion: 'Repas de famille', net: 280, clientPrice: 311, afterTaxCredit: 156, validUntil: iso(4), status: 'viewed', sentAt: iso(-2) },
  { id: 'off_002', briefId: 'brf_004', client: 'Paul V.', occasion: 'Batch mensuel', net: 420, clientPrice: 467, afterTaxCredit: 234, validUntil: iso(-1), status: 'accepted', sentAt: iso(-9) },
  { id: 'off_003', briefId: 'brf_005', client: 'Inès T.', occasion: 'Brunch dominical', net: 150, clientPrice: 167, afterTaxCredit: 84, validUntil: iso(-4), status: 'expired', sentAt: iso(-18) },
  { id: 'off_004', briefId: 'brf_006', client: 'Hugo M.', occasion: 'Dîner végan', net: 210, clientPrice: 233, afterTaxCredit: 117, validUntil: iso(-2), status: 'declined', sentAt: iso(-12) },
]

// ── Prestations ─────────────────────────────────────────────────────────────

export interface ChefMission {
  id: string
  reference: string
  client: string
  city: string
  date: string
  timeSlot: string
  persons: number
  meals: string[]
  paymentMethod: PaymentMethod
  amountTTC: number
  commission: number
  net: number
  status: MissionStatus
}

export const CHEF_MISSIONS: ChefMission[] = [
  { id: 'msn_001', reference: 'LF-2026-0142', client: 'Sophie M.', city: 'Nice 06000', date: iso(3), timeSlot: '9h00 – 11h00', persons: 3, meals: ['Poulet rôti aux herbes', 'Risotto champignons', 'Curry lentilles', 'Saumon papillote'], paymentMethod: 'urssaf', amountTTC: 220, commission: 22, net: 198, status: 'upcoming' },
  { id: 'msn_002', reference: 'LF-2026-0151', client: 'Karim B.', city: 'Cannes 06400', date: iso(0), timeSlot: '14h00 – 16h30', persons: 2, meals: ['Tajine légumes', 'Wok de nouilles'], paymentMethod: 'card', amountTTC: 240, commission: 24, net: 216, status: 'in-progress' },
  { id: 'msn_003', reference: 'LF-2026-0119', client: 'Camille F.', city: 'Antibes 06600', date: iso(-14), timeSlot: '10h00 – 12h00', persons: 4, meals: ['Lasagnes', 'Soupe de potiron', 'Gratin'], paymentMethod: 'cesu', amountTTC: 300, commission: 30, net: 270, status: 'done' },
  { id: 'msn_004', reference: 'LF-2026-0094', client: 'Marc D.', city: 'Nice 06200', date: iso(-30), timeSlot: '9h30 – 11h30', persons: 2, meals: ['Bœuf bourguignon', 'Purée maison'], paymentMethod: 'card', amountTTC: 180, commission: 18, net: 162, status: 'disputed' },
]

/** Checklist hygiène — prestation en cours. */
export const HYGIENE_CHECKLIST = [
  'Plan de travail nettoyé et désinfecté',
  'Mains lavées, tenue propre',
  'Chaîne du froid respectée',
  'Séparation cru / cuit',
  'Contenants étiquetés (date + contenu)',
  'Températures de cuisson relevées',
]

// ── Revenus ─────────────────────────────────────────────────────────────────

export const CHEF_EARNINGS = {
  balance: 846,
  nextPayoutAt: iso(4),
  monthNet: 1_284,
  yearRevenue: 41_620,
  byMethod: [
    { method: 'card' as PaymentMethod, gross: 1_120, commission: 112, net: 1_008, note: 'Split à l’encaissement' },
    { method: 'urssaf' as PaymentMethod, gross: 980, commission: 98, net: 882, note: 'Versement URSSAF ~J+4 ouvrés' },
    { method: 'cesu' as PaymentMethod, gross: 600, commission: 60, net: 540, note: 'Remboursement CRCESU en cours' },
  ],
}

export interface PayoutModeState {
  mode: PayoutMode
  status: PayoutModeStatus
  since: string
  commissionRate: number | null
  subscriptionPrice: number | null
  switchRequestedAt?: string
  switchEffectiveAt?: string
}

export const CHEF_PAYOUT_MODE: PayoutModeState = {
  mode: 'commission',
  status: 'active',
  since: iso(-180),
  commissionRate: 10, // à confirmer — décision client en attente
  subscriptionPrice: 39, // à confirmer — décision client en attente
}

// ── Recettes ────────────────────────────────────────────────────────────────

/** Statut de publication d'un plat ou d'un menu créé par le batch cooker. */
export type ContentStatus = 'draft' | 'pending' | 'published' | 'rejected'

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Brouillon',
  pending: 'En validation',
  published: 'Publié',
  rejected: 'Refusé',
}

export type Difficulty = 'facile' | 'moyen' | 'difficile'

/** Un plat créé par le batch cooker (équivalent du « meal » côté admin). */
export interface ChefDish {
  id: string
  name: string
  description: string
  country: string
  category: string
  portions: number
  prepMin: number
  cookMin: number
  difficulty: Difficulty
  diets: string[]
  allergens: string[]
  status: ContentStatus
  /** Origine : saisi par le chef, ou repris du catalogue IA. */
  origin: 'chef' | 'ai'
  /** Motif renseigné par l'admin en cas de refus. */
  rejectionReason?: string
}

/** Un menu = une composition de plats. */
export interface ChefMenu {
  id: string
  title: string
  period: 'semaine' | 'mois'
  dishIds: string[]
  status: ContentStatus
  rejectionReason?: string
}

export const CHEF_DISHES: ChefDish[] = [
  {
    id: 'dish_001',
    name: 'Poulet rôti aux herbes',
    description: 'Poulet fermier rôti, thym et romarin, pommes de terre grenaille.',
    country: 'France',
    category: 'Plat',
    portions: 3,
    prepMin: 20,
    cookMin: 55,
    difficulty: 'facile',
    diets: [],
    allergens: [],
    status: 'published',
    origin: 'chef',
  },
  {
    id: 'dish_002',
    name: 'Risotto aux champignons',
    description: 'Riz arborio, champignons de Paris, parmesan et huile de truffe.',
    country: 'Italie',
    category: 'Plat',
    portions: 3,
    prepMin: 15,
    cookMin: 30,
    difficulty: 'moyen',
    diets: ['Végétarien'],
    allergens: ['Lait'],
    status: 'published',
    origin: 'chef',
  },
  {
    id: 'dish_003',
    name: 'Curry de lentilles corail',
    description: 'Lentilles corail, lait de coco, épices douces.',
    country: 'Inde',
    category: 'Plat',
    portions: 3,
    prepMin: 10,
    cookMin: 25,
    difficulty: 'facile',
    diets: ['Végétarien', 'Vegan'],
    allergens: [],
    status: 'pending',
    origin: 'chef',
  },
  {
    id: 'dish_004',
    name: 'Tarte aux pommes',
    description: 'Pâte brisée maison, pommes fondantes, cannelle.',
    country: 'France',
    category: 'Dessert',
    portions: 6,
    prepMin: 25,
    cookMin: 40,
    difficulty: 'moyen',
    diets: ['Végétarien'],
    allergens: ['Gluten', 'Lait', 'Œufs'],
    status: 'rejected',
    origin: 'chef',
    rejectionReason: 'Allergènes incomplets : préciser la présence éventuelle de fruits à coque.',
  },
  {
    id: 'dish_005',
    name: 'Saumon en papillote',
    description: 'Pavé de saumon, julienne de légumes, aneth.',
    country: 'France',
    category: 'Plat',
    portions: 2,
    prepMin: 15,
    cookMin: 20,
    difficulty: 'facile',
    diets: [],
    allergens: ['Poisson'],
    status: 'draft',
    origin: 'chef',
  },
]

export const CHEF_MENUS: ChefMenu[] = [
  {
    id: 'menu_001',
    title: 'Semaine méditerranéenne',
    period: 'semaine',
    dishIds: ['dish_001', 'dish_002', 'dish_005'],
    status: 'published',
  },
  {
    id: 'menu_002',
    title: 'Découverte du monde',
    period: 'mois',
    dishIds: ['dish_002', 'dish_003'],
    status: 'pending',
  },
]

/** Catalogue IA — le détail reste verrouillé tant que le consentement n'est pas donné. */
export interface AiRecipe {
  id: string
  name: string
  country: string
  category: string
  portions: number
  prepMin: number
  cookMin: number
  allergens: string[]
  unlocked: boolean
}

export const AI_RECIPES: AiRecipe[] = [
  { id: 'ai_001', name: 'Tajine de légumes du soleil', country: 'Maroc', category: 'Plat', portions: 3, prepMin: 20, cookMin: 45, allergens: [], unlocked: false },
  { id: 'ai_002', name: 'Bibimbap végétarien', country: 'Corée du Sud', category: 'Plat', portions: 3, prepMin: 25, cookMin: 20, allergens: ['Soja', 'Sésame'], unlocked: false },
  { id: 'ai_003', name: 'Chili sin carne', country: 'Mexique', category: 'Plat', portions: 3, prepMin: 15, cookMin: 40, allergens: [], unlocked: true },
]

export const dishById = (id: string) => CHEF_DISHES.find((d) => d.id === id)

// ── Avis, litiges, messagerie ───────────────────────────────────────────────

export interface ChefReview {
  id: string
  client: string
  date: string
  overall: number
  punctuality: number
  hygiene: number
  taste: number
  comment: string
  reply?: string
}

export const CHEF_REVIEWS: ChefReview[] = [
  { id: 'rev_001', client: 'Camille F.', date: iso(-13), overall: 5, punctuality: 5, hygiene: 5, taste: 5, comment: 'Une semaine de repas parfaite, cuisine impeccable après le passage.' },
  { id: 'rev_002', client: 'Marc D.', date: iso(-29), overall: 4, punctuality: 4, hygiene: 5, taste: 4, comment: 'Très bon dans l’ensemble, un peu de retard au démarrage.', reply: 'Merci Marc ! Embouteillage sur la Promenade, je prévois plus large la prochaine fois.' },
]

export interface ChefDispute {
  id: string
  missionRef: string
  client: string
  category: string
  openedAt: string
  status: 'open' | 'processing' | 'resolved'
}

export const CHEF_DISPUTES: ChefDispute[] = [
  { id: 'dsp_001', missionRef: 'LF-2026-0094', client: 'Marc D.', category: 'Contestation de paiement', openedAt: iso(-8), status: 'processing' },
]

export const DISPUTE_STATUS_LABEL: Record<ChefDispute['status'], string> = {
  open: 'Ouvert',
  processing: 'En traitement',
  resolved: 'Résolu',
}

export interface ChefThread {
  id: string
  client: string
  missionRef: string
  lastMessage: string
  at: string
  unread: number
  /** Le contact direct n'est libéré qu'à J-2 de la prestation. */
  contactUnlocked: boolean
}

export const CHEF_THREADS: ChefThread[] = [
  { id: 'thr_001', client: 'Sophie M.', missionRef: 'LF-2026-0142', lastMessage: 'Parfait, à jeudi !', at: iso(-0.2), unread: 1, contactUnlocked: false },
  { id: 'thr_002', client: 'Karim B.', missionRef: 'LF-2026-0151', lastMessage: 'Je suis devant la porte.', at: iso(-0.05), unread: 0, contactUnlocked: true },
  { id: 'thr_003', client: 'Support Lab’s Food', missionRef: '—', lastMessage: 'Votre pièce DDPP a été refusée.', at: iso(-6), unread: 0, contactUnlocked: true },
]

// ── Agenda ──────────────────────────────────────────────────────────────────

export const CHEF_AVAILABILITY = {
  zone: 'Nice · Cannes · Antibes (30 km)',
  slots: [
    { day: 'Lundi', ranges: ['9h – 13h'] },
    { day: 'Mardi', ranges: ['9h – 13h', '14h – 18h'] },
    { day: 'Mercredi', ranges: [] },
    { day: 'Jeudi', ranges: ['9h – 13h'] },
    { day: 'Vendredi', ranges: ['9h – 13h', '14h – 17h'] },
    { day: 'Samedi', ranges: ['10h – 15h'] },
    { day: 'Dimanche', ranges: [] },
  ],
}
