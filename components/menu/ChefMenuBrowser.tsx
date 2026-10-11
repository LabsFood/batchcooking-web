'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import {
  CalendarCheck,
  Check,
  ChefHat,
  Globe2,
  Languages,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Star,
  UtensilsCrossed,
  Users,
  X,
} from 'lucide-react'
import {
  euros,
  useChefPublic,
  useWeekMenus,
  type WeekCard,
  type WeekDish,
} from '@/lib/api/menus'
import { useDiets, useRegions } from '@/lib/api/referentials'
import { countryLabel } from '@/lib/chef/countries'

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

/* ── Filtres ───────────────────────────────────────────────────────────────── */

export interface MenuFilters {
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
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const [diets, setDiets] = useState<string[]>([])
  const [shoppingOnly, setShoppingOnly] = useState(false)

  const q = useWeekMenus({
    q: query || undefined,
    region: region === 'all' ? undefined : region,
    diets: diets.length > 0 ? diets : undefined,
    shoppingIncluded: shoppingOnly || undefined,
    limit: 40,
  })

  return {
    query,
    setQuery,
    region,
    setRegion,
    diets,
    toggleDiet: (d) =>
      setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])),
    shoppingOnly,
    setShoppingOnly,
    menus: q.data?.data ?? [],
    week: q.data?.week,
    isPending: q.isPending,
    isError: q.isError,
    refetch: () => q.refetch(),
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

/** Le squelette d'attente : trois cartes, à la place qu'elles occuperont. */
export function MenusLoading() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[26rem] animate-pulse rounded-2xl bg-paper" />
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
  children,
}: {
  onReset: () => void
  /** Aucun résultat après filtrage, ou aucun batch cooker du tout. */
  filtered?: boolean
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(31,42,55,0.18)] bg-paper px-6 py-14 text-center">
      <ChefHat className="mx-auto mb-4 h-8 w-8 text-ink-soft" aria-hidden />
      <h2 className="font-display text-xl font-bold text-navy">
        {filtered ? 'Rien ne correspond, pour l’instant' : 'Aucun batch cooker cette semaine'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-mid">
        {filtered
          ? 'Élargissez vos critères, ou décrivez-nous ce que vous cherchez : un chef vous fera une proposition sur mesure.'
          : 'Personne n’est encore en ligne sur cette semaine. Décrivez-nous ce que vous cherchez, nous reviendrons vers vous.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {filtered && (
          <button type="button" onClick={onReset} className="btn btn-outline text-xs">
            Réinitialiser les filtres
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
  dietLabel,
}: {
  menu: WeekCard
  index: number
  onOpen: () => void
  openLabel?: string
  /** Traduit un code de régime en libellé lisible. */
  dietLabel: (code: string) => string
}) {
  const preview = menu.dishes.slice(0, 3)
  const reste = menu.dishes.length - preview.length
  const prix = euros(menu.sessionFromCents)
  const apresCredit = euros(menu.afterTaxCreditCents)

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.24), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col overflow-hidden rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper transition-colors hover:border-[rgba(31,42,55,0.18)]"
    >
      {/* Le chef d'abord : c'est lui qu'on choisit. */}
      <header className="flex items-start gap-4 p-5 pb-4">
        <Avatar card={menu} className="h-14 w-14 text-lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="font-display text-lg font-bold leading-tight text-navy">
              {menu.chef.displayName}
            </h2>
            {menu.chef.newcomer && (
              <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-mint-ink">
                Nouveau
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
            className="rounded-full bg-mint/60 px-2.5 py-1 text-[11px] font-medium text-mint-ink"
          >
            Toute la carte {dietLabel(d).toLowerCase()}
          </span>
        ))}
        {menu.shoppingIncluded && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-[11px] font-medium text-navy">
            <ShoppingBasket className="h-3 w-3" aria-hidden /> Courses incluses
          </span>
        )}
        {menu.chef.languages.length > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cream-soft px-2.5 py-1 text-[11px] font-medium text-navy">
            <Languages className="h-3 w-3" aria-hidden /> {menu.chef.languages.join(', ')}
          </span>
        )}
      </div>

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(31,42,55,0.08)] px-5 py-4">
        <div>
          {prix ? (
            <>
              <p className="text-xs text-ink-soft">À partir de</p>
              <p className="font-display text-xl font-bold text-navy">
                {prix}
                {apresCredit && (
                  <span className="ml-1.5 text-xs font-medium text-terra">
                    soit {apresCredit} après crédit d’impôt
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="text-xs text-ink-soft">Tarif sur demande</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p
            className={`text-xs ${
              menu.slotsLeft != null && menu.slotsLeft <= 2
                ? 'font-semibold text-terra'
                : 'text-ink-soft'
            }`}
          >
            {placesLabel(menu.slotsLeft)}
          </p>
          <button type="button" onClick={onOpen} className="btn btn-primary px-5 py-2.5 text-xs">
            {openLabel}
          </button>
        </div>
      </footer>
    </motion.article>
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 top-10 z-50 flex flex-col overflow-hidden rounded-t-3xl bg-cream focus:outline-none sm:inset-6 sm:rounded-3xl lg:inset-x-[10%] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4">
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
        {card.chef.newcomer && <span className="text-terra"> · nouveau sur Lab’s Food</span>}
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
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
            <dt className="shrink-0 text-ink-soft">{label}&nbsp;:</dt>
            <dd className="min-w-0 text-navy">{value}</dd>
          </div>
        ))}
      </dl>

      {(card.chef.badges.length > 0 || card.chef.languages.length > 0) && (
        <div className="mt-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
          {card.chef.badges.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
              {card.chef.badges.join(', ')}
            </p>
          )}
          {card.chef.languages.length > 0 && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-mid">
              <Languages className="h-3.5 w-3.5 shrink-0 text-amber" aria-hidden />
              {card.chef.languages.join(', ')}
            </p>
          )}
        </div>
      )}

      {(chef?.menus?.length ?? 0) > 1 && (
        <div className="mt-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
            <Globe2 className="h-3.5 w-3.5 text-amber" aria-hidden /> Ses autres cartes
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
            {dish.diets.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-cream-soft px-2 py-0.5 text-[10px] text-navy"
              >
                {dietLabel(tag)}
              </span>
            ))}
            {/* L'allergène est une information de sécurité : on la montre
                telle quelle, et l'absence déclarée se dit aussi. */}
            {dish.allergens.length > 0 ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-700">
                {dish.allergens.join(', ')}
              </span>
            ) : dish.allergensNone ? (
              <span className="rounded-full bg-mint/60 px-2 py-0.5 text-[10px] text-mint-ink">
                Sans allergène déclaré
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  )
}
