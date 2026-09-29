import { WEEKLY_MEALS, WORLD_RECIPES } from './mock-data'
import type { Meal } from '@/types'

/* ─────────────────────────────────────────────────────────────────────────────
   Menus de la semaine, par batch cooker.

   La page publique ne présente plus un menu unique : chaque batch cooker
   propose sa carte de la semaine, et le client choisit d'abord un chef.

   Les plats viennent de `WEEKLY_MEALS` et `WORLD_RECIPES` (source unique), les
   menus n'en portent que les identifiants. À remplacer par `GET /menus/week` une fois l'endpoint
   exposé — cf. docs/api/FLOW-02-plats-et-menus.md.

   Les trois batch cookers autres qu'Ivy sont des profils de démonstration :
   à remplacer par les vrais chefs avant mise en ligne.
   ───────────────────────────────────────────────────────────────────────────── */

export interface WeekMenu {
  id: string
  chefId: string
  chefName: string
  /** Initiales affichées à défaut de photo. */
  chefInitials: string
  chefAvatar?: string
  city: string
  region: string
  rating: number
  reviewCount: number
  sessionsDone: number
  /** Titre donné par le chef à sa carte de la semaine. */
  title: string
  pitch: string
  /** Identifiants de plats dans `WEEKLY_MEALS`. */
  dishIds: string[]
  /** Net perçu par le chef pour une session de base, en euros. */
  sessionFrom: number
  shoppingIncluded: boolean
  /** Langues parlées, utiles aux foyers non francophones. */
  languages: string[]
  badges: string[]
  /** Créneaux encore libres cette semaine. */
  spotsLeft: number
  newcomer?: boolean

  /* Fiche du chef — ce que le client veut savoir avant de confier sa cuisine. */

  /** Année de la première session sur Lab's Food. */
  since: number
  /** Cuisines et façons de faire, trois au maximum pour rester lisible. */
  specialties: string[]
  /** Rayon d'intervention depuis sa ville, en kilomètres. */
  radiusKm: number
  /** Délai de réponse moyen à un message, en heures. */
  responseHours: number
  /** Moyens de paiement acceptés : décide de ce que le client pourra choisir. */
  acceptedPayments: ('card' | 'urssaf' | 'cesu')[]
  /** Frais de courses quand le chef les fait, en euros. 0 = inclus. */
  shoppingFee: number
  /** Ce que le chef dit de sa façon de travailler, à la première personne. */
  signature: string
  /** Un ou deux avis, tels qu'ils ont été écrits. */
  reviews: { author: string; rating: number; text: string; monthsAgo: number }[]
}

export const WEEK_MENUS: WeekMenu[] = [
  {
    id: 'wm_ivy',
    chefId: 'c1',
    chefName: 'Ivy Siyaptze',
    chefInitials: 'IS',
    chefAvatar: '/images/IvyChef.png',
    city: 'Nice',
    region: "Provence-Alpes-Côte d'Azur",
    rating: 4.9,
    reviewCount: 28,
    sessionsDone: 30,
    title: 'Tour du monde en sept plats',
    pitch:
      'Une semaine qui voyage : Vietnam, Sénégal, Tunisie, puis retour en Provence pour le dimanche.',
    dishIds: ['r1', 'r2', 'r3', '1', '6'],
    sessionFrom: 150,
    shoppingIncluded: true,
    languages: ['Français', 'Anglais'],
    badges: ['Fondatrice', 'HACCP', 'Assurée'],
    spotsLeft: 2,
    since: 2024,
    specialties: ['Méditerranéen', 'Afrique de l’Ouest', 'Batch familial'],
    radiusKm: 30,
    responseHours: 2,
    acceptedPayments: ['card', 'urssaf', 'cesu'],
    shoppingFee: 25,
    signature:
      'Je cuisine ce que vous mangez déjà, en mieux. Dites-moi ce que vos enfants laissent dans l’assiette et j’arrête de le faire.',
    reviews: [
      {
        author: 'Claire M.',
        rating: 5,
        text: 'Quatre semaines de suite, jamais deux fois le même plat, et ma cuisine plus propre qu’avant son arrivée.',
        monthsAgo: 1,
      },
      {
        author: 'Yann D.',
        rating: 5,
        text: 'Le tajine se réchauffe encore mieux le troisième jour. On a arrêté les livraisons du soir.',
        monthsAgo: 3,
      },
    ],
  },
  {
    id: 'wm_naima',
    chefId: 'c2',
    chefName: 'Naïma B.',
    chefInitials: 'NB',
    city: 'Cannes',
    region: "Provence-Alpes-Côte d'Azur",
    rating: 4.8,
    reviewCount: 41,
    sessionsDone: 52,
    title: 'Méditerranée végétale',
    pitch:
      'Légumes du marché de Forville, épices douces, rien qui pique : la semaine que réclament les enfants.',
    dishIds: ['r7', 'r6', '6', '2', '3'],
    sessionFrom: 135,
    shoppingIncluded: true,
    languages: ['Français', 'Arabe', 'Anglais'],
    badges: ['HACCP', 'Assurée'],
    spotsLeft: 4,
    since: 2025,
    specialties: ['Végétarien', 'Méditerranéen', 'Sans épices fortes'],
    radiusKm: 20,
    responseHours: 4,
    acceptedPayments: ['card', 'urssaf'],
    shoppingFee: 0,
    signature:
      'Je fais mon marché à Forville le matin même. Si les artichauts ne sont pas beaux, je change le menu et je vous le dis.',
    reviews: [
      {
        author: 'Sophie L.',
        rating: 5,
        text: 'Mes deux garçons mangent des légumes sans négocier. Je ne sais pas comment elle fait.',
        monthsAgo: 2,
      },
    ],
  },
  {
    id: 'wm_thomas',
    chefId: 'c3',
    chefName: 'Thomas R.',
    chefInitials: 'TR',
    city: 'Antibes',
    region: "Provence-Alpes-Côte d'Azur",
    rating: 4.7,
    reviewCount: 19,
    sessionsDone: 23,
    title: 'Classiques de bistrot',
    pitch:
      'Mijotés longs, sauces montées au beurre, plats qui se réchauffent mieux que le premier jour.',
    dishIds: ['5', 'r5', '1', '4'],
    sessionFrom: 160,
    shoppingIncluded: false,
    languages: ['Français'],
    badges: ['Assuré', 'Déclaré DDPP'],
    spotsLeft: 1,
    since: 2025,
    specialties: ['Bistrot français', 'Mijotés', 'Sauces'],
    radiusKm: 15,
    responseHours: 6,
    acceptedPayments: ['card'],
    shoppingFee: 0,
    signature:
      'Un bœuf bourguignon demande trois heures. Je les prends chez vous, et vous en avez pour quatre jours.',
    reviews: [
      {
        author: 'Marc T.',
        rating: 5,
        text: 'Il est venu avec ses couteaux et son thermomètre. Du travail de cuisine, pas de la préparation de repas.',
        monthsAgo: 2,
      },
    ],
  },
  {
    id: 'wm_elise',
    chefId: 'c4',
    chefName: 'Élise M.',
    chefInitials: 'EM',
    city: 'Grasse',
    region: "Provence-Alpes-Côte d'Azur",
    rating: 5,
    reviewCount: 6,
    sessionsDone: 7,
    title: 'Asie du Sud-Est, sans gluten',
    pitch:
      'Bouillons longuement infusés, herbes fraîches, poissons du jour. Toute la carte est sans gluten.',
    dishIds: ['r8', 'r4', '4', 'r1'],
    sessionFrom: 145,
    shoppingIncluded: true,
    languages: ['Français', 'Anglais', 'Vietnamien'],
    badges: ['HACCP'],
    spotsLeft: 5,
    newcomer: true,
    since: 2026,
    specialties: ['Asie du Sud-Est', 'Sans gluten', 'Poissons'],
    radiusKm: 25,
    responseHours: 1,
    acceptedPayments: ['card', 'cesu'],
    shoppingFee: 18,
    signature:
      'Toute ma carte est sans gluten, pas seulement adaptée : je n’en fais pas entrer chez vous. Les bouillons infusent six heures.',
    reviews: [
      {
        author: 'Hélène R.',
        rating: 5,
        text: 'Coeliaque depuis dix ans. Première fois que je laisse quelqu’un cuisiner chez moi sans surveiller.',
        monthsAgo: 1,
      },
    ],
  },
]

// `Recipe` étend `Meal` : les deux catalogues alimentent la même recherche.
const MEALS_BY_ID = new Map<string, Meal>(
  [...WEEKLY_MEALS, ...WORLD_RECIPES].map((m) => [m.id, m]),
)

export const dishesOf = (menu: WeekMenu): Meal[] =>
  menu.dishIds.map((id) => MEALS_BY_ID.get(id)).filter((m): m is Meal => Boolean(m))

/** Régimes couverts par toute la carte d'un chef, pas seulement par un plat. */
export function dietsOf(menu: WeekMenu): string[] {
  const dishes = dishesOf(menu)
  if (dishes.length === 0) return []
  return dishes[0].dietaryTags.filter((tag) => dishes.every((d) => d.dietaryTags.includes(tag)))
}

export const REGIONS_ON_SHOW = [...new Set(WEEK_MENUS.map((m) => m.region))]

export const DIET_FILTERS = ['végétarien', 'vegan', 'sans-gluten', 'sans-lactose', 'halal']

/** Semaine affichée : du lundi au dimanche qui suivent la date donnée. */
export function weekRange(from: Date): { start: Date; end: Date } {
  const start = new Date(from)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start, end }
}

export function weekLabel(from: Date): string {
  const { start, end } = weekRange(from)
  const sameMonth = start.getMonth() === end.getMonth()
  const day = (d: Date) => d.getDate()
  const month = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long' })
  return sameMonth
    ? `Du ${day(start)} au ${day(end)} ${month(end)}`
    : `Du ${day(start)} ${month(start)} au ${day(end)} ${month(end)}`
}
