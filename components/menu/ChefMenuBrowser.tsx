'use client'

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  ChefHat,
  ChevronDown,
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
  weekLabel,
  type PublicServiceOffer,
  type WeekCard,
  type WeekDish,
} from '@/lib/api/menus'
import {
  refLabel,
  useAllergens,
  useDiets,
  useLanguages,
  useRecipeProfiles,
  useRegions,
} from '@/lib/api/referentials'
import { REGULATED_ALLERGENS } from '@/lib/recipe-fields'
import { Prix } from '@/components/shared/Prix'
import { useChefSlots } from '@/lib/api/bookings'
import { offerAfterTaxCents, offerEuros, offerSummary, platsLabel } from '@/lib/api/service-offers'
import { fadeUp } from '@/lib/motion'

/**
 * Un aliment « sans gluten » ou « sans lactose » peut avoir croisé l'allergène en
 * cuisine : la fiche le dit, comme l'étiquette d'un produit (§4.8).
 */
const TRACES_DIETS = new Set(['gluten-free', 'lactose-free'])
const TRACES_NOTE = 'traces possibles pendant la préparation'

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
import { FormulePicker } from '@/components/menu/FormulePicker'

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

/* ── Panneau de filtres (tiroir mobile) ────────────────────────────────────────────────────── */

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

/** `AAAA-MM` d'une date, dans le fuseau du visiteur. */
const cleMois = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/**
 * Le filtre de dates : un seul calendrier, toujours sous les yeux.
 *
 * Il y avait deux façons de dire « quand » — un bouton « à la semaine » avec
 * son champ et son calendrier caché, un bouton « au mois » avec sa liste — et
 * il fallait choisir la façon avant de choisir la date. Il n'y a plus qu'un
 * geste : on clique un jour, sa semaine est retenue (l'API filtre à la
 * semaine, `week` accepte n'importe quel jour de la semaine voulue). Au
 * survol, toute la ligne se colore : on voit qu'on choisit sept jours, pas
 * une date. Pour voir large, « Tout le mois » retient le mois affiché.
 *
 * La période choisie est dite en toutes lettres au-dessus : le calendrier
 * montre, la phrase confirme.
 */
function PeriodeCalendrier({ filters }: { filters: MenuFilters }) {
  const { mode, setMode, semaine, setSemaine, semaines, mois, setMois, moisListe } = filters
  const [survol, setSurvol] = useState<string | null>(null)
  const auMois = mode === 'mois'

  const choisie = bornes(semaine)
  const premier = bornes(semaines[0]).from
  // Le calendrier va jusqu'à la fin du dernier mois proposé : une semaine s'y
  // choisit aussi loin qu'un mois entier.
  const [anFin, moisFin] = moisListe[moisListe.length - 1].split('-').map(Number)
  const dernier = new Date(anFin, moisFin, 0)
  const [anDebut, moisDebut] = moisListe[0].split('-').map(Number)
  const premierMois = new Date(anDebut, moisDebut - 1, 1)

  /* Le mois affiché suit ce qui est choisi, y compris quand le choix vient
     d'ailleurs (remise à zéro, raccourcis) : ajustement pendant le rendu. */
  const cle = auMois ? `m:${mois}` : `s:${semaine}`
  const [vue, setVue] = useState(cle)
  const [affiche, setAffiche] = useState(() =>
    choisie.from < premierMois ? premierMois : choisie.from,
  )
  if (cle !== vue) {
    setVue(cle)
    if (auMois) {
      const [a, m] = mois.split('-').map(Number)
      setAffiche(new Date(a, m - 1, 1))
    } else {
      setAffiche(choisie.from < premierMois ? premierMois : choisie.from)
    }
  }

  // Le mois retenu, borné à ce qui est encore réservable.
  const [anChoisi, moisChoisi] = mois.split('-').map(Number)
  const debutMois = new Date(anChoisi, moisChoisi - 1, 1)
  const moisRetenu = {
    from: debutMois < premier ? premier : debutMois,
    to: new Date(anChoisi, moisChoisi, 0),
  }

  const retenue = auMois ? moisRetenu : choisie
  const survolee = survol && (auMois || survol !== semaine) ? bornes(survol) : null
  const dansLaPlage = (d: Date) => d >= premier && d <= dernier

  const choisirSemaine = (lundi: string) => {
    setSemaine(lundi)
    if (auMois) setMode('semaine')
    setSurvol(null)
  }
  const choisirMois = (cible: string) => {
    // `setMode` se cale sur le mois de la semaine en cours : le mois voulu passe après.
    setMode('mois')
    setMois(cible)
  }

  const moisAffiche = cleMois(affiche)
  const nomMoisAffiche = affiche.toLocaleDateString('fr-FR', { month: 'long' })
  const moisEntierChoisi = auMois && mois === moisAffiche

  return (
    <div>
      <p className="text-sm text-ink-mid" aria-live="polite">
        <span className="font-semibold text-navy">
          {auMois
            ? `Tout ${moisLabel(mois)}`
            : `Semaine ${weekLabel({
                start: choisie.from.toISOString(),
                end: choisie.to.toISOString(),
              })}`}
        </span>
      </p>

      <div className="mt-3" onMouseLeave={() => setSurvol(null)}>
        <DatePicker
          month={affiche}
          onMonthChange={setAffiche}
          startMonth={premierMois}
          endMonth={dernier}
          disabled={{ before: premier, after: dernier }}
          onDayClick={(jour) => dansLaPlage(jour) && choisirSemaine(lundiDe(jour))}
          onDayMouseEnter={(jour) => setSurvol(dansLaPlage(jour) ? lundiDe(jour) : null)}
          onDayFocus={(jour) => setSurvol(dansLaPlage(jour) ? lundiDe(jour) : null)}
          modifiers={{
            semaine: retenue,
            survol: survolee ?? [],
            bandeDebut: [retenue.from, ...(survolee ? [survolee.from] : [])],
            bandeFin: [retenue.to, ...(survolee ? [survolee.to] : [])],
          }}
          modifiersClassNames={{
            ...DAY_MODIFIERS,
            semaine: 'lf-week',
            survol: 'lf-week-hover',
            bandeDebut: 'lf-week-start',
            bandeFin: 'lf-week-end',
          }}
          className="lf-rdp-week lf-rdp-compact mx-auto"
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-soft">
        Cliquez un jour : toute sa semaine est retenue.
      </p>

      {/* Les raccourcis : les deux semaines qu'on demande le plus, et le mois entier. */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {semaines.slice(0, 2).map((lundi, i) => {
          const on = !auMois && lundi === semaine
          return (
            <button
              key={lundi}
              type="button"
              onClick={() => choisirSemaine(lundi)}
              aria-pressed={on}
              className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
                on ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
              }`}
            >
              {semaineRelative(i)}
            </button>
          )
        })}
        {moisListe.includes(moisAffiche) && (
          <button
            type="button"
            onClick={() => (moisEntierChoisi ? choisirSemaine(semaine) : choisirMois(moisAffiche))}
            aria-pressed={moisEntierChoisi}
            className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
              moisEntierChoisi ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
            }`}
          >
            Tout {nomMoisAffiche}
          </button>
        )}
      </div>
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
        <PeriodeCalendrier filters={filters} />
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

/* ── Filtres en barre, au-dessus des cartes ────────────────────────────────── */

const OUTIL =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber'
const OUTIL_REPOS = 'border-[var(--line)] bg-paper text-navy hover:border-[var(--line-strong)]'
const OUTIL_ACTIF = 'border-amber bg-amber-soft/60 text-navy'

/**
 * Un bouton de la barre qui déplie un panneau dessous : le calendrier, les
 * régimes. Il se referme au clic dehors et à Échap, et rend alors le focus au
 * bouton. Pas une liste de menu : le panneau contient des contrôles (un
 * calendrier, des cases), on y navigue à la tabulation.
 */
function Deroulant({
  label,
  icon,
  actif,
  compte,
  titre,
  children,
}: {
  label: ReactNode
  icon: ReactNode
  actif?: boolean
  compte?: number
  /** Ce que contient le panneau, pour un lecteur d'écran. */
  titre: string
  children: (fermer: () => void) => ReactNode
}) {
  const [ouvert, setOuvert] = useState(false)
  const racine = useRef<HTMLDivElement>(null)
  const id = useId()
  const boutonId = `${id}-bouton`
  // Le focus revient au bouton par son id : la fonction passe au panneau
  // pendant le rendu, elle ne doit pas lire de ref.
  const rendreFocus = () => document.getElementById(boutonId)?.focus()

  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false)
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOuvert(false)
      document.getElementById(boutonId)?.focus()
    }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', echap)
    }
  }, [ouvert, boutonId])

  const fermer = () => {
    setOuvert(false)
    rendreFocus()
  }

  return (
    <div ref={racine} className="relative">
      <button
        id={boutonId}
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
        className={cn(OUTIL, actif || ouvert ? OUTIL_ACTIF : OUTIL_REPOS)}
      >
        {icon}
        {label}
        {!!compte && (
          <span className="rounded-full bg-amber px-1.5 text-xs font-bold tabular-nums text-navy">
            {compte}
          </span>
        )}
        <ChevronDown
          className={cn('h-4 w-4 text-ink-soft transition-transform duration-150', ouvert && 'rotate-180')}
          aria-hidden
        />
      </button>
      {ouvert && (
        <div
          id={id}
          role="dialog"
          aria-label={titre}
          className="absolute left-0 top-full z-30 mt-2 rounded-2xl border border-[var(--line)] bg-paper p-5 shadow-[var(--shadow-pop)]"
        >
          {children(fermer)}
        </div>
      )}
    </div>
  )
}

/**
 * Les filtres en une barre, au-dessus des cartes, à partir de `lg`.
 *
 * En colonne, ils prenaient un tiers de la largeur pour un calendrier qu'on
 * touche une fois : les cartes, elles, se serraient à deux. En barre, la
 * période et les régimes se déplient à la demande, la recherche et la région
 * restent sous la main, et les cartes reprennent toute la largeur.
 * Sous `lg`, le tiroir reste : une barre de six contrôles ne tient pas.
 */
export function MenuFilterToolbar({
  filters,
  className,
}: {
  filters: MenuFilters
  className?: string
}) {
  const { query, setQuery, region, setRegion, diets, toggleDiet, shoppingOnly, setShoppingOnly } =
    filters
  const { regions } = useRegions([])
  const dietOptions = useDiets([])

  const { from, to } = bornes(filters.semaine)
  const periode =
    filters.mode === 'mois'
      ? `Tout ${moisLabel(filters.mois)}`
      : // « Du 23 au 29 novembre » : le titre des résultats dit déjà « Semaine ».
        weekLabel({ start: from.toISOString(), end: to.toISOString() })

  return (
    <div
      role="search"
      aria-label="Filtrer les cartes"
      className={cn(
        'flex-wrap items-center gap-2 rounded-2xl border border-[var(--line)] bg-paper p-2.5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <Deroulant
        titre="Choisir la période"
        icon={<CalendarDays className="h-4 w-4 text-amber-deep" aria-hidden />}
        label={<span className="cap-first">{periode}</span>}
      >
        {(fermer) => (
          <div className="w-[19rem]">
            {/* Choisir une semaine ou un mois referme le panneau : c'est fait. */}
            <PeriodeCalendrier
              filters={{
                ...filters,
                setSemaine: (v) => {
                  filters.setSemaine(v)
                  fermer()
                },
                setMois: (v) => {
                  filters.setMois(v)
                  fermer()
                },
              }}
            />
          </div>
        )}
      </Deroulant>

      {/* Sous 1400 px, la barre ne tient pas sur une ligne : la recherche passe
          dessous, sur toute la largeur, plutôt qu'un bouton orphelin. */}
      <div className="relative order-last min-w-[11rem] flex-1 basis-full min-[1400px]:order-none min-[1400px]:basis-0">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Un chef, une ville, un plat…"
          aria-label="Rechercher un chef, une ville ou un plat"
          className="h-11 w-full rounded-xl border border-[var(--line)] bg-cream-soft/50 pl-10 pr-3 text-sm text-navy placeholder:text-ink-soft focus:border-amber focus:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/40"
        />
      </div>

      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-deep"
          aria-hidden
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Filtrer par région"
          className={cn(OUTIL, 'max-w-[13rem] appearance-none truncate pl-10 pr-9', region !== 'all' ? OUTIL_ACTIF : OUTIL_REPOS)}
        >
          <option value="all">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
      </div>

      {dietOptions.length > 0 && (
        <Deroulant
          titre="Régime alimentaire"
          icon={<SlidersHorizontal className="h-4 w-4 text-amber-deep" aria-hidden />}
          label="Régimes"
          actif={diets.length > 0}
          compte={diets.length}
        >
          {() => (
            <ul className="w-56 space-y-1">
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
          )}
        </Deroulant>
      )}

      <button
        type="button"
        onClick={() => setShoppingOnly(!shoppingOnly)}
        aria-pressed={shoppingOnly}
        className={cn(OUTIL, shoppingOnly ? OUTIL_ACTIF : OUTIL_REPOS)}
      >
        <ShoppingBasket className="h-4 w-4 text-amber-deep" aria-hidden />
        Courses incluses
        {shoppingOnly && <Check className="h-4 w-4" aria-hidden />}
      </button>

      {filters.active && (
        <button
          type="button"
          onClick={filters.reset}
          className="hit ml-1 shrink-0 px-2 text-sm font-semibold text-ink-mid underline-offset-4 hover:text-navy hover:underline"
        >
          Tout effacer
        </button>
      )}
    </div>
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
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

/** Le squelette d'attente : trois cartes, à la place qu'elles occuperont. */
export function MenusLoading() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[30rem] animate-pulse rounded-2xl bg-paper" />
      ))}
    </div>
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
  // Une photo qui ne charge pas (lien expiré, fichier retiré) laissait un trou
  // à la place du visage : on retombe sur les initiales.
  const [casse, setCasse] = useState(false)
  if (card.chef.avatarUrl && !casse) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={card.chef.avatarUrl}
        alt=""
        onError={() => setCasse(true)}
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

/** Vrai dès que l'élément est entré une fois dans l'écran. */
function useVu<T extends Element>() {
  const ref = useRef<T>(null)
  const [vu, setVu] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || vu) return
    const io = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVu(true)
          io.disconnect()
        }
      },
      { rootMargin: '240px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [vu])
  return [ref, vu] as const
}

/**
 * Les formules d'un batch cooker, dans sa carte.
 *
 * La liste de la semaine (`/menus/week`) ne donne que son prix le plus bas. Ses
 * formules — nom, plats, durée, prix — sont sur sa fiche publique (`GET /chefs/{id}`,
 * `serviceOffers`, les actives seulement). On la lit carte par carte, et
 * seulement quand la carte approche de l'écran : la route publique est limitée
 * en appels, et quarante fiches d'un coup la satureraient.
 *
 * Le prix suit la règle de la maison : le reste à charge après crédit d'impôt
 * d'abord, le total avant déduction dessous.
 */
function Formules({ chefId, vu }: { chefId: string; vu: boolean }) {
  const fiche = useChefPublic(vu ? chefId : undefined)
  const offres = fiche.data?.serviceOffers ?? []

  // Sans formule, ou si la fiche ne répond pas : le pied de carte dit déjà le tarif.
  if (fiche.isError || (fiche.isSuccess && offres.length === 0)) return null

  return (
    <div className="mt-4 px-5">
      <h3 className="text-xs font-semibold text-ink-mid">Ses formules</h3>
      {fiche.isPending ? (
        // Deux lignes à la hauteur des formules : la carte ne saute pas à l'arrivée.
        <div role="status" aria-busy="true" className="mt-2 space-y-1.5">
          <span className="sr-only">Chargement des formules</span>
          {[0, 1].map((i) => (
            <div
              key={i}
              aria-hidden
              className="h-10 animate-pulse rounded-lg bg-cream-deep motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Une ligne par formule : son nom, et ce qu'elle coûte vraiment. Le
              détail (plats, durée, total avant crédit) est dans sa carte. */}
          <ul className="mt-2 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
            {offres.slice(0, 2).map((o) => {
              // Forfait courses compris, après crédit d'impôt, connecté ou pas.
              const apres = offerEuros(offerAfterTaxCents(o))
              return (
                <li key={o.id} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                  <span className="min-w-0 truncate text-sm font-semibold text-navy" title={o.name}>
                    {o.name}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-navy">
                    {apres}
                    <span className="ml-1 text-xs font-normal text-ink-soft">après crédit</span>
                  </span>
                </li>
              )
            })}
          </ul>
          {offres.length > 2 && (
            <p className="mt-1.5 text-xs text-ink-soft">
              + {offres.length - 2} autre{offres.length - 2 > 1 ? 's' : ''} formule
              {offres.length - 2 > 1 ? 's' : ''} dans sa carte
            </p>
          )}
        </>
      )}
    </div>
  )
}

/** `AAAA-MM-JJ` d'une date, dans le fuseau du visiteur. */
const cleJour = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Les jours où un batch cooker a encore de la place, sur la semaine regardée.
 *
 * La carte disait « 9 créneaux libres » sans dire quand : on ouvrait la carte,
 * on allait jusqu'au choix de la date, et on découvrait là que le mercredi
 * voulu n'était pas possible. Les sept jours sont sous les yeux dès la liste.
 *
 * `GET /chefs/{id}/availability` rend les débuts de session possibles pour sa
 * formule la plus courte ; un jour est libre s'il en porte au moins un. La
 * fenêtre ne peut pas commencer dans le passé : pour la semaine en cours, elle
 * part d'aujourd'hui, et les jours écoulés sont dits tels.
 *
 * Rien ne s'affiche quand il n'a pas d'horaires publiés (il est « sur
 * demande », le pied de carte le dit) ou que la route ne répond pas.
 */
function JoursLibres({ chefId, semaine, vu }: { chefId: string; semaine: string; vu: boolean }) {
  // Une seule lecture de l'heure, au montage : le rendu reste pur.
  const [aujourdhui] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const lundi = new Date(`${semaine}T00:00:00`)
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi)
    d.setDate(d.getDate() + i)
    return d
  })
  // `to` est exclu côté API : le lundi suivant couvre le dimanche.
  const finExclue = new Date(lundi)
  finExclue.setDate(finExclue.getDate() + 7)
  const debut = lundi < aujourdhui ? aujourdhui : lundi
  const ecoulee = debut >= finExclue

  const dispos = useChefSlots(vu && !ecoulee ? chefId : undefined, {
    from: cleJour(debut),
    to: cleJour(finExclue),
  })

  if (ecoulee || dispos.isError) return null
  if (dispos.isSuccess && !dispos.data.scheduled) return null

  const libres = new Set((dispos.data?.slots ?? []).map((iso) => cleJour(new Date(iso))))

  return (
    <div className="mt-4 px-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-semibold text-ink-mid">Ses jours libres</h3>
        {dispos.isSuccess && libres.size === 0 && (
          <p className="text-xs text-amber-deep">Complet : essayez la semaine suivante</p>
        )}
      </div>
      {dispos.isPending ? (
        <div role="status" aria-busy="true" className="mt-2 grid grid-cols-7 gap-1">
          <span className="sr-only">Chargement des disponibilités</span>
          {jours.map((d) => (
            <div
              key={d.getTime()}
              aria-hidden
              className="h-10 animate-pulse rounded-lg bg-cream-deep motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : (
        <ol className="mt-2 grid grid-cols-7 gap-1">
          {jours.map((d) => {
            const passe = d < aujourdhui
            const libre = !passe && libres.has(cleJour(d))
            return (
              <li
                key={d.getTime()}
                className={`flex h-10 flex-col items-center justify-center rounded-lg text-[11px] leading-none ${
                  libre ? 'bg-[var(--ok-soft)] text-[var(--ok-ink)]' : 'bg-cream-soft text-ink-soft'
                }`}
              >
                <span aria-hidden>
                  {d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                </span>
                {/* Barré : l'absence de couleur seule ne dit pas « pas possible ». */}
                <span
                  aria-hidden
                  className={`mt-0.5 text-[13px] font-semibold tabular-nums ${libre ? '' : 'line-through'}`}
                >
                  {d.getDate()}
                </span>
                <span className="sr-only">
                  {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} :{' '}
                  {libre ? 'un créneau reste libre' : passe ? 'jour passé' : 'indisponible'}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

/** Ce qu'on peut dire des places restantes sans inventer. */
function placesLabel(slotsLeft: number | null): string {
  if (slotsLeft == null) return 'Sur demande'
  if (slotsLeft === 0) return 'Complet cette semaine'
  return `${slotsLeft} créneau${slotsLeft > 1 ? 'x' : ''} libre${slotsLeft > 1 ? 's' : ''}`
}

function DishThumb({ dish, className }: { dish: WeekDish; className: string }) {
  // Même repli que l'avatar : pas de case vide quand la photo ne répond pas.
  const [casse, setCasse] = useState(false)
  if (dish.imageUrl && !casse) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dish.imageUrl}
        alt=""
        onError={() => setCasse(true)}
        className={`${className} bg-cream-soft object-cover`}
      />
    )
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
  semaine,
}: {
  menu: WeekCard
  index: number
  /**
   * Le lundi de la semaine regardée, `AAAA-MM-JJ`. Présent, la carte montre les
   * jours libres du batch cooker cette semaine-là ; absent (vue au mois), non.
   */
  semaine?: string
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
  // Quatre cases : quatre plats, ou trois et « +N » pour les autres.
  const preview = menu.dishes.length > 4 ? menu.dishes.slice(0, 3) : menu.dishes
  const reste = menu.dishes.length - preview.length
  const prix = euros(menu.sessionFromCents)
  const apresCredit = euros(menu.afterTaxCreditCents)
  // La fiche et les créneaux ne se lisent que lorsque la carte approche de l'écran.
  const [sentinelle, vu] = useVu<HTMLSpanElement>()

  return (
    <motion.article
      // slow-out : la carte se pose en 240 ms, décalée de 40 ms par rang
      {...fadeUp(Math.min(index * 0.04, 0.16))}
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-paper shadow-[var(--shadow-card)] transition-colors hover:border-[var(--line-strong)]"
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
          className="aspect-[3/1] w-full object-cover"
        />
      )}

      <span ref={sentinelle} aria-hidden />

      {/* Le chef d'abord : c'est lui qu'on choisit. */}
      <header className="flex items-start gap-3.5 p-5 pb-3">
        <Avatar card={menu} className="h-12 w-12 text-base" />

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
              <span className="rounded-full bg-amber-soft px-2 py-0.5 text-xs font-semibold text-amber-deep">
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
        <h3 className="font-display text-lg font-bold leading-tight tracking-[-0.01em] text-navy">
          {menu.hasMenu && menu.title ? menu.title : 'Ses plats de la semaine'}
        </h3>
        {menu.pitch && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-mid">{menu.pitch}</p>
        )}
      </div>

      {/* Les plats en vignettes : on voit la cuisine d'un coup d'œil, la liste
          complète (pays, portions, allergènes) est dans sa carte. */}
      {menu.dishes.length === 0 ? (
        <p className="mt-3 px-5 text-sm text-ink-soft">Aucun plat publié pour l’instant.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-4 gap-2 px-5">
          {preview.map((dish) => (
            <li key={dish.id} className="min-w-0">
              <DishThumb dish={dish} className="aspect-square w-full rounded-xl" />
              <span className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug text-navy" title={dish.name}>
                {dish.name}
              </span>
            </li>
          ))}
          {reste > 0 && (
            <li className="min-w-0">
              <button
                type="button"
                onClick={onOpen}
                aria-label={`Voir les ${reste} autres plats`}
                className="flex aspect-square w-full flex-col items-center justify-center rounded-xl bg-cream-soft text-navy transition-colors hover:bg-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                <span className="font-display text-lg font-bold tabular-nums">+{reste}</span>
                <span className="text-[11px] text-ink-soft">plat{reste > 1 ? 's' : ''}</span>
              </button>
            </li>
          )}
        </ul>
      )}

      {(menu.coveredDiets.length > 0 || menu.shoppingIncluded) && (
        <div className="mt-3 flex flex-wrap gap-1.5 px-5">
          {menu.coveredDiets.map((d) => (
            <span
              key={d}
              className="rounded-full bg-mint/60 px-2.5 py-1 text-xs font-medium text-mint-ink"
            >
              Toute la carte {dietLabel(d).toLowerCase()}
              {/* La promesse la plus forte de la page : la mention des traces la suit aussi. */}
              {TRACES_DIETS.has(d) && `, ${TRACES_NOTE}`}
            </span>
          ))}
          {menu.shoppingIncluded && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-xs font-medium text-navy">
              <ShoppingBasket className="h-3 w-3" aria-hidden /> Courses incluses
            </span>
          )}
        </div>
      )}

      {/*
        La liste de la semaine dit déjà si ces blocs auront quelque chose à
        montrer : sans créneau configuré (`slotsLeft` nul), pas de jours libres ;
        sans formule (`sessionFromCents` nul), pas de formules. On ne pose donc
        pas un squelette qui disparaîtrait ensuite en faisant sauter la carte.
      */}
      {semaine && menu.slotsLeft != null && (
        <JoursLibres chefId={menu.chef.id} semaine={semaine} vu={vu} />
      )}

      {menu.sessionFromCents != null && <Formules chefId={menu.chef.id} vu={vu} />}

      {customOrder ? (
        <>
          {/* Le pied se cale en bas : deux cartes côte à côte alignent leurs prix. */}
          <div aria-hidden className="min-h-4 flex-1" />
          <footer className="border-t border-[var(--line)] px-5 pb-4 pt-4">
            {/* Alignés en haut : « 3 créneaux libres » tombait sinon sur la
                dernière ligne du prix et se lisait comme sa suite. */}
            <div className="flex items-start justify-between gap-4">
              <Tarif prix={prix} apresCredit={apresCredit} />
              <Places slotsLeft={menu.slotsLeft} />
            </div>
            {/* Un seul bouton : ouvrir la carte. La demande sur-mesure est une
                autre route, plus rare — elle reste à portée, en lien. */}
            <button
              type="button"
              onClick={onOpen}
              className="btn btn-primary mt-4 w-full justify-center"
            >
              {openLabel}
            </button>
            <ReserveButton
              asChild
              href={`/espace-client/personnalisation?chef=${encodeURIComponent(menu.chef.id)}`}
              className="hit mx-auto mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-ink-mid underline-offset-4 hover:text-navy hover:underline"
            >
              Lui adresser une demande sur-mesure
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </ReserveButton>
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
        slotsLeft != null && slotsLeft <= 2 ? 'font-semibold text-amber-deep' : 'text-ink-soft'
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
  renderBeforeDishes,
  maxDishes = MAX_DISHES,
  maxDishesFixed = true,
}: {
  menu: WeekCard | null
  onClose: () => void
  /** Ce que fait le bouton final : se connecter, ou continuer la réservation. */
  renderAction: (ctx: {
    menu: WeekCard
    selected: string[]
    close: () => void
    /**
     * La formule retenue dans la carte, quand c'est la carte qui la fait
     * choisir (pas de `renderBeforeDishes`). `null` tant qu'aucune ne l'est.
     */
    offer: PublicServiceOffer | null
  }) => ReactNode
  /**
   * Sélection portée par le parent. La réservation en a besoin : rouvrir la
   * carte pour « modifier les plats » doit retrouver ceux déjà cochés.
   * Omise, la modale gère sa sélection et l'oublie à la fermeture.
   */
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
  dietLabel: (code: string) => string
  /**
   * Au-dessus des plats : la réservation y pose son propre choix de formule.
   * Omis, la carte fait choisir la formule elle-même (vitrine publique, espace
   * client) : le client choisit sa formule, puis ses plats.
   */
  renderBeforeDishes?: (menu: WeekCard) => ReactNode
  /** Plats cochables. La formule retenue le fixe ; `0` tant qu'aucune ne l'est. */
  maxDishes?: number
  /**
   * `false` : `maxDishes` est un plafond technique, pas le nombre de la
   * formule (une formule posée avant le 19/11 n'en a pas). Le compteur dit
   * alors combien de plats sont cochés, sans « / 20 ».
   */
  maxDishesFixed?: boolean
}) {
  const [own, setOwn] = useState<string[]>([])
  const selected = controlled ?? own
  const setSelected = (ids: string[]) => (onSelectedChange ?? setOwn)(ids)

  /*
   * Sans `renderBeforeDishes`, la formule se choisit ici, avant les plats :
   * c'est elle qui dit combien de plats cocher, et sans elle rien ne se
   * réserve. La fiche (`GET /chefs/{id}`) est celle que le panneau du batch
   * cooker lit déjà : même clé, une seule requête.
   */
  const formuleIci = renderBeforeDishes === undefined
  const ficheFormules = useChefPublic(menu?.chef.id)
  const offresIci = ficheFormules.data?.serviceOffers ?? []
  const [offerId, setOfferId] = useState<string | null>(null)
  const offre = formuleIci ? (offresIci.find((o) => o.id === offerId) ?? null) : null
  const effMax = formuleIci ? (offre ? (offre.mealsIncluded ?? MAX_DISHES) : 0) : maxDishes
  const effFixed = formuleIci ? offre?.mealsIncluded != null : maxDishesFixed
  const avecFormule = formuleIci || renderBeforeDishes !== undefined

  const pickOffer = (o: PublicServiceOffer) => {
    setOfferId(o.id)
    // Une formule à moins de plats que ceux déjà cochés : on garde les premiers.
    const max = o.mealsIncluded ?? MAX_DISHES
    if (selected.length > max) setSelected(selected.slice(0, max))
  }

  /*
   * Les plats rangés dans leurs menus. La fiche porte tous les menus publiés
   * du batch cooker et tous ses plats ; le menu de la semaine passe en tête,
   * les plats hors menu ferment la liste. Le client prend un menu entier, des
   * plats de plusieurs menus, ou les deux, dans la limite de sa formule.
   * Tant que la fiche n'est pas là, les plats de la vignette, à plat.
   */
  const groupes = useMemo(() => {
    const parCarte = menu?.dishes ?? []
    const data = ficheFormules.data
    if (!data) return { menus: [] as { id: string; title: string; pitch: string | null; dishes: WeekDish[] }[], autres: parCarte }
    const menus = (data.menus ?? [])
      .filter((m) => (m.dishes?.length ?? 0) > 0)
      .map((m) => ({ id: m.id, title: m.title, pitch: m.pitch, dishes: m.dishes ?? [] }))
      .sort((a, b) => Number(b.id === menu?.menuId) - Number(a.id === menu?.menuId))
    const dansUnMenu = new Set(menus.flatMap((m) => m.dishes.map((d) => d.id)))
    const vus = new Set<string>()
    const autres = [...(data.dishes ?? []), ...parCarte].filter((d) => {
      if (dansUnMenu.has(d.id) || vus.has(d.id)) return false
      vus.add(d.id)
      return true
    })
    return { menus, autres }
  }, [ficheFormules.data, menu?.dishes, menu?.menuId])
  const aucunPlat = groupes.menus.length === 0 && groupes.autres.length === 0
  const full = selected.length >= effMax

  /** Tout un menu d'un coup : ses plats manquants s'ajoutent s'ils tiennent dans la formule. */
  const toggleMenu = (ids: string[]) => {
    const tous = ids.every((id) => selected.includes(id))
    if (tous) return setSelected(selected.filter((id) => !ids.includes(id)))
    const manquants = ids.filter((id) => !selected.includes(id))
    if (selected.length + manquants.length <= effMax) setSelected([...selected, ...manquants])
  }

  const rangee = (list: WeekDish[]) => (
    <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {list.map((dish) => (
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
  )

  const toggle = (id: string) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : selected.length < effMax
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
          setOfferId(null)
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
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

                    {formuleIci ? (
                      <FormulePicker
                        chefName={menu.chef.displayName}
                        loading={ficheFormules.isPending}
                        offres={offresIci}
                        chosenId={offre?.id ?? null}
                        onPick={pickOffer}
                      />
                    ) : (
                      renderBeforeDishes(menu)
                    )}

                    <p className="mb-3 text-sm font-semibold text-navy">
                      {avecFormule ? '2. Choisissez vos plats' : 'Choisissez vos plats'}
                      <span className="ml-2 font-normal text-ink-soft">
                        {effMax === 0
                          ? 'choisissez d’abord votre formule'
                          : effFixed
                            ? `${selected.length} sur ${effMax} prévus par la formule`
                            : `${selected.length} plat${selected.length > 1 ? 's' : ''} choisi${selected.length > 1 ? 's' : ''}`}
                      </span>
                    </p>

                    {aucunPlat ? (
                      <p className="rounded-2xl bg-paper px-4 py-6 text-center text-sm text-ink-soft">
                        Ce batch cooker n’a pas encore publié de plat.
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {groupes.menus.map((m) => {
                          const ids = m.dishes.map((d) => d.id)
                          const tous = ids.every((id) => selected.includes(id))
                          const manquants = ids.filter((id) => !selected.includes(id)).length
                          const tientPas = !tous && selected.length + manquants > effMax
                          return (
                            <section key={m.id} aria-label={m.title}>
                              <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                                <div className="min-w-0">
                                  <h3 className="font-display text-base font-bold leading-tight text-navy">
                                    {m.title}
                                  </h3>
                                  {m.pitch && (
                                    <p className="mt-0.5 max-w-[62ch] text-xs leading-relaxed text-ink-soft">
                                      {m.pitch}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleMenu(ids)}
                                  disabled={tientPas}
                                  aria-pressed={tous}
                                  title={
                                    effMax === 0
                                      ? 'Choisissez d’abord votre formule'
                                      : tientPas
                                        ? `Ce menu compte ${platsLabel(ids.length)} : il ne tient pas dans votre formule`
                                        : undefined
                                  }
                                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                    tous
                                      ? 'border-navy bg-navy text-white'
                                      : 'border-[var(--line-strong)] bg-paper text-navy hover:border-navy'
                                  }`}
                                >
                                  {tous && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                                  {tous ? 'Menu entier choisi' : `Tout le menu · ${platsLabel(ids.length)}`}
                                </button>
                              </div>
                              {rangee(m.dishes)}
                            </section>
                          )
                        })}
                        {groupes.autres.length > 0 && (
                          <section aria-label="Autres plats">
                            {groupes.menus.length > 0 && (
                              <h3 className="mb-3 font-display text-base font-bold leading-tight text-navy">
                                Autres plats
                              </h3>
                            )}
                            {rangee(groupes.autres)}
                          </section>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(31,42,55,0.08)] bg-paper px-5 py-4 sm:px-7">
                <p className="text-sm text-ink-mid">
                  {effMax === 0 ? (
                    'Choisissez d’abord votre formule.'
                  ) : selected.length === 0 ? (
                    // Les plats sont facultatifs : l'API accepte une demande
                    // sans plat, à composer ensuite avec le batch cooker.
                    `Pas encore de plat : vous pourrez les choisir avec ${menu.chef.displayName.split(' ')[0]}.`
                  ) : (
                    <>
                      <span className="font-semibold text-navy">
                        {selected.length} plat{selected.length > 1 ? 's' : ''}
                      </span>{' '}
                      avec {menu.chef.displayName}
                    </>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Aucune formule ne convient : la demande sur-mesure, à côté
                      du bouton de réservation, au même format mais en clair. */}
                  <ReserveButton
                    href={`/espace-client/personnalisation?chef=${encodeURIComponent(menu.chef.id)}`}
                    variant="outline"
                    className="text-xs"
                    onClick={onClose}
                  >
                    Demande sur-mesure
                  </ReserveButton>
                  {renderAction({ menu, selected, close: onClose, offer: offre })}
                </div>
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
  const offres = chef?.serviceOffers ?? []

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
        {card.chef.newcomer && <span className="text-amber-deep"> · nouveau sur Lab’s Food</span>}
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

      {/*
        Les tarifs, que la carte ouverte ne portait pas.

        Le pied de la vignette annonce « À partir de X » et jusqu'à deux
        formules, puis « + N autres formules dans sa carte ». On ouvrait la
        carte, et plus un prix nulle part : le chiffre sur lequel on avait
        cliqué disparaissait, et la promesse des autres formules n'était tenue
        sur aucun écran. Elles sont donc toutes ici, sans le `slice(0, 2)` de
        la vignette : c'est la place qu'elle désigne.
      */}
      <div className="mt-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
        <Prix
          lead="À partir de"
          apresCredit={euros(card.afterTaxCreditCents)}
          total={euros(card.sessionFromCents)}
          taille="sm"
        />

        {fiche.isPending ? (
          // Deux lignes à la hauteur des formules : le panneau ne saute pas à
          // l'arrivée de la fiche.
          <div role="status" aria-busy="true" className="mt-4 space-y-1.5">
            <span className="sr-only">Chargement des formules</span>
            {[0, 1].map((i) => (
              <div
                key={i}
                aria-hidden
                className="h-12 animate-pulse rounded-lg bg-cream-deep motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : (
          offres.length > 0 && (
            <>
              {/* « après crédit » en légende de colonne plutôt que répété à
                  chaque ligne : la mention est la même pour toutes. */}
              <div className="mb-2 mt-4 flex items-baseline justify-between gap-3">
                <h3 className="text-xs font-semibold text-ink-mid">Ses formules</h3>
                <p className="shrink-0 whitespace-nowrap text-[11px] text-ink-soft">
                  après crédit d’impôt
                </p>
              </div>
              <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
                {offres.map((o) => {
                  // Forfait courses compris, connecté ou pas.
                  const apres = offerEuros(offerAfterTaxCents(o))
                  return (
                    <li key={o.id} className="px-3 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className="min-w-0 truncate text-sm font-semibold text-navy"
                          title={o.name}
                        >
                          {o.name}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-navy">
                          {apres}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-ink-soft">
                        {offerSummary(o)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </>
          )
        )}
      </div>

      {chef?.bio && (
        <blockquote className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-ink-mid">
          {chef.bio}
        </blockquote>
      )}

      <dl className="mt-5 space-y-2.5 border-t border-[rgba(31,42,55,0.08)] pt-4 text-[13px]">
        {faits.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-2">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
            <dt className="shrink-0 text-ink-soft">{label}&nbsp;:</dt>
            <dd className="min-w-0 text-navy">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Les langues sont déjà dans la liste au-dessus (« Parle ») : pas une seconde fois ici. */}
      {(card.chef.badges.length > 0 || card.chef.acceptsCesu) && (
        <div className="mt-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
          {card.chef.acceptsCesu && (
            <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
              <Wallet className="h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
              Accepte le CESU préfinancé
            </p>
          )}
          {card.chef.badges.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
              {card.chef.badges.join(', ')}
            </p>
          )}
        </div>
      )}

      {(chef?.menus?.length ?? 0) > 1 && (
        <div className="mt-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
          <p className="mb-2 text-sm font-semibold text-navy">Ses autres cartes</p>
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
  // Le repli des quatorze : un client lit « Lait », jamais le code `milk`.
  const allergenList = useAllergens(REGULATED_ALLERGENS)
  const conditional = new Set(dish.conditionalAllergens ?? [])
  // Les allergènes hors des quatorze (le sarrasin) : un client allergique doit les lire aussi.
  const customAllergens = dish.customAllergens ?? []
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
                ceux qu'il déclare (halal, casher), puis les profils. */}
            {/* « Sans gluten » et « sans lactose » d'abord : coupés par le plafond, leur mention de traces disparaîtrait avec eux. */}
            {[...(dish.computedDiets ?? dish.diets), ...(dish.declaredDiets ?? [])]
              .sort((a, b) => Number(TRACES_DIETS.has(b)) - Number(TRACES_DIETS.has(a)))
              .slice(0, 3)
              .map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-cream-soft px-2 py-0.5 text-xs text-navy"
                >
                  {DIET_LABEL[tag] ?? dietLabel(tag)}
                  {TRACES_DIETS.has(tag) && `, ${TRACES_NOTE}`}
                </span>
              ))}
            {/* Retour de recette du 26/11 : le client ne voit pas la saisonnalité d'un plat. */}
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
              <span className="text-xs italic text-ink-soft">
                régimes selon les produits achetés
              </span>
            )}
            {/* L'allergène est une information de sécurité : on la montre
                telle quelle, et l'absence déclarée se dit aussi. */}
            {dish.allergens.length > 0 || customAllergens.length > 0 ? (
              <>
                {dish.allergens.map((code) => (
                  <span
                    key={code}
                    className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
                  >
                    {refLabel(allergenList, code)}
                    {conditional.has(code) && ', si l’ingrédient facultatif est utilisé'}
                  </span>
                ))}
                {customAllergens.map((name) => (
                  <span
                    key={`autre-${name}`}
                    className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"
                  >
                    {name}
                  </span>
                ))}
              </>
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
