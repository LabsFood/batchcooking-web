'use client'

import { useMessagingSocket } from '@/lib/api/messaging-socket'

/**
 * Branche l'écoute temps réel de la messagerie. À poser une fois dans le layout
 * d'un espace connecté : les pastilles de non-lus suivent alors sur tous les
 * écrans, pas seulement sur celui de la messagerie.
 */
export default function MessagingRealtime() {
  useMessagingSocket()
  return null
}
