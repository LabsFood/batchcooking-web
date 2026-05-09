'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  WhiskingBowl,
  CalendarCheck,
  SteamingPot,
  ShoppingBag,
} from '@/components/shared/CookingAnimations'

const STEPS = [
  {
    number: '01',
    Anim: WhiskingBowl,
    title: 'Choisissez vos recettes',
    description:
      'Parcourez le menu de la semaine et sélectionnez à partir de 3 plats parmi nos recettes du monde.',
  },
  {
    number: '02',
    Anim: ShoppingBag,
    title: 'Recevez la liste de courses',
    description:
      'Vous recevez la liste d\'ingrédients précise au moins 3 jours avant — bio, producteurs locaux, vous gardez la main.',
  },
  {
    number: '03',
    Anim: CalendarCheck,
    title: 'Réservez votre session',
    description:
      'Choisissez la date, le créneau et l\'option courses. Validation et paiement en quelques clics.',
  },
  {
    number: '04',
    Anim: SteamingPot,
    title: 'Ivy cuisine chez vous',
    description:
      'Le jour J, Ivy arrive et prépare vos plats en 2 à 3 heures. La cuisine repart propre, le frigo plein.',
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
          initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
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
            const Anim = step.Anim
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40, filter: 'blur(8px)', scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.15 }}
                className="relative bg-paper rounded-2xl p-7 border border-[rgba(31,26,20,0.06)] hover:shadow-[0_24px_60px_-20px_rgba(31,26,20,0.18)] transition-shadow duration-500 hover:-translate-y-1 transform"
              >
                {/* Animated cooking icon */}
                <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-cream-soft" />
                  <Anim size={88} className="relative z-10" />
                  <span className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-navy text-white text-[10px] font-mono font-semibold flex items-center justify-center z-20">
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
