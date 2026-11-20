'use client'

/* ─────────────────────────────────────────────────────────────────────────────
   Messagerie — couche API partagée par l'espace client et l'espace chef.

   Les deux espaces appellent les mêmes routes `/me/conversations` : ce que
   l'on peut lire ou écrire dépend des conversations auxquelles on participe,
   pas du rôle. L'envoi passe par REST ; les messages entrants arrivent par
   WebSocket (`lib/api/messaging-socket.ts`) et sont insérés dans ce cache.
   ───────────────────────────────────────────────────────────────────────────── */

import { useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { ApiError, useApiFetch } from './client'
import { useMeKey } from './keys'

// ── Types (miroir de `LF-BackEnd/apps/src/modules/messaging/messaging.types.ts`) ──

export type ConversationType = 'chef_client' | 'support'
export type SenderRole = 'client' | 'chef' | 'support'

export interface Attachment {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

export interface Message {
  id: string
  conversationId: string
  /** À comparer au `viewerRole` de la conversation pour savoir qui a écrit. */
  senderRole: SenderRole
  body: string
  /** Un numéro ou un email a été remplacé par `•••••` dans `body`. */
  contactMasked: boolean
  attachments: Attachment[]
  clientMessageId: string | null
  createdAt: string
  /** Local uniquement : message affiché avant la réponse du serveur. */
  pending?: boolean
}

export interface Conversation {
  id: string
  type: ConversationType
  viewerRole: SenderRole
  counterpart: {
    role: SenderRole
    name: string
    avatarUrl: string | null
    /** Toujours `null` : les coordonnées ne sont jamais partagées. */
    phone: string | null
  }
  booking: {
    id: string
    reference: string | null
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    startsAt: string
    endsAt: string
  } | null
  writable: boolean
  /** Toujours `false` / `null` : aucune libération de coordonnées. */
  contactReleased: boolean
  contactReleaseAt: string | null
  lastMessage: Message | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
}

export interface ConversationDetail extends Conversation {
  /** Fiche du foyer, pour un chef sur un fil client. */
  clientCard: {
    city: string | null
    householdAdults: number
    householdKids: number
    allergies: string[]
    dietaryPreferences: string[]
    kitchenNotes: string | null
  } | null
}

export interface MessagePage {
  /** Du plus ancien au plus récent. */
  data: Message[]
  /** À passer en `before` pour charger la page au-dessus ; `null` en haut du fil. */
  nextCursor: string | null
}

export interface AttachmentRef {
  uploadId: string
  fileName: string
}

/** Limites appliquées par l'API, répétées ici pour refuser avant l'envoi. */
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENTS = 3
export const MAX_BODY_LENGTH = 4000

// ── Clés de cache ───────────────────────────────────────────────────────────

/** Toutes rattachées au compte connecté, comme `useMeKey` (voir ce fichier). */
export function useMessagingKeys() {
  const meKey = useMeKey()
  return useMemo(() => {
    const root = [...meKey, 'messaging'] as const
    return {
      root,
      conversations: [...root, 'conversations'] as const,
      unread: [...root, 'unread'] as const,
      conversation: (id: string) => [...root, 'conversation', id] as const,
      messages: (id: string) => [...root, 'messages', id] as const,
      attachment: (id: string) => [...root, 'attachment', id] as const,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la clé ne dépend que du compte
  }, [meKey[1]])
}

export type MessagingKeys = ReturnType<typeof useMessagingKeys>

// ── Lectures ────────────────────────────────────────────────────────────────

function useSignedIn() {
  const { isLoaded, isSignedIn } = useAuth()
  return isLoaded && !!isSignedIn
}

export function useConversations() {
  const apiFetch = useApiFetch()
  const keys = useMessagingKeys()
  return useQuery({
    queryKey: keys.conversations,
    queryFn: () => apiFetch<Conversation[]>('/me/conversations'),
    enabled: useSignedIn(),
    // Le WebSocket tient la liste à jour ; ce délai n'est que le filet de sécurité.
    staleTime: 30 * 1000,
  })
}

/** Total des non-lus, pour les pastilles de navigation. */
export function useUnreadCount() {
  const apiFetch = useApiFetch()
  const keys = useMessagingKeys()
  return useQuery({
    queryKey: keys.unread,
    queryFn: () => apiFetch<{ total: number }>('/me/conversations/unread-count'),
    enabled: useSignedIn(),
    select: (data) => data.total,
    staleTime: 30 * 1000,
    // Si le WebSocket est coupé (réseau d'entreprise, proxy), la pastille suit quand même.
    refetchInterval: 60 * 1000,
  })
}

export function useConversation(id: string | null) {
  const apiFetch = useApiFetch()
  const keys = useMessagingKeys()
  return useQuery({
    queryKey: keys.conversation(id ?? ''),
    queryFn: () => apiFetch<ConversationDetail>(`/me/conversations/${id}`),
    enabled: useSignedIn() && !!id,
    staleTime: 30 * 1000,
  })
}

const PAGE_SIZE = 30

/**
 * Les messages d'un fil. La première page est la plus récente ; `fetchNextPage`
 * remonte dans l'historique.
 */
export function useMessages(id: string | null) {
  const apiFetch = useApiFetch()
  const keys = useMessagingKeys()
  return useInfiniteQuery({
    queryKey: keys.messages(id ?? ''),
    queryFn: ({ pageParam }) =>
      apiFetch<MessagePage>(
        `/me/conversations/${id}/messages?limit=${PAGE_SIZE}` +
          (pageParam ? `&before=${pageParam}` : ''),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: useSignedIn() && !!id,
    staleTime: 30 * 1000,
  })
}

/** Les pages mises à plat, du plus ancien au plus récent. */
export function flattenMessages(data: InfiniteData<MessagePage> | undefined): Message[] {
  if (!data) return []
  return [...data.pages].reverse().flatMap((page) => page.data)
}

// ── Écriture dans le cache ──────────────────────────────────────────────────

/**
 * Ajoute un message au fil en cache, ou remplace sa version provisoire.
 *
 * Un même message peut arriver deux fois : par la réponse de l'envoi et par le
 * WebSocket, dans n'importe quel ordre. On dédoublonne donc par `id`, et par
 * `clientMessageId` pour retrouver le message provisoire qu'il confirme.
 */
export function upsertMessage(
  queryClient: QueryClient,
  keys: MessagingKeys,
  message: Message,
): void {
  queryClient.setQueryData<InfiniteData<MessagePage>>(
    keys.messages(message.conversationId),
    (old) => {
      // Fil jamais ouvert : rien à mettre à jour, il sera chargé à l'ouverture.
      if (!old) return old
      const same = (m: Message) =>
        m.id === message.id ||
        (!!message.clientMessageId && m.clientMessageId === message.clientMessageId)

      if (old.pages.some((page) => page.data.some(same))) {
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((m) => (same(m) ? message : m)),
          })),
        }
      }
      // La page 0 est la plus récente : le nouveau message va à sa fin.
      const [newest, ...older] = old.pages
      return {
        ...old,
        pages: [{ ...newest, data: [...newest.data, message] }, ...older],
      }
    },
  )
}

function removeMessage(
  queryClient: QueryClient,
  keys: MessagingKeys,
  conversationId: string,
  clientMessageId: string,
): void {
  queryClient.setQueryData<InfiniteData<MessagePage>>(
    keys.messages(conversationId),
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.filter((m) => m.clientMessageId !== clientMessageId),
        })),
      },
  )
}

// ── Mutations ───────────────────────────────────────────────────────────────

export interface SendInput {
  body: string
  attachments?: AttachmentRef[]
  /** Aperçu des pièces jointes pour le message provisoire. */
  attachmentPreviews?: Attachment[]
}

/**
 * Envoi optimiste : le message s'affiche tout de suite, puis est remplacé par
 * celui du serveur (qui peut être masqué). En cas d'échec il est retiré, et
 * l'erreur remonte pour que l'écran rende le brouillon.
 */
export function useSendMessage(conversation: Conversation | undefined) {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()
  const keys = useMessagingKeys()

  return useMutation({
    mutationFn: (input: SendInput & { clientMessageId: string }) =>
      apiFetch<Message>(`/me/conversations/${conversation!.id}/messages`, {
        method: 'POST',
        body: {
          body: input.body,
          clientMessageId: input.clientMessageId,
          attachments: input.attachments,
        },
      }),
    onMutate: (input) => {
      if (!conversation) return
      upsertMessage(queryClient, keys, {
        id: `pending-${input.clientMessageId}`,
        conversationId: conversation.id,
        senderRole: conversation.viewerRole,
        body: input.body,
        contactMasked: false,
        attachments: input.attachmentPreviews ?? [],
        clientMessageId: input.clientMessageId,
        createdAt: new Date().toISOString(),
        pending: true,
      })
    },
    onSuccess: (message) => {
      upsertMessage(queryClient, keys, message)
      void queryClient.invalidateQueries({ queryKey: keys.conversations })
    },
    onError: (_error, input) => {
      if (conversation) {
        removeMessage(queryClient, keys, conversation.id, input.clientMessageId)
      }
    },
  })
}

export function useMarkRead() {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()
  const keys = useMessagingKeys()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`/me/conversations/${id}/read`, { method: 'POST' }),
    onSuccess: (_data, id) => {
      // Sans attendre le refetch : la pastille du fil ouvert disparaît aussitôt.
      queryClient.setQueryData<Conversation[]>(keys.conversations, (old) =>
        old?.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      )
      void queryClient.invalidateQueries({ queryKey: keys.unread })
    },
  })
}

/** Ouvre (ou retrouve) le fil avec l'équipe Lab's Food. */
export function useOpenSupport() {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()
  const keys = useMessagingKeys()

  return useMutation({
    mutationFn: () =>
      apiFetch<ConversationDetail>('/me/conversations/support', { method: 'POST' }),
    onSuccess: (conversation) => {
      queryClient.setQueryData(keys.conversation(conversation.id), conversation)
      void queryClient.invalidateQueries({ queryKey: keys.conversations })
    },
  })
}

/**
 * Écrit à l'équipe Lab's Food depuis un formulaire : ouvre (ou retrouve) le fil
 * support, puis y poste le message. La réponse arrive dans la messagerie.
 */
export function useWriteToSupport() {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()
  const keys = useMessagingKeys()

  return useMutation({
    mutationFn: async (body: string) => {
      const conversation = await apiFetch<ConversationDetail>('/me/conversations/support', {
        method: 'POST',
      })
      await apiFetch<Message>(`/me/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: { body, clientMessageId: crypto.randomUUID() },
      })
      return conversation
    },
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: keys.conversations })
      void queryClient.invalidateQueries({ queryKey: keys.messages(conversation.id) })
    },
  })
}

/** Ouvre (ou retrouve) le fil entre le client et le chef d'une réservation. */
export function useOpenForBooking() {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()
  const keys = useMessagingKeys()

  return useMutation({
    mutationFn: (bookingId: string) =>
      apiFetch<ConversationDetail>('/me/conversations', {
        method: 'POST',
        body: { bookingId },
      }),
    onSuccess: (conversation) => {
      queryClient.setQueryData(keys.conversation(conversation.id), conversation)
      void queryClient.invalidateQueries({ queryKey: keys.conversations })
    },
  })
}

/**
 * Ouvre (ou retrouve) le fil entre le client et le batch cooker d'une demande
 * sur-mesure, avant toute acceptation : pour parler d'un plat ou d'une allergie.
 */
export function useOpenForQuote() {
  const apiFetch = useApiFetch()
  const queryClient = useQueryClient()
  const keys = useMessagingKeys()

  return useMutation({
    mutationFn: (quoteId: string) =>
      apiFetch<ConversationDetail>('/me/conversations', {
        method: 'POST',
        body: { quoteId },
      }),
    onSuccess: (conversation) => {
      queryClient.setQueryData(keys.conversation(conversation.id), conversation)
      void queryClient.invalidateQueries({ queryKey: keys.conversations })
    },
  })
}

// ── Pièces jointes ──────────────────────────────────────────────────────────

interface SignedUpload {
  uploadId: string
  method: 'PUT'
  url: string
  headers: Record<string, string>
}

/** Refuse avant l'envoi ce que l'API refuserait de toute façon. */
export function attachmentError(file: File): string | null {
  if (!ATTACHMENT_TYPES.includes(file.type)) {
    return `${file.name} : format non accepté (PDF, JPEG, PNG ou WebP).`
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${file.name} : 10 Mo maximum.`
  }
  return null
}

/**
 * Dépose un fichier : demande d'un lien signé, puis envoi direct au stockage.
 * Le fichier ne transite jamais par l'API ; il n'est rattaché à un message
 * qu'au moment de l'envoi, via la référence renvoyée ici.
 */
export function useUploadAttachment(conversationId: string | null) {
  const apiFetch = useApiFetch()

  return async (file: File): Promise<AttachmentRef> => {
    const signed = await apiFetch<SignedUpload>(
      `/me/conversations/${conversationId}/attachments/upload-url`,
      { method: 'POST', body: { mimeType: file.type, sizeBytes: file.size } },
    )
    const res = await fetch(signed.url, {
      method: signed.method,
      headers: signed.headers,
      body: file,
    })
    if (!res.ok) {
      throw new ApiError(res.status, `L'envoi de ${file.name} a échoué.`)
    }
    return { uploadId: signed.uploadId, fileName: file.name }
  }
}

/**
 * Le lien de lecture d'une pièce jointe, pour l'afficher dans la page (vignette
 * et aperçu d'une image).
 *
 * Le lien signé vit 5 minutes : on le redemande au bout de 4, pour qu'une
 * conversation restée ouverte n'affiche jamais une image au lien périmé.
 */
export function useAttachmentUrl(conversationId: string, attachmentId: string) {
  const apiFetch = useApiFetch()
  const keys = useMessagingKeys()
  return useQuery({
    queryKey: keys.attachment(attachmentId),
    queryFn: () =>
      apiFetch<{ url: string }>(
        `/me/conversations/${conversationId}/attachments/${attachmentId}/download-url`,
      ),
    select: (data) => data.url,
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
    // Revenir sur l'onglet après une longue absence : le lien est sans doute périmé.
    refetchOnWindowFocus: true,
  })
}

/** Ouvre une pièce jointe dans un nouvel onglet, via un lien valable 5 minutes. */
export function useOpenAttachment(conversationId: string | null) {
  const apiFetch = useApiFetch()

  return async (attachmentId: string): Promise<void> => {
    // Ouvert avant l'appel : après un `await`, le navigateur bloque la fenêtre.
    const tab = window.open('', '_blank')
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/me/conversations/${conversationId}/attachments/${attachmentId}/download-url`,
      )
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch (error) {
      tab?.close()
      throw error
    }
  }
}

/** Message d'erreur lisible pour l'écran, à partir du `code` renvoyé par l'API. */
export function messagingErrorText(error: unknown): string {
  const code =
    error instanceof ApiError ? (error.body as { code?: string } | null)?.code : undefined
  switch (code) {
    case 'CONVERSATION_READ_ONLY':
      return 'Cette conversation est fermée. Écrivez au support si besoin.'
    case 'RATE_LIMITED':
      return 'Trop de messages en peu de temps. Réessayez dans une minute.'
    case 'EMPTY_MESSAGE':
      return 'Écrivez un message ou joignez un fichier.'
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 'Format non accepté : PDF, JPEG, PNG ou WebP.'
    case 'FILE_TOO_LARGE':
      return 'Fichier trop lourd : 10 Mo maximum.'
    case 'ATTACHMENTS_UNAVAILABLE':
      return 'Les pièces jointes sont momentanément indisponibles.'
    case 'UPLOAD_NOT_CONFIRMED':
      return "Le fichier n'a pas été reçu. Joignez-le à nouveau."
    default:
      return "Le message n'a pas pu être envoyé. Réessayez."
  }
}
