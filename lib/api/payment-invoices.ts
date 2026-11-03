'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'

/* ─────────────────────────────────────────────────────────────────────────────
   Les factures de prestation (« facture A ») : une par paiement par carte.

   Le batch cooker est le prestataire : la facture est à son nom, établie par
   Lab's Food qui encaisse le règlement via Stripe. Le client la voit sur sa
   commande et dans son compte ; le batch cooker voit les mêmes, émises pour
   lui. Ne pas confondre avec les factures de commission (`chef-money.ts`), que
   Lab's Food adresse au batch cooker.

   Les titres CESU et l'avance immédiate n'en produisent pas pour l'instant.
   Un règlement par carte antérieur à l'ouverture des factures en reçoit une
   après coup : elle porte la date de son émission, et le PDF dit quand le
   paiement a eu lieu.
   ───────────────────────────────────────────────────────────────────────────── */

export interface PaymentInvoice {
  id: string
  /** `LF-CUS26-00001`. */
  invoiceNumber: string
  issuedAt: string
  /** Centimes, TTC : ce que la carte a payé. */
  amountTtcCents: number
  currency: string
  bookingId: string
  bookingReference: string | null
  chefDisplayName: string
  /** `false` n'est pas une panne : le PDF est dessiné au premier téléchargement. */
  pdfReady: boolean
}

/** `GET /me/payment-invoices` — les plus récentes d'abord ; `bookingId` restreint à une commande. */
export function usePaymentInvoices(bookingId?: string) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'payment-invoices', bookingId ?? 'all'],
    queryFn: async () => {
      const res = await apiFetch<unknown>(
        `/me/payment-invoices${bookingId ? `?bookingId=${bookingId}` : ''}`,
      )
      return Array.isArray(res) ? (res as PaymentInvoice[]) : []
    },
  })
}

/**
 * `GET /me/payment-invoices/{id}/download-url` — un lien signé de 5 minutes,
 * servi en pièce jointe : le navigateur télécharge sans quitter la page. On ne
 * le demande qu'au clic, pour qu'il ne soit jamais périmé.
 */
export function useDownloadPaymentInvoice() {
  const apiFetch = useApiFetch()
  return useMutation({
    mutationFn: async (id: string) => {
      const { url } = await apiFetch<{ url: string }>(
        `/me/payment-invoices/${id}/download-url`,
      )
      window.location.assign(url)
    },
  })
}
