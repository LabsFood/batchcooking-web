'use client'

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { fade } from '@/lib/motion'
import * as Dialog from '@radix-ui/react-dialog'
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Languages,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Star,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react'
import {
  euros,
  lundiDe,
  moisAVenir,
  moisDe,
  moisLabel,
  semaineCourte,
  semaineParDefaut,
  semainesAVenir,
  semainesDuMois,
  useChefPublic,
  useWeeksMenus,
  type WeekCard,
  type WeekDish,
} from '@/lib/api/menus'
import {
  refLabel,
  useDiets,
  useLanguages,
  useRecipeProfiles,
  useRegions,
} from '@/lib/api/referentials'
import { seasonsLine } from '@/lib/recipe-fields'
import { Prix } from '@/components/shared/Prix'

/** Les régimes que calcule la liste commune et ceux que l'on déclare (§4.8). */
const DIET_LABEL: Record<string, string> = {
  vegetarian: 'Végétarien',
  vegan: 'Végétalien',
  'no-pork': 'Sans porc',
  pescetarian: 'Pescétarien',
  'gluten-free': 'Sans gluten',
  'lactose-free': 'Sans lactose',
  halal: 'Halal',
  kosher: 'Casher',
}
import { countryLabel } from '@/lib/chef/countries'
import { cn } from '@/lib/utils'
import DatePicker, { DAY_MODIFIERS } from '@/components/shared/DatePicker'
import ReserveButton from '@/components/shared/ReserveButton'

/* ─────────────────────────────────────────────────────────────────────────────
   Choix d'un batch cooker et de sa carte de la semaine.

   Le même parcours sert deux fois : sur la page publique `/menu`, et dans la
   réservation de l'espace client. Il est donc ici, et pas dans l'une des deux
   pages — sinon les deux divergent au premier ajustement, et le client ne
   retrouve pas ce qu'il a vu avant de se connecter.

   Seule l'action finale change : la page publique envoie vers la connexion,
   l'espace client enchaîne sur la suite de la réservation. D'où `renderAction`.

   Les filtres passent par l'API, qui les comprend tous : c'est elle qui sait
   quels batch cookers couvrent une zone et lesquels ont encore de la place.
   Filtrer une page déjà reçue donnerait des résultats faux dès la deuxième.
   ───────────────────────────────────────────────────────────────────────────── */

export const MAX_DISHES = 7

/**
 * `['fr', 'en']` → « Français · Anglais ».
 *
 * Le champ est rempli depuis le 24/10 ; il valait `[]` avant, et les deux
 * endroits qui l'affichaient montraient donc des codes bruts sans que ça se
 * voie. « fr, en, es, tr » sur une carte publique ne dit rien à personne.
 */
function useLangueLabels(codes: string[]): string {
  const referentiel = useLanguages()
  return codes
    .map((c) => referentiel.find((l) => l.code === c)?.label ?? c)
    .join(' · ')
}

function LanguesChip({ codes }: { codes: string[] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-xs font-medium text-navy">
      <Languages className="h-3 w-3" aria-hidden /> {useLangueLabels(codes)}
    </span>
  )
}

function LanguesLigne({ codes }: { codes: string[] }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
      <Languages className="h-3.5 w-3.5 shrink-0 text-amber-ink" aria-hidden />
      Parle {useLangueLabels(codes)}
    </p>
  )
}

/* ── Filtres ───────────────────────────────────────────────────────────────── */

export interface MenuFilters {
  /** À la semaine (par défaut, et seul mode de l'espace client) ou au mois. */
  mode: 'semaine' | 'mois'
  setMode: (v: 'semaine' | 'mois') => void
  /** Le lundi de la semaine regardée, `AAAA-MM-JJ`. */
  semaine: string
  setSemaine: (v: string) => void
  /** Les six lundis proposés, à partir de la semaine en cours. */
  semaines: string[]
  /** Le mois regardé en mode « mois », `AAAA-MM`. */
  mois: string
  setMois: (v: string) => void
  /** Les mois proposés, à partir du mois en cours. */
  moisListe: string[]
  query: string
  setQuery: (v: string) => void
  region: string
  setRegion: (v: string) => void
  diets: string[]
  toggleDiet: (d: string) => void
  shoppingOnly: boolean
  setShoppingOnly: (v: boolean) => void
  /** Les cartes de la semaine, telles que l'API les renvoie. */
  menus: WeekCard[]
  /** La semaine couverte, pour l'annoncer. */
  week?: { start: string; end: string }
  isPending: boolean
  isError: boolean
  refetch: () => void
  /** Vrai dès qu'un filtre est posé — sert à proposer la remise à zéro. */
  active: boolean
  reset: () => void
}

export function useMenuFilters(): MenuFilters {
  /* Figées au montage : lire l'horloge pendant le rendu rendrait la liste
     différente à chaque passage, et la semaine choisie sauterait. */
  const [semaines] = useState(() => semainesAVenir())
  const [moisListe] = useState(() => moisAVenir())
  const [mode, setModeBrut] = useState<'semaine' | 'mois'>('semaine')
  const [semaine, setSemaine] = useState(() => semaineParDefaut())
  const [mois, setMois] = useState(() => moisDe(semaineParDefaut()))
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const [diets, setDiets] = useState<string[]>([])
  const [shoppingOnly, setShoppingOnly] = useState(false)

  /* La recherche part 300 ms après la dernière frappe : au mois, chaque
     requête en vaut quatre ou cinq, et la route publique est limitée à
     soixante appels par minute. */
  const [queryApi, setQueryApi] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQueryApi(query), 300)
    return () => clearTimeout(t)
  }, [query])

  /* Passer au mois ouvre sur celui de la semaine regardée : on ne perd pas
     le fil de ce qu'on était en train de consulter. */
  const setMode = (m: 'semaine' | 'mois') => {
    if (m === 'mois') {
      const courant = moisDe(semaine)
      setMois(moisListe.includes(courant) ? courant : moisListe[0])
    }
    setModeBrut(m)
  }

  const weeks = mode === 'mois' ? semainesDuMois(mois, semaines[0]) : [semaine]
  const q = useWeeksMenus(weeks, {
    q: queryApi || undefined,
    region: region === 'all' ? undefined : region,
    diets: diets.length > 0 ? diets : undefined,
    shoppingIncluded: shoppingOnly || undefined,
    limit: 40,
  })

  return {
    mode,
    setMode,
    semaine,
    setSemaine,
    semaines,
    mois,
    setMois,
    moisListe,
    query,
    setQuery,
    region,
    setRegion,
    diets,
    toggleDiet: (d) =>
      setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])),
    shoppingOnly,
    setShoppingOnly,
    menus: q.cards,
    week: q.week,
    isPending: q.isPending,
    isError: q.isError,
    refetch: q.refetch,
    /* La période n'y compte pas : remettre les filtres à zéro ne doit pas
       renvoyer quelqu'un sur une autre semaine que celle qu'il regarde. */
    active: query !== '' || region !== 'all' || diets.length > 0 || shoppingOnly,
    reset: () => {
      setQuery('')
      setRegion('all')
      setDiets([])
      setShoppingOnly(false)
    },
  }
}

export function MenuFilterBar({ filters }: { filters: MenuFilters }) {
  const { query, setQuery, region, setRegion, diets, toggleDiet, shoppingOnly, setShoppingOnly } =
    filters
  const { regions } = useRegions([])
  const dietOptions = useDiets([])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SemainePicker filters={filters} />

      {/* Recherche et région tiennent sur une ligne : sur mobile, la barre de
          filtres mangeait un quart de l'écran. */}
      <div className="flex w-full items-center gap-2 sm:flex-1">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Un chef, une ville, un plat…"
            aria-label="Rechercher un chef, une ville ou un plat"
            className="input-base py-3 pl-11"
          />
        </div>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Filtrer par région"
          className="input-base w-auto max-w-[45%] shrink-0 py-3 sm:max-w-none"
        >
          <option value="all">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {dietOptions.map((d) => {
          const on = diets.includes(d.code)
          return (
            <button
              key={d.code}
              type="button"
              onClick={() => toggleDiet(d.code)}
              aria-pressed={on}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                on ? 'bg-navy text-white' : 'bg-paper text-ink-mid hover:text-navy'
              }`}
            >
              {d.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setShoppingOnly(!shoppingOnly)}
          aria-pressed={shoppingOnly}
          className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
            shoppingOnly ? 'bg-navy text-white' : 'bg-paper text-ink-mid hover:text-navy'
          }`}
        >
          <ShoppingBasket className="h-3.5 w-3.5" aria-hidden /> Courses incluses
        </button>
      </div>
    </div>
  )
}

/**
 * Quelle semaine on regarde.
 *
 * L'écran n'en montrait qu'une, celle en cours, sans jamais le dire. Un
 * visiteur arrivé un vendredi soir voyait donc une carte presque vide — les
 * batch cookers complets d'ici dimanche en sortent — et en concluait qu'il n'y
 * avait personne. Or une session se prépare : c'est la semaine suivante qu'il
 * voulait voir.
 *
 * Le premier bouton reste « Cette semaine » : on ne cache pas ce qui est
 * encore réservable, on cesse seulement d'ouvrir dessus quand elle se termine.
 */
function SemainePicker({ filters }: { filters: MenuFilters }) {
  const { semaine, setSemaine, semaines } = filters

  return (
    <div
      role="group"
      aria-label="Choisir la semaine"
      /* Sa propre ligne : mis bout à bout avec la recherche et la région, il
         repoussait le sélecteur de région hors de l'écran dès 1280 px. */
      className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:w-full sm:px-0 sm:pb-0"
    >
      {semaines.map((lundi, i) => {
        const on = lundi === semaine
        return (
          <button
            key={lundi}
            type="button"
            onClick={() => setSemaine(lundi)}
            aria-pressed={on}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              on ? 'bg-terra text-white' : 'bg-paper text-ink-mid hover:text-navy'
            }`}
          >
            {i === 0 ? 'Cette semaine' : semaineCourte(lundi)}
          </button>
        )
      })}
    </div>
  )
}

/* ── Filtres en colonne ────────────────────────────────────────────────────── */

/** Combien de filtres sont posés — la semaine n'y compte pas, comme dans `active`. */
function nbFiltres(f: MenuFilters): number {
  return (f.query ? 1 : 0) + (f.region !== 'all' ? 1 : 0) + f.diets.length + (f.shoppingOnly ? 1 : 0)
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="min-w-0">
      <p id={id} className="mb-3 text-sm font-semibold text-navy">
        {title}
      </p>
      {children}
    </div>
  )
}

/** « 2 – 8 nov. », ou « 30 nov. – 6 déc. » à cheval sur deux mois : tient dans le champ. */
function periodeCourte(from: Date, to: Date): string {
  const mois = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' })
  return from.getMonth() === to.getMonth()
    ? `${from.getDate()} – ${to.getDate()} ${mois(to)}`
    : `${from.getDate()} ${mois(from)} – ${to.getDate()} ${mois(to)}`
}

/** « Cette semaine », « Semaine prochaine », « Dans 3 semaines ». */
function semaineRelative(rang: number): string {
  if (rang <= 0) return 'Cette semaine'
  if (rang === 1) return 'Semaine prochaine'
  return `Dans ${rang} semaines`
}

/** Le lundi et le dimanche d'une semaine donnée par son lundi `AAAA-MM-JJ`. */
function bornes(lundi: string): { from: Date; to: Date } {
  const from = new Date(`${lundi}T00:00:00`)
  const to = new Date(from)
  to.setDate(to.getDate() + 6)
  return { from, to }
}

const BOUTON_PAS =
  'flex w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(31,42,55,0.12)] bg-paper text-ink-mid transition-colors hover:border-[rgba(31,42,55,0.3)] hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:pointer-events-none disabled:opacity-35'

/**
 * Le filtre de dates : une semaine, du lundi au dimanche.
 *
 * Le champ dit en clair la période regardée (« lun. 2 nov. → dim. 8 nov. ») et
 * les flèches passent d'une semaine à l'autre — c'est le geste le plus
 * fréquent. Le calendrier ne sert qu'à sauter plus loin : au survol, toute la
 * ligne de la semaine se colore, pour qu'on voie avant de cliquer qu'on choisit
 * sept jours et pas une date. C'est la semaine que l'API sait filtrer (`week`
 * accepte n'importe quel jour de la semaine voulue).
 */
function SemaineChamp({ filters }: { filters: MenuFilters }) {
  const { semaine, setSemaine, semaines } = filters
  const [ouvert, setOuvert] = useState(false)
  const [survol, setSurvol] = useState<string | null>(null)
  const boite = useRef<HTMLDivElement>(null)

  const choisie = bornes(semaine)
  const premier = bornes(semaines[0]).from
  const dernier = bornes(semaines[semaines.length - 1]).to
  const rang = semaines.indexOf(semaine)
  const precedente = rang > 0 ? semaines[rang - 1] : undefined
  const suivante = rang >= 0 && rang < semaines.length - 1 ? semaines[rang + 1] : undefined
  const survolee = survol && survol !== semaine ? bornes(survol) : null

  /* Le mois affiché suit la semaine choisie, y compris quand ce sont les
     flèches qui la changent : ajustement pendant le rendu, comme la navbar. */
  const [mois, setMois] = useState(choisie.from)
  const [vue, setVue] = useState(semaine)
  if (semaine !== vue) {
    setVue(semaine)
    setMois(choisie.from)
  }

  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false)
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', dehors)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('mousedown', dehors)
      document.removeEventListener('keydown', echap)
    }
  }, [ouvert])

  const choisir = (lundi: string) => {
    setSemaine(lundi)
    setOuvert(false)
    setSurvol(null)
  }

  const dansLaPlage = (d: Date) => d >= premier && d <= dernier

  return (
    <div ref={boite} className="relative">
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => precedente && setSemaine(precedente)}
          disabled={!precedente}
          aria-label="Semaine précédente"
          className={BOUTON_PAS}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-haspopup="dialog"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[rgba(31,42,55,0.12)] bg-paper px-3.5 py-2.5 text-left transition-colors hover:border-[rgba(31,42,55,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-amber-ink" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-navy">
              {periodeCourte(choisie.from, choisie.to)}
            </span>
            <span className="block text-xs text-ink-soft">{semaineRelative(rang)}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => suivante && setSemaine(suivante)}
          disabled={!suivante}
          aria-label="Semaine suivante"
          className={BOUTON_PAS}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {ouvert && (
        <div
          role="dialog"
          aria-label="Choisir une semaine"
          className="absolute left-0 top-full z-40 mt-2 w-[20rem] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[rgba(31,42,55,0.1)] bg-paper p-4 shadow-[0_24px_60px_-24px_rgba(31,42,55,0.45)]"
        >
          <p className="text-sm font-semibold text-navy">Choisissez une semaine</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            Chaque ligne du calendrier est une semaine de 7 jours.
          </p>

          <div className="mt-3" onMouseLeave={() => setSurvol(null)}>
            <DatePicker
              month={mois}
              onMonthChange={setMois}
              startMonth={premier}
              endMonth={dernier}
              disabled={{ before: premier, after: dernier }}
              onDayClick={(jour) => dansLaPlage(jour) && choisir(lundiDe(jour))}
              onDayMouseEnter={(jour) => setSurvol(dansLaPlage(jour) ? lundiDe(jour) : null)}
              onDayFocus={(jour) => setSurvol(dansLaPlage(jour) ? lundiDe(jour) : null)}
              modifiers={{
                semaine: choisie,
                survol: survolee ?? [],
                bandeDebut: [choisie.from, ...(survolee ? [survolee.from] : [])],
                bandeFin: [choisie.to, ...(survolee ? [survolee.to] : [])],
              }}
              modifiersClassNames={{
                ...DAY_MODIFIERS,
                semaine: 'lf-week',
                survol: 'lf-week-hover',
                bandeDebut: 'lf-week-start',
                bandeFin: 'lf-week-end',
              }}
              className="lf-rdp-week mx-auto"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-[rgba(31,42,55,0.08)] pt-3">
            {semaines.slice(0, 2).map((lundi, i) => (
              <button
                key={lundi}
                type="button"
                onClick={() => choisir(lundi)}
                aria-pressed={lundi === semaine}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  lundi === semaine ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
                }`}
              >
                {semaineRelative(i)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** « Ce mois-ci », « Le mois prochain », « Dans 2 mois ». */
function moisRelatif(rang: number): string {
  if (rang <= 0) return 'Ce mois-ci'
  if (rang === 1) return 'Le mois prochain'
  return `Dans ${rang} mois`
}

/**
 * Le filtre au mois : les flèches, et le mois lui-même qui ouvre la liste.
 *
 * Retour de test du 09/11 : on cliquait sur le mois et rien ne s'ouvrait. Le
 * libellé n'était qu'un affichage ; il ouvre maintenant les mois proposés,
 * comme le champ de la semaine ouvre son calendrier.
 */
function MoisChamp({ filters }: { filters: MenuFilters }) {
  const { mois, setMois, moisListe } = filters
  const [ouvert, setOuvert] = useState(false)
  const boite = useRef<HTMLDivElement>(null)
  const rang = moisListe.indexOf(mois)
  const precedent = rang > 0 ? moisListe[rang - 1] : undefined
  const suivant = rang >= 0 && rang < moisListe.length - 1 ? moisListe[rang + 1] : undefined

  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false)
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', dehors)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('mousedown', dehors)
      document.removeEventListener('keydown', echap)
    }
  }, [ouvert])

  return (
    <div ref={boite} className="relative">
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => precedent && setMois(precedent)}
          disabled={!precedent}
          aria-label="Mois précédent"
          className={BOUTON_PAS}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-haspopup="dialog"
          aria-live="polite"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[rgba(31,42,55,0.12)] bg-paper px-3.5 py-2.5 text-left transition-colors hover:border-[rgba(31,42,55,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-amber-ink" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-navy first-letter:uppercase">
              {moisLabel(mois)}
            </span>
            <span className="block text-xs text-ink-soft">{moisRelatif(rang)}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => suivant && setMois(suivant)}
          disabled={!suivant}
          aria-label="Mois suivant"
          className={BOUTON_PAS}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {ouvert && (
        <div
          role="dialog"
          aria-label="Choisir un mois"
          className="absolute left-0 top-full z-40 mt-2 w-[16rem] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[rgba(31,42,55,0.1)] bg-paper p-3 shadow-[0_24px_60px_-24px_rgba(31,42,55,0.45)]"
        >
          <p className="px-1 text-sm font-semibold text-navy">Choisissez un mois</p>
          <ul className="mt-2 space-y-1">
            {moisListe.map((m, i) => (
              <li key={m}>
                <button
                  type="button"
                  onClick={() => {
                    setMois(m)
                    setOuvert(false)
                  }}
                  aria-pressed={m === mois}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    m === mois ? 'bg-navy text-white' : 'text-navy hover:bg-cream-soft'
                  }`}
                >
                  <span className="first-letter:uppercase">{moisLabel(m)}</span>
                  <span className={`text-xs ${m === mois ? 'text-white/70' : 'text-ink-soft'}`}>
                    {moisRelatif(i)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** À la semaine ou au mois : deux façons de dire « quand », le reste ne bouge pas. */
function ModeDates({ filters }: { filters: MenuFilters }) {
  return (
    <div role="group" aria-label="Période" className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-cream-soft p-1">
      {(['semaine', 'mois'] as const).map((m) => {
        const on = filters.mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => filters.setMode(m)}
            aria-pressed={on}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
              on
                ? 'bg-paper text-navy shadow-[0_1px_4px_rgba(31,42,55,0.14)]'
                : 'text-ink-mid hover:text-navy'
            }`}
          >
            {m === 'semaine' ? 'À la semaine' : 'Au mois'}
          </button>
        )
      })}
    </div>
  )
}

const CASE =
  'h-[18px] w-[18px] shrink-0 rounded accent-terra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber'

const LIGNE_CASE =
  'flex cursor-pointer items-center gap-3 py-1 text-sm text-ink-mid transition-colors hover:text-navy'

function FilterPanel({ filters }: { filters: MenuFilters }) {
  const { query, setQuery, region, setRegion, diets, toggleDiet, shoppingOnly, setShoppingOnly } =
    filters
  const { regions } = useRegions([])
  const dietOptions = useDiets([])

  return (
    /* Un filet entre chaque groupe, et de l'air de part et d'autre : la colonne
       se lit comme une suite de questions, pas comme un formulaire tassé. */
    <div className="divide-y divide-[rgba(31,42,55,0.08)] [&>*:first-child]:pt-0 [&>*:last-child]:pb-0 [&>*]:py-6">
      <FilterGroup title="Dates">
        <ModeDates filters={filters} />
        {filters.mode === 'mois' ? <MoisChamp filters={filters} /> : <SemaineChamp filters={filters} />}
      </FilterGroup>

      <FilterGroup title="Recherche">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Un chef, une ville, un plat…"
            aria-label="Rechercher un chef, une ville ou un plat"
            className="input-base py-3 pl-11"
          />
        </div>
      </FilterGroup>

      <FilterGroup title="Région">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Filtrer par région"
          className="input-base w-full py-3"
        >
          <option value="all">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </FilterGroup>

      {dietOptions.length > 0 && (
        <FilterGroup title="Régime alimentaire">
          <ul className="space-y-1.5">
            {dietOptions.map((d) => (
              <li key={d.code}>
                <label className={LIGNE_CASE}>
                  <input
                    type="checkbox"
                    checked={diets.includes(d.code)}
                    onChange={() => toggleDiet(d.code)}
                    className={CASE}
                  />
                  {d.label}
                </label>
              </li>
            ))}
          </ul>
        </FilterGroup>
      )}

      <FilterGroup title="Courses">
        <label className={LIGNE_CASE}>
          <input
            type="checkbox"
            checked={shoppingOnly}
            onChange={() => setShoppingOnly(!shoppingOnly)}
            className={CASE}
          />
          Courses incluses
        </label>
      </FilterGroup>
    </div>
  )
}

/** Les filtres en colonne, à gauche des cartes, à partir de `lg`. Dessous : le tiroir. */
export function MenuFilterSidebar({
  filters,
  className,
}: {
  filters: MenuFilters
  className?: string
}) {
  return (
    <aside aria-label="Filtres" className={cn('hidden lg:block', className)}>
      <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-navy">Filtrer les cartes</h2>
          {filters.active && (
            <button
              type="button"
              onClick={filters.reset}
              className="hit text-xs font-semibold text-amber-ink underline underline-offset-4"
            >
              Tout effacer
            </button>
          )}
        </div>
        <FilterPanel filters={filters} />
      </div>
    </aside>
  )
}

/** Le bouton qui ouvre le tiroir de filtres sur mobile, avec le nombre de filtres posés. */
export function MenuFilterButton({
  filters,
  onClick,
  className,
}: {
  filters: MenuFilters
  onClick: () => void
  className?: string
}) {
  const n = nbFiltres(filters)
  return (
    <button type="button" onClick={onClick} className={className}>
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      Filtrer les cartes
      {n > 0 && (
        <span className="rounded-full bg-terra px-1.5 text-xs font-bold text-white">{n}</span>
      )}
    </button>
  )
}

/** Les mêmes filtres, dans un tiroir : sur mobile, la colonne n'a pas sa place. */
export function MenuFilterDrawer({
  filters,
  open,
  onOpenChange,
}: {
  filters: MenuFilters
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const n = filters.menus.length
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(22rem,92vw)] flex-col bg-cream focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=closed]:[animation-duration:120ms]">
          <header className="flex items-center justify-between gap-3 border-b border-[rgba(31,42,55,0.08)] bg-paper px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-lg font-bold text-navy">
                Filtrer les cartes
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                Dates, recherche, région, régime alimentaire et courses.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fermer les filtres"
              className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
            <FilterPanel filters={filters} />
          </div>

          <footer className="flex items-center gap-3 border-t border-[rgba(31,42,55,0.08)] bg-paper px-5 py-4">
            {filters.active && (
              <button type="button" onClick={filters.reset} className="btn btn-outline px-4 py-2.5 text-xs">
                Effacer
              </button>
            )}
            <Dialog.Close className="btn btn-navy flex-1 px-4 py-2.5 text-xs">
              {filters.isPending
                ? 'Voir les cartes'
                : n === 0
                  ? 'Fermer'
                  : `Voir ${n} carte${n > 1 ? 's' : ''}`}
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Le squelette d'une carte : mêmes zones que `MenuCard` (en-tête chef, titre,
 * trois plats, pastilles, pied), pour que la grille ne bouge pas à l'arrivée.
 */
function MenuCardSkeleton() {
  return (
    <SkeletonCard className="flex flex-col p-0">
      <div className="flex items-start gap-4 p-5 pb-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-5 w-40 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
      <div className="px-5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="mt-2 h-5 w-full" />
        <Skeleton className="mt-1 h-5 w-4/5" />
      </div>
      <div className="mt-4 space-y-px px-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3.5 w-2/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-1.5 px-5">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-[rgba(31,42,55,0.08)] px-5 py-5">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
    </SkeletonCard>
  )
}

/** Le squelette d'attente : quatre cartes, dans la grille réelle (`xl:grid-cols-2`, comme les cartes). */
export function MenusLoading({ className }: { className?: string }) {
  return (
    <SkeletonGroup className={cn('grid grid-cols-1 gap-6 xl:grid-cols-2', className)}>
      {[0, 1, 2, 3].map((i) => (
        <MenuCardSkeleton key={i} />
      ))}
    </SkeletonGroup>
  )
}

export function MenusError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(31,42,55,0.18)] bg-paper px-6 py-14 text-center">
      <ChefHat className="mx-auto mb-4 h-8 w-8 text-ink-soft" aria-hidden />
      <h2 className="font-display text-xl font-bold text-navy">
        Les cartes de la semaine n’arrivent pas
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-mid">
        Le service n’a pas répondu. Ce n’est pas vous : réessayez dans un instant.
      </p>
      <button type="button" onClick={onRetry} className="btn btn-outline mt-6 text-xs">
        Réessayer
      </button>
    </div>
  )
}

export function NoMenus({
  onReset,
  filtered,
  filters,
  children,
}: {
  onReset: () => void
  /** Aucun résultat après filtrage, ou aucun batch cooker du tout. */
  filtered?: boolean
  /**
   * Donné, l'écran peut proposer la semaine suivante — le cas le plus
   * fréquent d'une carte vide n'est pas qu'il n'y ait personne, c'est que la
   * semaine regardée soit déjà prise ou presque finie.
   */
  filters?: MenuFilters
  children?: ReactNode
}) {
  const suivante =
    filters && filters.mode === 'semaine'
      ? filters.semaines[filters.semaines.indexOf(filters.semaine) + 1]
      : undefined

  return (
    <div className="rounded-2xl border border-dashed border-[rgba(31,42,55,0.18)] bg-paper px-6 py-14 text-center">
      <ChefHat className="mx-auto mb-4 h-8 w-8 text-ink-soft" aria-hidden />
      <h2 className="font-display text-xl font-bold text-navy">
        {filtered
          ? 'Rien ne correspond, pour l’instant'
          : filters?.mode === 'mois'
            ? 'Personne de libre ce mois-là'
            : 'Personne de libre cette semaine-là'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-mid">
        {filtered
          ? 'Élargissez vos critères, ou décrivez-nous ce que vous cherchez : un chef vous fera une proposition sur mesure.'
          : suivante
            ? 'Un batch cooker dont la semaine est complète n’apparaît pas ici. Regardez la semaine suivante : il y est probablement.'
            : 'Personne n’est encore en ligne sur cette semaine. Décrivez-nous ce que vous cherchez, nous reviendrons vers vous.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {filtered && (
          <button type="button" onClick={onReset} className="btn btn-outline text-xs">
            Réinitialiser les filtres
          </button>
        )}
        {!filtered && suivante && filters && (
          <button
            type="button"
            onClick={() => filters.setSemaine(suivante)}
            className="btn btn-navy text-xs"
          >
            Voir le {semaineCourte(suivante)}
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

/* ── Carte d'un batch cooker ───────────────────────────────────────────────── */

function Avatar({ card, className }: { card: WeekCard; className: string }) {
  if (card.chef.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={card.chef.avatarUrl}
        alt=""
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    )
  }
  const lettres =
    card.chef.displayName
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-navy font-display font-bold text-amber`}
    >
      {lettres}
    </span>
  )
}

/** Ce qu'on peut dire des places restantes sans inventer. */
function placesLabel(slotsLeft: number | null): string {
  if (slotsLeft == null) return 'Sur demande'
  if (slotsLeft === 0) return 'Complet cette semaine'
  return `${slotsLeft} créneau${slotsLeft > 1 ? 'x' : ''} libre${slotsLeft > 1 ? 's' : ''}`
}

function DishThumb({ dish, className }: { dish: WeekDish; className: string }) {
  if (dish.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={dish.imageUrl} alt="" className={`${className} object-cover`} />
  }
  return (
    <span
      aria-hidden
      className={`${className} flex items-center justify-center bg-cream-soft text-ink-soft`}
    >
      <UtensilsCrossed className="h-4 w-4" />
    </span>
  )
}

export function MenuCard({
  menu,
  index,
  onOpen,
  openLabel = 'Voir la carte',
  customOrder = false,
  dietLabel,
}: {
  menu: WeekCard
  index: number
  onOpen: () => void
  openLabel?: string
  /**
   * Propose la commande personnalisée à ce batch cooker : la demande sur-mesure
   * s'ouvre déjà adressée à lui. Absent, la carte reste telle qu'elle est — la
   * réservation de l'espace client ne la montre pas.
   */
  customOrder?: boolean
  /** Traduit un code de régime en libellé lisible. */
  dietLabel: (code: string) => string
}) {
  const preview = menu.dishes.slice(0, 3)
  const reste = menu.dishes.length - preview.length
  const prix = euros(menu.sessionFromCents)
  const apresCredit = euros(menu.afterTaxCreditCents)

  return (
    <motion.article
      // fondu : la carte arrive en 180 ms, sans décalage
      {...fade}
      className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper transition-colors hover:border-[rgba(31,42,55,0.18)]"
    >
      {/*
        La couverture de la carte, quand le batch cooker en a mis une.
        `/menus/week` la renvoie depuis le début et personne ne l'affichait :
        celui qui prenait la peine de l'envoyer ne la voyait nulle part.
      */}
      {menu.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={menu.imageUrl}
          alt=""
          className="aspect-[21/9] w-full object-cover"
        />
      )}

      {/* Le chef d'abord : c'est lui qu'on choisit. */}
      <header className="flex items-start gap-4 p-5 pb-4">
        <Avatar card={menu} className="h-14 w-14 text-lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="font-display text-lg font-bold leading-tight text-navy">
              {menu.chef.displayName}
            </h2>
            {menu.chef.newcomer && (
              <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-mint-ink">
                Nouveau
              </span>
            )}
            {/* Le CESU préfinancé change ce que le client paiera réellement :
                il se voit dès la carte, pas au moment de payer. */}
            {menu.chef.acceptsCesu && (
              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-xs font-semibold text-amber-ink">
                CESU accepté
              </span>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
            {menu.chef.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden /> {menu.chef.city}
              </span>
            )}
            {/* La note n'existe que s'il y a des avis. On ne met pas 0/5. */}
            {menu.chef.rating != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber text-amber" aria-hidden />
                <span className="font-semibold text-navy">{menu.chef.rating}</span>
                {menu.chef.reviewCount != null && ` (${menu.chef.reviewCount} avis)`}
              </span>
            )}
            {menu.chef.sessionsDone > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden /> {menu.chef.sessionsDone} sessions
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="px-5">
        <h3 className="font-display text-xl font-bold leading-tight tracking-[-0.01em] text-navy">
          {menu.hasMenu && menu.title ? menu.title : 'Ses plats de la semaine'}
        </h3>
        {menu.pitch ? (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">{menu.pitch}</p>
        ) : (
          !menu.hasMenu && (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Pas de carte composée cette semaine : choisissez parmi ses plats.
            </p>
          )
        )}
      </div>

      <ul className="mt-4 space-y-px px-5">
        {preview.map((dish) => (
          <li
            key={dish.id}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream-soft"
          >
            <DishThumb dish={dish} className="h-12 w-12 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy">{dish.name}</span>
              <span className="block truncate text-xs text-ink-soft">
                {[countryLabel(dish.country), `${dish.portions} portions`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </li>
        ))}
        {reste > 0 && (
          <li className="px-2 pt-1 text-xs text-ink-soft">
            + {reste} autre{reste > 1 ? 's' : ''} plat{reste > 1 ? 's' : ''} dans cette carte
          </li>
        )}
        {menu.dishes.length === 0 && (
          <li className="px-2 py-3 text-sm text-ink-soft">Aucun plat publié pour l’instant.</li>
        )}
      </ul>

      <div className="mt-4 flex flex-wrap gap-1.5 px-5">
        {menu.coveredDiets.map((d) => (
          <span
            key={d}
            className="rounded-full bg-mint/60 px-2.5 py-1 text-xs font-medium text-mint-ink"
          >
            Toute la carte {dietLabel(d).toLowerCase()}
          </span>
        ))}
        {menu.shoppingIncluded && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-xs font-medium text-navy">
            <ShoppingBasket className="h-3 w-3" aria-hidden /> Courses incluses
          </span>
        )}
        {menu.chef.languages.length > 1 && <LanguesChip codes={menu.chef.languages} />}
      </div>

      {customOrder ? (
        <>
          {/* Le pied se cale en bas : deux cartes côte à côte alignent leurs prix. */}
          <div aria-hidden className="min-h-5 flex-1" />
          <footer className="border-t border-[rgba(31,42,55,0.08)] px-5 pb-5 pt-5">
            {/* Alignés en haut : « 3 créneaux libres » tombait sinon sur la
                dernière ligne du prix et se lisait comme sa suite. */}
            <div className="flex items-start justify-between gap-4">
              <Tarif prix={prix} apresCredit={apresCredit} />
              <Places slotsLeft={menu.slotsLeft} />
            </div>
            {/* Côte à côte quand la carte est large (une par ligne), l'une sous
                l'autre quand elles sont deux par ligne. */}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row xl:flex-col">
              <button
                type="button"
                onClick={onOpen}
                className="btn btn-primary flex-1 justify-center py-3 text-xs"
              >
                {openLabel}
              </button>
              <ReserveButton
                href={`/espace-client/personnalisation?chef=${encodeURIComponent(menu.chef.id)}`}
                variant="outline"
                className="flex-1 justify-center py-3 text-xs"
              >
                Commande personnalisée
              </ReserveButton>
            </div>
          </footer>
        </>
      ) : (
        <footer className="mt-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-t border-[rgba(31,42,55,0.08)] px-5 py-5">
          <Tarif prix={prix} apresCredit={apresCredit} />
          <div className="flex items-center gap-3">
            <Places slotsLeft={menu.slotsLeft} />
            <button type="button" onClick={onOpen} className="btn btn-primary px-5 py-2.5 text-xs">
              {openLabel}
            </button>
          </div>
        </footer>
      )}
    </motion.article>
  )
}

function Tarif({ prix, apresCredit }: { prix: string | null; apresCredit: string | null }) {
  return <Prix lead="À partir de" apresCredit={apresCredit} total={prix} taille="sm" />
}

function Places({ slotsLeft }: { slotsLeft: number | null }) {
  return (
    <p
      className={`shrink-0 whitespace-nowrap text-xs leading-none ${
        slotsLeft != null && slotsLeft <= 2 ? 'font-semibold text-amber-ink' : 'text-ink-soft'
      }`}
    >
      {placesLabel(slotsLeft)}
    </p>
  )
}

/* ── Détail d'une carte ────────────────────────────────────────────────────── */

export function MenuDialog({
  menu,
  onClose,
  renderAction,
  selected: controlled,
  onSelectedChange,
  dietLabel,
}: {
  menu: WeekCard | null
  onClose: () => void
  /** Ce que fait le bouton final : se connecter, ou continuer la réservation. */
  renderAction: (ctx: { menu: WeekCard; selected: string[]; close: () => void }) => ReactNode
  /**
   * Sélection portée par le parent. La réservation en a besoin : rouvrir la
   * carte pour « modifier les plats » doit retrouver ceux déjà cochés.
   * Omise, la modale gère sa sélection et l'oublie à la fermeture.
   */
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
  dietLabel: (code: string) => string
}) {
  const [own, setOwn] = useState<string[]>([])
  const selected = controlled ?? own
  const setSelected = (ids: string[]) => (onSelectedChange ?? setOwn)(ids)

  const dishes = menu?.dishes ?? []
  const full = selected.length >= MAX_DISHES

  const toggle = (id: string) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : selected.length < MAX_DISHES
          ? [...selected, id]
          : selected,
    )

  return (
    <Dialog.Root
      open={Boolean(menu)}
      onOpenChange={(v) => {
        if (!v) {
          onClose()
          // Une sélection portée par le parent lui appartient : on ne l'efface
          // pas derrière lui.
          if (controlled === undefined) setOwn([])
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 top-10 z-50 flex flex-col overflow-hidden rounded-t-3xl bg-cream focus:outline-none sm:inset-6 sm:rounded-3xl lg:inset-x-[10%] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=closed]:[animation-duration:120ms]">
          {menu && (
            <>
              <header className="flex items-start gap-4 border-b border-[rgba(31,42,55,0.08)] bg-paper px-5 py-4 sm:px-7">
                <Avatar card={menu} className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="font-display text-lg font-bold leading-tight text-navy">
                    {menu.hasMenu && menu.title ? menu.title : 'Ses plats de la semaine'}
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-ink-soft">
                    {[
                      menu.chef.displayName,
                      menu.chef.city,
                      menu.chef.rating != null ? `${menu.chef.rating}/5` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  aria-label="Fermer"
                  className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                <div className="grid grid-cols-1 gap-7 lg:grid-cols-[19rem_1fr] lg:gap-9">
                  <ChefPanel card={menu} />

                  <div>
                    <p className="mb-1 font-display text-xl font-bold leading-tight text-navy">
                      {menu.hasMenu ? 'Sa carte de la semaine' : 'Ses plats publiés'}
                    </p>
                    {menu.pitch && (
                      <p className="mb-5 max-w-[62ch] text-sm leading-relaxed text-ink-mid">
                        {menu.pitch}
                      </p>
                    )}

                    <p className="mb-3 text-sm font-semibold text-navy">
                      Choisissez vos plats
                      <span className="ml-2 font-normal text-ink-soft">
                        {selected.length} / {MAX_DISHES} selon votre formule
                      </span>
                    </p>

                    {dishes.length === 0 ? (
                      <p className="rounded-2xl bg-paper px-4 py-6 text-center text-sm text-ink-soft">
                        Ce batch cooker n’a pas encore publié de plat.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {dishes.map((dish) => (
                          <DishRow
                            key={dish.id}
                            dish={dish}
                            selected={selected.includes(dish.id)}
                            disabled={full && !selected.includes(dish.id)}
                            onToggle={() => toggle(dish.id)}
                            dietLabel={dietLabel}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(31,42,55,0.08)] bg-paper px-5 py-4 sm:px-7">
                <p className="text-sm text-ink-mid">
                  {selected.length === 0 ? (
                    'Sélectionnez au moins un plat pour réserver.'
                  ) : (
                    <>
                      <span className="font-semibold text-navy">
                        {selected.length} plat{selected.length > 1 ? 's' : ''}
                      </span>{' '}
                      avec {menu.chef.displayName}
                    </>
                  )}
                </p>
                {renderAction({ menu, selected, close: onClose })}
              </footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Fiche du batch cooker. Un seul panneau, séparé par des filets : imbriquer des
 * cartes dans une carte rendrait la lecture plus lourde, pas plus riche.
 *
 * Sa page publique apporte ce que la carte de la semaine ne porte pas — sa
 * présentation et ses zones. Elle arrive après, donc le panneau s'affiche
 * d'abord avec ce qu'il a.
 */
function ChefPanel({ card }: { card: WeekCard }) {
  const fiche = useChefPublic(card.chef.id)
  const chef = fiche.data

  const zones = useMemo(() => {
    const z = chef?.zones ?? []
    return z.map((r) =>
      r.scope === 'cities' && r.cities.length > 0
        ? `${r.regionLabel} (${r.cities.map((c) => c.name).join(', ')})`
        : r.regionLabel,
    )
  }, [chef?.zones])

  // Les langues arrivent de `GET /chefs/{id}` depuis le 24/10 ; le référentiel
  // donne le libellé français du code.
  const referentiel = useLanguages()
  const langues = (chef?.languages ?? [])
    .map((c) => referentiel.find((l) => l.code === c)?.label ?? c)
    .join(' · ')

  const faits: { icon: typeof MapPin; label: string; value: string }[] = [
    ...(zones.length > 0
      ? [{ icon: MapPin, label: 'Se déplace', value: zones.join(' · ') }]
      : card.chef.city
        ? [{ icon: MapPin, label: 'Basé à', value: card.chef.city }]
        : []),
    {
      icon: ShoppingBasket,
      label: 'Courses',
      value: card.shoppingIncluded ? 'Faites pour vous' : 'À votre charge',
    },
    {
      icon: CalendarCheck,
      label: 'Cette semaine',
      value: placesLabel(card.slotsLeft),
    },
    ...(langues ? [{ icon: Languages, label: 'Parle', value: langues }] : []),
  ]

  return (
    <div className="rounded-3xl bg-paper p-5 lg:sticky lg:top-0">
      <p className="font-display text-xl font-bold leading-tight text-navy">
        {card.chef.displayName}
      </p>
      <p className="mt-1 text-[13px] text-ink-mid">
        {card.chef.sessionsDone > 0
          ? `${card.chef.sessionsDone} session${card.chef.sessionsDone > 1 ? 's' : ''} réalisée${card.chef.sessionsDone > 1 ? 's' : ''}`
          : 'Aucune session pour l’instant'}
        {card.chef.newcomer && <span className="text-amber-ink"> · nouveau sur Lab’s Food</span>}
      </p>

      {card.chef.rating != null ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm">
          <Star className="h-4 w-4 fill-amber text-amber" aria-hidden />
          <span className="font-semibold tabular-nums text-navy">{card.chef.rating}/5</span>
          {card.chef.reviewCount != null && (
            <span className="text-ink-soft">({card.chef.reviewCount} avis)</span>
          )}
        </p>
      ) : (
        <p className="mt-3 text-[13px] text-ink-soft">Pas encore d’avis.</p>
      )}

      {chef?.bio && (
        <blockquote className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-ink-mid">
          {chef.bio}
        </blockquote>
      )}

      <dl className="mt-5 space-y-2.5 border-t border-[rgba(31,42,55,0.08)] pt-4 text-[13px]">
        {faits.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-2">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-ink" aria-hidden />
            <dt className="shrink-0 text-ink-soft">{label}&nbsp;:</dt>
            <dd className="min-w-0 text-navy">{value}</dd>
          </div>
        ))}
      </dl>

      {(card.chef.badges.length > 0 ||
        card.chef.languages.length > 0 ||
        card.chef.acceptsCesu) && (
        <div className="mt-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
          {card.chef.acceptsCesu && (
            <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
              <Wallet className="h-3.5 w-3.5 shrink-0 text-amber-ink" aria-hidden />
              Accepte le CESU préfinancé
            </p>
          )}
          {card.chef.badges.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-ink" aria-hidden />
              {card.chef.badges.join(', ')}
            </p>
          )}
          {card.chef.languages.length > 0 && (
            <LanguesLigne codes={card.chef.languages} />
          )}
        </div>
      )}

      {(chef?.menus?.length ?? 0) > 1 && (
        <div className="mt-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
            <Globe2 className="h-3.5 w-3.5 text-amber-ink" aria-hidden /> Ses autres cartes
          </p>
          <ul className="space-y-1 text-[13px] text-ink-mid">
            {chef?.menus
              .filter((m) => m.id !== card.menuId)
              .slice(0, 4)
              .map((m) => (
                <li key={m.id}>{m.title}</li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function DishRow({
  dish,
  selected,
  disabled,
  onToggle,
  dietLabel,
}: {
  dish: WeekDish
  selected: boolean
  disabled: boolean
  onToggle: () => void
  dietLabel: (code: string) => string
}) {
  const profiles = useRecipeProfiles()
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={selected}
        className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition-colors ${
          selected
            ? 'border-terra bg-[rgba(243,156,18,0.08)]'
            : disabled
              ? 'cursor-not-allowed border-[rgba(31,42,55,0.08)] opacity-45'
              : 'border-[rgba(31,42,55,0.08)] bg-paper hover:border-[rgba(31,42,55,0.2)]'
        }`}
      >
        <DishThumb dish={dish} className="h-20 w-20 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-display text-base font-bold leading-tight text-navy">
              {dish.name}
            </span>
            <span
              aria-hidden
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                selected ? 'bg-terra text-white' : 'bg-cream-soft text-navy'
              }`}
            >
              {selected ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
            </span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
            {[countryLabel(dish.country), `${dish.portions} portions`]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Recettes §4.8 : les régimes calculés d'après les ingrédients quand
                le calcul se fait, sinon ceux indiqués par le batch cooker ; puis
                ceux qu'il déclare (halal, casher), les saisons et les profils. */}
            {[...(dish.computedDiets ?? dish.diets), ...(dish.declaredDiets ?? [])]
              .slice(0, 3)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-cream-soft px-2 py-0.5 text-xs text-navy"
                >
                  {DIET_LABEL[tag] ?? dietLabel(tag)}
                </span>
              ))}
            {seasonsLine(dish.seasonMonths ?? null) && dish.seasonMonths?.length !== 12 && (
              <span className="rounded-full bg-mint/40 px-2 py-0.5 text-xs text-mint-ink">
                {seasonsLine(dish.seasonMonths ?? null)}
              </span>
            )}
            {(dish.profiles ?? []).slice(0, 2).map((p) => (
              <span
                key={p}
                className="rounded-full bg-amber-soft/60 px-2 py-0.5 text-xs text-[#8B6200]"
              >
                {refLabel(profiles, p)}
              </span>
            ))}
            {/* Toute la ligne est un bouton : pas de popover à l'intérieur. */}
            {dish.computedDiets && dish.computedDiets.length > 0 && (
              <span className="text-xs text-ink-soft">
                régimes selon les produits achetés
              </span>
            )}
            {/* L'allergène est une information de sécurité : on la montre
                telle quelle, et l'absence déclarée se dit aussi. */}
            {dish.allergens.length > 0 ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                {dish.allergens.join(', ')}
              </span>
            ) : dish.allergensNone ? (
              <span className="rounded-full bg-mint/60 px-2 py-0.5 text-xs text-mint-ink">
                Sans allergène déclaré
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  )
}
