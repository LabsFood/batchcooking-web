'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, AlertCircle, CreditCard, Calendar, ChefHat, UtensilsCrossed } from 'lucide-react'
import { PLANS, CHEFS } from '@/lib/mock-data'
import { formatPrice } from '@/lib/utils'
import type { PlanId } from '@/types'

type Step = 'formule' | 'chef' | 'date' | 'recap' | 'paiement' | 'confirmation'

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'formule', label: 'Formule', icon: UtensilsCrossed },
  { id: 'chef', label: 'Chef', icon: ChefHat },
  { id: 'date', label: 'Date', icon: Calendar },
  { id: 'recap', label: 'Résumé', icon: Check },
  { id: 'paiement', label: 'Paiement', icon: CreditCard },
]

const AVAILABLE_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00']
const AVAILABLE_DATES = [
  { date: '2026-05-03', label: 'Sam. 3 mai' },
  { date: '2026-05-09', label: 'Ven. 9 mai' },
  { date: '2026-05-10', label: 'Sam. 10 mai' },
  { date: '2026-05-16', label: 'Ven. 16 mai' },
  { date: '2026-05-17', label: 'Sam. 17 mai' },
  { date: '2026-05-23', label: 'Ven. 23 mai' },
]

const optionBase =
  'block w-full text-left rounded-2xl border-2 transition-all duration-300 cursor-pointer'
const optionInactive = 'border-[rgba(31,26,20,0.1)] bg-paper hover:border-[rgba(217,105,65,0.4)]'
const optionActive = 'border-terra bg-cream shadow-[0_0_0_4px_rgba(217,105,65,0.1)]'

const tilePill =
  'rounded-full border text-sm font-semibold transition-all py-3 px-4 text-center'
const tileInactive = 'border-[rgba(31,26,20,0.12)] text-ink-mid hover:border-terra hover:text-terra'
const tileActive = 'border-terra bg-terra text-white'

export default function ReservationPage() {
  const [currentStep, setCurrentStep] = useState<Step>('formule')
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const [selectedChef, setSelectedChef] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep)
  const plan = PLANS.find((p) => p.id === selectedPlan)
  const chef = CHEFS.find((c) => c.id === selectedChef)

  const nextStep = () => {
    const idx = STEPS.findIndex((s) => s.id === currentStep)
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].id)
  }

  const goToStep = (step: Step) => {
    const target = STEPS.findIndex((s) => s.id === step)
    if (target <= currentStepIndex) setCurrentStep(step)
  }

  const handleConfirm = () => {
    setConfirmed(true)
    setCurrentStep('confirmation')
  }

  if (confirmed) {
    return (
      <div className="page-transition pt-24 bg-cream min-h-screen flex items-center justify-center">
        <div className="container-xl py-20 text-center max-w-2xl">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-24 h-24 bg-terra rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_20px_50px_-15px_rgba(217,105,65,0.5)]"
          >
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <p className="eyebrow mb-4 justify-center">Réservation confirmée</p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-navy mb-5">
              Votre session est <span className="text-terra italic font-medium">réservée !</span>
            </h2>
            <p className="text-ink-mid max-w-md mx-auto leading-relaxed mb-8">
              Un email de confirmation a été envoyé avec votre récapitulatif. Votre liste de courses
              vous sera transmise dès validation du paiement.
            </p>
            <div className="bg-paper rounded-2xl p-6 border border-[rgba(31,26,20,0.06)] text-left mb-8">
              {plan && <p className="text-sm text-ink mb-2">✦ Formule <span className="text-terra font-semibold">{plan.name}</span></p>}
              {chef && <p className="text-sm text-ink mb-2">✦ Chef <span className="text-terra font-semibold">{chef.name}</span></p>}
              {selectedDate && (
                <p className="text-sm text-ink">
                  ✦ Le <span className="text-terra font-semibold">{AVAILABLE_DATES.find(d => d.date === selectedDate)?.label}</span>
                  {' '}à <span className="text-terra font-semibold">{selectedSlot}</span>
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-[rgba(31,26,20,0.08)]">
                <p className="text-xs text-ink-soft flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-terra" />
                  Annulation possible jusqu&apos;à 48h avant la session
                </p>
              </div>
            </div>
            <a href="/espace-client" className="btn-primary">
              Voir mes réservations
              <ChevronRight className="w-4 h-4 icon-arrow" />
            </a>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-transition pt-24 bg-cream min-h-screen">
      <div className="container-xl py-12 lg:py-16 max-w-5xl">
        {/* Page title */}
        <div className="mb-12">
          <p className="eyebrow mb-4">Réservation</p>
          <h1 className="font-display font-bold text-navy leading-none"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            Réserver ma <span className="text-terra italic font-medium">session.</span>
          </h1>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-12 overflow-x-auto pb-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const isDone = i < currentStepIndex
            const isActive = step.id === currentStep
            return (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => goToStep(step.id)}
                  disabled={i > currentStepIndex}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-semibold transition-all ${
                    isActive
                      ? 'border-terra bg-terra text-white'
                      : isDone
                        ? 'border-terra text-terra bg-[rgba(217,105,65,0.08)] cursor-pointer'
                        : 'border-[rgba(31,26,20,0.1)] text-ink-soft opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {step.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div className="w-6 h-px bg-[rgba(31,26,20,0.1)] mx-1 flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Formule ── */}
          {currentStep === 'formule' && (
            <motion.div key="formule"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>
              <h2 className="font-display text-2xl font-bold text-navy mb-6">Choisissez votre formule</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`${optionBase} p-6 ${selectedPlan === p.id ? optionActive : optionInactive}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="label-brand">{p.name}</p>
                      {selectedPlan === p.id && (
                        <span className="w-6 h-6 rounded-full bg-terra text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="font-display text-4xl font-bold text-navy mb-1 leading-none">
                      {formatPrice(p.price)}
                    </p>
                    <p className="text-terra text-sm mb-4">soit {formatPrice(p.priceAfterTax)} après crédit d&apos;impôt</p>
                    <div className="space-y-1.5 text-sm text-ink-mid">
                      <p>⏱ {p.duration}</p>
                      <p>🍽 {p.meals} plats</p>
                      <p>👥 {p.persons}</p>
                    </div>
                    {p.popular && (
                      <span className="mt-4 inline-block chip chip-amber">★ Le plus populaire</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={nextStep}
                disabled={!selectedPlan}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuer
                <ChevronRight className="w-4 h-4 icon-arrow" />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: Chef ── */}
          {currentStep === 'chef' && (
            <motion.div key="chef"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>
              <h2 className="font-display text-2xl font-bold text-navy mb-6">Choisissez votre chef</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                {CHEFS.filter((c) => c.available).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChef(c.id)}
                    className={`${optionBase} p-5 flex gap-4 items-center ${selectedChef === c.id ? optionActive : optionInactive}`}
                  >
                    <img src={c.avatar} alt={c.name}
                      className="w-16 h-16 rounded-full object-cover object-top flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-navy font-semibold">{c.name}</p>
                        {selectedChef === c.id && (
                          <span className="w-5 h-5 rounded-full bg-terra text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-terra text-xs font-semibold mb-1">{c.specialty}</p>
                      <div className="flex items-center gap-3 text-xs text-ink-mid">
                        <span>⭐ {c.rating}</span>
                        <span>📍 {c.city}</span>
                        <span>{formatPrice(c.pricePerSession)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={nextStep}
                disabled={!selectedChef}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuer
                <ChevronRight className="w-4 h-4 icon-arrow" />
              </button>
            </motion.div>
          )}

          {/* ── STEP 3: Date ── */}
          {currentStep === 'date' && (
            <motion.div key="date"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>
              <h2 className="font-display text-2xl font-bold text-navy mb-6">Choisissez votre créneau</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="label-muted mb-3">Date disponible</p>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_DATES.map((d) => (
                      <button
                        key={d.date}
                        onClick={() => setSelectedDate(d.date)}
                        className={`${tilePill} ${selectedDate === d.date ? tileActive : tileInactive}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="label-muted mb-3">Heure de début</p>
                  <div className="grid grid-cols-3 gap-2">
                    {AVAILABLE_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        disabled={!selectedDate}
                        className={`${tilePill} disabled:opacity-30 disabled:cursor-not-allowed ${selectedSlot === slot ? tileActive : tileInactive}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 mb-8 p-4 bg-paper rounded-xl border border-[rgba(31,26,20,0.06)] text-sm text-ink-mid">
                <AlertCircle className="w-4 h-4 text-terra flex-shrink-0 mt-0.5" />
                Le paiement est dû dans les 48h suivant la réservation. Annulation possible jusqu&apos;à 48h avant la session.
              </div>
              <button
                onClick={nextStep}
                disabled={!selectedDate || !selectedSlot}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuer
                <ChevronRight className="w-4 h-4 icon-arrow" />
              </button>
            </motion.div>
          )}

          {/* ── STEP 4: Recap ── */}
          {currentStep === 'recap' && (
            <motion.div key="recap"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>
              <h2 className="font-display text-2xl font-bold text-navy mb-6">Récapitulatif</h2>
              <div className="bg-paper rounded-2xl border border-[rgba(31,26,20,0.06)] p-6 lg:p-8 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: 'Formule',          value: plan?.name || '—' },
                    { label: 'Chef',             value: chef?.name || '—' },
                    { label: 'Date',             value: AVAILABLE_DATES.find(d => d.date === selectedDate)?.label || '—' },
                    { label: 'Heure',            value: selectedSlot || '—' },
                    { label: 'Durée estimée',    value: plan?.duration || '—' },
                    { label: 'Nombre de plats',  value: plan ? `${plan.meals} plats` : '—' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between border-b border-[rgba(31,26,20,0.06)] pb-3">
                      <span className="text-sm text-ink-mid">{item.label}</span>
                      <span className="text-sm text-navy font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-[rgba(31,26,20,0.1)] flex justify-between items-end">
                  <div>
                    <p className="text-sm text-ink-mid mb-1">Total à payer</p>
                    <p className="text-sm text-terra font-semibold">soit {formatPrice(plan?.priceAfterTax || 0)} après crédit d&apos;impôt 50%</p>
                  </div>
                  <p className="font-display text-4xl font-bold text-navy leading-none">
                    {formatPrice(plan?.price || 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(243,156,18,0.1)] border border-[rgba(243,156,18,0.3)] mb-8">
                <AlertCircle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                <p className="text-sm text-ink leading-relaxed">
                  <span className="font-semibold">Important :</span> Le paiement doit être effectué dans les 48h suivant cette réservation.
                  Passé ce délai, la réservation sera annulée.
                </p>
              </div>
              <button onClick={nextStep} className="btn-primary">
                Procéder au paiement
                <CreditCard className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ── STEP 5: Payment ── */}
          {currentStep === 'paiement' && (
            <motion.div key="paiement"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>
              <h2 className="font-display text-2xl font-bold text-navy mb-6">Paiement sécurisé</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <Field label="Titulaire de la carte">
                    <input type="text" placeholder="Prénom Nom" className="input-base" />
                  </Field>
                  <Field label="Numéro de carte">
                    <input type="text" placeholder="1234 5678 9012 3456" className="input-base" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiration">
                      <input type="text" placeholder="MM/AA" className="input-base" />
                    </Field>
                    <Field label="CVV">
                      <input type="text" placeholder="123" className="input-base" />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-sm text-ink-mid cursor-pointer">
                    <input type="checkbox" className="accent-terra w-4 h-4" />
                    J&apos;accepte les CGV et la politique de non-remboursement
                  </label>
                </div>
                {/* Order summary */}
                <div className="bg-paper rounded-2xl border border-[rgba(31,26,20,0.06)] p-6 h-fit">
                  <p className="label-brand mb-4">Récapitulatif</p>
                  <div className="space-y-2 text-sm text-ink-mid mb-4">
                    <div className="flex justify-between">
                      <span>Formule {plan?.name}</span>
                      <span className="text-navy font-semibold">{formatPrice(plan?.price || 0)}</span>
                    </div>
                    <div className="flex justify-between text-terra">
                      <span>Crédit d&apos;impôt (50%)</span>
                      <span>− {formatPrice((plan?.price || 0) / 2)}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[rgba(31,26,20,0.1)] flex justify-between items-center">
                    <span className="text-navy font-semibold">Coût réel</span>
                    <span className="font-display text-2xl font-bold text-terra">
                      {formatPrice(plan?.priceAfterTax || 0)}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={handleConfirm} className="btn-primary mt-8">
                Confirmer et payer {formatPrice(plan?.price || 0)}
                <CreditCard className="w-4 h-4" />
              </button>
              <p className="mt-4 text-xs text-ink-soft flex items-center gap-2">
                🔒 Paiement sécurisé par Stripe. Vos données bancaires ne sont jamais stockées.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-muted block mb-2">{label}</label>
      {children}
    </div>
  )
}
