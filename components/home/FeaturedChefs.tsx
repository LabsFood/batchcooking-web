'use client'
import Link from 'next/link'
import { ArrowRight, Star, MapPin } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { CHEFS } from '@/lib/mock-data'

export default function FeaturedChefs() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-padding section-cream-soft">
      <div className="container-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="eyebrow mb-5 justify-center">Notre équipe</p>
          <h2 className="h-section">
            Des chefs passionnés <span className="accent">& certifiés.</span>
          </h2>
          <p className="text-ink-mid mt-5 leading-relaxed">
            Tous nos chefs sont des professionnels diplômés, agréés Service à la Personne,
            sélectionnés pour leur expertise et leur passion.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CHEFS.map((chef, i) => (
            <motion.div
              key={chef.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group text-center"
            >
              {/* Image */}
              <div className="relative mb-5 mx-auto w-fit">
                <div className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-paper shadow-[0_20px_40px_-15px_rgba(31,26,20,0.25)]">
                  <img
                    src={chef.avatar}
                    alt={chef.name}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                  />
                  {!chef.available && (
                    <div className="absolute inset-0 bg-navy/70 flex items-center justify-center">
                      <span className="chip chip-cream">Indisponible</span>
                    </div>
                  )}
                </div>
                {/* Rating badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-paper px-3 py-1 rounded-full shadow-md flex items-center gap-1 border border-[rgba(31,26,20,0.06)]">
                  <Star className="w-3 h-3 fill-amber text-amber" />
                  <span className="text-xs font-semibold text-navy">{chef.rating}</span>
                </div>
              </div>

              <h3 className="font-display text-xl font-bold text-navy mb-1">{chef.name}</h3>
              <p className="text-terra text-sm font-semibold mb-2">{chef.specialty}</p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-ink-soft">
                <MapPin className="w-3 h-3" />
                <span>{chef.city}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center mt-14">
          <Link href="/chefs" className="btn btn-outline">
            Voir tous les chefs
            <ArrowRight className="w-4 h-4 icon-arrow" />
          </Link>
        </div>
      </div>
    </section>
  )
}
