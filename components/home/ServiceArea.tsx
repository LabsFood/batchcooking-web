'use client'

import { motion } from 'framer-motion'
import { MapPin, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { fadeUpInView } from '@/lib/motion'

// En attendant de connaître les villes des batch cookers : la France entière.
const CITIES = [{ name: 'France' }]

export default function ServiceArea() {
  return (
    <section className="section-padding section-cream relative overflow-hidden">
      <div className="container-xl">
        {/* slow-out : l'en-tête se pose en 240 ms */}
        <motion.div {...fadeUpInView()} className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="h-section">
            Lab&apos;s Food intervient en France.
          </h2>
          {/* <p className="text-ink-mid mt-5 leading-relaxed">
            Nous lançons d&apos;abord là où le soleil et les marchés sont les meilleurs.
            Ivy se déplace dans toute la French Riviera, de Cannes à Monaco.
          </p> */}
        </motion.div>

        {/* slow-out : la carte et le bloc se posent en 240 ms */}
        <motion.div
          {...fadeUpInView()}
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
          </div>

          {/* Cities + CTA */}
          <div className="bg-navy text-white rounded-3xl p-6 lg:p-8 relative overflow-hidden flex flex-col">
            <div className="relative">
              <h3 className="font-display text-2xl font-bold leading-tight">
                Votre batch cooker vient à vous, où que vous soyez.
              </h3>

              <ul className="mt-6 space-y-2">
                {CITIES.map((c) => (
                  <li key={c.name} className="flex items-start gap-3 py-2">
                    <span className="w-7 h-7 rounded-lg bg-amber/15 text-amber flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">{c.name}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link
                href="/faq"
                className="hit mt-6 inline-flex items-center gap-2 text-xs font-semibold text-amber hover:text-white transition-colors duration-150"
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
