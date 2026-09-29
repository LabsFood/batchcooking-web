'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Circle,
  Clock,
  MessageCircle,
  ShoppingBasket,
  Sparkles,
  Trophy,
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

   Ordre de lecture : ce qui arrive et où ça en est, puis la carte culinaire,
   puis ce qui s'est passé. Le bilan chiffré est une ligne de texte et non une
   rangée de tuiles : quatre nombres du même poids ne font pas une hiérarchie,
   ils font un décor.
   ───────────────────────────────────────────────────────────────────────────── */

const STEP_LABEL: Record<OrderStatus, string> = {
  pending: 'Reçue',
  confirmed: 'Confirmée',
  shopping: 'Courses',
  cooking: 'En cuisine',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

const STATUS_DOT: Record<OrderStatus, string> = {
  pending: 'bg-amber',
  confirmed: 'bg-mint-deep',
  shopping: 'bg-mint-deep',
  cooking: 'bg-terra',
  delivered: 'bg-ink-soft',
  cancelled: 'bg-red-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DashboardOverviewPage() {
  const upcoming = DASHBOARD_ORDERS.find((o) => ['pending', 'confirmed'].includes(o.status))
  const toSettle = DASHBOARD_ORDERS.find((o) => o.payment.status === 'due')
  const lastMessage = CHAT_MESSAGES[CHAT_MESSAGES.length - 1]
  const pendingCustom = CUSTOM_REQUESTS[0]
  const currentStep = upcoming ? ORDER_STATUS_FLOW.indexOf(upcoming.status) : -1

  return (
    <div className="space-y-8">
      {/* ── Ce qui arrive ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-3xl bg-navy text-white"
      >
        <div className="grid grid-cols-1 gap-px bg-white/10 lg:grid-cols-[1.7fr_1fr]">
          <div className="bg-navy p-6 lg:p-8">
            {upcoming ? (
              <>
                <p className="text-sm text-amber">Prochaine session</p>
                <h2 className="mt-2 font-display text-3xl font-bold capitalize leading-tight lg:text-[2.5rem]">
                  {formatDate(upcoming.date)}
                </h2>
                <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/70">
                  <span>{upcoming.timeSlot}</span>
                  <span>{upcoming.chef}</span>
                  <span>
                    {upcoming.meals.length} plats · {upcoming.persons} personnes
                  </span>
                </p>

                <p className="mt-5 text-sm leading-relaxed text-white/60">
                  {upcoming.meals.map((m) => m.name).join(' · ')}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href={`/espace-client/commandes/${upcoming.id}`}
                    className="inline-flex items-center gap-2 bg-amber px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-amber-deep"
                  >
                    Voir le détail
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    href="/espace-client/messages"
                    className="text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
                  >
                    Écrire à mon chef
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-amber">Aucune session prévue</p>
                <h2 className="mt-2 font-display text-3xl font-bold leading-tight lg:text-[2.5rem]">
                  Votre frigo va finir par s’en apercevoir
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
                  Choisissez un batch cooker et calez une date : le reste se prépare tout seul.
                </p>
                <Link
                  href="/espace-client/reservation"
                  className="mt-7 inline-flex items-center gap-2 bg-amber px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-amber-deep"
                >
                  Trouver un batch cooker
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </div>

          {/* Où en est la session : la question qu'on se pose vraiment. */}
          {upcoming && (
            <div className="bg-navy p-6 lg:p-7">
              <p className="mb-4 text-sm text-white/50">Où en est ma session</p>
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
                        className={
                          now
                            ? 'text-sm font-semibold text-white'
                            : done
                              ? 'text-sm text-white/65'
                              : 'text-sm text-white/35'
                        }
                      >
                        {STEP_LABEL[step]}
                      </span>
                      {now && <span className="ml-auto text-xs text-amber">en cours</span>}
                    </li>
                  )
                })}
              </ol>
              <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/45">
                Vous réglez à l’issue de la prestation, et choisissez votre moyen de paiement à ce
                moment-là.
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── Une prestation attend son règlement ───────────────────────── */}
      {toSettle && (
        <Link
          href={`/espace-client/commandes/${toSettle.id}/paiement`}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-terra bg-paper py-4 pl-5 pr-4 transition-colors hover:bg-cream-soft"
        >
          <span className="text-sm text-navy">
            <span className="font-semibold">{toSettle.chef.split(' ')[0]} est passé{' '}</span>
            le {formatDate(toSettle.date)}. Cette prestation reste à régler.
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-terra">
            Régler {toSettle.amountAfterTax} €
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </Link>
      )}

      {/* ── Bilan ─────────────────────────────────────────────────────── */}
      <section>
        <dl className="flex flex-wrap items-baseline gap-x-10 gap-y-4 border-y border-[rgba(31,42,55,0.1)] py-5">
          <Figure value={String(DASHBOARD_STATS.sessionsTotal)} label="sessions réalisées" />
          <Figure value={String(DASHBOARD_STATS.mealsCooked)} label="plats cuisinés" />
          <Figure value={`${DASHBOARD_STATS.hoursSaved} h`} label="passées à autre chose" />
          <Figure
            value={`${DASHBOARD_STATS.moneySaved} €`}
            label="de crédit d’impôt cumulé"
            accent
          />
        </dl>
      </section>

      {/* ── Carte culinaire : une tuile, la carte s'ouvre en grand ────── */}
      <CulinaryMap />

      {/* ── Sessions et activité ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h3 className="font-display text-lg font-bold text-navy">Sessions récentes</h3>
            <Link
              href="/espace-client/commandes"
              className="text-xs font-semibold text-terra underline-offset-4 hover:underline"
            >
              Tout voir
            </Link>
          </div>
          <ul className="divide-y divide-[rgba(31,42,55,0.08)] border-t border-[rgba(31,42,55,0.08)]">
            {DASHBOARD_ORDERS.slice(0, 4).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/espace-client/commandes/${o.id}`}
                  className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-paper"
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[o.status]}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy">
                      {formatDate(o.date)} · {o.chef.split(' ')[0]}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {o.meals.length} plats · {o.amountTTC} € · {ORDER_STATUS_LABEL[o.status]}
                    </span>
                  </span>
                  {o.payment.status === 'due' && (
                    <span className="whitespace-nowrap text-xs font-semibold text-terra">
                      À régler
                    </span>
                  )}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-ink-soft transition-colors group-hover:text-navy"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-8">
          <section>
            <h3 className="mb-3 font-display text-lg font-bold text-navy">Dernier message</h3>
            <div className="border-t border-[rgba(31,42,55,0.08)] pt-3">
              <p className="text-sm font-semibold text-navy">{lastMessage.author}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-mid">
                {lastMessage.text}
              </p>
              <Link
                href="/espace-client/messages"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-terra underline-offset-4 hover:underline"
              >
                Répondre
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          </section>

          {pendingCustom && (
            <section>
              <h3 className="mb-3 font-display text-lg font-bold text-navy">Demande sur-mesure</h3>
              <div className="border-t border-[rgba(31,42,55,0.08)] pt-3">
                <p className="text-sm font-semibold text-navy">{pendingCustom.title}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {pendingCustom.status}
                  {pendingCustom.quote && ` · ${pendingCustom.quote.amountTTC} € proposés`}
                </p>
                <Link
                  href="/espace-client/personnalisation"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-terra underline-offset-4 hover:underline"
                >
                  Voir la demande
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Aller ailleurs ────────────────────────────────────────────── */}
      <section>
        <h3 className="mb-3 font-display text-lg font-bold text-navy">Aller à</h3>
        <ul className="divide-y divide-[rgba(31,42,55,0.08)] border-y border-[rgba(31,42,55,0.08)]">
          <Shortcut
            href="/espace-client/menus"
            Icon={ChefHat}
            title="Menus et plats"
            subtitle="Les cartes de la semaine, chef par chef"
          />
          <Shortcut
            href="/espace-client/courses"
            Icon={ShoppingBasket}
            title="Ma liste de courses"
            subtitle="Rangée par rayon, prête à emporter"
          />
          <Shortcut
            href="/espace-client/personnalisation"
            Icon={Sparkles}
            title="Demande sur-mesure"
            subtitle="Brunch, régime particulier, événement"
          />
          <Shortcut
            href="/espace-client/statistiques"
            Icon={Trophy}
            title="Mes statistiques"
            subtitle="Vos plats, votre temps gagné"
          />
        </ul>
      </section>
    </div>
  )
}

function Figure({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span
          className={`font-display text-3xl font-bold leading-none ${
            accent ? 'text-terra' : 'text-navy'
          }`}
        >
          {value}
        </span>
        <span className="ml-2 text-sm text-ink-soft">{label}</span>
      </dd>
    </div>
  )
}

function Shortcut({
  href,
  Icon,
  title,
  subtitle,
}: {
  href: string
  Icon: typeof ChefHat
  title: string
  subtitle: string
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-paper"
      >
        <Icon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy">{title}</span>
          <span className="block truncate text-xs text-ink-soft">{subtitle}</span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-ink-soft transition-colors group-hover:text-navy"
          aria-hidden
        />
      </Link>
    </li>
  )
}
