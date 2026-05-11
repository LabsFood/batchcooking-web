'use client'

import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import { TESTIMONIALS } from '@/lib/mock-data'

export default function Testimonials() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [active, setActive] = useState(0)

  const next = () => setActive((a) => (a + 1) % TESTIMONIALS.length)
  const prev = () => setActive((a) => (a - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)

  const t = TESTIMONIALS[active]

  return (
    <section id="testimonials" className="section-padding section-cream relative overflow-hidden" ref={ref}>
      <div className="container-xl relative">
        <motion.div
          initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="eyebrow mb-5 justify-center">Témoignages</p>
          <h2 className="h-section">
            Ils nous ont <span className="accent">fait confiance.</span>
          </h2>
        </motion.div>

        {/* Featured testimonial card */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-paper rounded-3xl p-10 lg:p-14 border border-[rgba(31,26,20,0.06)] shadow-[0_30px_60px_-30px_rgba(31,26,20,0.2)]"
            >
              <Quote
                className="absolute top-8 right-8 lg:top-12 lg:right-12 text-terra opacity-15"
                style={{ width: 72, height: 72 }}
              />

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
                  <img
                    src={t.clientAvatar}
                    alt={t.clientName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-cream"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-cream-deep flex items-center justify-center font-display text-xl font-bold text-terra">
                    {t.clientName.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-navy font-semibold">{t.clientName}</p>
                  {/* <p className="text-ink-soft text-sm">{t.clientCity} · Formule {t.planUsed}</p> */}
                </div>
                <span className="hidden md:inline-flex chip chip-amber">Avis vérifié</span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={prev}
              className="w-11 h-11 rounded-full border-2 border-[rgba(31,26,20,0.1)] text-ink-mid hover:border-terra hover:text-terra transition-all flex items-center justify-center"
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
                  className={`h-2 rounded-full transition-all ${active === i ? 'w-8 bg-terra' : 'w-2 bg-ink-soft/30 hover:bg-ink-soft/50'
                    }`}
                  aria-label={`Témoignage ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-11 h-11 rounded-full border-2 border-[rgba(31,26,20,0.1)] text-ink-mid hover:border-terra hover:text-terra transition-all flex items-center justify-center"
              aria-label="Suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aggregate stats */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {[
            { value: '4.9/5', label: 'Note moyenne' },
            { value: '+330', label: 'Avis vérifiés' },
            { value: '98%', label: 'Satisfaction' },
            { value: '87%', label: 'Renouvellement' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl lg:text-5xl font-bold text-terra leading-none">
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
