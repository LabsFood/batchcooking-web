'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ReserveButton from '@/components/shared/ReserveButton'
import { SOURCES } from '@/lib/faq/sources'
import { fade, fadeUp } from '@/lib/motion'

/* ─────────────────────────────────────────────────────────────────────────────
   Le hero dit trois choses, dans cet ordre : ce qu'on obtient, ce que ça coûte,
   quoi faire. Le prix passe par la même règle que `Prix.tsx` : le reste à
   charge d'abord, avec sa condition (« après crédit d'impôt ») collée au chiffre.

   Rien de décoratif : ni grille de points, ni badge qui tourne, ni ingrédients
   qui flottent. Le texte entre d'un seul bloc, l'image se fond : une seule
   chose bouge à la fois, et le CTA n'attend personne.
   ───────────────────────────────────────────────────────────────────────────── */

export default function Hero() {
  return (
    <section className="bg-white pt-28 pb-16 lg:pt-36 lg:pb-24">
      <div className="container-xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* slow-out : le bloc se pose en 240 ms, sans délai devant le CTA */}
          <motion.div {...fadeUp()} className="lg:col-span-7">
            <h1
              className="h-display font-fraunces text-navy"
              style={{ fontSize: 'clamp(2.4rem, 5.6vw, 4.25rem)' }}
            >
              Une semaine de repas faits maison, cuisinés chez vous.
            </h1>

            <p className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-semibold text-ink-mid">À partir de</span>
              <span className="font-display text-5xl font-bold tabular-nums text-navy">50 €</span>
              <span className="text-base text-ink-mid">par session, après crédit d&apos;impôt</span>
            </p>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-mid">
              Un batch cooker se déplace chez vous, partout en France. Le batch cooking à domicile
              est éligible au crédit d&apos;impôt Service à la Personne : grâce à l&apos;avance
              immédiate proposée par l&apos;Urssaf, la réduction s&apos;applique dès la
              facturation.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ReserveButton>
                Réserver ma session
                <ArrowRight className="icon-arrow h-4 w-4" />
              </ReserveButton>
              {/* Le secondaire est un lien : un seul bouton plein par vue. */}
              <Link
                href="/#how-it-works"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-navy underline underline-offset-4 transition-colors hover:text-ink"
              >
                Comment ça marche ?
              </Link>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink-mid">
              Tarif selon le batch cooker et le nombre de repas, courses (ingrédients) à votre
              charge.{' '}
              <a
                href={SOURCES.urssafAvanceImmediate.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-navy underline underline-offset-4 hover:text-ink"
              >
                L&apos;avance immédiate sur urssaf.fr
              </a>
            </p>
          </motion.div>

          <motion.div {...fade} className="lg:col-span-5">
            <Image
              src="/shapeIvy_transparent.png"
              alt="Chef cuisinier à domicile"
              width={1122}
              height={1402}
              preload
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="mx-auto h-auto w-full max-w-md lg:max-w-none"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
