'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Check,
  ChefHat,
  Clock,
  CreditCard,
  Lock,
  MapPin,
  ShoppingBasket,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  MenuCard,
  MenuDialog,
  MenuFilterBar,
  NoMenus,
  useMenuFilters,
} from '@/components/menu/ChefMenuBrowser'
import { WEEK_MENUS, dishesOf, weekLabel, type WeekMenu } from '@/lib/week-menus'

const STEPS = [
  { id: 'chef',      label: 'Chef',      Icon: ChefHat },
  { id: 'infos',     label: 'Infos',     Icon: CalendarRange },
  { id: 'paiement',  label: 'Paiement',  Icon: CreditCard },
  { id: 'succes',    label: 'Confirmé',  Icon: Check },
] as const
type StepId = typeof STEPS[number]['id']

const MIN_DISHES = 3

const SLOTS = ['9h00 – 11h00', '10h30 – 12h30', '14h00 – 16h00', '17h00 – 19h00']

const BASE_PRICE = 50

function ReservationFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuth()

  // La page publique et la carte d'un chef arrivent ici avec leur choix deja
  // fait : on reprend au bon endroit plutot que de le redemander.
  const initialMeals = (params.get('meals') || '').split(',').filter(Boolean)
  const initialChef = WEEK_MENUS.find((m) => m.chefId === params.get('chef')) ?? null

  const [chef, setChef] = useState<WeekMenu | null>(initialChef)
  const [step, setStep] = useState<StepId>(
    initialChef && initialMeals.length ? 'infos' : 'chef',
  )

  const filters = useMenuFilters()
  const [openMenu, setOpenMenu] = useState<WeekMenu | null>(null)
  const [today] = useState(() => new Date())

  // Step state
  const [selectedMeals, setSelectedMeals] = useState<string[]>(initialMeals)
  const [date, setDate] = useState<string>('')
  const [slot, setSlot] = useState<string>(SLOTS[0])
  const [persons, setPersons] = useState(3)
  const [extraMeals, setExtraMeals] = useState(0)
  const [withShopping, setWithShopping] = useState(false)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  // Payment state
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [reference, setReference] = useState<string>('')

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const meals = useMemo(
    () => (chef ? dishesOf(chef).filter((m) => selectedMeals.includes(m.id)) : []),
    [chef, selectedMeals],
  )

  // Le forfait est celui du chef : afficher un tarif de plateforme quand c'est
  // lui qui fixe son prix serait un mensonge sur le recapitulatif.
  const basePrice = chef?.sessionFrom ?? BASE_PRICE
  const shoppingFee = chef?.shoppingFee ?? 25
  const shoppingOffered = chef?.shoppingIncluded ?? true
  const extraPersons = Math.max(0, persons - 3)
  const total =
    basePrice + extraMeals * 8 + extraPersons * 15 + (withShopping ? shoppingFee : 0)
  const afterTax = Math.round(total / 2)

  /** Ouvrir une carte. Changer de chef repart de zéro : les plats cochés
      appartiennent à la carte précédente, pas à celle-ci. */
  const openCarte = (menu: WeekMenu) => {
    if (chef && menu.chefId !== chef.chefId) setSelectedMeals([])
    setOpenMenu(menu)
  }

  /** Retenir un chef depuis sa carte, avec les plats cochés dans la modale. */
  const chooseChef = (menu: WeekMenu, dishes: string[]) => {
    setChef(menu)
    setSelectedMeals(dishes)
    setWithShopping(menu.shoppingIncluded && menu.shoppingFee === 0)
    setOpenMenu(null)
    setStep('infos')
  }

  const next = () => {
    const order: StepId[] = ['chef', 'infos', 'paiement', 'succes']
    const i = order.indexOf(step)
    if (i < order.length - 1) setStep(order[i + 1])
  }
  const prev = () => {
    const order: StepId[] = ['chef', 'infos', 'paiement', 'succes']
    const i = order.indexOf(step)
    if (i > 0) setStep(order[i - 1])
  }

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentSubmitting(true)
    setTimeout(() => {
      const ref = `LF-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
      setReference(ref)
      setPaymentSubmitting(false)
      setStep('succes')
    }, 1100)
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]">
        <div className="relative grid grid-cols-4 gap-2">
          <div className="absolute left-0 right-0 top-4 h-px bg-[rgba(31,42,55,0.08)]" />
          <div
            className="absolute left-0 top-4 h-px bg-amber transition-all"
            style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((s, i) => {
            const reached = i <= stepIndex
            const current = i === stepIndex
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => i < stepIndex && setStep(s.id)}
                className="relative flex flex-col items-center text-center group disabled:cursor-not-allowed"
                disabled={i > stepIndex}
              >
                <span
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    reached
                      ? current
                        ? 'bg-amber text-navy ring-4 ring-amber/20'
                        : 'bg-amber text-navy'
                      : 'bg-cream-deep text-ink-soft'
                  }`}
                >
                  <s.Icon className="w-4 h-4" />
                </span>
                <p
                  className={`mt-2 text-[10px] uppercase tracking-[0.16em] font-semibold ${
                    reached ? 'text-navy' : 'text-ink-soft'
                  }`}
                >
                  {s.label}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'chef' && (
          <StepCard
            key="chef"
            title="Avec quel batch cooker ?"
            subtitle={`${weekLabel(today)} — chaque chef compose sa carte. Ouvrez celle qui vous parle, puis choisissez vos plats dedans.`}
          >
            <MenuFilterBar filters={filters} />

            <p className="mt-5 text-sm text-ink-mid" aria-live="polite">
              {filters.menus.length === 0
                ? 'Aucune carte ne correspond à votre recherche.'
                : `${filters.menus.length} chef${filters.menus.length > 1 ? 's' : ''} disponible${filters.menus.length > 1 ? 's' : ''} cette semaine`}
            </p>

            <div className="mt-4">
              {filters.menus.length === 0 ? (
                <NoMenus onReset={filters.reset}>
                  <Link href="/espace-client/personnalisation" className="btn btn-primary text-xs">
                    Faire une demande sur mesure
                    <ArrowRight className="icon-arrow h-3.5 w-3.5" />
                  </Link>
                </NoMenus>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {filters.menus.map((menu, i) => (
                    <MenuCard
                      key={menu.id}
                      menu={menu}
                      index={i}
                      onOpen={() => openCarte(menu)}
                      openLabel="Voir sa carte"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link
                href="/espace-client"
                className="inline-flex items-center gap-1.5 text-sm text-ink-mid hover:text-navy"
              >
                <ArrowLeft className="h-4 w-4" /> Retour au dashboard
              </Link>
              {chef && (
                <button onClick={() => setStep('infos')} className="btn btn-primary">
                  Continuer avec {chef.chefName.split(' ')[0]}
                  <ArrowRight className="h-4 w-4 icon-arrow" />
                </button>
              )}
            </div>
          </StepCard>
        )}

        {step === 'infos' && (
          <StepCard
            key="infos"
            title="Quand et où on cuisine ?"
            subtitle={
              chef
                ? `Date, créneau, adresse — ${chef.chefName} s'occupe du reste.`
                : 'Date, créneau, adresse — votre chef s\u2019occupe du reste.'
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="input-base"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </Field>
                  <Field label="Créneau">
                    <select value={slot} onChange={(e) => setSlot(e.target.value)} className="input-base">
                      {SLOTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Adresse">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="15 rue de la Paix, 06000 Nice"
                    className="input-base"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Stepper label="Adultes" Icon={Users} value={persons} setValue={setPersons} min={1} max={10} />
                  <Stepper label="Plats supp." Icon={ChefHat} value={extraMeals} setValue={setExtraMeals} min={0} max={10} />
                </div>

                <button
                  type="button"
                  onClick={() => shoppingOffered && setWithShopping((v) => !v)}
                  disabled={!shoppingOffered}
                  className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl transition-colors text-left ${
                    withShopping ? 'bg-amber-soft border border-amber/40' : 'bg-paper border border-[rgba(31,42,55,0.08)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      withShopping ? 'bg-amber text-navy' : 'bg-cream-deep text-ink-mid'
                    }`}>
                      <ShoppingBasket className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {shoppingOffered
                          ? `${chef ? chef.chefName.split(' ')[0] : 'Votre chef'} fait les courses`
                          : 'Courses à votre charge'}
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        {shoppingOffered
                          ? shoppingFee > 0
                            ? `+${shoppingFee}€ — les ingrédients sont là avant la session`
                            : 'Inclus dans son forfait'
                          : 'Ce batch cooker ne propose pas les courses'}
                      </p>
                    </div>
                  </div>
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    withShopping ? 'bg-amber border-amber text-navy' : 'border-[rgba(31,42,55,0.2)]'
                  }`}>
                    {withShopping && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                </button>

                <Field label="Notes pour le chef (optionnel)">
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allergies, goûts, codes d’entrée…"
                    className="input-base resize-none"
                  />
                </Field>
              </div>

              <SummaryCard
                chef={chef}
                meals={meals}
                date={date}
                slot={slot}
                persons={persons}
                extraMeals={extraMeals}
                withShopping={withShopping}
                shoppingFee={shoppingFee}
                basePrice={basePrice}
                total={total}
                afterTax={afterTax}
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => (chef ? openCarte(chef) : setStep('chef'))}
                className="text-sm text-ink-mid hover:text-navy inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Modifier les plats
              </button>
              <button
                onClick={next}
                disabled={!date || !address || selectedMeals.length < MIN_DISHES}
                className="btn btn-primary disabled:opacity-50"
              >
                {/* Un bouton gris sans raison est une impasse : il dit ce qui
                    manque, et « Modifier les plats » rouvre la carte du chef. */}
                {selectedMeals.length < MIN_DISHES
                  ? `Encore ${MIN_DISHES - selectedMeals.length} plat${MIN_DISHES - selectedMeals.length > 1 ? 's' : ''} minimum`
                  : !date
                    ? 'Choisissez une date'
                    : !address
                      ? 'Indiquez une adresse'
                      : 'Aller au paiement'}
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </button>
            </div>
          </StepCard>
        )}

        {step === 'paiement' && (
          <StepCard key="paiement" title="Paiement sécurisé" subtitle="Mock — aucune carte n'est débitée.">
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
              <form onSubmit={submitPayment} className="space-y-4">
                <Field label="Nom sur la carte">
                  <input defaultValue={user?.name} className="input-base" />
                </Field>
                <Field label="Numéro de carte">
                  <input placeholder="4242 4242 4242 4242" className="input-base font-mono" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiration">
                    <input placeholder="12/27" className="input-base font-mono" />
                  </Field>
                  <Field label="CVC">
                    <input placeholder="123" className="input-base font-mono" />
                  </Field>
                </div>

                <div className="flex items-start gap-2 text-xs text-ink-soft">
                  <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>Paiement chiffré — Stripe (mock pour cette démo).</p>
                </div>

                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="btn btn-primary w-full justify-center disabled:opacity-60"
                >
                  {paymentSubmitting ? 'Paiement…' : `Payer ${total} €`}
                  {!paymentSubmitting && <Wallet className="w-4 h-4" />}
                </button>
                <button type="button" onClick={prev} className="w-full text-xs text-ink-soft hover:text-navy">
                  ← Modifier les infos
                </button>
              </form>

              <SummaryCard
                chef={chef}
                meals={meals}
                date={date}
                slot={slot}
                persons={persons}
                extraMeals={extraMeals}
                withShopping={withShopping}
                shoppingFee={shoppingFee}
                basePrice={basePrice}
                total={total}
                afterTax={afterTax}
                address={address}
              />
            </div>
          </StepCard>
        )}

        {step === 'succes' && (
          <motion.div
            key="succes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-paper rounded-3xl p-8 lg:p-10 border border-[rgba(31,42,55,0.06)] text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex w-16 h-16 rounded-full bg-mint text-mint-ink items-center justify-center mb-5">
              <Check className="w-7 h-7" strokeWidth={3} />
            </div>
            <p className="eyebrow justify-center mb-2">Paiement confirmé</p>
            <h2 className="font-display text-3xl font-bold text-navy mb-3 leading-tight">
              C&apos;est parti, {user?.name?.split(' ')[0] || 'gourmand·e'} !
            </h2>
            <p className="text-ink-mid leading-relaxed mb-2">
              Ton chef te confirme la session par message dans les minutes qui viennent.
            </p>
            <p className="text-xs font-mono text-ink-soft mb-6">
              Référence : <span className="text-navy font-semibold">{reference}</span>
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/espace-client/commandes" className="btn btn-primary">
                Voir mes commandes
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </Link>
              <Link href="/espace-client" className="btn btn-outline">
                Retour au dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* La carte d'un chef : meme composant que sur le site public. Ici elle
          enchaine sur la suite de la reservation au lieu d'ouvrir la connexion. */}
      <MenuDialog
        menu={openMenu}
        onClose={() => setOpenMenu(null)}
        selected={selectedMeals}
        onSelectedChange={setSelectedMeals}
        renderAction={({ menu, selected }) => (
          <button
            type="button"
            onClick={() => chooseChef(menu, selected)}
            disabled={selected.length < MIN_DISHES}
            className="btn btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-55"
          >
            {selected.length < MIN_DISHES
              ? `Encore ${MIN_DISHES - selected.length} plat${MIN_DISHES - selected.length > 1 ? 's' : ''} minimum`
              : `Continuer avec ${menu.chefName.split(' ')[0]}`}
            <ArrowRight className="icon-arrow h-3.5 w-3.5" />
          </button>
        )}
      />
    </div>
  )
}

function StepCard({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-paper rounded-3xl p-6 lg:p-8 border border-[rgba(31,42,55,0.06)]"
    >
      <p className="eyebrow mb-2">Réservation</p>
      <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy leading-tight">
        {title}
      </h2>
      {subtitle && <p className="text-ink-mid text-sm mt-1.5">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </motion.section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">{label}</p>
      {children}
    </div>
  )
}

function Stepper({
  label,
  Icon,
  value,
  setValue,
  min,
  max,
}: {
  label: string
  Icon: any
  value: number
  setValue: (n: number) => void
  min: number
  max: number
}) {
  return (
    <div className="bg-paper border border-[rgba(31,42,55,0.08)] rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-mint/40 text-mint-ink flex items-center justify-center">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <p className="text-xs font-semibold text-navy">{label}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setValue(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-cream-soft hover:bg-amber text-navy font-bold"
        >
          –
        </button>
        <span className="font-display text-xl font-bold text-navy">{value}</span>
        <button
          type="button"
          onClick={() => setValue(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full bg-cream-soft hover:bg-amber text-navy font-bold"
        >
          +
        </button>
      </div>
    </div>
  )
}

function SummaryCard({
  chef,
  meals,
  date,
  slot,
  persons,
  extraMeals,
  withShopping,
  shoppingFee,
  basePrice,
  total,
  afterTax,
  address,
}: {
  chef: WeekMenu | null
  meals: { id: string; name: string }[]
  date: string
  slot: string
  persons: number
  extraMeals: number
  withShopping: boolean
  shoppingFee: number
  basePrice: number
  total: number
  afterTax: number
  address?: string
}) {
  const dateLabel = date
    ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—'

  return (
    <aside className="bg-navy text-white rounded-3xl p-5 lg:p-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber/25 blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-amber mb-3 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Récap
        </p>

        <ul className="space-y-2 text-sm">
          {chef && <Line Icon={ChefHat} label={chef.chefName} sub={`${chef.title} · ${chef.city}`} />}
          <Line Icon={Sparkles} label={`${meals.length} plat${meals.length > 1 ? 's' : ''}`} sub={meals.map((m) => m.name).join(', ') || '—'} />
          <Line Icon={CalendarRange} label={dateLabel} sub={slot} />
          <Line Icon={Users} label={`${persons} personne${persons > 1 ? 's' : ''}`} sub={extraMeals ? `+${extraMeals} plats supp.` : 'Forfait standard'} />
          {address && <Line Icon={MapPin} label="Adresse" sub={address} />}
          <Line
            Icon={ShoppingBasket}
            label="Courses"
            sub={withShopping ? `Faites par ${chef ? chef.chefName.split(' ')[0] : 'le chef'}` : 'À votre charge'}
          />
        </ul>

        <div className="mt-5 pt-5 border-t border-white/10 space-y-1.5">
          <Row label="Forfait du chef" value={`${basePrice}€`} />
          {extraMeals > 0 && <Row label={`+ ${extraMeals} plats`} value={`${extraMeals * 8}€`} />}
          {persons > 3 && <Row label={`+ ${persons - 3} pers.`} value={`${(persons - 3) * 15}€`} />}
          {withShopping && shoppingFee > 0 && <Row label="Courses" value={`${shoppingFee}€`} />}
          <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/55">Total TTC</span>
            <span className="font-display text-3xl font-bold">{total} €</span>
          </div>
          <p className="text-[11px] text-amber font-semibold text-right">
            soit {afterTax}€ après crédit d&apos;impôt
          </p>
        </div>
      </div>
    </aside>
  )
}

function Line({ Icon, label, sub }: { Icon: any; label: string; sub: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-white/5 text-amber flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-[11px] text-white/55 leading-snug truncate">{sub}</p>
      </div>
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs text-white/65">
      <span>{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  )
}

export default function ReservationPage() {
  return (
    <Suspense fallback={null}>
      <ReservationFlow />
    </Suspense>
  )
}
