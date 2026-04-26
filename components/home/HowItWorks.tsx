'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ShoppingCart, CalendarCheck, ChefHat, Utensils } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: Utensils,
    title: 'Choisissez vos recettes',
    description:
      'Parcourez notre menu hebdomadaire et sélectionnez jusqu\'à 7 plats parmi notre catalogue de recettes du monde.',
  },
  {
    number: '02',
    icon: CalendarCheck,
    title: 'Réservez votre session',
    description:
      'Choisissez votre formule, sélectionnez votre chef selon votre région et réservez un créneau.',
  },
  {
    number: '03',
    icon: ChefHat,
    title: 'Le chef cuisine chez vous',
    description:
      'Le jour J, votre chef professionnel arrive et prépare tous vos plats en 2 à 4 heures dans votre cuisine.',
  },
  {
    number: '04',
    icon: ShoppingCart,
    title: 'Profitez toute la semaine',
    description:
      'Recevez votre liste de courses optimisée et savourez des repas sains, prêts à servir.',
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="how-it-works" className="section-padding section-cream-soft relative overflow-hidden">
      <div className="container-xl" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <p className="eyebrow mb-5 justify-center">Le processus</p>
          <h2 className="h-section">
            Comment ça <span className="accent">fonctionne ?</span>
          </h2>
          <p className="text-ink-mid mt-6 leading-relaxed">
            Un service pensé pour simplifier votre quotidien. De la sélection des recettes
            à la dégustation, en 4 étapes simples.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-px border-t-2 border-dashed border-[rgba(217,105,65,0.3)] -z-0" />

          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                className="relative bg-paper rounded-2xl p-7 border border-[rgba(31,26,20,0.06)] hover:shadow-[0_24px_60px_-20px_rgba(31,26,20,0.18)] transition-shadow duration-500"
              >
                {/* Number circle */}
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full bg-cream-deep" />
                  <div className="absolute inset-2 rounded-full bg-paper border-2 border-terra flex items-center justify-center">
                    <Icon className="w-6 h-6 text-terra" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-navy text-white text-[10px] font-mono font-semibold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>

                <h3 className="font-display text-xl font-bold text-navy text-center mb-3">
                  {step.title}
                </h3>
                <p className="text-ink-mid text-sm leading-relaxed text-center">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
