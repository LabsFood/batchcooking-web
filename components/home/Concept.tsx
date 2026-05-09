'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Leaf, Clock, Smile, TrendingDown } from 'lucide-react'
import { ChefHatSparkle } from '@/components/shared/CookingAnimations'

const PILLARS = [
  {
    icon: Clock,
    title: 'Gain de temps',
    description: 'Une seule session de 2 à 4h remplace des heures de cuisine quotidienne.',
  },
  {
    icon: Leaf,
    title: 'Alimentation saine',
    description: 'Des repas équilibrés, frais, adaptés à vos besoins, par un professionnel.',
  },
  {
    icon: Smile,
    title: 'Zéro stress',
    description: 'Plus besoin de penser aux repas chaque soir. Votre semaine est organisée.',
  },
  {
    icon: TrendingDown,
    title: 'Économies réelles',
    description: 'Moins de gaspillage et 50% de crédit d\'impôt pour optimiser votre budget.',
  },
]

export default function Concept() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="concept" className="section-padding section-paper relative overflow-hidden" ref={ref}>
      <div className="container-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* ── Image collage ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="grid grid-cols-5 grid-rows-5 gap-3 h-[520px]">
              <div className="col-span-3 row-span-3 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop"
                  alt="Batch cooking — préparation des repas"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="col-span-2 row-span-3 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&auto=format&fit=crop"
                  alt="Ingrédients frais"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="col-span-5 row-span-2 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=900&auto=format&fit=crop"
                  alt="Chef professionnel"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>

            {/* Floating stat badge with chef hat animation */}
            <div className="absolute -bottom-8 -left-6 lg:-left-10 bg-paper rounded-2xl p-5 shadow-[0_20px_50px_-15px_rgba(31,26,20,0.25)] border border-[rgba(31,26,20,0.06)] flex items-center gap-4">
              <ChefHatSparkle size={64} />
              <div>
                <p className="font-display text-4xl font-bold text-terra leading-none">
                  400+
                </p>
                <p className="text-ink text-sm font-semibold mt-1">Sessions réalisées</p>
                <p className="text-ink-soft text-xs">en France entière</p>
              </div>
            </div>
          </motion.div>

          {/* ── Text content ───────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <p className="eyebrow mb-5">Notre concept</p>
            <h2 className="h-section mb-6">
              Le batch cooking,<br />
              <span className="accent">réinventé chez vous.</span>
            </h2>
            <p className="text-ink-mid leading-relaxed mb-5">
              Le batch cooking consiste à préparer tous ses repas de la semaine en une seule session.
              Lab&apos;s Food va plus loin : un chef professionnel vient directement chez vous pour prendre
              en charge l&apos;intégralité de la session — de la mise en place à la conservation.
            </p>
            <p className="text-ink-mid leading-relaxed mb-10">
              Cuisine française, africaine, asiatique, orientale... notre catalogue de recettes du monde
              garantit variété et découverte, semaine après semaine.
            </p>

            {/* Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
              {PILLARS.map((pillar, i) => {
                const Icon = pillar.icon
                return (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-4"
                  >
                    <div className="w-11 h-11 rounded-full bg-[rgba(217,105,65,0.1)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-terra" />
                    </div>
                    <div>
                      <p className="text-navy font-semibold mb-1">{pillar.title}</p>
                      <p className="text-ink-mid text-sm leading-relaxed">{pillar.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
