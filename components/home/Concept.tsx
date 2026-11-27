'use client'

import { motion } from 'framer-motion'
import { Leaf, Clock, Smile, TrendingDown } from 'lucide-react'
import Image from 'next/image'
import { fadeUpInView } from '@/lib/motion'

/* ─────────────────────────────────────────────────────────────────────────────
   « Le batch cooking, réinventé chez vous » — remis au propre le 26/11.

   Une seule photo — une gamelle de la semaine, le produit lui-même — à la
   place du collage de banque d'images (le batch cooker en tenue illustre
   l'étape 4 de « Comment ça marche »). En face,
   deux paragraphes courts alignés à gauche, puis les quatre piliers en
   grille. Rien d'autre.
   ───────────────────────────────────────────────────────────────────────────── */

const PILLARS = [
  {
    icon: Clock,
    title: 'Gain de temps',
    description: "Une session de 2 h en moyenne chez vous, et vous n'avez plus à cuisiner de la semaine.",
  },
  {
    icon: Leaf,
    title: 'Alimentation saine',
    description: 'Des repas faits maison, adaptés à vos goûts et à vos besoins.',
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
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ── Notre batch cooker, en tenue ───────────────────────── */}
          {/* slow-out : la photo se pose en 240 ms */}
          <motion.div {...fadeUpInView()} className="lg:col-span-5">
            <div className="relative mx-auto aspect-[3/4] max-w-md overflow-hidden rounded-3xl shadow-[0_40px_80px_-40px_rgba(31,42,55,0.45)]">
              <Image
                src="/images/gamelles/gamelle-a02.jpg"
                alt="Gamelle de la semaine : riz, haricots, poulet et brocoli"
                fill
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 28rem, 100vw"
                className="object-cover"
              />
            </div>
          </motion.div>

          {/* ── Le concept, puis les quatre piliers ────────────────── */}
          <motion.div
            // slow-out : se pose en 240 ms
            {...fadeUpInView(0.08)}
            className="lg:col-span-7"
          >
            <h2 className="h-section mb-6">Le batch cooking, chez vous.</h2>
            <p className="mb-4 max-w-xl leading-relaxed text-ink-mid">
              Un batch cooker vient chez vous, cuisine tous vos repas de la semaine en une seule
              session, range tout et vous laisse une cuisine propre. Il ne reste qu&apos;à ouvrir
              le frigo.
            </p>
            <p className="mb-10 max-w-xl leading-relaxed text-ink-mid">
              Familles, jeunes mamans, sportifs, séniors, végétariens : vous indiquez vos
              allergies, vos goûts et votre régime, et chaque menu est pensé pour vous.
            </p>

            <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
              {PILLARS.map((pillar, i) => {
                const Icon = pillar.icon
                return (
                  <motion.div
                    key={pillar.title}
                    // slow-out : chaque pilier se pose en 240 ms, décalé de 80 ms
                    {...fadeUpInView(i * 0.08)}
                    className="flex gap-4"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-soft">
                      <Icon className="h-5 w-5 text-amber-deep" aria-hidden />
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-navy">{pillar.title}</p>
                      <p className="text-sm leading-relaxed text-ink-mid">{pillar.description}</p>
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
