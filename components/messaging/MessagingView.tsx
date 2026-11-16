'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Headset, MessageCircle, UserRound } from 'lucide-react'
import {
  useConversations,
  useMarkRead,
  useOpenForBooking,
  useOpenSupport,
  type Conversation,
} from '@/lib/api/messaging'
import { cn } from '@/lib/utils'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import Thread, { BubblesSkeleton } from './Thread'
import { contextLine, previewOf, shortWhen } from './format'

/**
 * La messagerie, identique dans l'espace client et l'espace chef : la liste des
 * conversations et le fil ouvert. Seuls les textes changent d'un espace à l'autre.
 *
 * Le fil ouvert est dans l'URL (`?c=<id>`), pour qu'un lien — celui de l'email
 * « nouveau message », par exemple — y mène directement. `?booking=<id>` ouvre
 * le fil de la réservation indiquée, en le créant au besoin.
 */
export default function MessagingView({
  placeholder,
  canned,
  emptyText,
}: {
  placeholder: string
  canned?: string[]
  /** Ce qu'on explique à quelqu'un qui n'a encore aucune conversation. */
  emptyText: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const selectedId = params.get('c')
  const bookingId = params.get('booking')

  const conversations = useConversations()
  const openSupport = useOpenSupport()
  const openForBooking = useOpenForBooking()
  const markRead = useMarkRead()

  const list = conversations.data ?? []
  const active = list.find((c) => c.id === selectedId) ?? null

  const select = (id: string | null) =>
    router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false })

  // `?booking=` : une seule tentative par réservation, puis l'URL pointe sur le fil.
  const openedBooking = useRef<string | null>(null)
  useEffect(() => {
    if (!bookingId || openedBooking.current === bookingId) return
    openedBooking.current = bookingId
    openForBooking.mutate(bookingId, {
      onSuccess: (conversation) => select(conversation.id),
      onError: () => select(null),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché par le seul paramètre d'URL
  }, [bookingId])

  // Sur grand écran, un fil est toujours ouvert : le plus récent par défaut.
  useEffect(() => {
    if (selectedId || bookingId || list.length === 0) return
    if (window.matchMedia('(min-width: 1024px)').matches) select(list[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- au chargement de la liste
  }, [selectedId, bookingId, list.length])

  // Ouvrir un fil, ou y recevoir un message pendant qu'il est ouvert, c'est le lire.
  const marked = useRef<string | null>(null)
  useEffect(() => {
    if (!active || active.unreadCount === 0) return
    const stamp = `${active.id}:${active.lastMessageAt}`
    if (marked.current === stamp) return
    marked.current = stamp
    markRead.mutate(active.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `markRead` change à chaque rendu
  }, [active?.id, active?.unreadCount, active?.lastMessageAt])

  const startSupport = () =>
    openSupport.mutate(undefined, { onSuccess: (conversation) => select(conversation.id) })

  const hasSupport = list.some((c) => c.type === 'support')

  if (conversations.isPending) {
    return <MessagingSkeleton />
  }

  if (conversations.isError) {
    return (
      <div role="alert" className="rounded-3xl bg-paper p-8 text-center">
        <p className="text-sm text-ink-mid">La messagerie n&apos;a pas pu être chargée.</p>
        <button
          type="button"
          onClick={() => conversations.refetch()}
          className="btn btn-outline mt-4"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-amber">
          <MessageCircle className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="font-display text-xl font-bold text-navy">Aucune conversation</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">{emptyText}</p>
        <button
          type="button"
          onClick={startSupport}
          disabled={openSupport.isPending}
          className="btn btn-primary mt-6"
        >
          <Headset className="h-4 w-4" /> Écrire au support
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
      {/* Liste — sur mobile, cède la place au fil ouvert. */}
      <aside
        className={cn(
          'overflow-hidden rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper',
          active && 'hidden lg:block',
        )}
      >
        <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
          {list.map((conversation) => (
            <li key={conversation.id}>
              <ConversationRow
                conversation={conversation}
                active={conversation.id === active?.id}
                onSelect={() => select(conversation.id)}
              />
            </li>
          ))}
        </ul>
        {!hasSupport && (
          <div className="border-t border-[rgba(31,42,55,0.06)] p-3">
            <button
              type="button"
              onClick={startSupport}
              disabled={openSupport.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cream-soft px-3 py-2.5 text-xs font-semibold text-ink-mid hover:text-navy disabled:opacity-60"
            >
              <Headset className="h-3.5 w-3.5" aria-hidden /> Écrire au support
            </button>
          </div>
        )}
      </aside>

      {active ? (
        <Thread
          key={active.id}
          conversation={active}
          placeholder={placeholder}
          canned={canned}
          onBack={() => select(null)}
          onOpenSupport={startSupport}
        />
      ) : (
        <div className="hidden items-center justify-center rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper text-sm text-ink-soft lg:flex">
          Choisissez une conversation.
        </div>
      )}
    </div>
  )
}

/** La liste (300 px, rangées de 82 px) et le fil ouvert, comme à l'arrivée des données. */
export function MessagingSkeleton() {
  return (
    <SkeletonGroup className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
      <div className="overflow-hidden rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper">
        <div className="divide-y divide-[rgba(31,42,55,0.06)]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-0.5 px-4 py-3.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48 max-w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden h-[72vh] min-h-[520px] rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:block lg:p-6">
        <div className="flex items-center gap-3 border-b border-[rgba(31,42,55,0.08)] pb-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="py-4">
          <BubblesSkeleton />
        </div>
      </div>
    </SkeletonGroup>
  )
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation
  active: boolean
  onSelect: () => void
}) {
  const Icon = conversation.type === 'support' ? Headset : UserRound
  const lastIsMine = conversation.lastMessage?.senderRole === conversation.viewerRole

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'w-full px-4 py-3.5 text-left transition-colors',
        active ? 'bg-cream-soft' : 'hover:bg-cream-soft/60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-navy">
          <Icon className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
          <span className="truncate">{conversation.counterpart.name}</span>
        </p>
        {conversation.unreadCount > 0 && (
          <span
            className="rounded-full bg-amber px-1.5 py-0.5 text-xs font-bold text-navy"
            aria-label={`${conversation.unreadCount} non lu${conversation.unreadCount > 1 ? 's' : ''}`}
          >
            {conversation.unreadCount}
          </span>
        )}
      </div>
      <p className="text-xs text-ink-soft">{contextLine(conversation)}</p>
      <p className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-ink-mid">
        <span className="min-w-0 truncate">
          {lastIsMine && 'Vous : '}
          {previewOf(conversation.lastMessage)}
        </span>
        {conversation.lastMessageAt && (
          <span className="shrink-0 text-xs text-ink-soft">
            {shortWhen(conversation.lastMessageAt)}
          </span>
        )}
      </p>
    </button>
  )
}
