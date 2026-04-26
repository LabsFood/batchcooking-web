'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, Clock, Users, Flame, X } from 'lucide-react'
import { WORLD_RECIPES } from '@/lib/mock-data'
import type { Continent, DietaryTag } from '@/types'

const CONTINENTS: Continent[] = ['Europe', 'Afrique', 'Asie', 'Amériques', 'Moyen-Orient', 'Océanie']
const DIETS: DietaryTag[] = ['vegan', 'végétarien', 'halal', 'sans-gluten', 'sans-lactose']
const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile'] as const

const CONTINENT_EMOJI: Record<Continent, string> = {
  Europe: '🇪🇺',
  Afrique: '🌍',
  Asie: '🌏',
  Amériques: '🌎',
  'Moyen-Orient': '🕌',
  Océanie: '🌊',
}

const DIFFICULTY_CHIP: Record<string, string> = {
  Facile:    'text-[#3D8B5C] bg-[#E6F4EA] border-[#3D8B5C]/30',
  Moyen:     'text-[#9C6B0E] bg-[#FFF4DD] border-[#9C6B0E]/30',
  Difficile: 'text-[#B23A3A] bg-[#FBE7E7] border-[#B23A3A]/30',
}

export default function RecettesPage() {
  const [search, setSearch] = useState('')
  const [activeContinent, setActiveContinent] = useState<Continent | 'all'>('all')
  const [activeDiet, setActiveDiet] = useState<DietaryTag | 'all'>('all')
  const [activeDifficulty, setActiveDifficulty] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return WORLD_RECIPES.filter((r) => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.country.toLowerCase().includes(search.toLowerCase())) return false
      if (activeContinent !== 'all' && r.continent !== activeContinent) return false
      if (activeDiet !== 'all' && !r.dietaryTags.includes(activeDiet)) return false
      if (activeDifficulty !== 'all' && r.difficulty !== activeDifficulty) return false
      return true
    })
  }, [search, activeContinent, activeDiet, activeDifficulty])

  const hasFilters = activeContinent !== 'all' || activeDiet !== 'all' || activeDifficulty !== 'all' || search !== ''

  const clearFilters = () => {
    setSearch('')
    setActiveContinent('all')
    setActiveDiet('all')
    setActiveDifficulty('all')
  }

  return (
    <div className="page-transition pt-24 bg-cream min-h-screen">
      {/* Hero */}
      <section className="bg-navy text-white py-20 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&auto=format&fit=crop&q=70"
            alt=""
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/95 to-navy/70" />
        </div>
        <div className="container-xl relative">
          <p className="eyebrow mb-5" style={{ color: '#F39C12' }}>Catalogue mondial</p>
          <h1
            className="font-display font-bold text-white leading-none mb-5"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Recettes <span className="text-terra italic font-medium">du Monde.</span>
          </h1>
          <p className="text-white/70 max-w-xl leading-relaxed">
            Découvrez notre catalogue de recettes du monde entier, renouvelé régulièrement.
            Filtrez par continent, régime alimentaire ou niveau de difficulté.
          </p>
        </div>
      </section>

      <div className="container-xl py-16">
        {/* Search & Filter bar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un plat, un pays..."
              className="input-pill pl-12"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full border-2 text-sm font-semibold transition-all ${
              showFilters || hasFilters
                ? 'border-terra text-terra bg-[rgba(217,105,65,0.08)]'
                : 'border-[rgba(31,26,20,0.12)] text-ink-mid hover:border-terra hover:text-terra'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {hasFilters && <span className="w-2 h-2 bg-terra rounded-full" />}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-ink-mid hover:text-navy transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Effacer
            </button>
          )}
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-paper rounded-2xl border border-[rgba(31,26,20,0.08)] p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FilterGroup label="Continent">
                  <Pill active={activeContinent === 'all'} onClick={() => setActiveContinent('all')}>Tous</Pill>
                  {CONTINENTS.map((c) => (
                    <Pill key={c} active={activeContinent === c} onClick={() => setActiveContinent(c)}>
                      {CONTINENT_EMOJI[c]} {c}
                    </Pill>
                  ))}
                </FilterGroup>
                <FilterGroup label="Régime">
                  <Pill active={activeDiet === 'all'} onClick={() => setActiveDiet('all')}>Tous</Pill>
                  {DIETS.map((d) => (
                    <Pill key={d} active={activeDiet === d} onClick={() => setActiveDiet(d)}>{d}</Pill>
                  ))}
                </FilterGroup>
                <FilterGroup label="Difficulté">
                  <Pill active={activeDifficulty === 'all'} onClick={() => setActiveDifficulty('all')}>Toutes</Pill>
                  {DIFFICULTIES.map((d) => (
                    <Pill key={d} active={activeDifficulty === d} onClick={() => setActiveDifficulty(d)}>{d}</Pill>
                  ))}
                </FilterGroup>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-sm text-ink-mid mb-6">
          {filtered.length} recette{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Recipe grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filtered.map((recipe, i) => (
              <motion.div
                key={recipe.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                className="card-base overflow-hidden group flex flex-col"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className={`absolute top-3 right-3 chip ${DIFFICULTY_CHIP[recipe.difficulty] || 'chip-cream'}`}>
                    {recipe.difficulty}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs text-terra font-mono mb-2 uppercase tracking-wider">
                    {CONTINENT_EMOJI[recipe.continent]} {recipe.country}
                  </p>
                  <h3 className="font-display text-lg font-bold text-navy mb-2 group-hover:text-terra transition-colors leading-tight">
                    {recipe.name}
                  </h3>
                  <p className="text-ink-mid text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
                    {recipe.description}
                  </p>

                  {recipe.dietaryTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {recipe.dietaryTags.slice(0, 2).map((tag) => (
                        <span key={tag} className="chip chip-cream text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-ink-soft pt-3 border-t border-[rgba(31,26,20,0.06)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-terra" />
                      {recipe.prepTime >= 60 ? `${Math.floor(recipe.prepTime / 60)}h${recipe.prepTime % 60 > 0 ? recipe.prepTime % 60 : ''}` : `${recipe.prepTime}min`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-terra" />
                      {recipe.portions}
                    </span>
                    {recipe.calories && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-terra" />
                        {recipe.calories}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24 bg-paper rounded-2xl border border-[rgba(31,26,20,0.08)]">
            <p className="font-display text-3xl text-navy mb-3">Aucun résultat</p>
            <p className="text-ink-mid text-sm mb-6">Essayez d&apos;autres critères de recherche</p>
            <button onClick={clearFilters} className="btn-outline">
              Effacer les filtres
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-muted mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
        active
          ? 'border-terra bg-terra text-white'
          : 'border-[rgba(31,26,20,0.12)] text-ink-mid hover:border-terra hover:text-terra'
      }`}
    >
      {children}
    </button>
  )
}
