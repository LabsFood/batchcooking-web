'use client'

import { motion } from 'framer-motion'
import {
  ChefHat,
  Clock,
  Wallet,
  Trophy,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { DASHBOARD_STATS } from '@/lib/dashboard-mock'

export default function StatistiquesPage() {
  const max = Math.max(...DASHBOARD_STATS.weeklyMealMix.map((w) => w.meals))
  const loyaltyPct = Math.min(
    100,
    Math.round((DASHBOARD_STATS.loyaltyPoints / DASHBOARD_STATS.loyaltyTarget) * 100),
  )

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiTile Icon={ChefHat} label="Sessions" value={DASHBOARD_STATS.sessionsTotal} sub="depuis ton inscription" tone="amber" />
        <KpiTile Icon={Sparkles} label="Plats cuisinés" value={DASHBOARD_STATS.mealsCooked} sub="frais & maison" tone="mint" />
        <KpiTile Icon={Clock} label="Heures gagnées" value={`${DASHBOARD_STATS.hoursSaved} h`} sub="à faire autre chose" tone="navy" />
        <KpiTile Icon={Wallet} label="Crédit d'impôt" value={`${DASHBOARD_STATS.moneySaved} €`} sub="cumulé" tone="amber" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bars chart */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-2 bg-paper rounded-3xl p-6 border border-[rgba(31,42,55,0.06)]"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow">Activité</p>
              <h3 className="font-display text-xl font-bold text-navy mt-1">Plats / semaine</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint-ink bg-mint/40 rounded-full px-3 py-1">
              <TrendingUp className="w-3.5 h-3.5" /> +12% vs mois dernier
            </span>
          </div>

          <div className="h-44 flex items-end gap-2 lg:gap-3">
            {DASHBOARD_STATS.weeklyMealMix.map((w) => {
              const h = Math.round((w.meals / max) * 100)
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full rounded-t-2xl bg-gradient-to-b from-amber to-amber-deep relative"
                    style={{ minHeight: 8 }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-display text-sm font-bold text-navy">
                      {w.meals}
                    </span>
                  </motion.div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-soft">{w.week}</span>
                </div>
              )
            })}
          </div>
        </motion.section>

        {/* Loyalty + reserve CTA */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="bg-navy text-white rounded-3xl p-6 relative overflow-hidden"
        >
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-amber/30 blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-amber mb-2 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Club Marmitons
            </p>
            <p className="font-display text-2xl font-bold leading-tight">
              {DASHBOARD_STATS.loyaltyPoints} / {DASHBOARD_STATS.loyaltyTarget}
            </p>
            <p className="text-white/65 text-sm mt-1">sessions vers la prochaine récompense</p>

            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${loyaltyPct}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-amber to-amber-deep"
              />
            </div>

            <p className="mt-4 text-xs text-white/65 leading-relaxed">
              À <span className="text-amber font-semibold">{DASHBOARD_STATS.loyaltyTarget}</span>{' '}
              sessions, Ivy t&apos;offre un brunch chez toi avec dessert maison.
            </p>

            <Link
              href="/espace-client/menus"
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-navy bg-amber hover:bg-amber-deep rounded-full px-4 py-2.5 transition-colors"
            >
              Lancer une session
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.section>
      </div>

      {/* Badges */}
      <section className="bg-paper rounded-3xl p-6 border border-[rgba(31,42,55,0.06)]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="eyebrow">Wall of fame</p>
            <h3 className="font-display text-xl font-bold text-navy mt-1">Tes badges</h3>
          </div>
          <p className="text-xs text-ink-soft">{DASHBOARD_STATS.badges.length} débloqués</p>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {DASHBOARD_STATS.badges.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl bg-gradient-to-br from-amber-soft via-amber-soft/60 to-mint/40 border border-amber/20 p-4 text-center"
            >
              <div className="text-3xl mb-2" aria-hidden>{b.emoji}</div>
              <p className="font-display text-sm font-bold text-navy">{b.label}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft mt-1">
                {new Date(b.earnedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              </p>
            </li>
          ))}
          {/* Locked badge */}
          <li className="rounded-2xl bg-cream-soft border border-dashed border-[rgba(31,42,55,0.15)] p-4 text-center">
            <div className="text-3xl mb-2 grayscale opacity-60" aria-hidden>🔒</div>
            <p className="font-display text-sm font-bold text-ink-soft">Globe-trotteur</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft mt-1">5 cuisines essayées</p>
          </li>
        </ul>
      </section>
    </div>
  )
}

function KpiTile({
  Icon,
  label,
  value,
  sub,
  tone,
}: {
  Icon: any
  label: string
  value: string | number
  sub: string
  tone: 'amber' | 'mint' | 'navy'
}) {
  const styles =
    tone === 'amber'
      ? 'bg-amber-soft text-amber-deep'
      : tone === 'mint'
        ? 'bg-mint text-mint-ink'
        : 'bg-navy text-amber'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles} mb-4`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-display text-3xl font-bold text-navy">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft mt-1.5 font-semibold">{label}</p>
      <p className="text-xs text-ink-soft mt-1">{sub}</p>
    </motion.div>
  )
}
