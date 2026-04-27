'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Star, MapPin, ArrowRight, Check, Users } from 'lucide-react'
import { CHEFS } from '@/lib/mock-data'
import ReserveButton from '@/components/shared/ReserveButton'

const REGIONS = ['Toutes les régions', 'Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Occitanie', 'Auvergne-Rhône-Alpes']

export default function ChefsPage() {
  const [activeRegion, setActiveRegion] = useState('Toutes les régions')
  const [filterAvailable, setFilterAvailable] = useState(false)

  const filtered = CHEFS.filter((c) => {
    if (activeRegion !== 'Toutes les régions' && c.region !== activeRegion) return false
    if (filterAvailable && !c.available) return false
    return true
  })

  return (
    <div className="page-transition pt-24 bg-cream min-h-screen">
      {/* Hero */}
      <section className="bg-navy text-white py-20 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=1920&auto=format&fit=crop&q=70"
            alt=""
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/95 to-navy/70" />
        </div>
        <div className="container-xl relative">
          <p className="eyebrow mb-5" style={{ color: '#F39C12' }}>Notre équipe</p>
          <h1
            className="font-display font-bold text-white leading-none mb-5"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Des chefs <span className="text-terra italic font-medium">passionnés.</span>
          </h1>
          <p className="text-white/70 max-w-xl leading-relaxed mb-10">
            Tous nos chefs sont certifiés SAP, couverts par une assurance professionnelle et
            rigoureusement sélectionnés. Choisissez votre chef selon votre région.
          </p>

          <div className="flex flex-wrap gap-x-10 gap-y-6">
            {[
              { value: '4',     label: 'Chefs certifiés' },
              { value: '4.8',   label: 'Note moyenne' },
              { value: '575+',  label: 'Sessions réalisées' },
              { value: '100%',  label: 'Satisfaction' },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl lg:text-4xl font-bold text-terra leading-none">{s.value}</p>
                <p className="text-white/60 text-xs mt-2 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-xl py-16">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => setActiveRegion(region)}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                  activeRegion === region
                    ? 'border-terra bg-terra text-white'
                    : 'border-[rgba(31,26,20,0.12)] text-ink-mid hover:border-terra hover:text-terra'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFilterAvailable(!filterAvailable)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border transition-all sm:ml-auto ${
              filterAvailable
                ? 'border-[#3D8B5C] text-[#3D8B5C] bg-[#E6F4EA]'
                : 'border-[rgba(31,26,20,0.12)] text-ink-mid hover:border-[#3D8B5C] hover:text-[#3D8B5C]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterAvailable ? 'bg-[#3D8B5C]' : 'bg-ink-soft/40'}`} />
            Disponibles uniquement
          </button>
        </div>

        {/* Chef cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {filtered.map((chef, i) => (
              <motion.div
                key={chef.id}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="card-base overflow-hidden group"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Photo */}
                  <div className="relative w-full sm:w-48 h-56 sm:h-auto flex-shrink-0 overflow-hidden">
                    <img
                      src={chef.avatar}
                      alt={chef.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className={`absolute top-3 left-3 chip ${
                      chef.available ? 'bg-[#E6F4EA] text-[#3D8B5C] border-[#3D8B5C]/40' : 'bg-cream-soft text-ink-soft border-ink-soft/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${chef.available ? 'bg-[#3D8B5C]' : 'bg-ink-soft/60'}`} />
                      {chef.available ? 'Disponible' : 'Complet'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-6 flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h2 className="font-display text-2xl font-bold text-navy leading-tight">
                          {chef.name}
                        </h2>
                        <p className="text-terra text-sm font-semibold mt-1">{chef.specialty}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-display text-2xl font-bold text-navy leading-none">
                          {chef.pricePerSession}€
                        </p>
                        <p className="text-xs text-ink-soft mt-1">/session</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-ink-mid">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-terra" />
                        {chef.city}, {chef.region}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber text-amber" />
                        {chef.rating} ({chef.reviewCount} avis)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-terra" />
                        {chef.sessionsDone} sessions
                      </span>
                    </div>

                    <p className="text-ink-mid text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
                      {chef.bio}
                    </p>

                    {chef.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {chef.specialties.map((s) => (
                          <span key={s} className="chip chip-cream text-[10px]">{s}</span>
                        ))}
                      </div>
                    )}

                    {chef.badges.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-5">
                        {chef.badges.map((b) => (
                          <span key={b} className="flex items-center gap-1 text-[11px] text-terra font-semibold">
                            <Check className="w-3 h-3" strokeWidth={3} />
                            {b}
                          </span>
                        ))}
                      </div>
                    )}

                    {chef.available ? (
                      <ReserveButton className="self-start text-xs px-5 py-2.5">
                        Réserver avec ce chef
                        <ArrowRight className="w-3.5 h-3.5 icon-arrow" />
                      </ReserveButton>
                    ) : (
                      <span className="self-start btn-outline text-xs px-5 py-2.5 opacity-50 pointer-events-none">
                        Liste d&apos;attente
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Join CTA */}
        <div className="mt-16 bg-paper rounded-3xl p-10 lg:p-14 text-center border border-[rgba(31,26,20,0.06)]">
          <p className="eyebrow mb-4 justify-center">Vous êtes chef cuisinier ?</p>
          <h3 className="font-display text-3xl lg:text-4xl font-bold text-navy mb-4">
            Rejoignez la plateforme Lab&apos;s Food
          </h3>
          <p className="text-ink-mid max-w-xl mx-auto mb-8 leading-relaxed">
            Développez votre activité, gérez votre agenda librement et accédez à une clientèle
            qualifiée partout en France. Nous vous accompagnons dans votre déclaration SAP.
          </p>
          <Link href="/chefs/rejoindre" className="btn-primary">
            Candidater comme chef
            <ArrowRight className="w-4 h-4 icon-arrow" />
          </Link>
        </div>
      </div>
    </div>
  )
}
