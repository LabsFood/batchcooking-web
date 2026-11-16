'use client'

import { Suspense } from 'react'
import MessagingView, { MessagingSkeleton } from '@/components/messaging/MessagingView'

const CANNED = [
  'Je peux décaler la session ?',
  'Plus d\'épices svp 🌶️',
  'Tu peux remplacer un plat ?',
]

export default function MessagesPage() {
  return (
    // `useSearchParams` (fil ouvert dans l'URL) impose une frontière Suspense.
    <Suspense fallback={<MessagingSkeleton />}>
      <MessagingView
        placeholder="Écris à ton chef…"
        canned={CANNED}
        emptyText="Un fil s'ouvre avec ton chef dès qu'une session est réservée. En attendant, le support est joignable ici."
      />
    </Suspense>
  )
}
