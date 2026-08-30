'use client'

import { useState } from 'react'
import { Lock, Paperclip, Phone, Send, ShieldCheck } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import { CHEF_THREADS } from '@/lib/chef/mock'
import { cn } from '@/lib/utils'

/** Filtrage anti-désintermédiation : téléphones et e-mails sont masqués. */
function maskContacts(text: string): { masked: string; hit: boolean } {
  const phone = /(?:\+?\d[\s.-]?){9,}/g
  const email = /[\w.+-]+@[\w-]+\.[\w.]+/g
  const hit = phone.test(text) || email.test(text)
  const masked = text
    .replace(phone, '••• masqué •••')
    .replace(email, '••• masqué •••')
  return { masked, hit }
}

const MESSAGES = [
  { id: 'm1', from: 'client' as const, text: 'Bonjour ! Est-ce que vous pouvez prévoir un plat sans gluten ?', at: '09:12' },
  { id: 'm2', from: 'chef' as const, text: 'Bonjour Sophie, bien sûr — je note ça pour jeudi.', at: '09:20' },
  { id: 'm3', from: 'client' as const, text: 'Parfait ! Vous pouvez m’appeler au 06 12 34 56 78 si besoin.', at: '09:24' },
]

export default function ChefMessagesPage() {
  const [activeId, setActiveId] = useState(CHEF_THREADS[0].id)
  const [draft, setDraft] = useState('')
  const active = CHEF_THREADS.find((t) => t.id === activeId)!

  return (
    <ChefPage title="Messagerie" subtitle="Un fil par prestation, plus le canal support.">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Liste des fils */}
        <Card className="p-0 overflow-hidden">
          <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
            {CHEF_THREADS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    'w-full text-left px-4 py-3.5 transition-colors',
                    t.id === activeId ? 'bg-cream-soft' : 'hover:bg-cream-soft/60',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy truncate">{t.client}</p>
                    {t.unread > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber text-navy">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-ink-soft">{t.missionRef}</p>
                  <p className="text-xs text-ink-mid truncate mt-0.5">{t.lastMessage}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Conversation */}
        <Card className="flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[rgba(31,42,55,0.08)]">
            <div>
              <p className="font-display text-lg font-bold text-navy">{active.client}</p>
              <p className="font-mono text-[10px] text-ink-soft">{active.missionRef}</p>
            </div>
            {active.contactUnlocked ? (
              <StatusBadge tone="success">
                <Phone className="w-3 h-3" /> Contact disponible
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral">
                <Lock className="w-3 h-3" /> Contact à J-2
              </StatusBadge>
            )}
          </div>

          <div className="flex-1 py-4 space-y-3 overflow-y-auto">
            {MESSAGES.map((m) => {
              const { masked, hit } = maskContacts(m.text)
              const mine = m.from === 'chef'
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className="max-w-[80%]">
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm',
                        mine ? 'bg-navy text-white' : 'bg-cream-soft text-ink',
                      )}
                    >
                      {masked}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-ink-soft">{m.at}</span>
                      {hit && (
                        <span className="text-[10px] text-amber-deep inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> coordonnées masquées
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-4 border-t border-[rgba(31,42,55,0.08)]">
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-xl bg-cream-soft flex items-center justify-center text-ink-soft shrink-0">
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrire un message…"
                className="input-base flex-1"
              />
              <button className="btn btn-primary px-4 shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-ink-soft mt-2 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              Les échanges restent dans l&apos;application. Numéros et e-mails sont
              automatiquement masqués.
            </p>
          </div>
        </Card>
      </div>
    </ChefPage>
  )
}
