'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChefHat, Leaf } from 'lucide-react'
import ReserveButton from '@/components/shared/ReserveButton'

/* ─────────────────────────────────────────────────────────────────────────────
   Le hero de l'accueil, dans sa version d'origine (rétablie à la demande du
   20/11, en remplacement de la version « hero avec prix » du 16/11).

   Ce qu'il porte : la promesse en grand (« Une semaine entière de repas faits
   maison en 2 heures »), le chef dans la silhouette du logo, et le décor de la
   marque — badge circulaire qui tourne, ingrédients qui flottent, feuille et
   grille de points.

   Le mouvement décoratif est un choix assumé pour cette seule section,
   vitrine de la marque. Il se coupe avec `prefers-reduced-motion` : Framer
   Motion suit le réglage du système (`MotionConfig reducedMotion="user"`, dans
   `Providers`).
   ───────────────────────────────────────────────────────────────────────────── */

const FADE = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: (d = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const, delay: d },
  }),
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pb-20 pt-32 lg:pb-28 lg:pt-40">
      {/* Grille de points, en haut à droite */}
      <div className="pointer-events-none absolute right-12 top-32 hidden opacity-30 lg:block">
        <DotGrid rows={5} cols={5} />
      </div>
      {/* Feuille, en bas à gauche */}
      <Leaf
        className="pointer-events-none absolute -left-6 bottom-10 h-40 w-40 -rotate-45 text-terra opacity-[0.08]"
        strokeWidth={1}
        aria-hidden
      />
      {/* Ingrédients qui flottent, au-dessus du titre */}
      <div className="pointer-events-none absolute left-1/2 top-32 hidden -translate-x-[60%] opacity-90 xl:block">
        <FloatingIngredients size={120} />
      </div>

      <div className="container-xl relative">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* ── Le texte ──────────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <motion.p variants={FADE} custom={0} initial="hidden" animate="show" className="eyebrow mb-6">
              Service à la personne
            </motion.p>

            <motion.h1
              variants={FADE}
              custom={0.08}
              initial="hidden"
              animate="show"
              className="h-display font-fraunces text-navy"
              style={{ fontSize: 'clamp(2.6rem, 6.5vw, 5rem)' }}
            >
              Une semaine entière
              <br />
              de repas faits maison
              <br />
              <span className="font-medium italic text-terra">en 2 heures.</span>
            </motion.h1>

            <motion.p
              variants={FADE}
              custom={0.18}
              initial="hidden"
              animate="show"
              className="mt-7 max-w-xl text-lg leading-relaxed text-ink-mid"
            >
              Un cuisinier se déplace chez vous et prépare l&apos;ensemble de vos repas de la
              semaine en une seule session.
            </motion.p>

            <motion.div
              variants={FADE}
              custom={0.28}
              initial="hidden"
              animate="show"
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <ReserveButton>
                Réserver ma session
                <ArrowRight className="icon-arrow h-4 w-4" />
              </ReserveButton>
              <Link href="/#how-it-works" className="btn btn-outline">
                Comment ça marche ?
              </Link>
            </motion.div>

            <motion.div
              variants={FADE}
              custom={0.38}
              initial="hidden"
              animate="show"
              className="mt-12 flex flex-wrap items-center gap-8 border-t border-[rgba(31,26,20,0.08)] pt-8"
            >
              <p className="text-sm text-ink-mid">
                <span className="font-semibold text-terra">Avance immédiate</span> acceptée
              </p>
            </motion.div>
          </div>

          {/* ── L'image ───────────────────────────────────────────────── */}
          <div className="relative lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="relative"
            >
              <Image
                src="/shapeIvy_transparent.png"
                alt="Chef cuisinier à domicile"
                width={1122}
                height={1402}
                preload
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="h-full w-full object-cover"
              />

              {/* Badge circulaire qui tourne, en haut à gauche de l'image */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                className="absolute -left-6 -top-6 hidden h-28 w-28 md:block"
                aria-hidden
              >
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  <defs>
                    <path
                      id="hero-cercle"
                      d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
                      fill="none"
                    />
                  </defs>
                  <text fontSize="9" fill="var(--navy)" letterSpacing="2" fontFamily="var(--font-mono)">
                    <textPath href="#hero-cercle">Batch Cooking · À Domicile · ·</textPath>
                  </text>
                </svg>
              </motion.div>

              {/* Badge « Chef à domicile », en bas à droite */}
              <div className="absolute -bottom-4 -right-4 flex max-w-[260px] items-center gap-3 rounded-2xl border border-[rgba(31,26,20,0.06)] bg-paper p-4 shadow-[0_20px_50px_-15px_rgba(31,26,20,0.25)] md:-bottom-6 md:-right-8">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-terra">
                  <ChefHat className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight text-navy">Chef à domicile</p>
                  <p className="mt-0.5 text-xs text-ink-soft">certifié &amp; assuré chez vous</p>
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
    <div aria-hidden className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 8px)` }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <span key={i} className="block h-2 w-2 rounded-full bg-terra" />
      ))}
    </div>
  )
}

/** Tomate, feuille et citron qui flottent doucement. */
function FloatingIngredients({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <motion.g
        animate={{ y: [0, -6, 0], rotate: [0, 6, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle cx="34" cy="46" r="14" fill="#D9442B" />
        <path d="M 28 36 Q 34 30, 40 36 L 38 40 L 30 40 Z" fill="#3D8B5C" />
      </motion.g>

      <motion.g
        animate={{ y: [0, 5, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <path d="M 84 60 Q 92 44, 104 50 Q 100 70, 84 64 Z" fill="#3D8B5C" />
        <path
          d="M 86 62 Q 95 56, 100 54"
          stroke="#1F4D2C"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      </motion.g>

      <motion.g
        animate={{ y: [0, -4, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      >
        <ellipse cx="64" cy="92" rx="14" ry="10" fill="#F4C430" />
        <ellipse cx="60" cy="89" rx="3" ry="2" fill="#FFE791" />
      </motion.g>
    </svg>
  )
}
