'use client'
import Link from 'next/link'
import { ArrowRight, Star, MapPin, Award, ChefHat } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { CHEFS } from '@/lib/mock-data'

export default function FeaturedChefs() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const ivy = CHEFS[0] // Solo chef pour la version actuelle

  return (
    <section ref={ref} className="section-padding section-cream-soft relative overflow-hidden">
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-amber/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-mint/30 blur-3xl pointer-events-none" />

      <div className="container-xl relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="eyebrow mb-5 justify-center">Le chef</p>
          <h2 className="h-section">
            Une cheffe, mille <span className="accent">plats.</span>
          </h2>
          <p className="text-ink-mid mt-5 leading-relaxed">
            Pour cette première saison, c&apos;est <span className="font-semibold text-navy">Ivy</span> qui
            cuisine chez vous. Fondatrice de Lab&apos;s Food, formée en restauration gastronomique,
            spécialiste des cuisines du monde et de la nutrition saine.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] bg-paper rounded-3xl overflow-hidden shadow-[0_30px_80px_-30px_rgba(31,42,55,0.25)] border border-[rgba(31,42,55,0.06)]">
            {/* Portrait */}
            <div className="relative aspect-[4/5] lg:aspect-auto">
              <img
                src={ivy.avatar}
                alt={ivy.name}
                className="w-full h-full object-cover object-top"
              />
              {/* Floating ratings badge */}
              <div className="absolute bottom-5 left-5 bg-paper rounded-2xl px-4 py-2.5 shadow-[0_18px_40px_-15px_rgba(31,42,55,0.3)] flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber text-amber" />
                <span className="font-display font-bold text-navy">{ivy.rating}</span>
                <span className="text-xs text-ink-soft">· {ivy.reviewCount} avis</span>
              </div>
              {/* Sessions badge */}
              <div className="absolute top-5 left-5 bg-navy text-amber rounded-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.16em] flex items-center gap-1.5">
                <ChefHat className="w-3 h-3" /> {ivy.sessionsDone}+ sessions
              </div>
            </div>

            {/* Content */}
            <div className="p-7 lg:p-10 flex flex-col">
              <p className="text-amber font-mono text-[10px] uppercase tracking-[0.22em] mb-2">
                Fondatrice & cheffe
              </p>
              <h3 className="font-display text-3xl lg:text-4xl font-bold text-navy leading-tight">
                {ivy.name}
              </h3>
              <p className="text-terra font-semibold mt-2 text-sm">{ivy.specialty}</p>
              <div className="flex items-center gap-1.5 text-xs text-ink-soft mt-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>{ivy.city}, {ivy.region}</span>
              </div>

              <p className="text-ink-mid text-sm leading-relaxed mt-5">{ivy.bio}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {ivy.specialties.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] font-mono uppercase tracking-[0.12em] px-3 py-1 rounded-full bg-mint/40 text-mint-ink border border-mint-deep/30"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {ivy.badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-amber-soft text-amber-deep"
                  >
                    <Award className="w-3 h-3" /> {b}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-7 flex flex-wrap gap-3">
                <Link href="/a-propos" className="btn btn-primary text-xs">
                  Lire son histoire
                  <ArrowRight className="w-4 h-4 icon-arrow" />
                </Link>
                <span className="inline-flex items-center gap-2 text-xs text-ink-mid">
                  <span className="w-2 h-2 rounded-full bg-mint-deep animate-pulse" />
                  Disponible cette semaine
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
