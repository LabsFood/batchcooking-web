'use client'

import { motion } from 'framer-motion'
import { CalendarCheck, ChefHat, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { fadeUpInView } from '@/lib/motion'

const STEPS = [
  {
    number: '01',
    Icon: UtensilsCrossed,
    title: 'Choisissez vos repas',
    description:
      'Parcourez le menu de votre batch cooker et sélectionnez ce qui vous donne envie.',
  },
  {
    number: '02',
    Icon: CalendarCheck,
    title: 'Réservez votre session',
    description:
      'Choisissez la date, le créneau',
  },
  {
    number: '03',
    Icon: ShoppingBag,
    title: 'Recevez la liste de courses',
    description:
      'Vous recevez la liste de courses, classée par rayons.',
  },
  {
    number: '04',
    Icon: ChefHat,
    title: 'Un chef cuisine chez vous',
    description:
      'Le jour J, un cuisinier arrive et prépare vos plats en 2 à 3 heures. La cuisine repart propre, le frigo plein.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding section-cream-soft relative overflow-hidden">
      <div className="container-xl">
        {/* Header */}
        {/* slow-out : l'en-tête se pose en 240 ms */}
        <motion.div {...fadeUpInView()} className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="h-section">Comment ça fonctionne ?</h2>
          <p className="text-ink-mid mt-6 leading-relaxed">
            Un service pensé pour simplifier votre quotidien. De la sélection des recettes
            à la dégustation, en 4 étapes simples.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {STEPS.map((step, i) => (
            // slow-out : chaque étape se pose en 240 ms, décalée de 80 ms
            <motion.div
              key={step.number}
              {...fadeUpInView(i * 0.08)}
              className="relative bg-paper rounded-2xl p-7 border border-[rgba(31,26,20,0.06)]"
            >
              <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center rounded-full bg-cream-soft text-navy">
                <step.Icon className="h-7 w-7" aria-hidden />
                <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-navy text-white text-xs font-semibold tabular-nums flex items-center justify-center">
                  {step.number}
                </span>
              </div>

              <h3 className="font-display text-md font-semibold text-navy text-center mb-3">
                {step.title}
              </h3>
              <p className="text-ink-mid text-sm leading-relaxed text-center">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
