'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileText,
  Receipt,
  ShieldCheck,
  ShoppingBasket,
  XCircle,
} from 'lucide-react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { apiMessage } from '@/lib/api/messages'
import {
  euros,
  HOLD_FAILURE,
  type GroceryLine,
  useApproveGroceryLine,
  useCancelGroceries,
  useConfirmGroceries,
  useConfirmGroceriesCard,
  useContestGroceryLine,
  useGroceries,
  useGroceryReceiptUrl,
  useRetryGroceriesHold,
  useStartGroceriesCard,
} from '@/lib/api/groceries'

/* ─────────────────────────────────────────────────────────────────────────────
   Les courses payées à part, côté client (Recettes, lot 6).

   La carte est enregistrée sur une page Stripe ; le Budget Courses y est réservé
   48 h avant la séance (l'empreinte, pas un paiement). Le message avant les
   courses demande de confirmer ou d'annuler avant l'heure limite. Les tickets
   sont prélevés 24 h après leur dépôt, au centime près ; une ligne se conteste
   pendant 48 h.
   ───────────────────────────────────────────────────────────────────────────── */

const when = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

/** « dans 3 h 20 » jusqu'à une échéance, relu chaque minute. */
function useCountdown(iso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  if (!iso) return null
  const left = new Date(iso).getTime() - now
  if (left <= 0) return 'échéance passée'
  const h = Math.floor(left / 3_600_000)
  const m = Math.floor((left % 3_600_000) / 60_000)
  return h >= 48 ? `dans ${Math.floor(h / 24)} jours` : h > 0 ? `dans ${h} h ${m} min` : `dans ${m} min`
}

export default function GroceriesClient({ bookingId }: { bookingId: string }) {
  const query = useGroceries(bookingId, 'client')
  const start = useStartGroceriesCard()
  const confirmCard = useConfirmGroceriesCard()
  const retry = useRetryGroceriesHold()
  const confirm = useConfirmGroceries()
  const cancel = useCancelGroceries()
  const [askCancel, setAskCancel] = useState(false)
  const params = useSearchParams()
  const router = useRouter()
  const returned = params.get('groceries_session')
  const handled = useRef(false)
  const deadlineIn = useCountdown(query.data?.notice?.cancelDeadline)

  // Retour de la page Stripe : la carte est enregistrée, on l'annonce à l'API une fois.
  useEffect(() => {
    if (!returned || handled.current) return
    handled.current = true
    confirmCard.mutate(
      { bookingId, sessionId: returned },
      { onSettled: () => router.replace(`/espace-client/commandes/${bookingId}`) },
    )
  }, [returned, bookingId, confirmCard, router])

  const g = query.data
  if (!g || !g.applies) return null
  const status = g.status
  const toCard = () =>
    start.mutate(bookingId, { onSuccess: ({ url }) => window.location.assign(url) })
  const busy = start.isPending || confirmCard.isPending || retry.isPending
  const error = start.error ?? confirmCard.error ?? retry.error ?? confirm.error

  return (
    <div className="rounded-2xl card-shell p-6">
      <h3 className="mb-1 flex flex-wrap items-center gap-2 font-display text-lg font-bold text-navy">
        <ShoppingBasket className="h-5 w-5 text-amber" aria-hidden /> Vos courses
        <InfoPopover label="Qu’est-ce que le Budget Courses ?">
          Le maximum que votre batch cooker peut dépenser pour vos courses, {euros(g.budgetCents)} au
          plus. Il ne le dépasse jamais. Les courses se règlent par carte uniquement : le e-CESU et
          l’avance immédiate couvrent le service, pas les denrées.
        </InfoPopover>
      </h3>
      <p className="mb-4 text-[13px] text-ink-mid">
        Budget Courses : <strong className="text-navy">{euros(g.budgetCents)}</strong>
        {g.mandate && ` · mandat ${g.mandate.version} accepté le ${new Date(g.mandate.acceptedAt).toLocaleDateString('fr-FR')}`}
      </p>

      {status === 'cancelled' ? (
        <p className="rounded-2xl bg-cream-soft px-4 py-3 text-sm text-ink-mid">
          <XCircle className="mr-1.5 inline h-4 w-4 text-ink-soft" aria-hidden />
          Courses annulées
          {g.cancelled?.by === 'system' ? ' : la carte n’a pas pu être utilisée à temps' : ''}. Vous
          achetez vous-même les ingrédients de votre liste finale.
          {g.forfaitWaivedCents > 0 && ` Le forfait courses (${euros(g.forfaitWaivedCents)}) a été retiré de la prestation.`}
        </p>
      ) : (
        <>
          {/* La carte et l'empreinte */}
          <div className="rounded-2xl bg-cream-soft px-4 py-3 text-sm">
            <p className="flex flex-wrap items-center gap-1.5 font-semibold text-navy">
              <CreditCard className="h-4 w-4 text-amber" aria-hidden />
              {g.card ? `Carte ${g.card.brand ?? ''} ···· ${g.card.last4}` : 'Aucune carte enregistrée'}
              <InfoPopover label="Qu’est-ce que l’empreinte bancaire ?">
                Ce n’est pas un paiement : votre Budget Courses est réservé sur votre carte 48 h avant
                la séance, quelques jours au plus. Seul le total des tickets est prélevé ; le reste
                est libéré aussitôt.
              </InfoPopover>
            </p>
            <p className="mt-1 text-[13px] text-ink-mid">
              {g.hold?.placedAt
                ? `Budget réservé le ${when(g.hold.placedAt)}.`
                : status === 'hold_failed'
                  ? ''
                  : `Le Budget sera réservé le ${when(g.opensAt)}.`}
            </p>
            {(status === 'awaiting_card' || status === 'card_saved' || status === 'hold_failed') && (
              <button type="button" onClick={toCard} disabled={busy} className="btn btn-outline mt-2 text-xs disabled:opacity-50">
                <CreditCard className="h-3.5 w-3.5" aria-hidden />
                {g.card ? 'Changer de carte' : 'Enregistrer ma carte'}
              </button>
            )}
          </div>

          {status === 'hold_failed' && (
            <div role="alert" className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Votre carte a refusé l’empreinte
              </p>
              <p className="mt-1">
                {HOLD_FAILURE[g.hold?.failureCode ?? ''] ?? 'La banque a refusé la réservation du Budget.'}{' '}
                Authentifiez-vous ou changez de carte avant le {when(g.hold?.fixBefore)} ; sans quoi vous
                ferez les courses vous-même.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={toCard} disabled={busy} className="btn btn-primary text-xs disabled:opacity-50">
                  Changer de carte
                </button>
                <button type="button" onClick={() => retry.mutate(bookingId)} disabled={busy} className="btn btn-outline text-xs disabled:opacity-50">
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {/* Le message avant les courses */}
          {g.notice && (status === 'notice_sent' || status === 'awaiting_client') && (
            <div className="mt-3 rounded-2xl border border-amber/50 bg-amber-soft/60 px-4 py-3 text-[13px] text-navy">
              <p className="font-semibold">Votre batch cooker fera les courses le {when(g.notice.shoppingAt)}.</p>
              <p className="mt-1 text-ink-mid">
                {status === 'awaiting_client'
                  ? 'L’heure limite est passée : il attend votre réponse pour faire les courses.'
                  : `Vous pouvez les annuler jusqu’au ${when(g.notice.cancelDeadline)} (${deadlineIn}).`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => confirm.mutate(bookingId)} disabled={confirm.isPending} className="btn btn-primary text-xs disabled:opacity-50">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Confirmer les courses
                </button>
                <button type="button" onClick={() => setAskCancel(true)} className="btn btn-outline text-xs">
                  Annuler les courses
                </button>
              </div>
            </div>
          )}
          {status === 'confirmed' && (
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-mint-ink">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Courses confirmées{g.notice?.confirmedBy === 'silence' ? ' (sans annulation avant l’heure limite)' : ''}.
            </p>
          )}
          {['awaiting_card', 'card_saved', 'hold_placed', 'hold_failed', 'confirmed'].includes(status ?? '') && (
            <button type="button" onClick={() => setAskCancel(true)} className="mt-3 text-[12px] font-semibold text-ink-soft underline-offset-2 hover:underline">
              Je préfère faire les courses moi-même
            </button>
          )}

          {g.receiptsSubmittedAt && <Receipts bookingId={bookingId} />}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[12px] text-red-700">
          {apiMessage(error, 'L’opération n’a pas abouti.')}
        </p>
      )}

      <ConfirmDialog
        open={askCancel}
        onClose={() => setAskCancel(false)}
        onConfirm={() => cancel.mutate({ bookingId }, { onSuccess: () => setAskCancel(false) })}
        pending={cancel.isPending}
        error={cancel.isError ? apiMessage(cancel.error, 'L’annulation n’a pas abouti.') : null}
        tone="danger"
        title="Annuler les courses ?"
        lead="Vous achèterez vous-même les ingrédients de votre liste finale."
        detail={
          new Date(g.opensAt) > new Date()
            ? 'Avant le Verrouillage, le mandat est révoqué sans frais. L’empreinte n’est pas posée.'
            : 'La prestation est maintenue. L’empreinte est libérée ; rien n’est remboursé.'
        }
        confirmLabel="Annuler les courses"
      />
    </div>
  )
}

function Receipts({ bookingId }: { bookingId: string }) {
  const { data: g } = useGroceries(bookingId, 'client')
  const approve = useApproveGroceryLine()
  const contest = useContestGroceryLine()
  const receiptUrl = useGroceryReceiptUrl('client')
  const [contesting, setContesting] = useState<GroceryLine | null>(null)
  const [reason, setReason] = useState('')
  const contestIn = useCountdown(g?.contestClosesAt)
  if (!g) return null
  const open = g.contestClosesAt ? new Date(g.contestClosesAt) > new Date() : false

  const show = (receiptId: string) =>
    receiptUrl.mutate({ bookingId, receiptId }, { onSuccess: ({ url }) => window.open(url, '_blank', 'noopener') })

  return (
    <div className="mt-4 border-t border-[rgba(31,42,55,0.07)] pt-4">
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-navy">
        <Receipt className="h-4 w-4 text-amber" aria-hidden /> Tickets : {euros(g.receiptsTotalCents ?? 0)}
        <InfoPopover label="Comment contester une ligne ?">
          Vous avez 48 h après le dépôt des tickets pour contester une ligne. Elle est prélevée, puis
          vous est remboursée si la contestation est fondée.
        </InfoPopover>
      </p>
      <p className="mt-0.5 text-[12px] text-ink-soft">
        {g.capture
          ? `${euros(g.capture.cents ?? 0)} prélevés le ${when(g.capture.at)} ; le reste de l’empreinte est libéré.`
          : `Prélèvement le ${when(g.captureDueAt)}.`}
        {g.refundedCents > 0 && ` ${euros(g.refundedCents)} remboursés.`}
        {open && ` Contestation possible ${contestIn}.`}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {g.receipts.map((r, i) => (
          <button key={r.id} type="button" onClick={() => show(r.id)} className="btn btn-outline text-[11px]">
            <FileText className="h-3.5 w-3.5" aria-hidden /> Ticket {i + 1}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {g.lines.map((line) => (
          <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-soft px-3 py-2 text-[13px]">
            <span className="min-w-0 text-navy">
              {line.label}
              {!line.receiptId && (
                <span className="ml-1.5 text-[11px] text-ink-soft">
                  {line.clientApprovedAt ? '(sans ticket, accepté)' : '(sans ticket : non remboursé sauf accord)'}
                </span>
              )}
              {line.contestedAt && (
                <span className="ml-1.5 text-[11px] font-semibold text-amber-deep">
                  {line.decision === 'upheld'
                    ? `contestation fondée, ${euros(line.refundedCents)} remboursés`
                    : line.decision === 'rejected'
                      ? 'contestation rejetée'
                      : 'contestée, en cours d’examen'}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <span className="tabular-nums text-ink-mid">{euros(line.amountCents)}</span>
              {!line.receiptId && !line.clientApprovedAt && !g.capture && (
                <button type="button" onClick={() => approve.mutate({ bookingId, lineId: line.id })} className="text-[11px] font-semibold text-navy underline-offset-2 hover:underline">
                  J’accepte
                </button>
              )}
              {open && !line.contestedAt && (
                <button type="button" onClick={() => setContesting(line)} className="text-[11px] font-semibold text-red-700 underline-offset-2 hover:underline">
                  Contester
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={contesting !== null}
        onClose={() => setContesting(null)}
        onConfirm={() =>
          contesting &&
          reason.trim() &&
          contest.mutate(
            { bookingId, lineId: contesting.id, reason: reason.trim() },
            { onSuccess: () => { setContesting(null); setReason('') } },
          )
        }
        pending={contest.isPending}
        error={contest.isError ? apiMessage(contest.error, 'La contestation n’a pas été enregistrée.') : null}
        title={`Contester « ${contesting?.label ?? ''} » ?`}
        lead="Lab’s Food examine la ligne avec votre batch cooker."
        detail={
          <label className="mt-2 block text-[12px] text-ink-mid">
            Pourquoi ?
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} className="input-base mt-1 text-sm" />
          </label>
        }
        confirmLabel="Contester la ligne"
      />
    </div>
  )
}
