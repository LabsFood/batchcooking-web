'use client'

import { useState } from 'react'
import { useMyBooking, useMyBookings, type Booking } from '@/lib/api/bookings'
import { DOCUMENT_LABEL, useBookingDocument, useWithdrawal } from '@/lib/api/contract'
import { ApiError } from '@/lib/api/client'
import { apiMessage } from '@/lib/api/messages'
import { reasonText } from '@/lib/reason-codes'
import { euros } from '@/lib/api/bookings'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'

/* ─────────────────────────────────────────────────────────────────────────────
   Rétractation (CGV art. 15), dans les paramètres du compte.

   Elle n'est plus sur la page d'une réservation : on ne la met pas sous les
   yeux de qui vient d'acheter. Le droit, lui, reste exercé en ligne d'ici
   (`POST /me/bookings/{id}/withdrawal`) ou avec le formulaire. Une ligne par
   réservation dont le délai court encore, ou dont la rétractation est partie.
   ───────────────────────────────────────────────────────────────────────────── */

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

export default function WithdrawalSettings() {
  const list = useMyBookings({ limit: 50 })
  const bookings = ((list.data?.data ?? []) as Booking[]).filter((b) => b.status !== 'pending')
  if (bookings.length === 0) return null
  return (
    <>
      {bookings.map((b) => (
        <Row key={b.id} id={b.id} />
      ))}
    </>
  )
}

// ponytail: un GET /me/bookings/{id} par ligne (la liste ne porte pas `withdrawal`) ; une 50aine max, mis en cache.
function Row({ id }: { id: string }) {
  const toast = useToast()
  const { data: b } = useMyBooking(id)
  const retract = useWithdrawal()
  const document = useBookingDocument()
  const [ask, setAsk] = useState(false)
  const w = b?.withdrawal
  if (!b || !w || (!w.open && !w.submittedAt)) return null

  const form = b.documents?.find((d) => d.kind === 'withdrawal-form')

  return (
    <div className="rounded-xl border border-[rgba(31,42,55,0.08)] p-4">
      <p className="text-sm font-semibold text-navy">
        Réservation {b.reference ?? ''} · {day(b.startsAt)}
      </p>
      {w.submittedAt ? (
        <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">
          Rétractation envoyée le {day(w.submittedAt)}. Un accusé de réception vous a été envoyé par
          e-mail.
          {w.refundCents != null && ` Remboursement prévu : ${euros(w.refundCents)}, sous 14 jours.`}
        </p>
      ) : (
        <>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">
            Possible jusqu’au {day(w.availableUntil)} à minuit.
            <InfoPopover label="Comment ça marche ?">
              Vous pouvez vous rétracter sans donner de motif pendant 14 jours après la confirmation.
              Nous vous remboursons sous 14 jours, par le même moyen de paiement. Si vous avez demandé
              que la prestation commence pendant ce délai, la part déjà réalisée reste due.
            </InfoPopover>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={() => setAsk(true)} className="btn btn-outline text-xs">
              Se rétracter
            </button>
            {form && (
              <button
                onClick={() =>
                  document.mutate(
                    { id: b.id, kind: form.kind, filename: form.filename },
                    {
                      onError: (e) =>
                        toast.error(
                          'Le document n’a pas pu être téléchargé',
                          reasonText(e instanceof ApiError ? e.body : null) ?? apiMessage(e),
                        ),
                    },
                  )
                }
                className="text-[13px] font-semibold text-navy underline underline-offset-2"
              >
                {DOCUMENT_LABEL[form.kind]}
              </button>
            )}
          </div>
          <ConfirmDialog
            open={ask}
            onClose={() => setAsk(false)}
            onConfirm={() =>
              retract.mutate(b.id, {
                onSuccess: () => {
                  setAsk(false)
                  toast.success('Rétractation envoyée', 'L’accusé de réception part par e-mail.')
                },
                onError: (e) => {
                  setAsk(false)
                  toast.error(
                    'La rétractation a été refusée',
                    reasonText(e instanceof ApiError ? e.body : null) ?? apiMessage(e),
                  )
                },
              })
            }
            pending={retract.isPending}
            tone="danger"
            title="Confirmer la rétractation ?"
            lead={`« Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ${b.reference ?? ''}. »`}
            detail={
              w.amountDueCents == null
                ? 'La prestation est en cours : la part déjà réalisée est fixée par notre équipe, qui vous rembourse le reste sous 14 jours, par le même moyen de paiement.'
                : `Reste dû : ${euros(w.amountDueCents)}. Remboursement : ${euros(w.refundCents) ?? '0 €'}, sous 14 jours, par le même moyen de paiement.`
            }
            confirmLabel="Confirmer la rétractation"
          />
        </>
      )}
    </div>
  )
}
