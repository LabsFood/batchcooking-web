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
import { WEEKLY_MEALS } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'

const STEPS = [
  { id: 'plats',     label: 'Plats',     Icon: ChefHat },
  { id: 'infos',     label: 'Infos',     Icon: CalendarRange },
  { id: 'paiement',  label: 'Paiement',  Icon: CreditCard },
  { id: 'succes',    label: 'Confirmé',  Icon: Check },
] as const
type StepId = typeof STEPS[number]['id']

const SLOTS = ['9h00 – 11h00', '10h30 – 12h30', '14h00 – 16h00', '17h00 – 19h00']

const BASE_PRICE = 50

function ReservationFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuth()

  const initialMeals = (params.get('meals') || '').split(',').filter(Boolean)
  const [step, setStep] = useState<StepId>(initialMeals.length ? 'infos' : 'plats')

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
    () => WEEKLY_MEALS.filter((m) => selectedMeals.includes(m.id)),
    [selectedMeals],
  )
  const extraPersons = Math.max(0, persons - 3)
  const total = BASE_PRICE + extraMeals * 8 + extraPersons * 15 + (withShopping ? 25 : 0)
  const afterTax = Math.round(total / 2)

  const toggleMeal = (id: string) =>
    setSelectedMeals((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < 7 ? [...p, id] : p,
    )

  const next = () => {
    const order: StepId[] = ['plats', 'infos', 'paiement', 'succes']
    const i = order.indexOf(step)
    if (i < order.length - 1) setStep(order[i + 1])
  }
  const prev = () => {
    const order: StepId[] = ['plats', 'infos', 'paiement', 'succes']
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
        {step === 'plats' && (
          <StepCard
            key="plats"
            title="Choisis tes plats — entre 3 et 7"
            subtitle="Le menu est renouvelé chaque semaine. Le minimum pour passer à la liste de courses est de 3 plats."
          >
            {selectedMeals.length < 3 && (
              <div className="rounded-2xl border border-amber/40 bg-amber-soft/40 p-4 mb-4 text-sm text-navy">
                Sélectionne au moins <strong>3 plats</strong> pour passer à la liste de
                courses. Tu en as actuellement <strong>{selectedMeals.length}</strong>.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WEEKLY_MEALS.map((m) => {
                const on = selectedMeals.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMeal(m.id)}
                    className={`text-left rounded-2xl overflow-hidden border-2 transition-all ${
                      on ? 'border-amber shadow-[0_18px_36px_-16px_rgba(243,156,18,0.5)]' : 'border-[rgba(31,42,55,0.06)] hover:border-amber/40'
                    } bg-paper`}
                  >
                    <div className="relative aspect-[4/3]">
                      <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                      <span
                        className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center ${
                          on ? 'bg-amber text-navy' : 'bg-paper/85 text-navy'
                        }`}
                      >
                        {on ? <Check className="w-4 h-4" strokeWidth={3} /> : '+'}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-navy line-clamp-1">{m.name}</p>
                      <p className="text-[11px] text-ink-soft mt-0.5 line-clamp-2">{m.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link href="/espace-client" className="text-sm text-ink-mid hover:text-navy inline-flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Retour au dashboard
              </Link>
              <button
                onClick={next}
                disabled={selectedMeals.length < 3}
                className="btn btn-primary disabled:opacity-50"
              >
                {selectedMeals.length < 3
                  ? `Encore ${3 - selectedMeals.length} plat${3 - selectedMeals.length > 1 ? 's' : ''} minimum`
                  : `Continuer (${selectedMeals.length}/7)`}
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </button>
            </div>
          </StepCard>
        )}

        {step === 'infos' && (
          <StepCard key="infos" title="Quand & où on cuisine ?" subtitle="Date, créneau, adresse — ton chef gère le reste.">
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
                  onClick={() => setWithShopping((v) => !v)}
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
                      <p className="text-sm font-semibold text-navy">Lab&apos;s Food fait les courses</p>
                      <p className="text-[11px] text-ink-soft">+25€ — On livre les ingrédients avant la session</p>
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
                meals={meals}
                date={date}
                slot={slot}
                persons={persons}
                extraMeals={extraMeals}
                withShopping={withShopping}
                total={total}
                afterTax={afterTax}
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button onClick={prev} className="text-sm text-ink-mid hover:text-navy inline-flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Modifier les plats
              </button>
              <button
                onClick={next}
                disabled={!date || !address}
                className="btn btn-primary disabled:opacity-50"
              >
                Aller au paiement
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
                meals={meals}
                date={date}
                slot={slot}
                persons={persons}
                extraMeals={extraMeals}
                withShopping={withShopping}
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
  meals,
  date,
  slot,
  persons,
  extraMeals,
  withShopping,
  total,
  afterTax,
  address,
}: {
  meals: { id: string; name: string }[]
  date: string
  slot: string
  persons: number
  extraMeals: number
  withShopping: boolean
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
          <Line Icon={ChefHat} label={`${meals.length} plat${meals.length > 1 ? 's' : ''}`} sub={meals.map((m) => m.name).join(', ') || '—'} />
          <Line Icon={CalendarRange} label={dateLabel} sub={slot} />
          <Line Icon={Users} label={`${persons} personne${persons > 1 ? 's' : ''}`} sub={extraMeals ? `+${extraMeals} plats supp.` : 'Forfait standard'} />
          {address && <Line Icon={MapPin} label="Adresse" sub={address} />}
          <Line Icon={ShoppingBasket} label="Courses" sub={withShopping ? 'Gérées par Lab’s Food' : 'À votre charge'} />
        </ul>

        <div className="mt-5 pt-5 border-t border-white/10 space-y-1.5">
          <Row label="Forfait base" value="50€" />
          {extraMeals > 0 && <Row label={`+ ${extraMeals} plats`} value={`${extraMeals * 8}€`} />}
          {persons > 3 && <Row label={`+ ${persons - 3} pers.`} value={`${(persons - 3) * 15}€`} />}
          {withShopping && <Row label="Courses" value="25€" />}
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
