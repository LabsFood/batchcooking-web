'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Leaf } from 'lucide-react'
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

/* L'entrée du texte et de l'image est en CSS (`.hero-in`, dans globals.css),
   pas en Framer Motion : avec Framer, le HTML du serveur sort en `opacity: 0`
   et le titre (l'élément LCP) reste invisible jusqu'à l'hydratation du JS,
   soit ~9 s sur un mobile lent (PageSpeed du 24/11). En CSS, l'animation part
   dès le premier rendu, sans attendre le JS. */
const heroDelay = (s: number) => ({ '--hero-delay': `${s}s` }) as React.CSSProperties

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
            <p className="hero-in eyebrow mb-6" style={heroDelay(0)}>
              Service à la personne
            </p>

            <h1
              className="hero-in h-display font-fraunces text-navy"
              style={{ ...heroDelay(0.08), fontSize: 'clamp(2.6rem, 6.5vw, 5rem)' }}
            >
              Une semaine entière
              <br />
              de repas faits maison
              <br />
              <span className="font-medium italic text-terra">en 2 heures.</span>
            </h1>

            <p className="hero-in mt-7 max-w-xl text-lg leading-relaxed text-ink-mid" style={heroDelay(0.18)}>
              Un cuisinier se déplace chez vous et prépare l&apos;ensemble de vos repas de la
              semaine en une seule session.
            </p>

            <div className="hero-in mt-10 flex flex-wrap items-center gap-4" style={heroDelay(0.28)}>
              <ReserveButton>
                Réserver ma session
                <ArrowRight className="icon-arrow h-4 w-4" />
              </ReserveButton>
              <Link href="/#how-it-works" className="btn btn-outline">
                Comment ça marche ?
              </Link>
            </div>

            <div
              className="hero-in mt-12 flex flex-wrap items-center gap-8 border-t border-[rgba(31,26,20,0.08)] pt-8"
              style={heroDelay(0.38)}
            >
              <p className="text-sm text-ink-mid">
                <span className="font-semibold text-terra">Avance immédiate</span> acceptée
              </p>
            </div>
          </div>

          {/* ── L'image ───────────────────────────────────────────────── */}
          <div className="relative lg:col-span-5">
            <div className="hero-in hero-in--scale relative" style={heroDelay(0.15)}>
              <Image
                src="/shapeIvy_transparent.png"
                alt="Chef cuisinier à domicile"
                width={1122}
                height={1402}
                preload
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="h-full w-full object-cover"
              />
            </div>
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
