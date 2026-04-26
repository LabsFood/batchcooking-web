'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Clock, Users, Flame } from 'lucide-react'
import { WEEKLY_MEALS } from '@/lib/mock-data'

export default function FeaturedMenu() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const featured = WEEKLY_MEALS.slice(0, 4)

  return (
    <section className="section-padding section-cream relative" ref={ref}>
      <div className="container-xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="eyebrow mb-5 justify-center">Cette semaine</p>
          <h2 className="h-section">
            Le menu de <span className="accent">la semaine</span>
          </h2>
          <p className="text-ink-mid mt-5 leading-relaxed">
            Le menu est renouvelé chaque semaine. Sélectionnez jusqu&apos;à 7 plats selon votre formule.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((meal, i) => (
            <motion.div
              key={meal.id}
              initial={{ opacity: 0, y: 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              className="card-base overflow-hidden group flex flex-col"
            >
              {/* Image */}
              <div className="relative h-56 overflow-hidden">
                <img
                  src={meal.image}
                  alt={meal.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {meal.dietaryTags.length > 0 && (
                  <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                    {meal.dietaryTags.slice(0, 2).map((tag) => (
                      <span key={tag} className="chip chip-cream bg-white/90 backdrop-blur-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-display text-xl font-bold text-navy mb-2 group-hover:text-terra transition-colors leading-tight">
                  {meal.name}
                </h3>
                <p className="text-ink-mid text-sm leading-relaxed line-clamp-2 mb-5 flex-1">
                  {meal.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-ink-soft pt-4 border-t border-[rgba(31,26,20,0.06)]">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-terra" /> {meal.portions}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-terra" />
                    {meal.prepTime >= 60 ? `${Math.floor(meal.prepTime / 60)}h` : `${meal.prepTime}min`}
                  </span>
                  {meal.calories && (
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-terra" /> {meal.calories}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 flex justify-center">
          <Link href="/menu" className="btn btn-navy">
            Voir tout le menu
            <ArrowRight className="w-4 h-4 icon-arrow" />
          </Link>
        </div>
      </div>
    </section>
  )
}
