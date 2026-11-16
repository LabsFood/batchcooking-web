'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, CalendarDays, Check, Loader2, Mail, MapPin, Phone, Send, Users, Wallet, X } from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import ApprovalGate from '@/components/chef/ApprovalGate'
import StatusBadge, { OfferBadge } from '@/components/chef/StatusBadge'
import DatePicker from '@/components/shared/DatePicker'
import { dayKey } from '@/lib/time'
import { ApiError } from '@/lib/api/client'
import {
  SLOT_LABEL,
  centsToEuros,
  dayLabel,
  previewOffer,
  useChefQuotes,
  useDeclineQuote,
  usePricingRules,
  useSendOffer,
  useWithdrawOffer,
  type Quote,
  type TimeSlot,
} from '@/lib/api/quotes'

const SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening']

/** Les refus de l'API que le batch cooker peut comprendre et corriger. */
const MESSAGES: Record<string, string> = {
  OFFER_ALREADY_ACTIVE: 'Une offre est déjà en attente pour cette demande. Retirez-la avant d’en envoyer une autre.',
  QUOTE_CLOSED: 'Cette demande est close.',
  QUOTE_NOT_AWAITING_CHEF: 'Cette demande n’attend plus de réponse.',
  DATE_TOO_SOON: 'La date proposée doit être à partir de demain.',
  DATE_TOO_FAR: 'La date proposée doit être dans l’année qui vient.',
  OFFER_NOT_ACTIVE: 'Cette offre n’est plus en attente.',
}

/** Un jour à `n` jours d'ici, en date locale, au format des champs date. */
function dayFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const errorText = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.status !== 0 && error.status < 500
    ? (MESSAGES[(error.body as { code?: string } | null)?.code ?? ''] ?? fallback)
    : fallback

export default function ChefOffersPage() {
  const quotes = useChefQuotes()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const all = quotes.data ?? []
  // À répondre : aucune offre en attente, rien de conclu.
  /* `closed` n'apparaît dans aucune des deux listes : la maison a classé la
     demande, il n'y a plus rien à chiffrer ni à attendre. */
  const toAnswer = all.filter((q) => ['submitted', 'in_review', 'declined'].includes(q.status))
  const confirmed = all.filter((q) => q.status === 'accepted')
  const selected = toAnswer.find((q) => q.id === selectedId) ?? null
  const offers = all
    .flatMap((quote) => quote.offers.map((offer) => ({ quote, offer })))
    .sort((a, b) => b.offer.createdAt.localeCompare(a.offer.createdAt))

  return (
    <ChefPage
      title="Offres sur-mesure"
      subtitle="Répondez aux demandes personnalisées avec votre propre prix et vos conditions."
    >
      <div className="space-y-5">
        <ApprovalGate quoi="Vos réponses aux demandes partent" />

        <Card title={`Demandes à traiter (${toAnswer.length})`}>
          {quotes.isPending ? (
            // Deux demandes en grille, comme `RequestItem` : titre + détail, pastilles, action.
            <SkeletonGroup className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-2xl border border-transparent p-4">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="mt-1 h-4 w-1/2" />
                  <div className="mt-3 flex gap-1.5">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="mt-3 h-5 w-full" />
                  <Skeleton className="mt-4 h-10 w-36 rounded-full" />
                </div>
              ))}
            </SkeletonGroup>
          ) : quotes.isError ? (
            <div className="py-8 text-center text-sm text-ink-soft">
              {quotes.error instanceof ApiError && quotes.error.status === 403
                ? 'Les demandes sur-mesure s’ouvrent une fois votre dossier validé.'
                : 'Impossible de charger vos demandes.'}{' '}
              <button onClick={() => quotes.refetch()} className="underline font-semibold text-navy">
                Réessayer
              </button>
            </div>
          ) : toAnswer.length === 0 ? (
            <Empty text="Aucune demande personnalisée à traiter pour le moment." />
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {toAnswer.map((quote) => (
                <RequestItem
                  key={quote.id}
                  quote={quote}
                  onCompose={() => setSelectedId(quote.id)}
                />
              ))}
            </ul>
          )}
        </Card>

        {selected && (
          <OfferComposer key={selected.id} quote={selected} onClose={() => setSelectedId(null)} />
        )}

        {confirmed.length > 0 && (
          <Card title={`Prestations confirmées (${confirmed.length})`}>
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {confirmed.map((quote) => (
                <ConfirmedItem key={quote.id} quote={quote} />
              ))}
            </ul>
          </Card>
        )}

        <Card title="Suivi de mes offres">
          {offers.length === 0 ? (
            <Empty text="Vous n’avez pas encore envoyé d’offre." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.12em] text-ink-soft border-b border-[rgba(31,42,55,0.08)]">
                    <th className="pb-2 font-normal">Client</th>
                    <th className="pb-2 font-normal">Demande</th>
                    <th className="pb-2 font-normal">Net</th>
                    <th className="pb-2 font-normal">Validité</th>
                    <th className="pb-2 font-normal">Statut</th>
                    <th className="pb-2 font-normal" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(31,42,55,0.06)]">
                  {offers.map(({ quote, offer }) => (
                    <OfferRow key={offer.id} quote={quote} offerId={offer.id} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </ChefPage>
  )
}

/* ── Une demande à traiter ────────────────────────────────────────────────── */

function RequestItem({ quote, onCompose }: { quote: Quote; onCompose: () => void }) {
  const decline = useDeclineQuote()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const lastDeclined = quote.status === 'declined' ? quote.offers.find((o) => o.status === 'declined') : null

  return (
    <li className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-bold text-navy">{quote.title}</p>
          <p className="text-xs text-ink-soft">
            {quote.client?.name ?? 'Client'} · reçue le {dayLabel(quote.createdAt)}
          </p>
        </div>
        <StatusBadge tone={lastDeclined ? 'danger' : 'warning'}>
          {lastDeclined ? 'Offre refusée' : 'À répondre'}
        </StatusBadge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="text-xs px-2.5 py-1 rounded-full bg-cream-soft text-navy">{quote.cuisine}</span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-cream-soft text-navy">{quote.mealsCount} plats</span>
        {quote.diet.map((d) => (
          <span key={d} className="text-xs px-2.5 py-1 rounded-full bg-mint text-mint-ink">
            {d}
          </span>
        ))}
        {quote.allergies.map((a) => (
          <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            ⚠ {a}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-ink-mid leading-relaxed whitespace-pre-line line-clamp-5">{quote.brief}</p>

      {lastDeclined?.declineReason && (
        <p className="mt-3 text-xs text-ink-mid bg-cream-soft rounded-xl px-3 py-2">
          <span className="font-semibold text-navy">Le client a refusé votre offre :</span>{' '}
          {lastDeclined.declineReason}
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-cream-soft p-3 text-center">
        <Mini Icon={Users} label="Personnes" value={`${quote.persons}`} />
        <Mini
          Icon={CalendarDays}
          label={quote.timeSlot ? SLOT_LABEL[quote.timeSlot].split(' (')[0] : 'Date'}
          value={quote.desiredDate ? dayLabel(quote.desiredDate) : '—'}
        />
        <Mini
          Icon={quote.budgetCents ? Wallet : MapPin}
          label={quote.budgetCents ? 'Budget' : 'Lieu'}
          value={quote.budgetCents ? centsToEuros(quote.budgetCents) : (quote.address.city ?? '—')}
        />
      </div>
      {quote.budgetCents != null && quote.address.city && (
        <p className="mt-2 text-xs text-ink-soft inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {quote.address.postalCode} {quote.address.city}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {declining ? (
        <div className="mt-4 space-y-2">
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            placeholder="Pourquoi déclinez-vous ? (facultatif, lu par l’équipe Lab’s Food)"
            className="input-base resize-none text-xs"
          />
          <div className="flex gap-3 text-xs">
            <button
              disabled={decline.isPending}
              onClick={() =>
                decline.mutate(
                  { quoteId: quote.id, reason: reason.trim() || undefined },
                  { onError: (cause) => setError(errorText(cause, 'La demande n’a pas pu être déclinée.')) },
                )
              }
              className="font-semibold text-red-700 disabled:opacity-60"
            >
              Confirmer : je décline
            </button>
            <button onClick={() => setDeclining(false)} className="font-semibold text-ink-mid">
              Annuler
            </button>
          </div>
          <p className="text-xs text-ink-soft">
            La demande quittera votre liste : l’équipe la confiera à un autre batch cooker.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <button onClick={onCompose} className="btn btn-primary flex-1 justify-center text-sm">
            {lastDeclined ? 'Proposer une nouvelle offre' : 'Composer une offre'} <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeclining(true)}
            className="hit text-xs font-semibold text-ink-soft hover:text-red-700"
          >
            Décliner
          </button>
        </div>
      )}
    </li>
  )
}

/* ── Le composeur ─────────────────────────────────────────────────────────── */

/**
 * Composeur d'offre.
 *
 * Contrainte § 6.2 : le batch cooker saisit son **net perçu**, jamais le prix
 * de vente. Le prix client et le montant après crédit d'impôt sont calculés et
 * affichés en temps réel, au taux en vigueur lu depuis l'API.
 */
function OfferComposer({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const rules = usePricingRules()
  const send = useSendOffer()
  const id = useId()
  const panneau = useRef<HTMLDivElement>(null)

  const [net, setNet] = useState(quote.budgetCents ? Math.round(quote.budgetCents / 100) : 150)
  const [validityDays, setValidityDays] = useState(7)
  const [conditions, setConditions] = useState(
    'Courses incluses. Déplacement compris dans un rayon de 30 km.',
  )
  /* Sans date demandée il n'y a pas de date à garder : on en propose une. */
  const [otherDate, setOtherDate] = useState(!quote.desiredDate)
  const [date, setDate] = useState(quote.desiredDate ?? '')
  const [slot, setSlot] = useState<TimeSlot>(quote.timeSlot ?? 'evening')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  /* Le composeur s'insère sous une liste qui tient parfois deux écrans : sans
     ça, on clique « Proposer une prestation » et rien ne semble se passer. */
  useEffect(() => {
    const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panneau.current?.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' })
  }, [])

  const netCents = Math.round(net * 100)
  const preview = rules.data ? previewOffer(netCents, rules.data) : null
  const clientName = quote.client?.name ?? 'le client'

  // Les règles de l'API (`quote.rules.ts`), répétées pour le message : elle revérifie tout.
  const problem = (): string | null => {
    if (!Number.isFinite(net) || net < 10) return 'Votre net perçu est d’au moins 10 €.'
    if (net > 20_000) return 'Votre net perçu ne peut pas dépasser 20 000 €.'
    if (conditions.length > 2000) return 'Vos conditions tiennent en 2 000 caractères.'
    if (otherDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Indiquez la date que vous proposez.'
      if (date < dayFromNow(1)) return MESSAGES.DATE_TOO_SOON
      if (date > dayFromNow(365)) return MESSAGES.DATE_TOO_FAR
    }
    return null
  }

  const submit = () => {
    const refused = problem()
    if (refused) return setError(refused)
    setError(null)
    send.mutate(
      {
        quoteId: quote.id,
        netCents,
        validityDays,
        conditions: conditions.trim() || undefined,
        ...(otherDate && date ? { proposedDate: date, proposedTimeSlot: slot } : {}),
      },
      {
        onSuccess: () => setSent(true),
        onError: (cause) => setError(errorText(cause, 'L’offre n’a pas pu être envoyée. Réessayez dans un instant.')),
      },
    )
  }

  return (
    <div
      ref={panneau}
      className="scroll-mt-24"
    >
      <Card
        title={`Proposer une prestation à ${clientName}`}
        action={
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-cream-soft hover:text-navy"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Fermer
          </button>
        }
      >
        {sent ? (
          <div className="py-10 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-deep text-mint-ink">
              <Check className="h-6 w-6" aria-hidden />
            </span>
            <p className="font-display text-lg font-bold text-navy">Offre envoyée</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-mid">
              Elle passera en « Vue » dès que {clientName} l&apos;aura consultée. Vous la
              retrouvez dans le suivi, plus bas.
            </p>
          </div>
        ) : (
          /* Deux colonnes seulement à partir de `xl` : à 1024 px la barre
             latérale prend déjà 288 px, et le calendrier ne tenait plus. */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_21rem] xl:gap-8">
            <div className="space-y-6">
              <Champ
                htmlFor={`${id}-net`}
                label="Votre net perçu"
                hint="Vous saisissez ce que vous touchez. Le prix client s’en déduit, commission comprise."
              >
                <div className="relative w-full max-w-[13rem]">
                  <input
                    id={`${id}-net`}
                    type="number"
                    inputMode="decimal"
                    min={10}
                    max={20000}
                    step="0.01"
                    value={net}
                    onChange={(e) => setNet(Math.max(0, Number(e.target.value) || 0))}
                    /* Les flèches natives passaient sous le « € ». */
                    className="input-base pr-10 font-display text-xl font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span
                    aria-hidden
                    className="tabular-nums pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-display text-xl font-bold text-ink-soft"
                  >
                    €
                  </span>
                </div>
              </Champ>

              <Champ
                label="Validité de l’offre"
                hint="Passé ce délai, l’offre expire et la demande vous revient."
              >
                <div role="group" aria-label="Validité de l’offre" className="flex max-w-sm flex-wrap gap-2">
                  {[3, 7, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValidityDays(d)}
                      aria-pressed={validityDays === d}
                      className={`min-w-[5.5rem] flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold tabular-nums transition-colors ${
                        validityDays === d
                          ? 'bg-amber text-navy'
                          : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
                      }`}
                    >
                      {d} jours
                    </button>
                  ))}
                </div>
              </Champ>

              <Champ label="Date de la prestation">
                <p className="text-sm leading-relaxed text-ink-mid">
                  Demandée :{' '}
                  <strong className="font-semibold text-navy">
                    {quote.desiredDate ? dayLabel(quote.desiredDate) : 'non précisée'}
                  </strong>
                  {quote.timeSlot ? `, ${SLOT_LABEL[quote.timeSlot].toLowerCase()}` : ''}
                </p>

                {quote.desiredDate && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Choix on={!otherDate} onClick={() => setOtherDate(false)}>
                      Je garde cette date
                    </Choix>
                    <Choix on={otherDate} onClick={() => setOtherDate(true)}>
                      J’en propose une autre
                    </Choix>
                  </div>
                )}

                {otherDate && (
                  <div className="mt-3 flex flex-wrap items-start gap-4">
                    <DatePicker
                      mode="single"
                      selected={date ? new Date(`${date}T12:00:00`) : undefined}
                      onSelect={(d) => d && setDate(dayKey(d))}
                      disabled={{
                        before: new Date(`${dayFromNow(1)}T00:00:00`),
                        after: new Date(`${dayFromNow(365)}T00:00:00`),
                      }}
                      startMonth={new Date(`${dayFromNow(1)}T00:00:00`)}
                      className="w-fit rounded-2xl bg-cream-soft p-3"
                    />
                    <div className="min-w-[11rem] flex-1">
                      <label
                        htmlFor={`${id}-slot`}
                        className="mb-1.5 block text-[13px] font-semibold text-navy"
                      >
                        Créneau
                      </label>
                      <select
                        id={`${id}-slot`}
                        value={slot}
                        onChange={(e) => setSlot(e.target.value as TimeSlot)}
                        className="input-base"
                      >
                        {SLOTS.map((sl) => (
                          <option key={sl} value={sl}>
                            {SLOT_LABEL[sl]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </Champ>

              <Champ
                htmlFor={`${id}-conditions`}
                label="Conditions"
                hint="Ce qui est compris, ce qui ne l’est pas. C’est ce que le client lit avant d’accepter."
              >
                <textarea
                  id={`${id}-conditions`}
                  rows={4}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  maxLength={2000}
                  className="input-base resize-y"
                />
                <p className="mt-1 text-right text-xs tabular-nums text-ink-soft">
                  {conditions.length} / 2 000
                </p>
              </Champ>
            </div>

            {/* Le récapitulatif, calculé au taux en vigueur lu depuis l'API. */}
            <aside className="h-fit rounded-2xl bg-navy p-5 text-white lg:sticky lg:top-24">
              <h3 className="font-display text-base font-bold text-white">Ce que dit cette offre</h3>

              <dl className="tabular-nums mt-4">
                <Row label="Votre net perçu" value={centsToEuros(netCents)} strong />
                {preview && rules.data && (
                  <Row
                    label={`Commission Lab’s Food (${(rules.data.commissionBps / 100).toLocaleString('fr-FR')} %)`}
                    value={centsToEuros(preview.commissionCents)}
                    muted
                  />
                )}
              </dl>

              {preview ? (
                <div className="mt-4 border-t border-white/15 pt-4">
                  <p className="text-xs leading-none text-white/60">Ce que paie {clientName}</p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-display text-3xl font-bold leading-none tabular-nums text-amber">
                      {centsToEuros(preview.afterTaxCreditCents)}
                    </span>
                    <span className="text-xs leading-none text-white/70">après crédit d’impôt</span>
                  </p>
                  <p className="mt-2 text-xs leading-none tabular-nums text-white/60">
                    {centsToEuros(preview.clientPriceCents)} avant déduction
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-xs leading-relaxed text-white/70">
                  {rules.isError ? 'Le prix client sera calculé à l’envoi.' : 'Calcul du prix client…'}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-amber/15 px-3 py-2.5 text-xs leading-relaxed text-amber"
                >
                  {error}
                </p>
              )}

              <button
                onClick={submit}
                disabled={send.isPending}
                className="btn btn-amber mt-4 w-full justify-center text-sm disabled:opacity-60"
              >
                {send.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Envoyer l&apos;offre
              </button>

              <p className="mt-3 text-xs leading-relaxed text-white/60">
                La prestation est réglée après coup : {clientName} paie une fois qu’elle a
                eu lieu, jamais à l’acceptation de l’offre.
              </p>
            </aside>
          </div>
        )}
      </Card>
    </div>
  )
}

/** Un champ du composeur : une étiquette qui pointe vraiment sur son champ. */
function Champ({
  htmlFor,
  label,
  hint,
  children,
}: {
  htmlFor?: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy">
          {label}
        </label>
      ) : (
        <p className="text-sm font-semibold text-navy">{label}</p>
      )}
      {hint && <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

/** Un choix parmi deux ou trois, assez large pour le pouce. */
function Choix({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${
        on ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
      }`}
    >
      {children}
    </button>
  )
}

/* ── Une prestation née d'une offre acceptée ──────────────────────────────── */

function ConfirmedItem({ quote }: { quote: Quote }) {
  const accepted = quote.offers.find((o) => o.status === 'accepted')
  return (
    <li className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-bold text-navy">{quote.title}</p>
          <p className="text-xs text-ink-soft">
            {quote.client?.name}
            {quote.booking?.reference ? ` · ${quote.booking.reference}` : ''}
          </p>
        </div>
        <StatusBadge tone="success">Confirmée</StatusBadge>
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-ink-mid">
        {quote.booking && (
          <p className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-amber-ink" />
            {new Date(quote.booking.startsAt).toLocaleString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Paris',
            })}
          </p>
        )}
        <p className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-amber-ink" />
          {[quote.address.line, quote.address.postalCode, quote.address.city].filter(Boolean).join(', ')}
        </p>
        {quote.client?.phone && (
          <p className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-amber-ink" /> {quote.client.phone}
          </p>
        )}
        {quote.client?.email && (
          <p className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-amber-ink" /> {quote.client.email}
          </p>
        )}
      </div>
      {accepted?.netCents != null && (
        <p className="tabular-nums mt-3 text-sm font-semibold text-navy">Votre net : {centsToEuros(accepted.netCents)}</p>
      )}
    </li>
  )
}

/* ── Une ligne du suivi ───────────────────────────────────────────────────── */

function OfferRow({ quote, offerId }: { quote: Quote; offerId: string }) {
  const withdraw = useWithdrawOffer()
  const offer = quote.offers.find((o) => o.id === offerId)
  if (!offer) return null
  const active = offer.status === 'sent' || offer.status === 'viewed'

  return (
    <tr>
      <td className="py-3 font-semibold text-navy">{quote.client?.name ?? 'Client'}</td>
      <td className="py-3 text-ink-mid">{quote.title}</td>
      <td className="tabular-nums py-3 font-semibold text-navy">{offer.netCents != null ? centsToEuros(offer.netCents) : '—'}</td>
      <td className="tabular-nums py-3 text-xs text-ink-soft">
        {active ? `jusqu'au ${dayLabel(offer.validUntil)}` : '—'}
      </td>
      <td className="py-3">
        <OfferBadge status={offer.status} />
      </td>
      <td className="py-3 text-right">
        {active && (
          <button
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate({ quoteId: quote.id, offerId: offer.id })}
            className="hit text-xs font-semibold text-ink-soft hover:text-red-700 disabled:opacity-60"
          >
            {withdraw.isError ? 'Réessayer' : 'Retirer'}
          </button>
        )}
      </td>
    </tr>
  )
}

function Row({
  label,
  value,
  strong,
  muted,
  accent,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className={`text-xs leading-snug ${muted ? 'text-white/60' : 'text-white/75'}`}>{label}</dt>
      <dd
        className={`shrink-0 font-display font-bold tabular-nums ${
          accent ? 'text-lg text-amber' : strong ? 'text-lg text-white' : 'text-sm text-white/75'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function Mini({ Icon, label, value }: { Icon: typeof Users; label: string; value: string }) {
  return (
    <div>
      <Icon className="w-3.5 h-3.5 text-amber-ink mx-auto mb-1" />
      <p className="text-xs font-bold text-navy">{value}</p>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  )
}
