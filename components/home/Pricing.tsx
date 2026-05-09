'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Check,
  ArrowRight,
  Clock,
  Users,
  Utensils,
  ShoppingBasket,
  Sparkles,
  Plus,
} from 'lucide-react'
import ReserveButton from '@/components/shared/ReserveButton'

const BASE_PRICE = 50
const BASE_INCLUDES = [
  '2 h chez vous, en une seule session',
  '3 repas pour la semaine',
  'Jusqu\'à 3 adultes',
  'Liste de menus optimisée chaque semaine',
  'Vous fournissez les ingrédients',
]

const ADD_ONS = [
  {
    Icon: Plus,
    title: 'Repas supplémentaires',
    text: 'Plus de 3 plats ? Tarif ajusté à la session.',
    badge: 'Sur-mesure',
  },
  {
    Icon: Sparkles,
    title: 'Recettes perso ou régime spécial',
    text: 'Sportif, post-partum, végé, sans gluten… on adapte.',
    badge: 'Inclus à étudier',
  },
  {
    Icon: ShoppingBasket,
    title: 'On fait les courses',
    text: 'Option : on s\'occupe des courses et on livre.',
    badge: 'En option',
  },
]

export default function Pricing() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [persons, setPersons] = useState(3)
  const [extraMeals, setExtraMeals] = useState(0)
  const [withShopping, setWithShopping] = useState(false)

  // Indicative pricing — base + ~8€/repas suppl. + ~15€/pers > 3 + 25€ courses
  const extraPersons = Math.max(0, persons - 3)
  const estimate = BASE_PRICE + extraMeals * 8 + extraPersons * 15 + (withShopping ? 25 : 0)
  const afterTax = Math.round(estimate / 2)

  return (
    <section id="pricing" className="section-padding section-paper relative overflow-hidden">
      <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-amber/5 blur-3xl pointer-events-none" />
      <div className="container-xl relative" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="eyebrow mb-5 justify-center">Service Batch Cooking</p>
          <h2 className="h-section">
            Un forfait de base, le reste <span className="accent">à votre image.</span>
          </h2>
          <p className="text-ink-mid mt-5 leading-relaxed">
            Marre de cuisiner tous les soirs après le travail ? En 2&nbsp;h chez vous, on prépare 3 repas pour
            la semaine. Vous fournissez les ingrédients ou on s&apos;en charge — c&apos;est vous qui choisissez.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-6 max-w-6xl mx-auto items-start">
          {/* Base card */}
          <motion.div
            initial={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl bg-navy text-white p-7 lg:p-9 overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full bg-mint/15 blur-3xl pointer-events-none" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/20 text-amber text-[10px] font-mono uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3" /> Forfait de base
              </span>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-7xl lg:text-8xl font-bold leading-none">
                  {BASE_PRICE}€
                </span>
                <span className="text-white/60 text-sm">la session</span>
              </div>
              <p className="text-amber font-semibold mt-2 text-sm">
                soit {BASE_PRICE / 2}€ après crédit d&apos;impôt SAP (-50%)
              </p>

              <ul className="mt-7 space-y-3">
                {BASE_INCLUDES.map((f, i) => {
                  const isShopping = f.toLowerCase().includes('ingrédients')
                  return (
                    <motion.li
                      key={f}
                      initial={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                      whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                      className="flex items-start gap-3"
                    >
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                          isShopping ? 'bg-mint/20 text-mint-deep' : 'bg-amber/20 text-amber'
                        }`}
                      >
                        {isShopping ? <ShoppingBasket className="w-3 h-3" /> : <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                      <span className="text-sm text-white/85 leading-relaxed">{f}</span>
                    </motion.li>
                  )
                })}
              </ul>

              <ReserveButton variant="amber" className="mt-8 text-xs">
                Réserver une session
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </ReserveButton>
            </div>
          </motion.div>

          {/* Estimator + add-ons */}
          <motion.div
            initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Estimator */}
            <div className="rounded-3xl bg-cream-soft border border-[rgba(31,42,55,0.06)] p-6">
              <p className="eyebrow mb-3">Estimation indicative</p>
              <h3 className="font-display text-xl font-bold text-navy mb-5">
                Ajustez à votre foyer.
              </h3>

              <div className="space-y-4">
                <Stepper label="Adultes" value={persons} setValue={setPersons} min={1} max={10} />
                <Stepper label="Repas supplémentaires" value={extraMeals} setValue={setExtraMeals} min={0} max={10} />

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
                      <p className="text-sm font-semibold text-navy">On s&apos;occupe des courses</p>
                      <p className="text-[11px] text-ink-soft">Liste, achats & livraison</p>
                    </div>
                  </div>
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    withShopping ? 'bg-amber border-amber text-navy' : 'border-[rgba(31,42,55,0.2)]'
                  }`}>
                    {withShopping && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                </button>
              </div>

              <div className="mt-6 flex items-end justify-between p-4 rounded-2xl bg-navy text-white">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-amber">Estimation</p>
                  <p className="font-display text-3xl font-bold mt-1 leading-none">~ {estimate}€</p>
                  <p className="text-[11px] text-white/55 mt-1">
                    soit ~{afterTax}€ après crédit d&apos;impôt
                  </p>
                </div>
                <span className="text-[10px] text-white/50 max-w-[150px] text-right leading-tight">
                  Estimation, devis final confirmé par Ivy
                </span>
              </div>
            </div>

            {/* Add-ons */}
            <div className="space-y-2">
              {ADD_ONS.map((a, i) => (
                <motion.div
                  key={a.title}
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                  className="flex items-start gap-3 bg-paper rounded-2xl p-4 border border-[rgba(31,42,55,0.06)]"
                >
                  <span className="w-9 h-9 rounded-xl bg-amber-soft text-amber-deep flex items-center justify-center flex-shrink-0">
                    <a.Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-navy">{a.title}</p>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-mono px-2 py-0.5 rounded-full bg-cream-soft text-ink-mid">
                        {a.badge}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">{a.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-ink-soft mt-10 max-w-3xl mx-auto leading-relaxed">
          * Tarifs indicatifs en mode démo — Ivy confirme le devis exact avant la session.
          Crédit d&apos;impôt applicable aux personnes fiscalement domiciliées en France, sous conditions.
          Lab&apos;s Food est agréé Service à la Personne.
        </p>
      </div>
    </section>
  )
}

function Stepper({
  label,
  value,
  setValue,
  min,
  max,
}: {
  label: string
  value: number
  setValue: (n: number) => void
  min: number
  max: number
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-2.5 rounded-2xl bg-paper border border-[rgba(31,42,55,0.08)]">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-mint/40 text-mint-ink flex items-center justify-center">
          {label === 'Adultes' ? <Users className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
        </span>
        <div>
          <p className="text-sm font-semibold text-navy">{label}</p>
          <p className="text-[10px] text-ink-soft uppercase tracking-[0.14em]">
            {label === 'Adultes' ? 'Le forfait couvre 3 adultes' : 'Au-delà de 3 plats / semaine'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setValue(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-cream-soft text-navy font-bold flex items-center justify-center hover:bg-amber hover:text-navy transition-colors"
        >
          –
        </button>
        <span className="font-display text-lg font-bold text-navy w-6 text-center">{value}</span>
        <button
          type="button"
          onClick={() => setValue(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full bg-cream-soft text-navy font-bold flex items-center justify-center hover:bg-amber hover:text-navy transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}
