'use client'

/* ─────────────────────────────────────────────────────────────────────────────
   Messagerie — écoute temps réel.

   WebSocket en écoute seule sur `<API>/ws` : rien n'y est envoyé hormis le
   jeton Clerk, dans la première trame (un navigateur ne peut pas poser
   d'en-tête `Authorization` sur un WebSocket). Il n'y a pas d'abonnement : le
   serveur pousse à chacun ses propres conversations.

   Le socket n'est qu'un accélérateur. Un événement perdu coûte un rechargement,
   jamais un message : à chaque (re)connexion, le cache est invalidé et relu.
   ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import { upsertMessage, useMessagingKeys, type Message } from './messaging'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

const RETRY_MIN_MS = 1_000
const RETRY_MAX_MS = 30_000

type ServerEvent =
  | { event: 'ready' }
  | { event: 'message.created'; data: { conversationId: string; message: Message } }
  | { event: 'conversation.updated'; data: { conversationId: string } }

function socketUrl(): string | null {
  if (!API_URL) return null
  // http → ws, https → wss.
  return `${API_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/ws`
}

/**
 * À monter une seule fois par espace connecté (layout). Tient à jour le fil
 * ouvert, la liste des conversations et les pastilles de non-lus.
 */
export function useMessagingSocket(): void {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const queryClient = useQueryClient()
  const keys = useMessagingKeys()

  // Par référence : si Clerk renvoie une nouvelle fonction à un rendu, ce n'est
  // pas une raison de couper le socket pour le rouvrir.
  const getTokenRef = useRef(getToken)
  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    const url = socketUrl()
    if (!isLoaded || !isSignedIn || !url) return

    let socket: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let retryDelay = RETRY_MIN_MS
    let stopped = false

    const refreshLists = () => {
      void queryClient.invalidateQueries({ queryKey: keys.conversations })
      void queryClient.invalidateQueries({ queryKey: keys.unread })
    }

    const onEvent = (event: ServerEvent) => {
      switch (event.event) {
        case 'ready':
          retryDelay = RETRY_MIN_MS
          // Ce qui s'est passé pendant la coupure n'a pas été poussé : on relit.
          void queryClient.invalidateQueries({ queryKey: keys.root })
          break
        case 'message.created':
          upsertMessage(queryClient, keys, event.data.message)
          refreshLists()
          break
        case 'conversation.updated':
          void queryClient.invalidateQueries({
            queryKey: keys.conversation(event.data.conversationId),
          })
          refreshLists()
          break
      }
    }

    const scheduleRetry = () => {
      if (stopped) return
      retryTimer = setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS)
    }

    async function connect() {
      // Jeton frais à chaque tentative : celui de Clerk ne vit qu'une minute.
      const token = await getTokenRef.current().catch(() => null)
      if (stopped) return
      if (!token) {
        scheduleRetry()
        return
      }

      const ws = new WebSocket(url as string)
      socket = ws
      ws.onopen = () => ws.send(JSON.stringify({ event: 'auth', data: { token } }))
      ws.onmessage = (raw) => {
        try {
          onEvent(JSON.parse(String(raw.data)) as ServerEvent)
        } catch {
          // Trame illisible : ignorée, la prochaine relecture rattrapera.
        }
      }
      // `onerror` est toujours suivi de `onclose` : la reprise se fait là.
      ws.onclose = () => {
        if (socket === ws) socket = null
        scheduleRetry()
      }
    }

    void connect()

    return () => {
      stopped = true
      clearTimeout(retryTimer)
      if (socket) {
        socket.onclose = null
        socket.close()
      }
    }
  }, [isLoaded, isSignedIn, queryClient, keys])
}
