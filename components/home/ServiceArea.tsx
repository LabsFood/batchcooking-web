'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { fadeUpInView } from '@/lib/motion'

/* ─────────────────────────────────────────────────────────────────────────────
   « Partout en France » — simplifiée le 27/11.

   La section ne dit qu'une chose, et elle est vraie : Lab's Food intervient en
   France. Pas de ville mise en avant, pas de promesse sur les batch cookers
   qui ne serait pas vérifiée. La carte (Google Maps, chargée paresseusement)
   montre la France ; le texte le dit, et le bouton mène aux cartes des batch
   cookers.
   ───────────────────────────────────────────────────────────────────────────── */

export default function ServiceArea() {
  return (
    <section className="section-padding section-cream relative overflow-hidden">
      <div className="container-xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* ── La carte ───────────────────────────────────────────── */}
          {/* slow-out : la carte se pose en 240 ms */}
          <motion.div
            {...fadeUpInView()}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[var(--line)] shadow-[0_30px_70px_-30px_rgba(31,42,55,0.35)] lg:aspect-auto lg:h-[420px]"
          >
            {/* En absolu : h-full seul ne vaut rien dans un cadre sans hauteur fixe. */}
            <iframe
              src="https://www.google.com/maps?q=France&z=5&output=embed&hl=fr"
              className="absolute inset-0 h-full w-full"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Zone d'intervention Lab's Food — France"
            />
          </motion.div>

          {/* ── Le message ─────────────────────────────────────────── */}
          <motion.div {...fadeUpInView(0.08)}>
            <h2 className="h-section mb-5">Lab&apos;s Food intervient partout en France.</h2>
            <p className="max-w-xl leading-relaxed text-ink-mid">
              Indiquez vos dates et votre région : vous verrez les batch cookers qui peuvent
              venir cuisiner chez vous.
            </p>

            <Link href="/menu" className="btn btn-navy mt-9">
              Trouver un batch cooker
              <ArrowRight className="icon-arrow h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
