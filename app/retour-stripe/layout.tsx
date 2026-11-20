import type { ReactNode } from 'react'
import { pageMetadata } from '@/lib/seo'

// Page de retour après paiement : contenu propre à une session, hors index.
export const metadata = pageMetadata({
  title: 'Retour de paiement',
  description: "Confirmation de votre paiement Lab's Food.",
  path: '/retour-stripe',
  noIndex: true,
})

export default function RetourStripeLayout({ children }: { children: ReactNode }) {
  return children
}
