'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, Check, Clock, Users, Flame, Sparkles, ArrowRight, ChefHat } from 'lucide-react'
import { WEEKLY_MEALS } from '@/lib/mock-data'
import ReserveButton from '@/components/shared/ReserveButton'

function DashboardMenusInner() {
  const params = useSearchParams()
  const reserveMode = params.get('reserve') === '1'
  const [picked, setPicked] = useState<string[]>([])
  const MAX = 7
  const toggle = (id: string) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX ? [...p, id] : p,
    )

  return (
    <div className="space-y-6">
      {/* Reserve-flow banner */}
      {reserveMode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-amber-soft/70 border border-amber/40 p-4 lg:p-5 flex items-start gap-3"
        >
          <span className="w-10 h-10 rounded-xl bg-amber text-navy flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="flex-1 text-sm text-navy">
            <p className="font-semibold">D&apos;abord les plats, ensuite la réservation.</p>
            <p className="text-xs text-ink-mid mt-0.5 leading-relaxed">
              Sélectionne entre 3 et {MAX} plats ci-dessous, puis clique sur
              <strong className="text-navy"> Continuer ma réservation</strong>.
            </p>
          </div>
        </motion.div>
      )}

      {/* Hero strip */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-mint via-mint/80 to-mint-deep/30 p-6 lg:p-7 border border-mint-deep/30">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-center">
          <div>
            <p className="eyebrow mb-3" style={{ color: 'var(--mint-ink)' }}>Semaine 18</p>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy leading-tight">
              Compose ton menu — Ivy s&apos;occupe du reste.
            </h2>
            <p className="text-ink-mid text-sm mt-2 max-w-xl leading-relaxed">
              Sélectionne jusqu&apos;à <span className="font-semibold text-navy">{MAX} plats</span> pour
              ta prochaine session. Tes choix apparaissent direct dans ta commande.
            </p>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-2">
            <span className="px-3 py-1 rounded-full bg-paper text-navy text-xs font-semibold border border-mint-deep/40">
              {picked.length} / {MAX} sélectionnés
            </span>
            {picked.length >= 3 ? (
              <Link
                href={`/espace-client/reservation?meals=${picked.join(',')}`}
                className="btn btn-navy text-xs"
              >
                {reserveMode ? 'Continuer ma réservation' : 'Réserver avec ces plats'}
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </Link>
            ) : (
              <span className="btn btn-navy text-xs opacity-40 cursor-not-allowed">
                Encore {3 - picked.length} plat{3 - picked.length > 1 ? 's' : ''} minimum
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {WEEKLY_MEALS.map((meal, i) => {
          const isPicked = picked.includes(meal.id)
          return (
            <motion.button
              key={meal.id}
              type="button"
              onClick={() => toggle(meal.id)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className={`group text-left rounded-3xl overflow-hidden bg-paper border-2 transition-all relative ${
                isPicked
                  ? 'border-amber shadow-[0_18px_36px_-16px_rgba(243,156,18,0.6)]'
                  : 'border-[rgba(31,42,55,0.06)] hover:border-amber/50'
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={meal.image}
                  alt={meal.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isPicked ? 'bg-amber text-navy' : 'bg-paper/85 text-navy'
                  }`}
                >
                  {isPicked ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" />}
                </span>
                {meal.isFeatured && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-navy text-amber text-[10px] font-mono uppercase tracking-[0.12em] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Coup de cœur
                  </span>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-display text-base font-bold text-navy leading-tight line-clamp-2">
                  {meal.name}
                </h4>
                <p className="text-xs text-ink-soft mt-1.5 line-clamp-3 leading-relaxed">
                  {meal.description}
                </p>
              </div>
            </motion.button>
          )
        })}
      </section>

      {/* Custom CTA */}
      <section className="rounded-3xl p-6 lg:p-7 bg-paper border border-dashed border-amber/40 text-center">
        <span className="inline-flex w-12 h-12 rounded-full bg-amber-soft text-amber-deep items-center justify-center mb-3">
          <ChefHat className="w-5 h-5" />
        </span>
        <h3 className="font-display text-xl font-bold text-navy mb-1">
          Ton plat fétiche n&apos;est pas dans la liste ?
        </h3>
        <p className="text-sm text-ink-mid mb-4 max-w-md mx-auto">
          Demande une session sur-mesure : recettes perso, régime spécial, événement privé.
        </p>
        <Link
          href="/espace-client/personnalisation"
          className="btn btn-primary text-xs"
        >
          Faire une demande
          <ArrowRight className="w-4 h-4 icon-arrow" />
        </Link>
      </section>
    </div>
  )
}

export default function DashboardMenusPage() {
  return (
    <Suspense fallback={null}>
      <DashboardMenusInner />
    </Suspense>
  )
}
