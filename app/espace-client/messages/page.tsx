'use client'

import { Suspense } from 'react'
import MessagingView, { MessagingSkeleton } from '@/components/messaging/MessagingView'

const CANNED = [
  'Je peux décaler la session ?',
  'Un peu plus épicé, s’il vous plaît',
  'Pouvez-vous remplacer un plat ?',
]

export default function MessagesPage() {
  return (
    // `useSearchParams` (fil ouvert dans l'URL) impose une frontière Suspense.
    <Suspense fallback={<MessagingSkeleton />}>
      <MessagingView
        placeholder="Écrivez à votre batch cooker…"
        canned={CANNED}
        emptyText="Un fil s’ouvre avec votre batch cooker dès qu’une session est réservée. En attendant, le support est joignable ici."
      />
    </Suspense>
  )
}
