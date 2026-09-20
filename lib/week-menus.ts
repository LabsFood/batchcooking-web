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
