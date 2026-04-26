'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { Check, ArrowRight, Clock, Users, Utensils } from 'lucide-react'
import { PLANS } from '@/lib/mock-data'
import { formatPrice } from '@/lib/utils'

export default function Pricing() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="pricing" className="section-padding section-paper relative overflow-hidden">
      <div className="container-xl" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="eyebrow mb-5 justify-center">Nos formules</p>
          <h2 className="h-section">
            Choisissez votre <span className="accent">expérience.</span>
          </h2>
          <p className="text-ink-mid mt-5 leading-relaxed">
            Tous nos tarifs incluent le déplacement du chef et la préparation complète.
            Bénéficiez du crédit d&apos;impôt SAP de 50%.
          </p>
        </motion.div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
              className={`relative flex ${plan.popular ? 'md:-mt-6' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="chip chip-amber px-4 py-1.5 shadow-md whitespace-nowrap">
                    ★ Le plus populaire
                  </span>
                </div>
              )}

              <div
                className={`flex flex-col w-full p-8 lg:p-10 rounded-2xl border-2 transition-all duration-300 ${
                  plan.popular
                    ? 'border-terra bg-cream shadow-[0_30px_60px_-25px_rgba(217,105,65,0.4)]'
                    : 'border-[rgba(31,26,20,0.08)] bg-paper hover:border-[rgba(217,105,65,0.4)]'
                }`}
              >
                {/* Header */}
                <div className="mb-6">
                  <h3 className="font-display text-2xl font-bold text-navy mb-2">{plan.name}</h3>
                  <p className="text-ink-mid text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-7 pb-7 border-b border-[rgba(31,26,20,0.08)]">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-display text-5xl lg:text-6xl font-bold text-navy leading-none">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-ink-soft text-sm">TTC</span>
                  </div>
                  <p className="text-terra text-sm font-semibold mt-2">
                    soit {formatPrice(plan.priceAfterTax)} après crédit d&apos;impôt
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 text-xs text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-terra" /> {plan.duration}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-terra" /> {plan.meals} plats
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-terra" /> {plan.persons}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[rgba(217,105,65,0.12)] flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-terra" strokeWidth={3} />
                      </span>
                      <span className="text-sm text-ink-mid leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={`/reservation?plan=${plan.id}`}
                  className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline'} w-full justify-center`}
                >
                  Choisir {plan.name}
                  <ArrowRight className="w-4 h-4 icon-arrow" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-ink-soft mt-12 max-w-3xl mx-auto">
          * Crédit d&apos;impôt applicable aux personnes fiscalement domiciliées en France, sous conditions.
          Lab&apos;s Food est agréé Service à la Personne. Attestation fiscale fournie annuellement.
        </p>
      </div>
    </section>
  )
}
