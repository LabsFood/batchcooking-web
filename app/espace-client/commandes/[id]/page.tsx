'use client'

import { Suspense, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ChefHat,
  CalendarRange,
  Clock,
  Users,
  ShoppingBasket,
  CheckCircle2,
  Circle,
  MessageCircle,
  Sparkles,
  Receipt,
  BadgeEuro,
  ShieldCheck,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import {
  DASHBOARD_ORDERS,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_FLOW,
  type OrderPayment,
  type OrderStatus,
} from '@/lib/dashboard-mock'
import { PAYMENT_METHODS, formatEuros } from '@/lib/client/payments'

const STEP_LABELS: Record<OrderStatus, string> = {
  pending: 'Reçue',
  confirmed: 'Confirmée',
  shopping: 'Liste de courses prête',
  cooking: 'Chef en cuisine',
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

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const order = DASHBOARD_ORDERS.find((o) => o.id === id)

  if (!order) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-6xl mb-4" aria-hidden>🍳</p>
        <h2 className="font-display text-2xl font-bold text-navy mb-2">
          Commande introuvable
        </h2>
        <p className="text-ink-mid mb-6">
          Cette commande n&apos;existe plus ou n&apos;a jamais existé. Retour à ta liste.
        </p>
        <Link href="/espace-client/commandes" className="btn btn-primary text-xs">
          <ArrowLeft className="w-4 h-4" />
          Toutes mes commandes
        </Link>
      </div>
    )
  }

  const currentStep = ORDER_STATUS_FLOW.indexOf(order.status)

  return (
    <div className="space-y-6">
      <Link
        href="/espace-client/commandes"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Toutes mes commandes
      </Link>

      <Suspense fallback={null}>
        <CheckoutOutcome />
      </Suspense>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-navy text-white p-6 lg:p-8"
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber/30 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber">
              {order.reference}
            </p>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mt-2 leading-tight">
              Formule {order.formula}
            </h2>
            <p className="mt-3 text-white/65 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5"><CalendarRange className="w-4 h-4 text-amber" /> {formatDate(order.date)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber" /> {order.timeSlot}</span>
              <span className="inline-flex items-center gap-1.5"><ChefHat className="w-4 h-4 text-amber" /> {order.chef}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-amber" /> {order.persons} pers.</span>
            </p>
          </div>
          <div className="flex flex-col items-start lg:items-end">
            <p className="font-display text-3xl font-bold text-amber">{order.amountTTC} €</p>
            <p className="text-xs text-white/60">soit {order.amountAfterTax}€ après crédit d&apos;impôt</p>
          </div>
        </div>
      </motion.div>

      {/* Tracker */}
      <section className="bg-paper rounded-3xl p-6 lg:p-7 border border-[rgba(31,42,55,0.06)]">
        <h3 className="font-display text-lg font-bold text-navy mb-5">Suivi de la commande</h3>
        {order.status === 'cancelled' ? (
          <p className="text-red-700 text-sm font-semibold">Cette commande a été annulée.</p>
        ) : (
          <div className="relative grid grid-cols-5 gap-2">
            <div className="absolute left-0 right-0 top-4 h-px bg-[rgba(31,42,55,0.08)]" />
            <div
              className="absolute left-0 top-4 h-px bg-amber transition-all"
              style={{ width: `${(currentStep / (ORDER_STATUS_FLOW.length - 1)) * 100}%` }}
            />
            {ORDER_STATUS_FLOW.map((step, i) => {
              const reached = i <= currentStep
              return (
                <div key={step} className="relative flex flex-col items-center text-center">
                  <span
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      reached ? 'bg-amber text-navy' : 'bg-cream-deep text-ink-soft'
                    }`}
                  >
                    {reached ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3.5 h-3.5" />}
                  </span>
                  <p
                    className={`mt-2 text-[10px] uppercase tracking-[0.12em] font-semibold ${
                      reached ? 'text-navy' : 'text-ink-soft'
                    }`}
                  >
                    {STEP_LABELS[step]}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Two-col content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          {/* Meals */}
          <div className="bg-paper rounded-3xl p-6 border border-[rgba(31,42,55,0.06)]">
            <h3 className="font-display text-lg font-bold text-navy mb-4 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-amber" /> Plats prévus
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {order.meals.map((m) => (
                <li
                  key={m.name}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-cream-soft border border-[rgba(31,42,55,0.04)]"
                >
                  <span className="w-8 h-8 rounded-lg bg-amber-soft text-amber-deep flex items-center justify-center text-xs font-bold">
                    {m.portions}
                  </span>
                  <p className="text-sm font-semibold text-navy">{m.name}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Shopping list */}
          <div className="bg-paper rounded-3xl p-6 border border-[rgba(31,42,55,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-navy flex items-center gap-2">
                <ShoppingBasket className="w-4 h-4 text-amber" /> Liste de courses
              </h3>
              <span
                className={`text-[10px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full ${
                  order.shoppingByClient ? 'bg-mint text-mint-ink' : 'bg-amber-soft text-amber-deep'
                }`}
              >
                {order.shoppingByClient ? 'Courses : à votre charge' : 'Courses : Lab’s Food'}
              </span>
            </div>

            {order.shoppingList ? (
              <div className="space-y-4">
                {order.shoppingList.map((aisle) => (
                  <div key={aisle.aisle}>
                    <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">
                      {aisle.aisle}
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aisle.items.map((it) => (
                        <li
                          key={it.name}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-cream-soft text-sm"
                        >
                          <span className="text-navy">{it.name}</span>
                          <span className="text-ink-soft text-xs">{it.qty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">
                Pas de liste détaillée pour cette commande — Lab&apos;s Food a tout géré.
              </p>
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-soft/50 border border-amber/30 rounded-3xl p-5 text-sm text-navy">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-deep font-mono mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Tes consignes
              </p>
              {order.notes}
            </div>
          )}
        </section>

        {/* Right column */}
        <aside className="space-y-4">
          <Settlement
            payment={order.payment}
            delivered={order.status === 'delivered'}
            dueAmount={order.amountAfterTax}
            href={`/espace-client/commandes/${order.id}/paiement`}
          />

          <div className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]">
            <h4 className="font-display text-base font-bold text-navy mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber" /> Récapitulatif
            </h4>
            <ul className="text-sm text-ink-mid space-y-2">
              <Row label="Forfait" value={`${order.amountTTC} €`} />
              <Row label="TVA" value="incluse" />
              <Row label="Crédit d'impôt SAP" value={`-${order.amountTTC - order.amountAfterTax} €`} accent="amber" />
              <Row label="Reste à charge" value={`${order.amountAfterTax} €`} bold />
            </ul>
          </div>

          <Link
            href="/espace-client/messages"
            className="flex items-center gap-3 bg-mint/40 border border-mint-deep/40 rounded-3xl p-4 hover:bg-mint/60 transition-colors"
          >
            <span className="w-10 h-10 rounded-xl bg-mint-deep/20 text-mint-ink flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </span>
            <div className="text-sm">
              <p className="font-semibold text-navy">Une question ?</p>
              <p className="text-xs text-ink-mid">Écris à ton chef directement.</p>
            </div>
          </Link>

          <button className="w-full text-xs text-ink-soft hover:text-red-700 transition-colors text-center">
            Demander une annulation
          </button>
        </aside>
      </div>
    </div>
  )
}

/**
 * Retour de Stripe. Le paramètre est posé par `successUrl` / `cancelUrl` de la
 * session : c'est la seule chose que le navigateur rapporte du paiement.
 */
function CheckoutOutcome() {
  const outcome = useSearchParams().get('paiement')
  if (outcome !== 'succes' && outcome !== 'annule') return null

  const ok = outcome === 'succes'
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-3xl p-4 text-sm leading-relaxed ${
        ok ? 'bg-mint/50 text-navy' : 'bg-amber-soft/70 text-navy'
      }`}
    >
      <span aria-hidden className="mt-0.5 shrink-0">
        {ok ? (
          <ShieldCheck className="h-4 w-4 text-mint-ink" />
        ) : (
          <XCircle className="h-4 w-4 text-amber-deep" />
        )}
      </span>
      <p>
        {ok ? (
          <>
            <strong className="font-semibold">Paiement accepté.</strong> Votre chef est prévenu et
            votre reçu est disponible ci-dessous.
          </>
        ) : (
          <>
            <strong className="font-semibold">Paiement abandonné.</strong> Rien n&apos;a été débité.
            Vous pouvez reprendre le règlement quand vous voulez.
          </>
        )}
      </p>
    </div>
  )
}

/** État du règlement : à régler, réglé, ou pas encore exigible. */
function Settlement({
  payment,
  delivered,
  dueAmount,
  href,
}: {
  payment: OrderPayment
  delivered: boolean
  dueAmount: number
  href: string
}) {
  if (payment.status === 'processing') {
    return (
      <div className="rounded-3xl bg-cream-soft p-5">
        <h4 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <BadgeEuro className="h-4 w-4 text-amber-deep" /> Prélèvement en cours
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">
          Vous avez confirmé la prestation en avance immédiate. L’URSSAF prélève{' '}
          {formatEuros(payment.amountPaid ?? dueAmount)} sur votre compte et règle votre
          chef. Vous n’avez rien d’autre à faire.
        </p>
      </div>
    )
  }

  if (payment.status === 'paid') {
    return (
      <div className="rounded-3xl bg-mint/40 p-5">
        <h4 className="font-display text-base font-bold text-navy flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-mint-ink" /> Prestation réglée
        </h4>
        <p className="mt-2 text-sm text-ink-mid">
          {formatEuros(payment.amountPaid ?? dueAmount)}
          {payment.method && <> · {PAYMENT_METHODS[payment.method].label}</>}
          {payment.paidAt && (
            <>
              {' '}
              le{' '}
              {new Date(payment.paidAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
              })}
            </>
          )}
        </p>
        {payment.receiptRef && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            Reçu {payment.receiptRef}
          </p>
        )}
      </div>
    )
  }

  if (payment.status === 'due' || (delivered && payment.status === 'failed')) {
    const failed = payment.status === 'failed'
    return (
      <div className="rounded-3xl bg-navy p-5 text-white">
        <h4 className="font-display text-base font-bold flex items-center gap-2">
          <BadgeEuro className="w-4 h-4 text-amber" />
          {failed ? 'Paiement à reprendre' : 'Prestation à régler'}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {failed
            ? (payment.failureMessage ??
              'Votre banque a refusé le paiement. Reprenez avec un autre moyen.')
            : 'Votre chef est passé. Choisissez votre moyen de paiement : le montant dû aujourd’hui en dépend.'}
        </p>
        {payment.dueAt && !failed && (
          <p className="mt-2 text-xs text-white/50">
            Attendu avant le{' '}
            {new Date(payment.dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </p>
        )}
        <Link href={href} className="btn btn-amber mt-4 w-full justify-center text-xs">
          {failed ? 'Reprendre le paiement' : 'Régler la prestation'}
          <ArrowRight className="icon-arrow h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <p className="rounded-3xl bg-cream-soft p-5 text-sm leading-relaxed text-ink-mid">
      Le règlement s’ouvre une fois la prestation réalisée. Rien ne vous est demandé avant.
    </p>
  )
}

function Row({
  label,
  value,
  accent,
  bold,
}: {
  label: string
  value: string
  accent?: 'amber'
  bold?: boolean
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink-soft text-xs uppercase tracking-[0.1em]">{label}</span>
      <span
        className={`${bold ? 'font-display text-lg font-bold text-navy' : ''} ${
          accent === 'amber' ? 'text-amber font-semibold' : ''
        }`}
      >
        {value}
      </span>
    </li>
  )
}
