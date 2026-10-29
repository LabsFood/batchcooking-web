'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MapPin, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// En attendant de connaître les villes des batch cookers : la France entière.
const CITIES = [{ name: 'France' }]

export default function ServiceArea() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-padding section-cream relative overflow-hidden">
      <div className="container-xl">
        <motion.div
          initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="eyebrow mb-5 justify-center">Zone d&apos;intervention</p>
          <h2 className="h-section">
            Lab&apos;s Food intervient <span className="accent">en France.</span>
          </h2>
          {/* <p className="text-ink-mid mt-5 leading-relaxed">
            Nous lançons d&apos;abord là où le soleil et les marchés sont les meilleurs.
            Ivy se déplace dans toute la French Riviera, de Cannes à Monaco.
          </p> */}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 max-w-6xl mx-auto"
        >
          {/* Map */}
          <div className="relative rounded-3xl overflow-hidden shadow-[0_30px_70px_-30px_rgba(31,42,55,0.35)] border border-[rgba(31,42,55,0.06)] aspect-[4/3] lg:aspect-auto lg:min-h-[420px]">
            <iframe
              src="https://www.google.com/maps?q=France&z=5&output=embed&hl=fr"
              className="w-full h-full"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Zone d'intervention Lab's Food — France"
            />
            {/* Floating badge */}
            <div className="absolute top-4 left-4 bg-paper rounded-2xl px-3.5 py-2.5 shadow-[0_10px_30px_-10px_rgba(31,42,55,0.3)] border border-[rgba(31,42,55,0.06)] flex items-center gap-2.5 max-w-[220px]">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber/60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber" />
              </span>
              <div>
                <p className="text-xs font-semibold text-navy leading-tight">France</p>
              </div>
            </div>
          </div>

          {/* Cities + CTA */}
          <div className="bg-navy text-white rounded-3xl p-6 lg:p-8 relative overflow-hidden flex flex-col">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-mint/15 blur-3xl pointer-events-none" />

            <div className="relative">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber mb-3 inline-flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Saison 1
              </p>
              <h3 className="font-display text-2xl font-bold leading-tight">
                Là où nous cuisinons aujourd&apos;hui.
              </h3>

              <ul className="mt-6 space-y-2">
                {CITIES.map((c, i) => (
                  <motion.li
                    key={c.name}
                    initial={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                    whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                    className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="w-7 h-7 rounded-lg bg-amber/15 text-amber flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">{c.name}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>

              <Link
                href="/faq"
                className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-amber hover:text-white transition-colors"
              >
                Une question sur votre zone ?
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
