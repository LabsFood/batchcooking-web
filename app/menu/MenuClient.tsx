'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowRight,
  Check,
  ChefHat,
  Languages,
  MapPin,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react'
import type { Meal } from '@/types'
import ReserveButton from '@/components/shared/ReserveButton'
import EquipmentSection from '@/components/shared/EquipmentSection'
import {
  DIET_FILTERS,
  REGIONS_ON_SHOW,
  WEEK_MENUS,
  dietsOf,
  dishesOf,
  weekLabel,
  type WeekMenu,
} from '@/lib/week-menus'

/* ─────────────────────────────────────────────────────────────────────────────
   Menus de la semaine.

   Le client ne choisit plus des plats dans un catalogue anonyme : il choisit
   d'abord un batch cooker et sa carte de la semaine. La page se lit donc par
   chef — une carte par chef, ses plats en aperçu — et la sélection des plats
   se fait à l'intérieur du menu retenu.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_DISHES = 7
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function MenuClient() {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const [diets, setDiets] = useState<string[]>([])
  const [shoppingOnly, setShoppingOnly] = useState(false)
  const [open, setOpen] = useState<WeekMenu | null>(null)
  // La date n'est lue qu'au montage : le rendu reste pur.
  const [today] = useState(() => new Date())

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

  const toggleDiet = (d: string) =>
    setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  const totalDishes = WEEK_MENUS.reduce((n, m) => n + m.dishIds.length, 0)

  return (
    <div className="page-transition min-h-screen bg-cream pt-24">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy py-20 text-white lg:py-24">
        <div className="container-xl relative">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-amber">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {weekLabel(today)}
          </p>
          <h1
            className="mb-5 font-display font-bold leading-none text-white"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Les menus de <span className="font-medium italic text-terra">vos chefs.</span>
          </h1>
          <p className="max-w-xl leading-relaxed text-white/70">
            Chaque batch cooker compose sa carte de la semaine. Choisissez celui dont la cuisine vous parle, puis les
            plats que vous voulez retrouver dans votre frigo.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <Stat value={String(WEEK_MENUS.length)} label={`chef${WEEK_MENUS.length > 1 ? 's' : ''} cette semaine`} />
            <Stat value={String(totalDishes)} label="plats proposés" />
            <Stat value="2 h" label="chez vous, une seule session" />
          </dl>
        </div>
      </section>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <section className="sticky top-20 z-30 border-b border-[rgba(31,42,55,0.08)] bg-cream/95 backdrop-blur">
        <div className="container-xl flex flex-wrap items-center gap-3 py-4">
          <div className="flex w-full items-center gap-2 sm:flex-1">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
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
              onClick={() => setShoppingOnly((v) => !v)}
              aria-pressed={shoppingOnly}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                shoppingOnly ? 'bg-navy text-white' : 'bg-paper text-ink-mid hover:text-navy'
              }`}
            >
              <ShoppingBasket className="h-3.5 w-3.5" aria-hidden /> Courses incluses
            </button>
          </div>
        </div>
      </section>

      {/* ── Menus ────────────────────────────────────────────────────────── */}
      <section className="py-14 lg:py-16">
        <div className="container-xl">
          <p className="mb-6 text-sm text-ink-mid" aria-live="polite">
            {menus.length === 0
              ? 'Aucun menu ne correspond à votre recherche.'
              : `${menus.length} menu${menus.length > 1 ? 's' : ''} cette semaine`}
          </p>

          {menus.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(31,42,55,0.18)] bg-paper px-6 py-14 text-center">
              <ChefHat className="mx-auto mb-4 h-8 w-8 text-ink-soft" aria-hidden />
              <h2 className="font-display text-xl font-bold text-navy">Rien ne correspond, pour l’instant</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-mid">
                Élargissez vos critères, ou décrivez-nous ce que vous cherchez : un chef vous fera une proposition sur
                mesure.
              </p>
              <button
                onClick={() => {
                  setQuery('')
                  setRegion('all')
                  setDiets([])
                  setShoppingOnly(false)
                }}
                className="btn btn-outline mt-6 text-xs"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {menus.map((menu, i) => (
                <MenuCard key={menu.id} menu={menu} index={i} onOpen={() => setOpen(menu)} />
              ))}
            </div>
          )}

          {/* Demande sur-mesure */}
          <div className="mt-16 rounded-2xl border-2 border-dashed border-[rgba(217,105,65,0.3)] bg-paper p-10 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(217,105,65,0.1)]">
              <ChefHat className="h-7 w-7 text-terra" aria-hidden />
            </span>
            <h2 className="mb-3 font-display text-2xl font-bold text-navy">Aucune carte ne vous ressemble ?</h2>
            <p className="mx-auto mb-6 max-w-md leading-relaxed text-ink-mid">
              Décrivez vos envies, vos allergies et votre budget : les batch cookers disponibles vous répondent avec
              une proposition chiffrée.
            </p>
            <ReserveButton href="/espace-client/personnalisation">
              Faire une demande sur mesure
              <ArrowRight className="icon-arrow h-4 w-4" />
            </ReserveButton>
          </div>
        </div>
      </section>

      <EquipmentSection variant="paper" compact />

      <MenuDialog menu={open} onClose={() => setOpen(null)} />
    </div>
  )
}

// ── Carte d'un menu ─────────────────────────────────────────────────────────

function MenuCard({ menu, index, onOpen }: { menu: WeekMenu; index: number; onOpen: () => void }) {
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
        <h3 className="font-display text-xl font-bold leading-tight tracking-[-0.01em] text-navy">{menu.title}</h3>
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
          <span key={d} className="rounded-full bg-mint/60 px-2.5 py-1 text-[11px] font-medium capitalize text-mint-ink">
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
          <button onClick={onOpen} className="btn btn-primary px-5 py-2.5 text-xs">
            Voir la carte
          </button>
        </div>
      </footer>
    </motion.article>
  )
}

// ── Détail d'un menu ────────────────────────────────────────────────────────

function MenuDialog({ menu, onClose }: { menu: WeekMenu | null; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([])

  const dishes = menu ? dishesOf(menu) : []
  const full = selected.length >= MAX_DISHES

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_DISHES ? [...prev, id] : prev,
    )

  return (
    <Dialog.Root
      open={Boolean(menu)}
      onOpenChange={(v) => {
        if (!v) {
          onClose()
          setSelected([])
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
                <p className="mb-5 max-w-[62ch] text-sm leading-relaxed text-ink-mid">{menu.pitch}</p>

                <p className="mb-3 text-sm font-semibold text-navy">
                  Choisissez vos plats
                  <span className="ml-2 font-normal text-ink-soft">
                    {selected.length} / {MAX_DISHES} selon votre formule
                  </span>
                </p>

                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(31,42,55,0.08)] bg-paper px-5 py-4 sm:px-7">
                <p className="text-sm text-ink-mid">
                  {selected.length === 0 ? (
                    'Sélectionnez au moins un plat pour réserver.'
                  ) : (
                    <>
                      <span className="font-semibold text-navy">{selected.length} plat{selected.length > 1 ? 's' : ''}</span>{' '}
                      avec {menu.chefName}
                    </>
                  )}
                </p>
                <ReserveButton meals={selected.join(',')} className="text-xs" >
                  Réserver cette session
                  <ArrowRight className="icon-arrow h-3.5 w-3.5" />
                </ReserveButton>
              </footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-ink-mid">{dish.description}</span>
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display text-2xl font-bold text-amber">{value}</span>
        <span className="block text-xs text-white/60">{label}</span>
      </dd>
    </div>
  )
}
