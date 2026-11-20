'use client'

import { motion } from 'framer-motion'
import { Leaf, Clock, Smile, TrendingDown } from 'lucide-react'
import Image from 'next/image'
import { fadeUpInView } from '@/lib/motion'

const PILLARS = [
  {
    icon: Clock,
    title: 'Gain de temps',
    description: "Une séance de 2h en moyenne chez vous, et vous n'avez plus à cuisiner de la semaine.",
  },
  {
    icon: Leaf,
    title: 'Alimentation saine',
    description: 'Des repas adaptés à vos goûts et à vos besoins.',
  },
  {
    icon: Smile,
    title: 'Zéro stress',
    description: 'Fini la question « on mange quoi ce soir ? ». Vos repas sont prêts.',
  },
  {
    icon: TrendingDown,
    title: 'Économies réelles',
    description: "Moins de gaspillage, et 50 % de crédit d'impôt déduit directement grâce à l'avance immédiate.",
  },
]

export default function Concept() {
  return (
    <section id="concept" className="section-padding section-paper relative overflow-hidden">
      <div className="container-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* ── Image collage ──────────────────────────────────────── */}
          <motion.div
            // slow-out : se pose en 240 ms
            {...fadeUpInView()}
            className="relative"
          >
            <div className="grid grid-cols-5 grid-rows-5 gap-3 h-[520px]">
              <div className="relative col-span-3 row-span-3 rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop"
                  alt="Batch cooking — préparation des repas"
                  fill
                  sizes="(min-width: 1024px) 360px, 60vw"
                  className="object-cover"
                />
              </div>
              <div className="relative col-span-2 row-span-3 rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&auto=format&fit=crop"
                  alt="Ingrédients frais"
                  fill
                  sizes="(min-width: 1024px) 240px, 40vw"
                  className="object-cover"
                />
              </div>
              <div className="relative col-span-5 row-span-2 rounded-2xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=900&auto=format&fit=crop"
                  alt="Cuisinier à domicile"
                  fill
                  sizes="(min-width: 1024px) 600px, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </motion.div>

          {/* ── Text content ───────────────────────────────────────── */}
          <motion.div
            // slow-out : se pose en 240 ms
            {...fadeUpInView(0.08)}
          >
            <h2 className="h-section mb-6">
              Le batch cooking réinventé chez vous.
            </h2>
            <p className="text-ink-mid leading-relaxed mb-5 text-justify">
              Imaginez ouvrir votre frigo et trouver tous vos repas de la semaine, faits maison et
              prêts à réchauffer. C&apos;est ce que fait Lab&apos;s Food : un(e) cuisinier(e) vient
              chez vous, cuisine pour toute la semaine en une seule séance, range tout et vous
              laisse une cuisine propre.
            </p>
            <p className="text-ink-mid leading-relaxed mb-5 text-justify">
              Séniors, végétarien, allergie ou régime spécifique : nos
              cuisiniers adaptent chaque menu à votre profil et à vos goûts.
            </p>
            <p className="text-ink-mid leading-relaxed mb-10 text-justify">
              Cuisine européenne, africaine, américaine... Vous découvrez de nouvelles saveurs
              chaque semaine, sans jamais vous lasser.
            </p>

            {/* Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
              {PILLARS.map((pillar, i) => {
                const Icon = pillar.icon
                return (
                  <motion.div
                    key={pillar.title}
                    // slow-out : se pose en 240 ms
                    {...fadeUpInView(i * 0.08)}
                    className="flex gap-4"
                  >
                    <div className="w-11 h-11 rounded-full bg-[rgba(217,105,65,0.1)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-amber-ink" />
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
