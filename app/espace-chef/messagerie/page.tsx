'use client'

import { Suspense } from 'react'
import ChefPage from '@/components/chef/ChefPage'
import MessagingView from '@/components/messaging/MessagingView'

/* ─────────────────────────────────────────────────────────────────────────────
   Messagerie.

   Un fil par client, plus le canal support. Tout se passe dans l'application :
   les numéros et adresses écrits dans un message sont masqués par l'API jusqu'à
   48 h avant la prestation. La fiche du client s'ouvre d'un clic sur son nom.
   ───────────────────────────────────────────────────────────────────────────── */

export default function ChefMessagesPage() {
  return (
    <ChefPage title="Messagerie" subtitle="Un fil par client, plus le canal support.">
      {/* `useSearchParams` (fil ouvert dans l'URL) impose une frontière Suspense. */}
      <Suspense fallback={null}>
        <MessagingView
          placeholder="Écrire un message…"
          emptyText="Un fil s'ouvre avec chaque client dès qu'une prestation est réservée. En attendant, le support est joignable ici."
        />
      </Suspense>
    </ChefPage>
  )
}
