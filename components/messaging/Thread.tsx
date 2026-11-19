'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  EyeOff,
  Headset,
  Lock,
  Utensils,
} from 'lucide-react'
import {
  flattenMessages,
  useConversation,
  useMessages,
  type Conversation,
  type Message,
} from '@/lib/api/messaging'
import { cn } from '@/lib/utils'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import Attachments from './Attachments'
import Composer from './Composer'
import {
  contextLine,
  dateTimeLabel,
  dayLabel,
  groupByDay,
  hourLabel,
  initials,
} from './format'

/**
 * Un fil : en-tête, messages groupés par jour, zone de saisie.
 *
 * Les coordonnées ne sont pas filtrées ici : l'API sert déjà le texte masqué
 * tant qu'elles ne sont pas libérées. L'écran se contente de l'expliquer.
 */
export default function Thread({
  conversation: listed,
  placeholder,
  canned,
  onBack,
  onOpenSupport,
}: {
  /** La version de la liste, affichée tout de suite ; le détail la complète. */
  conversation: Conversation
  placeholder: string
  canned?: string[]
  onBack: () => void
  onOpenSupport: () => void
}) {
  const detail = useConversation(listed.id)
  const conversation = detail.data ?? listed
  const clientCard = detail.data?.clientCard ?? null

  const messagesQuery = useMessages(conversation.id)
  const messages = flattenMessages(messagesQuery.data)
  const [showCard, setShowCard] = useState(false)

  const scroller = useRef<HTMLDivElement | null>(null)
  const lastId = messages[messages.length - 1]?.id
  const firstId = messages[0]?.id
  const heightBefore = useRef(0)

  // Nouveau message en bas (ou fil qui vient de charger) : on suit.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastId])

  // Page plus ancienne ajoutée en haut : on garde sous les yeux ce qu'on lisait.
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && heightBefore.current) {
      el.scrollTop += el.scrollHeight - heightBefore.current
      heightBefore.current = 0
    }
  }, [firstId])

  const loadOlder = () => {
    heightBefore.current = scroller.current?.scrollHeight ?? 0
    void messagesQuery.fetchNextPage()
  }

  const isSupport = conversation.type === 'support'
  const { counterpart } = conversation

  return (
    <section className="flex h-[72vh] min-h-[520px] flex-col rounded-2xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 lg:p-6">
      {/* En-tête */}
      <header className="border-b border-[rgba(31,42,55,0.08)] pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour aux conversations"
            className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream-soft text-ink-mid lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-amber">
            {isSupport ? <Headset className="h-5 w-5" aria-hidden /> : initials(counterpart.name)}
          </span>
          <div className="min-w-0 flex-1">
            {clientCard ? (
              <button
                type="button"
                onClick={() => setShowCard((v) => !v)}
                aria-expanded={showCard}
                className="group flex items-center gap-1.5 text-left"
              >
                <span className="truncate font-display text-lg font-bold text-navy group-hover:text-amber-ink">
                  {counterpart.name}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-ink-soft transition-transform',
                    showCard && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
            ) : (
              <p className="truncate font-display text-lg font-bold text-navy">
                {counterpart.name}
              </p>
            )}
            <p className="truncate text-xs text-ink-soft">
              {contextLine(conversation)}
              {conversation.booking && ` · ${dateTimeLabel(conversation.booking.startsAt)}`}
            </p>
          </div>
        </div>

        {showCard && clientCard && (
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 rounded-xl bg-cream-soft px-4 py-3 text-[13px] sm:grid-cols-2">
            <Row label="Ville" value={clientCard.city ?? 'Non renseignée'} />
            <Row
              label="Foyer"
              value={
                `${clientCard.householdAdults} adulte${clientCard.householdAdults > 1 ? 's' : ''}` +
                (clientCard.householdKids
                  ? `, ${clientCard.householdKids} enfant${clientCard.householdKids > 1 ? 's' : ''}`
                  : '')
              }
            />
            <Row label="Allergies" value={clientCard.allergies.join(', ') || 'Aucune'} />
            <Row
              label="Régimes"
              value={clientCard.dietaryPreferences.join(', ') || 'Aucun'}
            />
            {clientCard.kitchenNotes && (
              <p className="mt-1 flex items-start gap-2 text-ink-mid sm:col-span-2">
                <Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-ink" aria-hidden />
                {clientCard.kitchenNotes}
              </p>
            )}
          </dl>
        )}

        {!isSupport && <ContactNotice />}
      </header>

      {/* Messages */}
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto py-4">
        {messagesQuery.hasNextPage && (
          <div className="text-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={messagesQuery.isFetchingNextPage}
              className="rounded-full bg-cream-soft px-3 py-1 text-xs font-semibold text-ink-mid hover:text-navy disabled:opacity-60"
            >
              {messagesQuery.isFetchingNextPage ? 'Chargement…' : 'Messages précédents'}
            </button>
          </div>
        )}

        {messagesQuery.isPending && (
          <BubblesSkeleton />
        )}
        {messagesQuery.isError && (
          <p role="alert" className="py-8 text-center text-sm text-ink-soft">
            La conversation n&apos;a pas pu être chargée.{' '}
            <button
              type="button"
              onClick={() => messagesQuery.refetch()}
              className="font-semibold text-navy underline"
            >
              Réessayer
            </button>
          </p>
        )}
        {messagesQuery.isSuccess && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-soft">
            Aucun message pour le moment. Écrivez le premier.
          </p>
        )}

        {groupByDay(messages).map((group) => (
          <div key={group.day} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[rgba(31,42,55,0.08)]" />
              <span className="cap-first inline-block text-xs font-semibold text-ink-soft">
                {dayLabel(group.items[0].createdAt)}
              </span>
              <span className="h-px flex-1 bg-[rgba(31,42,55,0.08)]" />
            </div>
            {group.items.map((message) => (
              <Bubble key={message.id} message={message} conversation={conversation} />
            ))}
          </div>
        ))}
      </div>

      {/* Saisie */}
      {conversation.writable ? (
        <Composer
          key={conversation.id}
          conversation={conversation}
          placeholder={placeholder}
          canned={canned}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(31,42,55,0.08)] pt-4">
          <p className="flex items-center gap-2 text-sm text-ink-mid">
            <Lock className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
            Conversation fermée : aucune prestation à venir ou récente.
          </p>
          <button type="button" onClick={onOpenSupport} className="btn btn-outline">
            <Headset className="h-4 w-4" /> Écrire au support
          </button>
        </div>
      )}
    </section>
  )
}

/** Des bulles qui alternent gauche et droite, aux largeurs de vrais messages. */
export function BubblesSkeleton() {
  const bulles = [
    { mine: false, w: 'w-2/5', h: 'h-10' },
    { mine: true, w: 'w-1/2', h: 'h-14' },
    { mine: false, w: 'w-3/5', h: 'h-14' },
    { mine: true, w: 'w-1/3', h: 'h-10' },
  ]
  return (
    <SkeletonGroup className="space-y-4">
      {bulles.map((b, i) => (
        <div key={i} className={cn('flex', b.mine ? 'justify-end' : 'justify-start')}>
          <Skeleton className={cn('rounded-2xl', b.w, b.h)} />
        </div>
      ))}
    </SkeletonGroup>
  )
}

/** Pourquoi des `•••••` apparaissent : les coordonnées ne sont jamais partagées. */
function ContactNotice() {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-xl bg-cream-soft px-3 py-2 text-xs text-ink-mid">
      <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
      <span>
        Tous les échanges se passent ici.
      </span>
    </p>
  )
}

function Bubble({ message, conversation }: { message: Message; conversation: Conversation }) {
  const mine = message.senderRole === conversation.viewerRole
  // L'équipe qui intervient dans un fil entre un client et un chef.
  const fromTeam = message.senderRole === 'support' && conversation.type === 'chef_client'

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%]', message.pending && 'opacity-60')}>
        {fromTeam && (
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-ink">
            <Headset className="h-3 w-3" aria-hidden /> Lab&apos;s Food
          </p>
        )}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            mine
              ? 'rounded-br-md bg-navy text-white'
              : fromTeam
                ? 'rounded-bl-md bg-amber-soft text-navy'
                : 'rounded-bl-md bg-cream-soft text-ink',
          )}
        >
          {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
          <Attachments
            conversationId={conversation.id}
            attachments={message.attachments}
            mine={mine}
            pending={message.pending}
            className={message.body ? 'mt-2' : undefined}
          />
        </div>
        <p className={cn('mt-1 text-xs text-ink-soft', mine && 'text-right')}>
          {message.pending ? 'Envoi…' : hourLabel(message.createdAt)}
          {mine && message.contactMasked && ' · coordonnées masquées pour votre interlocuteur'}
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-navy">{value}</dd>
    </div>
  )
}
