'use client'

import { useState } from 'react'
import { ChevronDown, Headset, Paperclip, Send, UserRound, Utensils } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import { CHEF_MESSAGES, CHEF_THREADS, clientById, type ChefMessage } from '@/lib/chef/mock'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Messagerie.

   Tout se passe dans l'application : pas d'appel, pas d'échange de coordonnées.
   Les numéros et adresses écrits dans un message sont donc remplacés avant
   affichage. Les messages sont groupés par jour, et la fiche du client
   s'ouvre d'un clic sur son nom.
   ───────────────────────────────────────────────────────────────────────────── */

function mask(text: string): string {
  return text
    .replace(/(?:\+?\d[\s.-]?){9,}/g, '•••••')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '•••••')
}

const dayOf = (iso: string) => new Date(iso).toDateString()

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const hourLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function ChefMessagesPage() {
  const [activeId, setActiveId] = useState(CHEF_THREADS[0].id)
  const [draft, setDraft] = useState('')
  const [showClient, setShowClient] = useState(false)

  const active = CHEF_THREADS.find((t) => t.id === activeId)!
  const client = active.clientId ? clientById(active.clientId) : undefined
  const messages = CHEF_MESSAGES.filter((m) => m.threadId === activeId).sort((a, b) => a.at.localeCompare(b.at))

  // Groupement par jour : une séparation datée, comme dans une vraie conversation.
  const groups = messages.reduce<{ day: string; items: ChefMessage[] }[]>((acc, m) => {
    const last = acc[acc.length - 1]
    if (last && last.day === dayOf(m.at)) last.items.push(m)
    else acc.push({ day: dayOf(m.at), items: [m] })
    return acc
  }, [])

  return (
    <ChefPage title="Messagerie" subtitle="Un fil par prestation, plus le canal support.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        {/* Liste des fils */}
        <Card className="!p-0 overflow-hidden">
          <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
            {CHEF_THREADS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => {
                    setActiveId(t.id)
                    setShowClient(false)
                  }}
                  aria-current={t.id === activeId ? 'true' : undefined}
                  className={cn(
                    'w-full px-4 py-3.5 text-left transition-colors',
                    t.id === activeId ? 'bg-cream-soft' : 'hover:bg-cream-soft/60',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-navy">
                      {t.clientId ? (
                        <UserRound className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
                      ) : (
                        <Headset className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
                      )}
                      {t.client}
                    </p>
                    {t.unread > 0 && (
                      <span className="rounded-full bg-amber px-1.5 py-0.5 text-[10px] font-bold text-navy">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    {t.missionRef ? `Prestation n° ${t.missionRef}` : 'Canal support'}
                  </p>
                  <p className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-ink-mid">
                    <span className="min-w-0 truncate">{t.lastMessage}</span>
                    <span className="shrink-0 text-[10px] text-ink-soft">{hourLabel(t.at)}</span>
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Conversation */}
        <Card className="flex min-h-[560px] flex-col">
          <div className="border-b border-[rgba(31,42,55,0.08)] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {client ? (
                <button
                  onClick={() => setShowClient((v) => !v)}
                  aria-expanded={showClient}
                  className="group flex items-center gap-2 rounded-lg px-1 py-0.5 text-left"
                >
                  <span className="font-display text-lg font-bold text-navy group-hover:text-amber-deep">
                    {active.client}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-ink-soft transition-transform ${showClient ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
              ) : (
                <p className="font-display text-lg font-bold text-navy">{active.client}</p>
              )}
              {active.missionRef && (
                <p className="text-xs text-ink-soft">
                  Prestation n° <span className="font-mono text-ink-mid">{active.missionRef}</span>
                </p>
              )}
            </div>

            {/* Fiche client */}
            {showClient && client && (
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 rounded-xl bg-cream-soft px-4 py-3 text-[13px] sm:grid-cols-2">
                <Row label="Ville" value={client.city} />
                <Row label="Foyer" value={client.household} />
                <Row label="Allergies" value={client.allergies.join(', ') || 'Aucune'} />
                <Row label="Régimes" value={client.diets.join(', ') || 'Aucun'} />
                <Row label="Équipement" value={client.equipment.join(', ')} />
                <Row label="Sessions" value={`${client.sessionsCount} avec vous`} />
                {client.note && (
                  <p className="mt-1 flex items-start gap-2 text-ink-mid sm:col-span-2">
                    <Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-deep" aria-hidden />
                    {client.note}
                  </p>
                )}
              </dl>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            {groups.map((g) => (
              <div key={g.day} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-[rgba(31,42,55,0.08)]" />
                  <span className="text-[11px] font-semibold capitalize text-ink-soft">
                    {dayLabel(g.items[0].at)}
                  </span>
                  <span className="h-px flex-1 bg-[rgba(31,42,55,0.08)]" />
                </div>

                {g.items.map((m) => {
                  const mine = m.from === 'chef'
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className="max-w-[80%]">
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                            mine ? 'bg-navy text-white' : 'bg-cream-soft text-ink',
                          )}
                        >
                          {mask(m.text)}
                        </div>
                        <p className={cn('mt-1 text-[10px] text-ink-soft', mine && 'text-right')}>
                          {hourLabel(m.at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-[rgba(31,42,55,0.08)] pt-4">
            <div className="flex gap-2">
              <button
                aria-label="Joindre un fichier"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-soft text-ink-soft hover:text-navy"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrire un message…"
                aria-label="Votre message"
                className="input-base flex-1"
              />
              <button aria-label="Envoyer" className="btn btn-primary shrink-0 px-4">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </ChefPage>
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
