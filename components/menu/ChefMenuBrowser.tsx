'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import {
  CalendarCheck,
  Check,
  ChefHat,
  Clock,
  CreditCard,
  Languages,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Star,
  Users,
  X,
} from 'lucide-react'
import type { Meal } from '@/types'
import {
  DIET_FILTERS,
  REGIONS_ON_SHOW,
  WEEK_MENUS,
  dietsOf,
  dishesOf,
  type WeekMenu,
} from '@/lib/week-menus'

/* ─────────────────────────────────────────────────────────────────────────────
   Choix d'un batch cooker et de sa carte de la semaine.

   Le même parcours sert deux fois : sur la page publique `/menu`, et dans la
   réservation de l'espace client. Il est donc ici, et pas dans l'une des deux
   pages — sinon les deux divergent au premier ajustement, et le client ne
   retrouve pas ce qu'il a vu avant de se connecter.

   Seule l'action finale change : la page publique envoie vers la connexion,
   l'espace client enchaîne sur la suite de la réservation. D'où `renderAction`.
   ───────────────────────────────────────────────────────────────────────────── */

export const MAX_DISHES = 7

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// ── Filtres ─────────────────────────────────────────────────────────────────

export interface MenuFilters {
  query: string
  setQuery: (v: string) => void
  region: string
  setRegion: (v: string) => void
  diets: string[]
  toggleDiet: (d: string) => void
  shoppingOnly: boolean
  setShoppingOnly: (v: boolean) => void
  /** Menus retenus par les filtres courants. */
  menus: WeekMenu[]
  /** Vrai dès qu'un filtre est posé — sert à proposer la remise à zéro. */
  active: boolean
  reset: () => void
}

export function useMenuFilters(): MenuFilters {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const [diets, setDiets] = useState<string[]>([])
  const [shoppingOnly, setShoppingOnly] = useState(false)

  const menus = useMemo(() => {
    const q = norm(query)
    return WEEK_MENUS.filter((m) => {
      if (region !== 'all' && m.region !== region) return false
      if (shoppingOnly && !m.shoppingIncluded) return false
      if (diets.length > 0) {
        const covered = dietsOf(m)
        if (!diets.every((d) => covered.includes(d))) return false
      }
      if (!q) return true
      const haystack = [m.chefName, m.city, m.title, m.pitch, ...dishesOf(m).map((d) => d.name)]
      return haystack.some((t) => norm(t).includes(q))
    })
  }, [query, region, diets, shoppingOnly])

  return {
    query,
    setQuery,
    region,
    setRegion,
    diets,
    toggleDiet: (d) => setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])),
    shoppingOnly,
    setShoppingOnly,
    menus,
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
  const { query, setQuery, region, setRegion, diets, toggleDiet, shoppingOnly, setShoppingOnly } = filters

  return (
    <div className="flex flex-wrap items-center gap-3">
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
          {REGIONS_ON_SHOW.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {DIET_FILTERS.map((d) => {
          const on = diets.includes(d)
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDiet(d)}
              aria-pressed={on}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold capitalize transition-colors ${
                on ? 'bg-navy text-white' : 'bg-paper text-ink-mid hover:text-navy'
              }`}
            >
              {d}
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

export function NoMenus({ onReset, children }: { onReset: () => void; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(31,42,55,0.18)] bg-paper px-6 py-14 text-center">
      <ChefHat className="mx-auto mb-4 h-8 w-8 text-ink-soft" aria-hidden />
      <h2 className="font-display text-xl font-bold text-navy">Rien ne correspond, pour l’instant</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-mid">
        Élargissez vos critères, ou décrivez-nous ce que vous cherchez : un chef vous fera une
        proposition sur mesure.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onReset} className="btn btn-outline text-xs">
          Réinitialiser les filtres
        </button>
        {children}
      </div>
    </div>
  )
}

// ── Carte d'un menu ─────────────────────────────────────────────────────────

export function MenuCard({
  menu,
  index,
  onOpen,
  openLabel = 'Voir la carte',
}: {
  menu: WeekMenu
  index: number
  onOpen: () => void
  openLabel?: string
}) {
  const dishes = dishesOf(menu)
  const diets = dietsOf(menu)
  const preview = dishes.slice(0, 3)

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.24), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper transition-colors hover:border-[rgba(31,42,55,0.18)]"
    >
      {/* Le chef d'abord : c'est lui qu'on choisit. */}
      <header className="flex items-start gap-4 p-5 pb-4">
        {menu.chefAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={menu.chefAvatar}
            alt={menu.chefName}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy font-display text-lg font-bold text-amber">
            {menu.chefInitials}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="font-display text-lg font-bold leading-tight text-navy">{menu.chefName}</h2>
            {menu.newcomer && (
              <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-mint-ink">
                Nouveau
              </span>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden /> {menu.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber text-amber" aria-hidden />
              <span className="font-semibold text-navy">{menu.rating}</span> ({menu.reviewCount} avis)
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden /> {menu.sessionsDone} sessions
            </span>
          </p>
        </div>
      </header>

      <div className="px-5">
        <h3 className="font-display text-xl font-bold leading-tight tracking-[-0.01em] text-navy">
          {menu.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">{menu.pitch}</p>
      </div>

      {/* Aperçu des plats */}
      <ul className="mt-4 space-y-px px-5">
        {preview.map((dish) => (
          <li key={dish.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dish.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy">{dish.name}</span>
              <span className="block truncate text-xs text-ink-soft">{dish.portions}</span>
            </span>
          </li>
        ))}
        {dishes.length > preview.length && (
          <li className="px-2 pt-1 text-xs text-ink-soft">
            + {dishes.length - preview.length} autre{dishes.length - preview.length > 1 ? 's' : ''} plat
            {dishes.length - preview.length > 1 ? 's' : ''} dans cette carte
          </li>
        )}
      </ul>

      <div className="mt-4 flex flex-wrap gap-1.5 px-5">
        {diets.map((d) => (
          <span
            key={d}
            className="rounded-full bg-mint/60 px-2.5 py-1 text-[11px] font-medium capitalize text-mint-ink"
          >
            Toute la carte {d}
          </span>
        ))}
        {menu.shoppingIncluded && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-[11px] font-medium text-navy">
            <ShoppingBasket className="h-3 w-3" aria-hidden /> Courses incluses
          </span>
        )}
        {menu.languages.length > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-[11px] font-medium text-navy">
            <Languages className="h-3 w-3" aria-hidden /> {menu.languages.join(', ')}
          </span>
        )}
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(31,42,55,0.08)] px-5 py-4">
        <div>
          <p className="text-xs text-ink-soft">À partir de</p>
          <p className="font-display text-xl font-bold text-navy">
            {menu.sessionFrom} €
            <span className="ml-1.5 text-xs font-medium text-terra">
              soit {Math.round(menu.sessionFrom / 2)} € après crédit d&apos;impôt
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className={`text-xs ${menu.spotsLeft <= 2 ? 'font-semibold text-terra' : 'text-ink-soft'}`}>
            {menu.spotsLeft} créneau{menu.spotsLeft > 1 ? 'x' : ''} libre{menu.spotsLeft > 1 ? 's' : ''}
          </p>
          <button type="button" onClick={onOpen} className="btn btn-primary px-5 py-2.5 text-xs">
            {openLabel}
          </button>
        </div>
      </footer>
    </motion.article>
  )
}

// ── Détail d'un menu ────────────────────────────────────────────────────────

const PAYMENT_LABEL: Record<'card' | 'urssaf' | 'cesu', string> = {
  card: 'Carte bancaire',
  urssaf: 'Avance immédiate',
  cesu: 'CESU préfinancé',
}

export function MenuDialog({
  menu,
  onClose,
  renderAction,
  selected: controlled,
  onSelectedChange,
}: {
  menu: WeekMenu | null
  onClose: () => void
  /** Ce que fait le bouton final : se connecter, ou continuer la réservation. */
  renderAction: (ctx: { menu: WeekMenu; selected: string[]; close: () => void }) => ReactNode
  /**
   * Sélection portée par le parent. La réservation en a besoin : rouvrir la
   * carte pour « modifier les plats » doit retrouver ceux déjà cochés.
   * Omise, la modale gère sa sélection et l'oublie à la fermeture.
   */
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
}) {
  const [own, setOwn] = useState<string[]>([])
  const selected = controlled ?? own
  const setSelected = (ids: string[]) => (onSelectedChange ?? setOwn)(ids)

  const dishes = menu ? dishesOf(menu) : []
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 top-10 z-50 flex flex-col overflow-hidden rounded-t-3xl bg-cream focus:outline-none sm:inset-6 sm:rounded-3xl lg:inset-x-[10%] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4">
          {menu && (
            <>
              <header className="flex items-start gap-4 border-b border-[rgba(31,42,55,0.08)] bg-paper px-5 py-4 sm:px-7">
                {menu.chefAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={menu.chefAvatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy font-display font-bold text-amber">
                    {menu.chefInitials}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="font-display text-lg font-bold leading-tight text-navy">
                    {menu.title}
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-ink-soft">
                    {menu.chefName} · {menu.city} · {menu.rating}/5 ({menu.reviewCount} avis)
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
                  <ChefPanel menu={menu} />

                  <div>
                    <p className="mb-1 font-display text-xl font-bold leading-tight text-navy">
                      Sa carte de la semaine
                    </p>
                    <p className="mb-5 max-w-[62ch] text-sm leading-relaxed text-ink-mid">
                      {menu.pitch}
                    </p>

                    <p className="mb-3 text-sm font-semibold text-navy">
                      Choisissez vos plats
                      <span className="ml-2 font-normal text-ink-soft">
                        {selected.length} / {MAX_DISHES} selon votre formule
                      </span>
                    </p>

                    <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {dishes.map((dish) => (
                        <DishRow
                          key={dish.id}
                          dish={dish}
                          selected={selected.includes(dish.id)}
                          disabled={full && !selected.includes(dish.id)}
                          onToggle={() => toggle(dish.id)}
                        />
                      ))}
                    </ul>
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
                      avec {menu.chefName}
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
 */
function ChefPanel({ menu }: { menu: WeekMenu }) {
  const facts: { icon: typeof MapPin; label: string; value: string }[] = [
    { icon: MapPin, label: 'Se déplace', value: `${menu.city} et ${menu.radiusKm} km autour` },
    {
      icon: ShoppingBasket,
      label: 'Courses',
      value: menu.shoppingIncluded
        ? menu.shoppingFee > 0
          ? `Faites pour vous · ${menu.shoppingFee} €`
          : 'Incluses dans le tarif'
        : 'À votre charge',
    },
    {
      icon: CreditCard,
      label: 'Paiement',
      value: menu.acceptedPayments.map((m) => PAYMENT_LABEL[m]).join(' · '),
    },
    {
      icon: Clock,
      label: 'Répond en',
      value: menu.responseHours <= 1 ? 'moins d’une heure' : `${menu.responseHours} h en moyenne`,
    },
    {
      icon: CalendarCheck,
      label: 'Cette semaine',
      value: `${menu.spotsLeft} créneau${menu.spotsLeft > 1 ? 'x' : ''} libre${menu.spotsLeft > 1 ? 's' : ''}`,
    },
  ]

  return (
    <div className="rounded-3xl bg-paper p-5 lg:sticky lg:top-0">
      <p className="font-display text-xl font-bold leading-tight text-navy">{menu.chefName}</p>
      <p className="mt-1 text-[13px] text-ink-mid">
        Batch cooker depuis {menu.since} · {menu.sessionsDone} sessions
        {menu.newcomer && <span className="text-terra"> · nouveau sur Lab’s Food</span>}
      </p>

      <p className="mt-3 flex items-center gap-1.5 text-sm">
        <Star className="h-4 w-4 fill-amber text-amber" aria-hidden />
        <span className="font-semibold tabular-nums text-navy">{menu.rating}/5</span>
        <span className="text-ink-soft">({menu.reviewCount} avis)</span>
      </p>

      <blockquote className="mt-4 font-display text-[15px] font-semibold leading-relaxed text-navy">
        <span aria-hidden className="text-terra">
          «{' '}
        </span>
        {menu.signature}
        <span aria-hidden className="text-terra"> »</span>
      </blockquote>

      <dl className="mt-5 space-y-2.5 border-t border-[rgba(31,42,55,0.08)] pt-4 text-[13px]">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-2">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
            <dt className="shrink-0 text-ink-soft">{label}&nbsp;:</dt>
            <dd className="text-navy">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          <ChefHat className="h-3.5 w-3.5 text-amber" aria-hidden /> Sa cuisine
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {menu.specialties.map((sp) => (
            <li key={sp} className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-navy">
              {sp}
            </li>
          ))}
        </ul>

        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
          <Languages className="h-3.5 w-3.5 text-amber" aria-hidden />
          {menu.languages.join(', ')}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
          <ShieldCheck className="h-3.5 w-3.5 text-amber" aria-hidden />
          {menu.badges.join(', ')}
        </p>
      </div>

      {menu.reviews.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-[rgba(31,42,55,0.08)] pt-4">
          {menu.reviews.map((r) => (
            <figure key={r.author}>
              <blockquote className="text-[13px] leading-relaxed text-ink-mid">{r.text}</blockquote>
              <figcaption className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-soft">
                <span className="font-semibold text-navy">{r.author}</span>
                <span aria-hidden className="inline-flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber text-amber" />
                  {r.rating}
                </span>
                <span className="sr-only">{r.rating} sur 5</span>
                <span>· il y a {r.monthsAgo} mois</span>
              </figcaption>
            </figure>
          ))}
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
}: {
  dish: Meal
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dish.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="font-display text-base font-bold leading-tight text-navy">{dish.name}</span>
            <span
              aria-hidden
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                selected ? 'bg-terra text-white' : 'bg-cream-soft text-navy'
              }`}
            >
              {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" />}
            </span>
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-ink-mid">
            {dish.description}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ink-soft">{dish.portions}</span>
            {dish.dietaryTags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-cream-soft px-2 py-0.5 text-[10px] capitalize text-navy">
                {tag}
              </span>
            ))}
            {dish.allergens.length > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-700">
                {dish.allergens.join(', ')}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}
