'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  CalendarRange,
  ChefHat,
  CreditCard,
  Info,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Ticket,
  X,
} from 'lucide-react'
import { DASHBOARD_ORDERS } from '@/lib/dashboard-mock'
import { PAYMENT_CARDS } from '@/lib/client/mock'
import {
  buildCheckoutPayload,
  confirmUrssaf,
  firstAvailable,
  formatEuros,
  methodsFor,
  openCheckout,
  recordPayment,
  settlementFor,
  type PaymentMethodId,
} from '@/lib/client/payments'

/* ─────────────────────────────────────────────────────────────────────────────
   Règlement d'une prestation réalisée.

   Une page et pas une modale : un paiement doit survivre à un rechargement,
   se partager par lien, et revenir de Stripe sur une URL. Le choix du moyen
   n'est pas cosmétique — il change le montant dû aujourd'hui, donc chaque
   option porte son montant, et c'est ce montant qui décide.
   ───────────────────────────────────────────────────────────────────────────── */

const METHOD_ICON: Record<PaymentMethodId, typeof CreditCard> = {
  urssaf: BadgeEuro,
  card: CreditCard,
  cesu: Ticket,
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function MockSettlement({ id }: { id: string }) {
  const router = useRouter()
  const order = DASHBOARD_ORDERS.find((o) => o.id === id)

  const methods = useMemo(() => (order ? methodsFor(order.chefId) : []), [order])
  // Présélection du premier moyen disponible — le plus avantageux de la liste.
  // Personne n'arrive ici pour comparer des cases vides.
  const [method, setMethod] = useState<PaymentMethodId | null>(() =>
    order ? firstAvailable(methodsFor(order.chefId)) : null,
  )
  const [cesuAmount, setCesuAmount] = useState('')
  const [cardId, setCardId] = useState<string | null>(
    PAYMENT_CARDS.find((c) => c.isDefault)?.id ?? null,
  )
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!order) return <NotFound />

  if (order.payment.status === 'paid') {
    return (
      <Settled
        reference={order.reference}
        amount={order.payment.amountPaid ?? order.amountAfterTax}
        receipt={order.payment.receiptRef}
        href={`/espace-client/commandes/${order.id}`}
      />
    )
  }

  if (order.status !== 'delivered') {
    return (
      <TooEarly date={formatDate(order.date)} href={`/espace-client/commandes/${order.id}`} />
    )
  }

  const titres = Number(cesuAmount.replace(',', '.')) || 0
  const settlement = settlementFor(order, method ?? 'card', titres)
  const cesuTooHigh = method === 'cesu' && titres > order.amountTTC
  const needsCard = method !== null && settlement.dueNow > 0
  // L'avance immédiate n'encaisse rien ici : elle se confirme, et l'URSSAF agit.
  const isAdvance = method === 'urssaf'
  const blocked = method === null || cesuTooHigh || pending

  async function pay() {
    if (method === null || blocked) return
    setPending(true)
    setError(null)
    try {
      const session = await openCheckout(
        buildCheckoutPayload(order!, method, {
          cesuAmount: titres,
          savedCardId: needsCard ? cardId : null,
          origin: window.location.origin,
        }),
      )
      recordPayment(order!.id, method, settlement.dueNow)
      router.push(session.url.replace(window.location.origin, ''))
    } catch {
      setPending(false)
      setError(
        'La session de paiement n’a pas pu s’ouvrir. Votre prestation n’a pas été débitée — réessayez dans un instant.',
      )
    }
  }

  async function confirmAdvance() {
    setPending(true)
    setError(null)
    try {
      await confirmUrssaf(order!.id)
      recordPayment(order!.id, 'urssaf', settlement.debitedLater)
      setConfirming(false)
      router.push(`/espace-client/commandes/${order!.id}?paiement=succes`)
    } catch {
      setPending(false)
      setError(
        'La confirmation n’est pas passée. Rien n’a été transmis à l’URSSAF — réessayez dans un instant.',
      )
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/espace-client/commandes/${order.id}`}
        className="hit inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour à la prestation
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          {order.reference}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-navy lg:text-4xl">
          Régler la prestation
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-mid">
          <span className="inline-flex items-center gap-1.5">
            <ChefHat className="h-4 w-4 text-amber-ink" /> {order.chef}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="h-4 w-4 text-amber-ink" /> {formatDate(order.date)}
          </span>
          <span>
            {order.meals.length} plats · {order.persons} pers.
          </span>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="space-y-5 lg:col-span-3">
          <fieldset>
            <legend className="mb-1 font-display text-lg font-bold text-navy">
              Comment souhaitez-vous régler ?
            </legend>
            <p className="mb-4 text-sm text-ink-mid">
              {order.chef.split(' ')[0]} accepte {methods.length === 1 ? 'un seul moyen' : `${methods.length} moyens`} de
              paiement. Le montant dû aujourd’hui change selon celui que vous choisissez.
            </p>

            <div className="space-y-3">
              {methods.map(({ spec, available, reason, action }) => {
                const Icon = METHOD_ICON[spec.id]
                const due = settlementFor(order, spec.id, spec.id === 'cesu' ? titres : 0).dueNow
                const active = method === spec.id
                return (
                  <div key={spec.id}>
                    <label
                      className={`flex cursor-pointer gap-4 rounded-2xl border-[1.5px] p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
                        !available
                          ? 'cursor-not-allowed border-[rgba(31,42,55,0.08)] bg-cream-soft/60 opacity-70'
                          : active
                            ? 'border-navy bg-paper'
                            : 'border-[rgba(31,42,55,0.1)] bg-paper hover:border-[rgba(31,42,55,0.26)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        className="sr-only"
                        value={spec.id}
                        checked={active}
                        disabled={!available}
                        onChange={() => setMethod(spec.id)}
                      />
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          active ? 'bg-navy text-amber' : 'bg-cream-soft text-navy'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <span className="font-display text-base font-bold text-navy">
                            {spec.label}
                          </span>
                          {available &&
                            (spec.id === 'urssaf' ? (
                              <span className="font-display text-lg font-bold text-amber-ink">
                                Rien à payer
                              </span>
                            ) : (
                              <span className="font-display text-lg font-bold tabular-nums text-navy">
                                {formatEuros(due)}
                                <span className="ml-1 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
                                  aujourd’hui
                                </span>
                              </span>
                            ))}
                        </span>
                        <span className="mt-0.5 block text-[13px] font-semibold text-amber-ink">
                          {spec.tagline}
                        </span>
                        <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-mid">
                          {spec.detail}
                        </span>
                      </span>
                    </label>

                    {!available && reason && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-[13px] text-ink-mid">
                        <Info className="h-3.5 w-3.5 shrink-0 text-amber-ink" />
                        {reason}
                        {action && (
                          <Link href={action.href} className="font-semibold text-navy underline">
                            {action.label}
                          </Link>
                        )}
                      </p>
                    )}

                    {available && active && spec.id === 'cesu' && (
                      <div className="mt-3 rounded-2xl bg-cream-soft p-4">
                        <label
                          htmlFor="cesu"
                          className="block text-[13px] font-semibold text-navy"
                        >
                          Montant de titres CESU remis à {order.chef.split(' ')[0]}
                        </label>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            id="cesu"
                            inputMode="decimal"
                            value={cesuAmount}
                            onChange={(e) => setCesuAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                            placeholder="0"
                            aria-invalid={cesuTooHigh}
                            aria-describedby="cesu-hint"
                            className={`w-32 rounded-xl border-[1.5px] bg-paper px-3 py-2 font-display text-lg font-bold tabular-nums text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
                              cesuTooHigh ? 'border-red-400' : 'border-[rgba(31,42,55,0.14)]'
                            }`}
                          />
                          <span className="tabular-nums font-display text-lg font-bold text-ink-soft">€</span>
                        </div>
                        <p
                          id="cesu-hint"
                          className={`tabular-nums mt-2 text-[13px] ${cesuTooHigh ? 'font-semibold text-red-700' : 'text-ink-mid'}`}
                        >
                          {cesuTooHigh
                            ? `Vos titres dépassent le prix de la prestation. Le maximum utilisable ici est ${formatEuros(order.amountTTC)}.`
                            : `Le solde part par carte. Laissez à 0 si vous préférez tout régler par carte.`}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </fieldset>

          {needsCard && (
            <fieldset>
              <legend className="mb-3 font-display text-lg font-bold text-navy">
                Avec quelle carte ?
              </legend>
              <div className="space-y-2">
                {PAYMENT_CARDS.map((c) => (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
                      cardId === c.id
                        ? 'border-navy bg-paper'
                        : 'border-[rgba(31,42,55,0.1)] bg-paper hover:border-[rgba(31,42,55,0.26)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="card"
                      className="sr-only"
                      checked={cardId === c.id}
                      onChange={() => setCardId(c.id)}
                    />
                    <CreditCard className="h-4 w-4 shrink-0 text-navy" aria-hidden />
                    <span className="flex-1 text-sm text-navy">
                      <span className="font-semibold">{c.brand}</span>
                      <span className="text-ink-mid"> •••• {c.last4}</span>
                    </span>
                    <span className="text-xs tabular-nums text-ink-soft">exp. {c.expiry}</span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-dashed px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
                    cardId === null
                      ? 'border-navy bg-paper'
                      : 'border-[rgba(31,42,55,0.16)] hover:border-[rgba(31,42,55,0.32)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="card"
                    className="sr-only"
                    checked={cardId === null}
                    onChange={() => setCardId(null)}
                  />
                  <Plus className="h-4 w-4 shrink-0 text-navy" aria-hidden />
                  <span className="text-sm text-navy">
                    Payer avec une autre carte
                    <span className="block text-xs text-ink-mid">
                      Vous la saisirez sur la page sécurisée de Stripe.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>
          )}
        </section>

        <aside className="lg:col-span-2">
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-3xl bg-navy p-6 text-white">
              <p className="text-xs uppercase tracking-[0.12em] text-amber">
                À régler aujourd’hui
              </p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums text-amber">
                {formatEuros(settlement.dueNow)}
              </p>
              {isAdvance && (
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                  Vous ne sortez pas votre carte : l’URSSAF s’occupe de tout.
                </p>
              )}

              <dl className="tabular-nums mt-5 space-y-2 border-t border-white/12 pt-4 text-sm">
                <Line label="Prestation" value={formatEuros(settlement.total)} />
                {settlement.deductionLabel && settlement.deducted > 0 && (
                  <Line
                    label={settlement.deductionLabel}
                    value={`− ${formatEuros(settlement.deducted)}`}
                    accent
                  />
                )}
                {settlement.debitedLater > 0 && (
                  <Line
                    label="Prélevé ensuite par l’URSSAF"
                    value={formatEuros(settlement.debitedLater)}
                  />
                )}
                {settlement.creditLater > 0 && (
                  <Line
                    label="Crédit d’impôt l’année prochaine"
                    value={formatEuros(settlement.creditLater)}
                    muted
                  />
                )}
              </dl>

              <button
                type="button"
                onClick={() => (isAdvance ? setConfirming(true) : pay())}
                disabled={blocked}
                className="btn btn-amber mt-6 w-full justify-center text-xs disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    {isAdvance ? 'Transmission à l’URSSAF…' : 'Ouverture du paiement sécurisé…'}
                  </>
                ) : isAdvance ? (
                  <>
                    Confirmer la prestation
                    <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
                  </>
                ) : (
                  <>
                    <Lock className="tabular-nums h-3.5 w-3.5" aria-hidden />
                    Payer {formatEuros(settlement.dueNow)} sur Stripe
                    <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
                  </>
                )}
              </button>

              <p aria-live="polite" className="mt-3 text-xs leading-relaxed text-white/60">
                {pending
                  ? isAdvance
                    ? 'Ne fermez pas cette page.'
                    : 'Ne fermez pas cette page, la redirection est en cours.'
                  : isAdvance
                    ? 'Votre chef est réglé par l’URSSAF. Vous n’avancez rien et vous n’attendez pas l’année prochaine.'
                    : 'Vous finalisez le paiement chez Stripe, puis revenez ici. Lab’s Food ne voit jamais vos coordonnées bancaires.'}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-2xl bg-red-50 p-4 text-[13px] leading-relaxed text-red-800"
              >
                {error}
              </p>
            )}

            <div className="flex gap-3 rounded-3xl bg-mint/40 p-4 text-[13px] leading-relaxed text-navy">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" aria-hidden />
              <p>
                Un problème sur cette prestation ? Ouvrez un litige avant de régler : le paiement
                est suspendu le temps de l’examen.{' '}
                <Link href="/espace-client/messages" className="font-semibold underline">
                  Signaler un problème
                </Link>
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Rien n'est encaissé ici, mais un prélèvement part ensuite du compte du
          client : il doit savoir ce qu'il déclenche avant de le déclencher. */}
      <Dialog.Root open={confirming} onOpenChange={(v) => !pending && setConfirming(v)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-paper p-6 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2 data-[state=closed]:[animation-duration:120ms]">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="font-display text-xl font-bold leading-tight text-navy">
                Confirmer la prestation
              </Dialog.Title>
              <Dialog.Close
                aria-label="Fermer"
                disabled={pending}
                className="hit flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <Dialog.Description className="mt-2 text-sm leading-relaxed text-ink-mid">
              Vous confirmez que {order.chef} est bien passé le {formatDate(order.date)} et
              que la prestation est faite.
            </Dialog.Description>

            <ul className="mt-4 space-y-2.5 border-y border-[rgba(31,42,55,0.08)] py-4 text-sm">
              <li className="flex items-baseline justify-between gap-4">
                <span className="text-ink-mid">Vous réglez maintenant</span>
                <span className="tabular-nums font-display text-lg font-bold text-navy">0 €</span>
              </li>
              <li className="flex items-baseline justify-between gap-4">
                <span className="text-ink-mid">L’URSSAF prélève sur votre compte</span>
                <span className="font-semibold tabular-nums text-navy">
                  {formatEuros(settlement.debitedLater)}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-4">
                <span className="text-ink-mid">Crédit d’impôt déduit tout de suite</span>
                <span className="font-semibold tabular-nums text-mint-ink">
                  {formatEuros(settlement.deducted)}
                </span>
              </li>
            </ul>

            <p className="mt-4 text-[13px] leading-relaxed text-ink-mid">
              L’URSSAF verse ensuite sa part à {order.chef.split(' ')[0]} : vous n’avez plus
              rien à faire. Un problème sur la prestation ? Ouvrez un litige avant de
              confirmer.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmAdvance}
                disabled={pending}
                className="btn btn-primary flex-1 justify-center text-xs disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Transmission…
                  </>
                ) : (
                  <>Oui, la prestation est faite</>
                )}
              </button>
              <Dialog.Close disabled={pending} className="btn btn-outline text-xs">
                Annuler
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

function Line({
  label,
  value,
  accent,
  muted,
}: {
  label: string
  value: string
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={muted ? 'text-white/50' : 'text-white/70'}>{label}</dt>
      <dd
        className={`shrink-0 tabular-nums ${
          accent ? 'font-semibold text-mint' : muted ? 'text-white/50' : 'text-white'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto max-w-lg py-12 text-center"
    >
      {children}
    </div>
  )
}

function NotFound() {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-navy">Prestation introuvable</h1>
      <p className="mt-2 text-sm text-ink-mid">
        Rien à régler ici : cette prestation n’existe pas ou ne vous appartient pas.
      </p>
      <Link href="/espace-client/commandes" className="btn btn-primary mt-6 text-xs">
        <ArrowLeft className="h-4 w-4" />
        Mes prestations
      </Link>
    </Shell>
  )
}

function TooEarly({ date, href }: { date: string; href: string }) {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-navy">La prestation n’a pas eu lieu</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-mid">
        Le règlement s’ouvre une fois votre chef passé, le {date}. Rien ne vous est demandé avant.
      </p>
      <Link href={href} className="btn btn-primary mt-6 text-xs">
        <ArrowLeft className="h-4 w-4" />
        Voir la prestation
      </Link>
    </Shell>
  )
}

function Settled({
  reference,
  amount,
  receipt,
  href,
}: {
  reference: string
  amount: number
  receipt?: string
  href: string
}) {
  return (
    <Shell>
      <span
        aria-hidden
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint text-mint-ink"
      >
        <ShieldCheck className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">
        Cette prestation est réglée
      </h1>
      <p className="tabular-nums mt-2 text-sm text-ink-mid">
        {formatEuros(amount)} encaissés sur {reference}
        {receipt && <> · reçu {receipt}</>}.
      </p>
      <Link href={href} className="btn btn-primary mt-6 text-xs">
        <ArrowLeft className="h-4 w-4" />
        Voir la prestation
      </Link>
    </Shell>
  )
}
