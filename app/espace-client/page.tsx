'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarRange,
  Clock,
  Sparkles,
  ShoppingBasket,
  ChefHat,
  Trophy,
  MessageCircle,
  Flame,
} from 'lucide-react'
import {
  DASHBOARD_ORDERS,
  DASHBOARD_STATS,
  CHAT_MESSAGES,
  CUSTOM_REQUESTS,
  ORDER_STATUS_LABEL,
} from '@/lib/dashboard-mock'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function DashboardOverviewPage() {
  const upcoming = DASHBOARD_ORDERS.find((o) => ['pending', 'confirmed'].includes(o.status))
  const lastMessage = CHAT_MESSAGES[CHAT_MESSAGES.length - 1]
  const pendingCustom = CUSTOM_REQUESTS[0]

  return (
    <div className="space-y-6">
      {/* ── Hero card ─────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-mid to-navy text-white p-6 lg:p-8"
      >
        {/* <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber/30 blur-3xl pointer-events-none" /> */}
        {/* <div className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full bg-mint/15 blur-3xl pointer-events-none" /> */}

        <div className="relative grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-end">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/20 text-amber text-[10px] font-mono uppercase tracking-[0.2em]">
              <Flame className="w-3 h-3" /> Prochaine session
            </span>
            {upcoming ? (
              <>
                <h2 className="font-display text-3xl lg:text-4xl font-bold mt-4 leading-tight">
                  {formatDate(upcoming.date)}
                </h2>
                <p className="text-white/65 mt-2 text-sm">
                  {upcoming.timeSlot} · Avec <span className="text-amber font-semibold">{upcoming.chef}</span> · Formule {upcoming.formula}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {upcoming.meals.slice(0, 3).map((m) => (
                    <span key={m.name} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/15">
                      {m.name}
                    </span>
                  ))}
                  {upcoming.meals.length > 3 && (
                    <span className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/60">
                      +{upcoming.meals.length - 3} autres
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/espace-client/commandes/${upcoming.id}`}
                    className="inline-flex items-center gap-2 bg-amber hover:bg-amber-deep text-navy font-semibold rounded-full px-5 py-2.5 text-sm transition-colors"
                  >
                    Voir le détail
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/espace-client/messages"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white rounded-full px-5 py-2.5 text-sm transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Écrire à Ivy
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-3xl font-bold mt-4">Pas de session prévue</h2>
                <p className="text-white/65 mt-2 text-sm">Lance ta prochaine session de batch cooking.</p>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber font-mono mb-3">
              Cette saison chez Lab&apos;s Food
            </p>
            <Stat label="Sessions réalisées" value={DASHBOARD_STATS.sessionsTotal} accent="amber" />
            <Stat label="Plats cuisinés" value={DASHBOARD_STATS.mealsCooked} />
            <Stat label="Heures gagnées" value={`${DASHBOARD_STATS.hoursSaved} h`} />
            <Stat label="Crédit d'impôt cumulé" value={`${DASHBOARD_STATS.moneySaved} €`} accent="mint" />
          </div>
        </div>
      </motion.section>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <QuickAction
          href="/espace-client/menus"
          Icon={ChefHat}
          title="Menus"
          subtitle="Découvrir cette semaine"
          accent="amber"
        />
        <QuickAction
          href="/espace-client/personnalisation"
          Icon={Sparkles}
          title="Personnaliser"
          subtitle="Brunch, régime, événement…"
          accent="mint"
        />
        <QuickAction
          href="/espace-client/commandes"
          Icon={CalendarRange}
          title="Commandes"
          subtitle="Suivi & historique"
          accent="navy"
        />
        <QuickAction
          href="/espace-client/statistiques"
          Icon={Trophy}
          title="Statistiques"
          subtitle="Tes plats, ton temps gagné"
          accent="amber"
        />
      </section>

      {/* ── 2-column row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-paper rounded-3xl p-6 border border-[rgba(31,42,55,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-navy">Sessions récentes</h3>
            <Link href="/espace-client/commandes" className="text-xs font-semibold text-amber hover:underline inline-flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
            {DASHBOARD_ORDERS.slice(0, 3).map((o) => (
              <li key={o.id} className="py-3 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-soft text-amber-deep flex items-center justify-center flex-shrink-0">
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">
                    {o.formula} · {o.meals.length} plats
                  </p>
                  <p className="text-xs text-ink-soft truncate">
                    {formatDate(o.date)} · {o.amountTTC}€ TTC
                  </p>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full ${o.status === 'delivered'
                      ? 'bg-mint text-mint-ink'
                      : o.status === 'pending'
                        ? 'bg-amber-soft text-amber-deep'
                        : 'bg-cream-deep text-navy'
                    }`}
                >
                  {ORDER_STATUS_LABEL[o.status]}
                </span>
                <Link
                  href={`/espace-client/commandes/${o.id}`}
                  className="text-ink-soft hover:text-navy"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Activity */}
        <div className="space-y-6">
          {/* Last message */}
          <div className="bg-mint/40 border border-mint-deep/40 rounded-3xl p-5">
            <div className="flex items-center gap-2 text-mint-ink text-[10px] uppercase tracking-[0.2em] font-mono mb-3">
              <MessageCircle className="w-3.5 h-3.5" /> Dernier message
            </div>
            <p className="text-sm font-semibold text-navy mb-1">{lastMessage.author}</p>
            <p className="text-sm text-ink-mid leading-relaxed line-clamp-3">{lastMessage.text}</p>
            <Link
              href="/espace-client/messages"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-mint-ink hover:underline"
            >
              Répondre <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Custom request */}
          {pendingCustom && (
            <div className="bg-paper border border-[rgba(31,42,55,0.06)] rounded-3xl p-5">
              <div className="flex items-center gap-2 text-amber text-[10px] uppercase tracking-[0.2em] font-mono mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Demande perso
              </div>
              <p className="text-sm font-semibold text-navy mb-1">{pendingCustom.title}</p>
              <p className="text-xs text-ink-soft mb-3">
                Statut : <span className="text-navy font-semibold">{pendingCustom.status}</span>
                {pendingCustom.quote && ` · ${pendingCustom.quote.amountTTC}€ proposés`}
              </p>
              <Link
                href="/espace-client/personnalisation"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber hover:underline"
              >
                Voir la demande <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: 'amber' | 'mint' }) {
  const accentClass =
    accent === 'amber' ? 'text-amber' : accent === 'mint' ? 'text-mint-deep' : 'text-white'
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-white/55 uppercase tracking-[0.12em]">{label}</span>
      <span className={`font-display text-xl font-bold ${accentClass}`}>{value}</span>
    </div>
  )
}

function QuickAction({
  href,
  Icon,
  title,
  subtitle,
  accent,
}: {
  href: string
  Icon: any
  title: string
  subtitle: string
  accent: 'amber' | 'mint' | 'navy'
}) {
  const styles =
    accent === 'amber'
      ? 'bg-amber-soft text-amber-deep'
      : accent === 'mint'
        ? 'bg-mint text-mint-ink'
        : 'bg-navy text-amber'
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-paper border border-[rgba(31,42,55,0.06)] p-4 hover:border-amber transition-colors flex items-center gap-3"
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${styles}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy leading-tight truncate">{title}</p>
        <p className="text-[11px] text-ink-soft mt-0.5 truncate">{subtitle}</p>
      </div>
    </Link>
  )
}
