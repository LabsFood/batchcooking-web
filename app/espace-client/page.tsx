'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChefHat,
  Circle,
  Clock,
  Flame,
  MessageCircle,
  ShoppingBasket,
  Sparkles,
  Trophy,
  Wallet,
  UtensilsCrossed,
} from 'lucide-react'
import {
  DASHBOARD_ORDERS,
  DASHBOARD_STATS,
  CHAT_MESSAGES,
  CUSTOM_REQUESTS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from '@/lib/dashboard-mock'
import CulinaryMap from '@/components/dashboard/CulinaryMap'

/* ─────────────────────────────────────────────────────────────────────────────
   Accueil client.

   Ordre de lecture : ce qui arrive (la prochaine session et où elle en est),
   puis ce qui s'est accumulé (les compteurs), puis les raccourcis, puis le
   reste. La carte culinaire tient en une tuile : elle s'ouvre en grand quand
   on veut la regarder, elle ne mange plus le haut de page.
   ───────────────────────────────────────────────────────────────────────────── */

const STEP_LABEL: Record<OrderStatus, string> = {
  pending: 'Reçue',
  confirmed: 'Confirmée',
  shopping: 'Courses',
  cooking: 'En cuisine',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

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
  const currentStep = upcoming ? ORDER_STATUS_FLOW.indexOf(upcoming.status) : -1

  return (
    <div className="space-y-6">
      {/* ── Prochaine session ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-mid to-navy p-6 text-white lg:p-8"
      >
        <div className="relative grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber">
              <Flame className="h-3 w-3" aria-hidden /> Prochaine session
            </span>

            {upcoming ? (
              <>
                <h2 className="mt-4 font-display text-3xl font-bold capitalize leading-tight lg:text-4xl">
                  {formatDate(upcoming.date)}
                </h2>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/65">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber" aria-hidden /> {upcoming.timeSlot}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ChefHat className="h-4 w-4 text-amber" aria-hidden /> {upcoming.chef}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <UtensilsCrossed className="h-4 w-4 text-amber" aria-hidden /> Formule {upcoming.formula}
                  </span>
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {upcoming.meals.slice(0, 3).map((m) => (
                    <span key={m.name} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs">
                      {m.name}
                    </span>
                  ))}
                  {upcoming.meals.length > 3 && (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
                      +{upcoming.meals.length - 3} autres
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/espace-client/commandes/${upcoming.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-amber-deep"
                  >
                    Voir le détail
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    href="/espace-client/messages"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm text-white transition-colors hover:bg-white/15"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Écrire à mon chef
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-display text-3xl font-bold">Pas de session prévue</h2>
                <p className="mt-2 text-sm text-white/65">
                  Choisissez un batch cooker et calez votre prochaine session.
                </p>
                <Link
                  href="/espace-client/chefs"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-amber-deep"
                >
                  Trouver un batch cooker
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </div>

          {/* Où en est la session : la question qu'on se pose vraiment. */}
          {upcoming && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-amber">Où en est ma session</p>
              <ol className="space-y-3">
                {ORDER_STATUS_FLOW.map((step, i) => {
                  const done = i < currentStep
                  const now = i === currentStep
                  return (
                    <li key={step} className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-mint-deep" aria-hidden />
                      ) : (
                        <Circle
                          className={`h-4 w-4 shrink-0 ${now ? 'text-amber' : 'text-white/25'}`}
                          strokeWidth={now ? 3 : 2}
                          aria-hidden
                        />
                      )}
                      <span
                        className={`text-sm ${now ? 'font-semibold text-white' : done ? 'text-white/70' : 'text-white/35'}`}
                      >
                        {STEP_LABEL[step]}
                      </span>
                      {now && (
                        <span className="ml-auto rounded-full bg-amber px-2 py-0.5 text-[10px] font-semibold text-navy">
                          En cours
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>
              <p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/45">
                Vous réglez à l&apos;issue de la prestation, et choisissez votre moyen de paiement à ce moment-là.
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Compteurs ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile
          Icon={CalendarRange}
          value={String(DASHBOARD_STATS.sessionsTotal)}
          label="Sessions réalisées"
          accent="amber"
        />
        <StatTile
          Icon={UtensilsCrossed}
          value={String(DASHBOARD_STATS.mealsCooked)}
          label="Plats cuisinés"
          accent="navy"
        />
        <StatTile
          Icon={Clock}
          value={`${DASHBOARD_STATS.hoursSaved} h`}
          label="Heures gagnées"
          accent="navy"
        />
        <StatTile
          Icon={Wallet}
          value={`${DASHBOARD_STATS.moneySaved} €`}
          label="Crédit d'impôt cumulé"
          accent="mint"
        />
      </section>

      {/* ── Carte culinaire : une tuile, la carte s'ouvre en grand ────── */}
      <CulinaryMap />

      {/* ── Raccourcis ────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <QuickAction
          href="/espace-client/menus"
          Icon={ChefHat}
          title="Menus"
          subtitle="Les cartes de la semaine"
          accent="amber"
        />
        <QuickAction
          href="/espace-client/courses"
          Icon={ShoppingBasket}
          title="Liste de courses"
          subtitle="Prête pour votre session"
          accent="mint"
        />
        <QuickAction
          href="/espace-client/personnalisation"
          Icon={Sparkles}
          title="Demande sur-mesure"
          subtitle="Brunch, régime, événement…"
          accent="navy"
        />
        <QuickAction
          href="/espace-client/statistiques"
          Icon={Trophy}
          title="Statistiques"
          subtitle="Vos plats, votre temps gagné"
          accent="amber"
        />
      </section>

      {/* ── Sessions et activité ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy">Sessions récentes</h3>
            <Link
              href="/espace-client/commandes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:underline"
            >
              Tout voir <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
          <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
            {DASHBOARD_ORDERS.slice(0, 3).map((o) => (
              <li key={o.id} className="flex items-center gap-4 py-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber-deep">
                  <CalendarRange className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">
                    {o.formula} · {o.meals.length} plats
                  </p>
                  <p className="truncate text-xs text-ink-soft">
                    {formatDate(o.date)} · {o.amountTTC} € TTC
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    o.status === 'delivered'
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
                  aria-label={`Ouvrir la session du ${formatDate(o.date)}`}
                  className="text-ink-soft hover:text-navy"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-mint-deep/40 bg-mint/40 p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mint-ink">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden /> Dernier message
            </div>
            <p className="mb-1 text-sm font-semibold text-navy">{lastMessage.author}</p>
            <p className="line-clamp-3 text-sm leading-relaxed text-ink-mid">{lastMessage.text}</p>
            <Link
              href="/espace-client/messages"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-mint-ink hover:underline"
            >
              Répondre <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>

          {pendingCustom && (
            <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-deep">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Demande sur-mesure
              </div>
              <p className="mb-1 text-sm font-semibold text-navy">{pendingCustom.title}</p>
              <p className="mb-3 text-xs text-ink-soft">
                Statut : <span className="font-semibold text-navy">{pendingCustom.status}</span>
                {pendingCustom.quote && ` · ${pendingCustom.quote.amountTTC} € proposés`}
              </p>
              <Link
                href="/espace-client/personnalisation"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber hover:underline"
              >
                Voir la demande <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({
  Icon,
  value,
  label,
  accent,
}: {
  Icon: typeof CalendarRange
  value: string
  label: string
  accent: 'amber' | 'mint' | 'navy'
}) {
  const badge =
    accent === 'amber'
      ? 'bg-amber-soft text-amber-deep'
      : accent === 'mint'
        ? 'bg-mint text-mint-ink'
        : 'bg-cream-deep text-navy'
  return (
    <div className="rounded-2xl border border-[rgba(31,42,55,0.06)] bg-paper p-4">
      <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${badge}`} aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <p className="font-display text-2xl font-bold leading-none text-navy">{value}</p>
      <p className="mt-1 text-xs leading-snug text-ink-soft">{label}</p>
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
  Icon: typeof CalendarRange
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
      className="group flex items-center gap-3 rounded-2xl border border-[rgba(31,42,55,0.06)] bg-paper p-4 transition-colors hover:border-amber"
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${styles}`} aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight text-navy">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-soft">{subtitle}</span>
      </span>
    </Link>
  )
}
