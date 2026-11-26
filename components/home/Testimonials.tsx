'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { TESTIMONIALS } from '@/lib/mock-data'
import Image from 'next/image'
import { DURATION, EASE_IN, EASE_OUT, fadeUpInView } from '@/lib/motion'

export default function Testimonials() {
  const [active, setActive] = useState(0)

  const next = () => setActive((a) => (a + 1) % TESTIMONIALS.length)
  const prev = () => setActive((a) => (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)

  const t = TESTIMONIALS[active]

  return (
    <section id="testimonials" className="section-padding section-cream relative overflow-hidden">
      <div className="container-xl relative">
        <motion.div
          // slow-out : se pose en 240 ms
          {...fadeUpInView()}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <h2 className="h-section">
            Ils nous ont fait confiance.
          </h2>
        </motion.div>

        {/* Featured testimonial card */}
        <div className="max-w-4xl mx-auto">
          {/* Une seule cellule de grille : l'avis qui part et celui qui arrive
              se croisent en fondu au même endroit. */}
          <div className="grid">
          <AnimatePresence>
            <motion.div
              key={active}
              // slow-out : l'avis arrive en 240 ms, l'ancien s'efface en 180 ms
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: DURATION.base, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE_IN } }}
              className="col-start-1 row-start-1 relative bg-paper rounded-3xl p-10 lg:p-14 border border-[rgba(31,26,20,0.06)] shadow-[0_30px_60px_-30px_rgba(31,26,20,0.2)]"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-7">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${i < t.rating ? 'fill-amber text-amber' : 'text-ink-soft/30'}`}
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="font-display text-2xl lg:text-3xl font-medium text-navy leading-relaxed mb-10">
                &ldquo;{t.text}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4 pt-8 border-t border-[rgba(31,26,20,0.08)]">
                {t.clientAvatar ? (
                  // Avatar issu des données : hôte inconnu d'avance, donc sans optimiseur.
                  <Image
                    src={t.clientAvatar}
                    alt={t.clientName}
                    width={56}
                    height={56}
                    unoptimized
                    className="w-14 h-14 rounded-full object-cover border-2 border-cream"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-cream-deep flex items-center justify-center font-display text-xl font-bold text-amber-deep">
                    {t.clientName.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-navy font-semibold">{t.clientName}</p>
                  {/* <p className="text-ink-soft text-sm">{t.clientCity} · Formule {t.planUsed}</p> */}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={prev}
              className="w-11 h-11 rounded-full border-2 border-[rgba(31,26,20,0.1)] text-ink-mid hover:border-terra hover:text-amber-deep transition-colors duration-150 active:scale-[0.97] flex items-center justify-center"
              aria-label="Précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2 mx-3">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className="flex h-10 items-center px-1"
                  aria-label={`Témoignage ${i + 1}`}
                >
                  <span
                    className={`block h-2 rounded-full transition-[width,background-color] duration-200 ${active === i ? 'w-8 bg-terra' : 'w-2 bg-ink-soft/30'}`}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={next}
              className="w-11 h-11 rounded-full border-2 border-[rgba(31,26,20,0.1)] text-ink-mid hover:border-terra hover:text-amber-deep transition-colors duration-150 active:scale-[0.97] flex items-center justify-center"
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aggregate stats */}
        <motion.div
          // slow-out : se pose en 240 ms
          {...fadeUpInView(0.08)}
          className="mt-20 grid grid-cols-2 gap-6 max-w-xl mx-auto"
        >
          {/* Note moyenne et nombre d'avis retirés : le module d'avis n'existe
              pas encore côté API, ces deux nombres ne s'appuyaient sur rien. */}
          {[
            { value: '98%', label: 'Satisfaction' },
            { value: '90%', label: 'Renouvellement' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl lg:text-5xl font-bold text-amber-deep leading-none">
                {s.value}
              </p>
              <p className="text-ink-mid text-sm mt-2">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
