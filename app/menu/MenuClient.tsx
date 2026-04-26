'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, ShoppingCart, Plus, Check, ChefHat, Clock, Users, Flame } from 'lucide-react'
import type { Meal } from '@/types'

export default function MenuClient({ meals }: { meals: Meal[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const MAX = 7

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id)
      : prev.length < MAX ? [...prev, id] : prev
    )
  }

  return (
    <div className="page-transition pt-24 bg-cream min-h-screen">
      {/* Header */}
      <section className="bg-navy text-white py-20 lg:py-24 relative overflow-hidden">
        <div className="container-xl relative">
          <p className="eyebrow mb-5" style={{ color: '#F39C12' }}>Cette semaine</p>
          <h1
            className="font-display font-bold text-white leading-none mb-5"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Menu de <span className="text-terra italic font-medium">la semaine.</span>
          </h1>
          <p className="text-white/70 max-w-xl leading-relaxed">
            Sélectionnez jusqu&apos;à 7 plats selon votre formule. Le menu est renouvelé
            chaque semaine par nos chefs.
          </p>
        </div>
      </section>

      {/* Sticky selection bar */}
      {selected.length > 0 && (
        <div className="sticky top-20 z-30 bg-terra py-3 shadow-[0_8px_24px_rgba(217,105,65,0.35)]">
          <div className="container-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-white">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {selected.length} plat{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
                <span className="text-white/70 ml-2">/ {MAX} max</span>
              </span>
            </div>
            <Link href={`/reservation?meals=${selected.join(',')}`} className="btn-navy text-xs px-5 py-2.5">
              Réserver ma session
              <ArrowRight className="w-3.5 h-3.5 icon-arrow" />
            </Link>
          </div>
        </div>
      )}

      <section className="py-16 lg:py-20">
        <div className="container-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {meals.map((meal, i) => {
              const isSelected = selected.includes(meal.id)
              const isFull = selected.length >= MAX && !isSelected
              return (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.5 }}
                  className={`card-base overflow-hidden group flex flex-col ${isFull ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={meal.image}
                      alt={meal.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <button
                      onClick={() => toggle(meal.id)}
                      aria-label={isSelected ? 'Retirer' : 'Ajouter'}
                      className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
                        isSelected
                          ? 'bg-terra text-white'
                          : 'bg-white text-navy hover:bg-terra hover:text-white'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" />}
                    </button>
                    {meal.dietaryTags.length > 0 && (
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {meal.dietaryTags.slice(0, 2).map((tag) => (
                          <span key={tag} className="chip chip-cream bg-white/95 backdrop-blur-sm text-[10px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-display text-lg font-bold text-navy mb-2 leading-tight">
                      {meal.name}
                    </h3>
                    <p className="text-ink-mid text-sm leading-relaxed line-clamp-2 mb-4 flex-1">
                      {meal.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-ink-soft pt-3 border-t border-[rgba(31,26,20,0.06)]">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-terra" />
                        {meal.portions}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-terra" />
                        {meal.prepTime >= 60 ? `${Math.floor(meal.prepTime / 60)}h` : `${meal.prepTime}min`}
                      </span>
                      {meal.calories && (
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-terra" />
                          {meal.calories}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Personalization CTA */}
          <div className="mt-16 p-10 bg-paper rounded-2xl border-2 border-dashed border-[rgba(217,105,65,0.3)] text-center">
            <div className="inline-flex w-14 h-14 rounded-full bg-[rgba(217,105,65,0.1)] items-center justify-center mb-4">
              <ChefHat className="w-7 h-7 text-terra" />
            </div>
            <h3 className="font-display font-bold text-navy text-2xl mb-3">
              Vous ne trouvez pas votre bonheur ?
            </h3>
            <p className="text-ink-mid mb-6 max-w-md mx-auto leading-relaxed">
              Soumettez une demande personnalisée. Notre chef vous fera une proposition tarifaire adaptée.
            </p>
            <Link href="/reservation?custom=true" className="btn-primary">
              Faire une demande personnalisée
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
