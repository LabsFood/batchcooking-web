'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Leaf, ChefHat } from 'lucide-react'
import { FloatingIngredients, SteamingPot } from '@/components/shared/CookingAnimations'
import ReserveButton from '@/components/shared/ReserveButton'

const FADE = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: (d = 0) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const, delay: d },
  }),
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Decorative dot grid — top right */}
      <div className="absolute top-32 right-12 hidden lg:block opacity-30 pointer-events-none">
        <DotGrid rows={5} cols={5} />
      </div>
      {/* Decorative leaf — bottom left */}
      <Leaf
        className="absolute -left-6 bottom-10 w-40 h-40 text-terra opacity-[0.08] -rotate-45 pointer-events-none"
        strokeWidth={1}
      />
      {/* Animated steaming pot — bottom left corner */}
      {/* <div className="absolute left-6 bottom-6 hidden xl:block pointer-events-none">
        <SteamingPot size={130} />
      </div> */}
      {/* Floating ingredients — top center */}
      <div className="absolute top-32 left-1/2 -translate-x-[60%] hidden xl:block pointer-events-none opacity-90">
        <FloatingIngredients size={120} />
      </div>

      <div className="container-xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* ── Left text column ─────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <motion.p variants={FADE} custom={0} initial="hidden" animate="show" className="eyebrow mb-6">
              Service à la personne
            </motion.p>

            <motion.h1
              variants={FADE} custom={0.08} initial="hidden" animate="show"
              className="h-display text-navy font-fraunces"
              style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5rem)' }}
            >
              Une semaine entière<br />
              de repas faits maison<br />
              <span className="text-terra italic font-medium">en 2 heures.</span>
            </motion.h1>

            <motion.p
              variants={FADE} custom={0.18} initial="hidden" animate="show"
              className="mt-7 text-ink-mid text-lg leading-relaxed max-w-xl"
            >
              Un cuisinier se déplace chez vous et prépare l&apos;ensemble de vos repas
              de la semaine en une seule session.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={FADE} custom={0.28} initial="hidden" animate="show"
              className="flex flex-wrap items-center gap-4 mt-10"
            >
              <ReserveButton>
                Réserver ma session
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </ReserveButton>
              <Link href="/#how-it-works" className="btn btn-outline">
                Comment ça marche ?
              </Link>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              variants={FADE} custom={0.38} initial="hidden" animate="show"
              className="flex flex-wrap items-center gap-8 mt-12 pt-8 border-t border-[rgba(31,26,20,0.08)]"
            >
              {/* La note moyenne a été retirée : le module d'avis n'existe pas,
                  l'API rend `rating: null`, et une note que rien ne soutient
                  n'a pas sa place au-dessus d'un bandeau « en construction ». */}
              <p className="text-sm text-ink-mid">
                <span className="font-semibold text-terra">Avance immédiate</span> acceptée
              </p>
            </motion.div>
          </div>

          {/* ── Right image column ───────────────────────────────────── */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="relative"
            >
              {/* Main framed image — rounded shape */}
              <div className="relative">
                <img
                  src="/shapeIvy_transparent.png"
                  alt="Chef cuisinier à domicile"
                  className="w-full h-full object-cover"
                />
                {/* <img
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&auto=format&fit=crop&q=80"
                  alt="Chef cuisinier à domicile"
                  className="w-full h-full object-cover"
                /> */}
              </div>

              {/* Floating circle badge — top left */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-6 -left-6 w-28 h-28 hidden md:block"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <path
                      id="circlePath"
                      d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
                      fill="none"
                    />
                  </defs>
                  <text fontSize="9" fill="#00234B" letterSpacing="2" fontFamily="var(--font-mono)">
                    <textPath href="#circlePath">
                      Batch Cooking · À Domicile · ·
                    </textPath>
                  </text>
                </svg>
              </motion.div>

              {/* Floating chef badge — bottom right */}
              <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-8 bg-paper rounded-2xl p-4 shadow-[0_20px_50px_-15px_rgba(31,26,20,0.25)] border border-[rgba(31,26,20,0.06)] flex items-center gap-3 max-w-[260px]">
                <div className="w-10 h-10 rounded-full bg-terra flex items-center justify-center flex-shrink-0">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy leading-tight">Chef à domicile</p>
                  <p className="text-xs text-ink-soft mt-0.5">certifié & assuré chez vous</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DotGrid({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, 8px)` }}
    >
      {Array.from({ length: rows * cols }).map((_, i) => (
        <span key={i} className="block w-2 h-2 rounded-full bg-terra" />
      ))}
    </div>
  )
}
