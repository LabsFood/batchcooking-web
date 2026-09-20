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
  WorkStatus,
} from './states'
import type { Recipe } from './recipes'

// ── Référentiel des pièces ──────────────────────────────────────────────────

/*
 * Un seul vocabulaire de pièces pour les trois espaces : la candidature, le
 * dossier du batch cooker et la revue côté admin partagent ces identifiants.
 * La pièce d'autorisation de travail découle de la situation déclarée.
 */
export const DOC_DEFINITIONS: DocDefinition[] = [
  // Toujours demandées
  { id: 'identity', label: 'Pièce d’identité', family: 'blocking', hint: 'Carte d’identité ou passeport en cours de validité', expires: true },
  { id: 'registration', label: 'Justificatif d’immatriculation', family: 'blocking', hint: 'Avis de situation SIRENE ou extrait Kbis de moins de 3 mois' },

  // Appelées par la situation déclarée à la candidature
  { id: 'residence-permit', label: 'Titre de séjour', family: 'conditional', hint: 'Recto et verso, autorisation de travail visible', condition: { workStatus: 'residence-permit' }, expires: true },
  { id: 'renewal-receipt', label: 'Récépissé de renouvellement', family: 'conditional', hint: 'Délivré par la préfecture, avec l’autorisation de travail', condition: { workStatus: 'renewal-pending' }, expires: true },
  { id: 'status-proof', label: 'Justificatif de situation', family: 'conditional', hint: 'Document permettant d’étudier la situation déclarée', condition: { workStatus: 'other' } },

  // Services à la personne : seulement en déclaration propre (Type A)
  { id: 'sap-declaration', label: 'Récépissé de déclaration SAP', family: 'conditional', hint: 'Délivré par la DREETS via NOVA', condition: { sapPath: 'type-a' }, expires: true },

  // Publics fragiles
  { id: 'approval', label: 'Agrément publics fragiles', family: 'conditional', condition: { vulnerablePublics: true }, expires: true },
  { id: 'criminal-record', label: 'Casier judiciaire n° 3', family: 'conditional', condition: { vulnerablePublics: true }, expires: true },

  // Facultatives — alimentent les badges de la vitrine
  { id: 'rc-pro', label: 'Assurance responsabilité civile professionnelle', family: 'recommended', expires: true, badge: 'Assuré' },
  { id: 'haccp', label: 'Formation hygiène alimentaire (HACCP)', family: 'recommended', expires: true, badge: 'HACCP' },
  { id: 'ddpp', label: 'Récépissé de déclaration DDPP', family: 'recommended', badge: 'Déclaré DDPP' },
  { id: 'vigilance', label: 'Attestation de vigilance', family: 'recommended', expires: true },
]

// ── Profil du batch cooker connecté ─────────────────────────────────────────

export interface ChefProfile {
  name: string
  city: string
  address: string
  /** Situation déclarée à la candidature — commande la pièce attendue. */
  workStatus: WorkStatus
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
  /** Texte libre affiché sur la vitrine (sans lien ni coordonnées). */
  showcaseText: string
}

export const CHEF_PROFILE: ChefProfile = {
  name: 'Ivy Siyaptze',
  city: 'Nice',
  address: '18 rue Gioffredo, 06000 Nice',
  workStatus: 'eu-citizen',
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
  showcaseText:
    'Cuisinière depuis douze ans, je cuisine surtout méditerranéen : légumes de saison du marché, poissons, herbes fraîches. Je m’adapte aux allergies et aux goûts des enfants, et je laisse la cuisine plus propre qu’en arrivant.',
}

/** Langues proposées sur la vitrine — liste déroulante, pas de saisie libre. */
export const LANGUAGE_OPTIONS = [
  'Français', 'Anglais', 'Espagnol', 'Italien', 'Allemand', 'Portugais', 'Arabe',
  'Russe', 'Chinois (mandarin)', 'Japonais', 'Turc', 'Polonais', 'Néerlandais',
  'Roumain', 'Grec', 'Vietnamien', 'Wolof', 'Créole', 'Langue des signes française',
]

// ── État du dossier ─────────────────────────────────────────────────────────

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString()

export const CHEF_DOCS: DocState[] = [
  { definitionId: 'identity', status: 'valid', expiresAt: iso(540), submittedAt: iso(-40) },
  { definitionId: 'registration', status: 'valid', submittedAt: iso(-38) },
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

/** Photo prise après la prestation : plats dressés, contenants étiquetés, cuisine rendue. */
export interface MissionPhoto {
  id: string
  url: string
  caption?: string
  at: string
}

export interface ChefMission {
  id: string
  /** Numéro de prestation : c'est lui qui relie support, litige et facture. */
  reference: string
  clientId: string
  client: string
  city: string
  address: string
  date: string
  timeSlot: string
  persons: number
  /** Plats prévus. `dishIds` pointe vers le catalogue quand le plat en vient. */
  meals: string[]
  dishIds: string[]
  allergies: string[]
  diets: string[]
  /** Consignes laissées par le client à la réservation. */
  clientNote?: string
  /** Le batch cooker fait les courses → un mandat de débours est joint. */
  shoppingByChef: boolean
  /** Plafond de dépenses accepté par le client, en euros. */
  expenseCap?: number
  paymentMethod: PaymentMethod
  amountTTC: number
  commission: number
  net: number
  status: MissionStatus
  /** Horodatage de l'arrivée sur place, posé par le batch cooker. */
  arrivedAt?: string
  completedAt?: string
  photos: MissionPhoto[]
}

export const CHEF_MISSIONS: ChefMission[] = [
  {
    id: 'msn_001',
    reference: 'LF-2026-0142',
    clientId: 'cli_sophie',
    client: 'Sophie M.',
    city: 'Nice 06000',
    address: '15 rue de la Buffa, 06000 Nice — 3e étage, code 4512',
    date: iso(3),
    timeSlot: '9h00 – 11h00',
    persons: 3,
    meals: ['Poulet rôti aux herbes', 'Risotto aux champignons', 'Curry de lentilles corail', 'Saumon en papillote'],
    dishIds: ['dish_001', 'dish_002', 'dish_003', 'dish_005'],
    allergies: ['Fruits à coque'],
    diets: ['Sans-porc'],
    clientNote:
      'Ma fille de 6 ans mange avec nous : rien de trop épicé. Plaque à induction et four classique. Les contenants sont dans le placard au-dessus de l’évier.',
    shoppingByChef: true,
    expenseCap: 90,
    paymentMethod: 'urssaf',
    amountTTC: 220,
    commission: 22,
    net: 198,
    status: 'upcoming',
    photos: [],
  },
  {
    id: 'msn_002',
    reference: 'LF-2026-0151',
    clientId: 'cli_karim',
    client: 'Karim B.',
    city: 'Cannes 06400',
    address: '8 avenue des Mimosas, 06400 Cannes',
    date: iso(0),
    timeSlot: '14h00 – 16h30',
    persons: 2,
    meals: ['Tajine de légumes', 'Wok de nouilles sautées'],
    dishIds: [],
    allergies: [],
    diets: ['Végétarien'],
    clientNote: 'Nous sommes végétariens tous les deux. Merci d’éviter le piment fort.',
    shoppingByChef: false,
    paymentMethod: 'card',
    amountTTC: 240,
    commission: 24,
    net: 216,
    status: 'in-progress',
    arrivedAt: iso(0),
    photos: [],
  },
  {
    id: 'msn_003',
    reference: 'LF-2026-0119',
    clientId: 'cli_camille',
    client: 'Camille F.',
    city: 'Antibes 06600',
    address: '22 chemin des Oliviers, 06600 Antibes',
    date: iso(-14),
    timeSlot: '10h00 – 12h00',
    persons: 4,
    meals: ['Lasagnes maison', 'Soupe de potiron', 'Gratin dauphinois'],
    dishIds: [],
    allergies: ['Lactose'],
    diets: [],
    clientNote: 'Deux enfants en bas âge, portions généreuses appréciées.',
    shoppingByChef: true,
    expenseCap: 120,
    paymentMethod: 'cesu',
    amountTTC: 300,
    commission: 30,
    net: 270,
    status: 'done',
    completedAt: iso(-14),
    photos: [],
  },
  {
    id: 'msn_004',
    reference: 'LF-2026-0094',
    clientId: 'cli_marc',
    client: 'Marc D.',
    city: 'Nice 06200',
    address: '4 boulevard Gambetta, 06200 Nice',
    date: iso(-30),
    timeSlot: '9h30 – 11h30',
    persons: 2,
    meals: ['Bœuf bourguignon', 'Purée maison'],
    dishIds: [],
    allergies: [],
    diets: [],
    shoppingByChef: false,
    paymentMethod: 'card',
    amountTTC: 180,
    commission: 18,
    net: 162,
    status: 'disputed',
    completedAt: iso(-30),
    photos: [],
  },
]

/** Fiche client consultable depuis la messagerie et la prestation. */
export interface ChefClient {
  id: string
  name: string
  city: string
  household: string
  diets: string[]
  allergies: string[]
  equipment: string[]
  sessionsCount: number
  firstSessionAt: string
  lastSessionAt?: string
  note?: string
}

export const CHEF_CLIENTS: ChefClient[] = [
  {
    id: 'cli_sophie',
    name: 'Sophie M.',
    city: 'Nice 06000',
    household: '2 adultes, 1 enfant (6 ans)',
    diets: ['Sans-porc'],
    allergies: ['Fruits à coque'],
    equipment: ['Four classique', 'Plaque à induction', 'Robot ménager'],
    sessionsCount: 4,
    firstSessionAt: iso(-160),
    lastSessionAt: iso(-21),
    note: 'Aime les plats mijotés, peu épicés. Contenants fournis.',
  },
  {
    id: 'cli_karim',
    name: 'Karim B.',
    city: 'Cannes 06400',
    household: '2 adultes',
    diets: ['Végétarien'],
    allergies: [],
    equipment: ['Four', 'Wok'],
    sessionsCount: 2,
    firstSessionAt: iso(-60),
    lastSessionAt: iso(0),
    note: 'Curieux des cuisines du monde, évite le piment fort.',
  },
  {
    id: 'cli_camille',
    name: 'Camille F.',
    city: 'Antibes 06600',
    household: '2 adultes, 2 enfants',
    diets: [],
    allergies: ['Lactose'],
    equipment: ['Four', 'Autocuiseur'],
    sessionsCount: 6,
    firstSessionAt: iso(-320),
    lastSessionAt: iso(-14),
  },
  {
    id: 'cli_marc',
    name: 'Marc D.',
    city: 'Nice 06200',
    household: '2 adultes',
    diets: [],
    allergies: [],
    equipment: ['Four'],
    sessionsCount: 1,
    firstSessionAt: iso(-30),
    lastSessionAt: iso(-30),
  },
]

export const clientById = (id: string) => CHEF_CLIENTS.find((c) => c.id === id)

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
  /** Origine : saisi par le chef, ou repris d'une proposition Lab's Food. */
  origin: 'chef' | 'labs-food'
  /** Recette : fiche remise au client et base de la liste de courses. */
  recipe: Recipe
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
    recipe: {
      ingredients: [
        { name: 'Poulet fermier entier', qty: 1.4, unit: 'kg', aisle: 'Boucherie' },
        { name: 'Pommes de terre grenaille', qty: 800, unit: 'g', aisle: 'Fruits et légumes' },
        { name: 'Thym frais', qty: 1, unit: 'botte', aisle: 'Fruits et légumes' },
        { name: 'Romarin frais', qty: 1, unit: 'botte', aisle: 'Fruits et légumes' },
        { name: 'Ail', qty: 4, unit: 'gousse', aisle: 'Fruits et légumes' },
        { name: 'Huile d’olive', qty: 4, unit: 'c. à soupe', aisle: 'Épicerie salée' },
        { name: 'Beurre doux', qty: 30, unit: 'g', aisle: 'Crèmerie' },
      ],
      steps: [
        'Préchauffer le four à 200 °C.',
        'Glisser le beurre, l’ail écrasé et les herbes sous la peau du poulet.',
        'Disposer les grenailles autour, arroser d’huile d’olive, saler et poivrer.',
        'Enfourner 55 min en arrosant deux fois avec le jus.',
        'Laisser reposer 10 min, découper puis répartir dans les contenants.',
      ],
      reheating: { mode: 'Four', temperature: 160, minutes: 15, note: 'Couvrir d’un papier cuisson pour garder le moelleux.' },
      storage: { method: 'Réfrigérateur', days: 3, container: 'Boîte hermétique' },
    },
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
    recipe: {
      ingredients: [
        { name: 'Riz arborio', qty: 300, unit: 'g', aisle: 'Épicerie salée' },
        { name: 'Champignons de Paris', qty: 400, unit: 'g', aisle: 'Fruits et légumes' },
        { name: 'Oignon', qty: 1, unit: 'pièce', aisle: 'Fruits et légumes' },
        { name: 'Bouillon de légumes', qty: 1, unit: 'l', aisle: 'Épicerie salée' },
        { name: 'Parmesan râpé', qty: 80, unit: 'g', aisle: 'Crèmerie' },
        { name: 'Vin blanc sec', qty: 10, unit: 'cl', aisle: 'Boissons' },
        { name: 'Huile de truffe', qty: 1, unit: 'c. à café', aisle: 'Épicerie salée' },
      ],
      steps: [
        'Faire revenir l’oignon ciselé, ajouter les champignons émincés et laisser rendre l’eau.',
        'Nacrer le riz 2 min, déglacer au vin blanc.',
        'Ajouter le bouillon chaud louche par louche en remuant, 18 min environ.',
        'Hors du feu, incorporer le parmesan et l’huile de truffe.',
      ],
      reheating: { mode: 'Poêle', minutes: 6, note: 'Ajouter deux cuillères d’eau pour retrouver le crémeux.' },
      storage: { method: 'Réfrigérateur', days: 2, container: 'Boîte hermétique' },
    },
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
    recipe: {
      ingredients: [
        { name: 'Lentilles corail', qty: 300, unit: 'g', aisle: 'Épicerie salée' },
        { name: 'Lait de coco', qty: 40, unit: 'cl', aisle: 'Épicerie salée' },
        { name: 'Oignon', qty: 1, unit: 'pièce', aisle: 'Fruits et légumes' },
        { name: 'Gingembre frais', qty: 20, unit: 'g', aisle: 'Fruits et légumes' },
        { name: 'Curry doux', qty: 2, unit: 'c. à café', aisle: 'Épicerie salée' },
        { name: 'Tomates concassées', qty: 400, unit: 'g', aisle: 'Épicerie salée' },
      ],
      steps: [
        'Suer l’oignon et le gingembre, ajouter le curry et laisser torréfier 30 secondes.',
        'Ajouter les lentilles rincées, les tomates et le lait de coco.',
        'Cuire 25 min à feu doux, rectifier l’assaisonnement.',
      ],
      reheating: { mode: 'Casserole', minutes: 8, note: 'Détendre avec un peu d’eau si le curry a épaissi.' },
      storage: { method: 'Réfrigérateur', days: 4, container: 'Boîte hermétique' },
    },
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
    recipe: {
      ingredients: [
        { name: 'Farine T55', qty: 250, unit: 'g', aisle: 'Épicerie sucrée' },
        { name: 'Beurre doux', qty: 125, unit: 'g', aisle: 'Crèmerie' },
        { name: 'Pommes Golden', qty: 6, unit: 'pièce', aisle: 'Fruits et légumes' },
        { name: 'Sucre', qty: 80, unit: 'g', aisle: 'Épicerie sucrée' },
        { name: 'Œufs', qty: 1, unit: 'pièce', aisle: 'Crèmerie' },
        { name: 'Cannelle', qty: 1, unit: 'c. à café', aisle: 'Épicerie sucrée' },
      ],
      steps: [
        'Sabler la farine et le beurre, lier avec l’œuf, laisser reposer 30 min au frais.',
        'Étaler la pâte, disposer les pommes en lamelles, saupoudrer sucre et cannelle.',
        'Cuire 40 min à 180 °C.',
      ],
      reheating: { mode: 'Four', temperature: 150, minutes: 10 },
      storage: { method: 'Température ambiante', days: 2, container: 'Sous cloche' },
    },
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
    recipe: {
      ingredients: [
        { name: 'Pavé de saumon', qty: 2, unit: 'pièce', aisle: 'Poissonnerie' },
        { name: 'Courgette', qty: 1, unit: 'pièce', aisle: 'Fruits et légumes' },
        { name: 'Carotte', qty: 2, unit: 'pièce', aisle: 'Fruits et légumes' },
        { name: 'Aneth', qty: 1, unit: 'botte', aisle: 'Fruits et légumes' },
        { name: 'Citron', qty: 1, unit: 'pièce', aisle: 'Fruits et légumes' },
      ],
      steps: [
        'Tailler les légumes en julienne fine.',
        'Poser le saumon sur la julienne, ajouter l’aneth et deux rondelles de citron.',
        'Fermer la papillote et cuire 20 min à 180 °C.',
      ],
      reheating: { mode: 'Four', temperature: 150, minutes: 8, note: 'Réchauffer dans la papillote fermée.' },
      storage: { method: 'Réfrigérateur', days: 2, container: 'Boîte hermétique' },
    },
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

/**
 * Menus proposés par Lab's Food. Le détail reste verrouillé tant que le batch
 * cooker ne les a pas repris à son compte.
 */
export interface LfSuggestion {
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

export const LF_SUGGESTIONS: LfSuggestion[] = [
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

/*
 * Un litige ne porte pas forcément sur une prestation : il peut concerner un
 * versement, le dossier, le compte ou l'application elle-même.
 */
export const DISPUTE_SUBJECTS = [
  { id: 'mission', label: 'Une prestation', needsMission: true },
  { id: 'payment', label: 'Un paiement ou un versement', needsMission: false },
  { id: 'client', label: 'Le comportement d’un client', needsMission: true },
  { id: 'documents', label: 'Mon dossier ou mes documents', needsMission: false },
  { id: 'account', label: 'Mon compte ou ma rémunération', needsMission: false },
  { id: 'app', label: 'Un problème technique', needsMission: false },
  { id: 'other', label: 'Autre sujet', needsMission: false },
] as const

export type DisputeSubject = (typeof DISPUTE_SUBJECTS)[number]['id']

export interface ChefDispute {
  id: string
  subject: DisputeSubject
  /** Vide quand le litige ne porte pas sur une prestation précise. */
  missionRef?: string
  client?: string
  category: string
  openedAt: string
  status: 'open' | 'processing' | 'resolved'
}

export const CHEF_DISPUTES: ChefDispute[] = [
  { id: 'dsp_001', subject: 'mission', missionRef: 'LF-2026-0094', client: 'Marc D.', category: 'Contestation de paiement', openedAt: iso(-8), status: 'processing' },
  { id: 'dsp_002', subject: 'documents', category: 'Pièce refusée à tort', openedAt: iso(-3), status: 'open' },
]

export const DISPUTE_STATUS_LABEL: Record<ChefDispute['status'], string> = {
  open: 'Ouvert',
  processing: 'En traitement',
  resolved: 'Résolu',
}

export interface ChefThread {
  id: string
  client: string
  /** Fiche client consultable depuis le fil ; absent pour le canal support. */
  clientId?: string
  /** Prestation rattachée au fil ; absent pour le canal support. */
  missionRef?: string
  lastMessage: string
  at: string
  unread: number
}

export interface ChefMessage {
  id: string
  threadId: string
  from: 'client' | 'chef' | 'support'
  text: string
  at: string
}

export const CHEF_THREADS: ChefThread[] = [
  { id: 'thr_001', client: 'Sophie M.', clientId: 'cli_sophie', missionRef: 'LF-2026-0142', lastMessage: 'Parfait, à jeudi !', at: iso(-0.2), unread: 1 },
  { id: 'thr_002', client: 'Karim B.', clientId: 'cli_karim', missionRef: 'LF-2026-0151', lastMessage: 'Je suis devant la porte.', at: iso(-0.05), unread: 0 },
  { id: 'thr_003', client: 'Support Lab’s Food', lastMessage: 'Votre pièce DDPP a été refusée.', at: iso(-6), unread: 0 },
]

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

export const CHEF_MESSAGES: ChefMessage[] = [
  { id: 'm1', threadId: 'thr_001', from: 'client', text: 'Bonjour ! Est-ce que vous pouvez prévoir un plat sans gluten ?', at: hoursAgo(52) },
  { id: 'm2', threadId: 'thr_001', from: 'chef', text: 'Bonjour Sophie, bien sûr — je note ça pour jeudi.', at: hoursAgo(51) },
  { id: 'm3', threadId: 'thr_001', from: 'client', text: 'Super. Ma fille adore les lasagnes, si jamais vous avez une idée.', at: hoursAgo(27) },
  { id: 'm4', threadId: 'thr_001', from: 'chef', text: 'Je prévois des lasagnes de légumes, elle devrait aimer.', at: hoursAgo(26) },
  { id: 'm5', threadId: 'thr_001', from: 'client', text: 'Parfait, à jeudi !', at: hoursAgo(4) },
  { id: 'm6', threadId: 'thr_002', from: 'client', text: 'Bonjour, la place de parking devant l’immeuble est libre.', at: hoursAgo(5) },
  { id: 'm7', threadId: 'thr_002', from: 'chef', text: 'Merci, j’arrive dans dix minutes.', at: hoursAgo(2) },
  { id: 'm8', threadId: 'thr_002', from: 'client', text: 'Je suis devant la porte.', at: hoursAgo(1) },
  { id: 'm9', threadId: 'thr_003', from: 'support', text: 'Votre pièce DDPP a été refusée : le scan est rogné. Merci de la redéposer depuis Documents.', at: hoursAgo(144) },
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
