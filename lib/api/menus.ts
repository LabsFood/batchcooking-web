'use client'

import { useQuery } from '@tanstack/react-query'
import { useApiFetch } from './client'

/* ─────────────────────────────────────────────────────────────────────────────
   Les cartes de la semaine — `GET /menus/week`.

   La page publique ne présente pas une liste anonyme de plats : une carte par
   batch cooker, parce que c'est un batch cooker qu'on choisit, pas un plat.

   L'API ne renvoie que des chefs approuvés, en ligne, qui couvrent la zone et
   qui ont encore de la place. `hasMenu: false` marque celui qui n'a pas composé
   de menu cette semaine : il passe en dernier, avec ses plats publiés. Jamais
   de recette — ni ingrédients, ni étapes.

   L'ordre tourne une fois par mois, le même pour tout le monde, pour que les
   mêmes ne soient pas toujours en tête.

   Les routes sont **publiques** : pas de token. Le client bas niveau l'ajoute
   s'il y en a un, l'API ne s'en formalise pas.
   ───────────────────────────────────────────────────────────────────────────── */

export interface WeekDish {
  id: string
  name: string
  /** Rendue par l'API, et utilisée sur l'accueil public. */
  description: string | null
  country: string | null
  continent: string | null
  category: string | null
  imageUrl: string | null
  /** Les temps et les calories ne sont pas publics : réservés au batch cooker. */
  portions: number
  difficulty: string | null
  diets: string[]
  customDiets: string[]
  allergens: string[]
  allergensNone: boolean
  customAllergens: string[]
}

export interface WeekChef {
  id: string
  displayName: string
  city: string | null
  regionCode: string | null
  badges: string[]
  sessionsDone: number
  newcomer: boolean
  avatarUrl: string | null
  /** `null` tant qu'il n'y a pas d'avis : le module est hors MVP. */
  rating: number | null
  reviewCount: number | null
  /** Vide : le champ existe, l'API ne le remplit pas encore (BLK-17). */
  languages: string[]
  /**
   * Le CESU préfinancé est accepté — arrivé le 17/10.
   *
   * `true` seulement si le batch cooker a activé le CESU **et** déclaré son
   * numéro NAN. Le numéro lui-même se lit sur `GET /chefs/{id}/cesu-info`,
   * au moment de payer — pas avant.
   */
  acceptsCesu?: boolean
}

/** Une carte : un batch cooker, et ce qu'il propose cette semaine. */
export interface WeekCard {
  menuId: string | null
  /** `false` : pas de menu cette semaine, on montre ses plats publiés. */
  hasMenu: boolean
  chef: WeekChef
  title: string | null
  pitch: string | null
  imageUrl: string | null
  /** Les régimes que **tous** les plats respectent. C'est là-dessus qu'on filtre. */
  coveredDiets: string[]
  shoppingIncluded: boolean
  /** En centimes, avant commission. `null` quand aucune offre n'est configurée. */
  sessionFromCents: number | null
  afterTaxCreditCents: number | null
  /** `null` : aucun créneau configuré — disponible sur demande. */
  slotsLeft: number | null
  dishes: WeekDish[]
}

export interface WeekResponse {
  week: { start: string; end: string }
  data: WeekCard[]
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export interface WeekQuery {
  /** N'importe quel jour de la semaine voulue, `AAAA-MM-JJ`. */
  week?: string
  /** Code INSEE de région, depuis `GET /referentials/regions`. */
  region?: string
  /** Code INSEE d'une commune. À envoyer avec sa région. */
  city?: string
  /** Régimes que le menu entier doit respecter. */
  diets?: string[]
  shoppingIncluded?: boolean
  /** Texte libre : nom du chef, ville, titre du menu, nom des plats. */
  q?: string
  page?: number
  limit?: number
}

export function useWeekMenus(params: WeekQuery = {}) {
  const apiFetch = useApiFetch()
  const { week, region, city, diets, shoppingIncluded, q, page, limit } = params

  const search = new URLSearchParams()
  if (week) search.set('week', week)
  if (region) search.set('region', region)
  if (city) search.set('city', city)
  if (diets && diets.length > 0) search.set('diets', diets.join(','))
  if (shoppingIncluded) search.set('shoppingIncluded', 'true')
  if (q?.trim()) search.set('q', q.trim())
  if (page != null) search.set('page', String(page))
  if (limit != null) search.set('limit', String(limit))
  const qs = search.toString()

  return useQuery({
    queryKey: [
      'menus',
      'week',
      { week: week ?? 'now', region: region ?? 'all', city: city ?? '', diets: diets ?? [], shoppingIncluded: !!shoppingIncluded, q: q?.trim() ?? '', page, limit },
    ],
    queryFn: () => apiFetch<WeekResponse>(`/menus/week${qs ? `?${qs}` : ''}`),
    // La semaine ne change pas d'une minute à l'autre.
    staleTime: 5 * 60 * 1000,
  })
}

/* ── La page publique d'un batch cooker ───────────────────────────────────── */

export interface ChefZone {
  regionCode: string
  regionLabel: string
  scope: 'region' | 'cities'
  cities: { name: string; dept: string; insee: string }[]
}

export interface ChefMenuCard {
  id: string
  title: string
  pitch: string | null
  imageUrl: string | null
  period: string
  shoppingIncluded: boolean
  coveredDiets: string[]
  dishes?: WeekDish[]
}

/** Une offre, telle que le public la voit : sans sa description ni son état. */
export interface PublicServiceOffer {
  id: string
  name: string
  /** C'est elle qui découpe les créneaux proposés au client. */
  durationMinutes: number
  /** Prix client, en centimes, hors courses. */
  priceCents: number
  shoppingIncluded: boolean
  shoppingFeeCents: number
}

export interface ChefPublic extends WeekChef {
  bio: string | null
  zones: ChefZone[]
  sessionFromCents: number | null
  afterTaxCreditCents: number | null
  dishes: WeekDish[]
  menus: ChefMenuCard[]
  /**
   * Les offres **actives**, de la moins chère à la plus chère — arrivées le
   * 17/10. Vide tant que le batch cooker n'en a posé aucune : il n'est alors
   * réservable que sur demande.
   */
  serviceOffers?: PublicServiceOffer[]
}

/**
 * `GET /chefs/{id}` — profil, badges validés par Lab's Food, zones couvertes,
 * plats et menus publiés. Jamais un brouillon, jamais une recette.
 *
 * `404` quand le batch cooker n'est pas approuvé **et** en ligne : ce n'est
 * pas une panne, c'est qu'il n'a pas de page publique.
 */
export function useChefPublic(id: string | undefined) {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: ['chefs', id],
    queryFn: () => apiFetch<ChefPublic>(`/chefs/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

/* ── Mise en forme ─────────────────────────────────────────────────────────── */

/** « 15000 » → « 150 € ». `null` reste `null`. */
export function euros(centimes?: number | null): string | null {
  if (centimes == null || !Number.isFinite(centimes)) return null
  return (centimes / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

/** « du 5 au 11 octobre ». */
export function weekLabel(week?: { start: string; end: string }): string {
  if (!week) return 'cette semaine'
  const d = (iso: string) => new Date(iso)
  const start = d(week.start)
  const end = d(week.end)
  const memeMois = start.getMonth() === end.getMonth()
  const jour = (x: Date) =>
    x.toLocaleDateString('fr-FR', memeMois ? { day: 'numeric' } : { day: 'numeric', month: 'long' })
  const fin = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `du ${jour(start)} au ${fin}`
}

/** Le lundi de la semaine décalée de `n` semaines, au format attendu. */
export function weekParam(offset: number): string | undefined {
  if (offset === 0) return undefined
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  return d.toISOString().slice(0, 10)
}

/* ── La vitrine du mois, vue du public ─────────────────────────────────────── */

export interface ShowcasePublicWeek {
  weekStart: string
  /** `null` quand le menu de cette semaine n'est pas publié : le client ne voit rien. */
  menu: { id: string; title: string; imageUrl?: string | null } | null
}

/**
 * `GET /chefs/{id}/showcase` — publique.
 *
 * À ne pas confondre avec `GET /me/showcase/weeks`, qui rend ce que le batch
 * cooker a **affecté**. Celle-ci rend ce qu'un client **voit** : une semaine
 * dont le menu n'est pas publié y vaut `null`. C'est tout l'intérêt de la
 * montrer à côté — un batch cooker qui a programmé un brouillon croit avoir
 * une vitrine, et n'en a pas.
 *
 * `404` quand le batch cooker n'est pas approuvé et en ligne : ce n'est pas
 * une panne, c'est qu'il n'a pas encore de page publique.
 */
export function useChefShowcase(id: string | undefined) {
  const apiFetch = useApiFetch()
  return useQuery({
    queryKey: ['chef', id, 'showcase'],
    queryFn: () =>
      apiFetch<{ from: string; to: string; weeks: ShowcasePublicWeek[] }>(
        `/chefs/${id}/showcase`,
      ),
    enabled: !!id,
    retry: false,
  })
}

/* ── Les semaines qu'on peut parcourir ─────────────────────────────────────── */

/**
 * `AAAA-MM-JJ` en heure **locale**.
 *
 * `toISOString()` convertirait en UTC : minuit à Paris y devient la veille à
 * 22 h, et toutes les semaines partaient du dimanche. L'API attend un jour de
 * calendrier, pas un instant.
 */
function jourISO(d: Date): string {
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mois}-${jour}`
}

/** Le lundi de la semaine d'une date, en `AAAA-MM-JJ`. */
export function lundiDe(d: Date): string {
  const x = new Date(d)
  // `getDay()` rend 0 le dimanche : on le ramène à 7 pour reculer jusqu'au lundi.
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return jourISO(x)
}

/**
 * Les semaines proposées au visiteur, à partir de la semaine en cours.
 *
 * Six suffisent : au-delà, personne ne sait encore ce qu'il mangera, et les
 * batch cookers n'ont pas posé leurs menus.
 */
export function semainesAVenir(depuis = new Date(), combien = 6): string[] {
  const premier = new Date(`${lundiDe(depuis)}T00:00:00`)
  return Array.from({ length: combien }, (_, i) => {
    const d = new Date(premier)
    d.setDate(d.getDate() + i * 7)
    return jourISO(d)
  })
}

/**
 * La semaine sur laquelle ouvrir.
 *
 * Pas toujours celle en cours : une prestation se prépare, et le batch cooking
 * ne se réserve presque jamais pour le lendemain. À partir du vendredi, la
 * semaine en cours n'est plus réservable en pratique — ouvrir dessus
 * montrerait une carte vide à qui arrive un vendredi soir, et lui ferait
 * croire que la plateforme est déserte. On ouvre alors sur la suivante, et le
 * sélecteur permet de revenir en arrière.
 */
export function semaineParDefaut(maintenant = new Date()): string {
  const semaines = semainesAVenir(maintenant, 2)
  // 5 = vendredi, 6 = samedi, 0 = dimanche.
  const jour = maintenant.getDay()
  const finDeSemaine = jour === 0 || jour >= 5
  return finDeSemaine ? semaines[1] : semaines[0]
}

/** « du 26 octobre au 1er novembre » → « 26 oct. – 1er nov. », pour un bouton. */
export function semaineCourte(lundi: string): string {
  const debut = new Date(`${lundi}T00:00:00`)
  const fin = new Date(debut)
  fin.setDate(fin.getDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${f(debut)} – ${f(fin)}`
}
