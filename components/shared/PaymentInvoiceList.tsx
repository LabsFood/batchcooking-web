'use client'

import { Download, Loader2, Receipt } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'
import { euros, shortDate } from '@/lib/api/bookings'
import { apiMessage } from '@/lib/api/messages'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import { useDownloadPaymentInvoice, usePaymentInvoices } from '@/lib/api/payment-invoices'

type Side = 'client' | 'chef'

/** Qui émet la facture, pour qui, et pourquoi elle peut être datée après le paiement. */
export function PaymentInvoicesInfo({ side }: { side: Side }) {
  return (
    <InfoPopover label="Qu’est-ce que cette facture ?">
      {side === 'client' ? (
        <>
          Votre batch cooker est le prestataire : la facture est établie à son nom, par
          Lab’s Food qui encaisse le paiement par carte via Stripe. Une facture par paiement
          par carte. Les titres CESU et l’avance immédiate n’en produisent pas pour l’instant.
        </>
      ) : (
        <>
          Vos factures de vente : émises en votre nom par Lab’s Food, une par paiement par
          carte de vos clients. Conservez-les dix ans. Ce que Lab’s Food vous facture, la
          commission, est dans Revenus &amp; paiements.
        </>
      )}{' '}
      Un paiement fait avant l’ouverture des factures en reçoit une après coup : elle porte
      sa date d’émission, et le PDF indique la date du paiement.
    </InfoPopover>
  )
}

/**
 * Les factures du compte, ou d'une seule commande avec `bookingId`. Sans
 * `emptyText`, une liste vide ne rend rien : une commande réglée en CESU n'a
 * simplement pas de facture ici.
 */
export function PaymentInvoiceList({
  side,
  bookingId,
  heading,
  emptyText,
}: {
  side: Side
  bookingId?: string
  /** Titre affiché au-dessus des lignes, avec l'explication. */
  heading?: string
  emptyText?: string
}) {
  const invoices = usePaymentInvoices(bookingId)
  const download = useDownloadPaymentInvoice()
  const toast = useToast()

  // Sans `emptyText`, rien ne s'annonce : la plupart des commandes n'ont pas de facture.
  if (invoices.isPending) {
    return emptyText ? (
      <SkeletonGroup>
        <Skeleton className="h-14 rounded-xl" />
      </SkeletonGroup>
    ) : null
  }
  if (invoices.isError) {
    return <p className="text-[13px] text-ink-soft">{apiMessage(invoices.error)}</p>
  }
  const rows = invoices.data ?? []
  if (rows.length === 0) {
    return emptyText ? (
      <p className="rounded-2xl bg-cream-soft px-4 py-6 text-center text-sm text-ink-mid">
        {emptyText}
      </p>
    ) : null
  }

  return (
    <div>
      {heading && (
        <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {heading}
          <PaymentInvoicesInfo side={side} />
        </p>
      )}
      <ul className="tabular-nums space-y-2">
        {rows.map((f) => {
          const enCours = download.isPending && download.variables === f.id
          const detail = [
            euros(f.amountTtcCents),
            `émise le ${shortDate(f.issuedAt)}`,
            side === 'client' ? f.chefDisplayName : null,
            bookingId ? null : f.bookingReference,
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() =>
                  download.mutate(f.id, {
                    onError: (e) => toast.error('Téléchargement impossible', apiMessage(e)),
                  })
                }
                disabled={download.isPending}
                aria-label={`Télécharger la facture ${f.invoiceNumber}`}
                className="flex w-full items-center gap-3 rounded-xl border border-[rgba(31,42,55,0.08)] px-3 py-2.5 text-left transition-colors hover:border-[rgba(31,42,55,0.2)] hover:bg-cream-soft disabled:opacity-70"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-soft text-navy"
                >
                  <Receipt className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold tabular-nums text-navy">
                    Facture {f.invoiceNumber}
                  </span>
                  <span className="block text-xs text-ink-soft">{detail}</span>
                </span>
                {enCours ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-soft" aria-hidden />
                ) : (
                  <Download className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
