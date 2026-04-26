'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Paperclip, ChefHat, Phone, Sparkles } from 'lucide-react'
import { CHAT_MESSAGES, type ChatMessage } from '@/lib/dashboard-mock'

const CANNED = [
  'Je peux décaler la session ?',
  'Plus d\'épices svp 🌶️',
  'Tu peux remplacer un plat ?',
]

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function dayOf(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = (text: string) => {
    if (!text.trim()) return
    const next: ChatMessage = {
      id: `m_${Date.now()}`,
      from: 'me',
      author: 'Vous',
      text: text.trim(),
      at: new Date().toISOString(),
      read: true,
    }
    setMessages((m) => [...m, next])
    setDraft('')
    // Mock auto-reply
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `m_${Date.now() + 1}`,
          from: 'admin',
          author: 'Ivy · Lab’s Food',
          text: 'Bien reçu ! Je regarde ça et je reviens vers toi 🍳',
          at: new Date().toISOString(),
          read: true,
        },
      ])
    }, 1100)
  }

  // Group by day
  const groups: { day: string; items: ChatMessage[] }[] = []
  messages.forEach((m) => {
    const d = dayOf(m.at)
    const last = groups[groups.length - 1]
    if (!last || last.day !== d) groups.push({ day: d, items: [m] })
    else last.items.push(m)
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      {/* Chat */}
      <section className="bg-paper rounded-3xl border border-[rgba(31,42,55,0.06)] flex flex-col h-[72vh]">
        {/* Chat header */}
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[rgba(31,42,55,0.06)]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-navy text-amber font-bold flex items-center justify-center">
                IS
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-mint-deep border-2 border-paper" />
            </div>
            <div>
              <p className="font-semibold text-navy text-sm leading-tight">Ivy Siyaptze</p>
              <p className="text-[11px] text-mint-ink">En ligne · répond &lt; 1h</p>
            </div>
          </div>
          <a href="tel:+33000000000" className="w-9 h-9 rounded-full bg-mint/40 text-mint-ink flex items-center justify-center hover:bg-mint transition-colors">
            <Phone className="w-4 h-4" />
          </a>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {groups.map((g) => (
            <div key={g.day} className="space-y-3">
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                <span className="flex-1 h-px bg-[rgba(31,42,55,0.08)]" />
                {g.day}
                <span className="flex-1 h-px bg-[rgba(31,42,55,0.08)]" />
              </div>
              {g.items.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-2.5 ${m.from === 'me' ? 'flex-row-reverse' : ''}`}
                >
                  {m.from === 'admin' && (
                    <div className="w-8 h-8 rounded-full bg-navy text-amber font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                      IS
                    </div>
                  )}
                  <div className={`max-w-[78%] ${m.from === 'me' ? 'items-end' : ''} flex flex-col`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        m.from === 'me'
                          ? 'bg-navy text-white rounded-br-md'
                          : 'bg-cream-soft text-navy rounded-bl-md'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-ink-soft mt-1">{timeOf(m.at)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="border-t border-[rgba(31,42,55,0.06)] p-3"
        >
          <div className="flex items-end gap-2">
            <button type="button" className="w-10 h-10 rounded-full bg-cream-soft text-ink-mid hover:bg-cream-deep flex items-center justify-center">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(draft)
                }
              }}
              rows={1}
              placeholder="Écris à Ivy…"
              className="flex-1 resize-none bg-cream-soft rounded-2xl px-4 py-3 text-sm outline-none focus:bg-paper focus:ring-2 focus:ring-amber/50 transition"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="w-10 h-10 rounded-full bg-amber text-navy flex items-center justify-center disabled:opacity-50 hover:bg-amber-deep transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CANNED.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setDraft(c)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-cream-soft text-ink-mid hover:bg-amber-soft hover:text-amber-deep transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* Side */}
      <aside className="space-y-4">
        <div className="bg-navy text-white rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber/30 blur-3xl pointer-events-none" />
          <ChefHat className="w-5 h-5 text-amber mb-3" />
          <p className="font-display text-lg font-bold leading-tight">Ton chef à portée de message.</p>
          <p className="text-white/65 text-xs mt-2 leading-relaxed">
            Tu peux écrire à Ivy pour ajuster un plat, demander une astuce de conservation ou
            partager un retour après ta session.
          </p>
        </div>

        <div className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber font-mono mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Bon à savoir
          </p>
          <p className="text-sm text-ink-mid leading-relaxed">
            Pour les annulations, passe par <strong className="text-navy">Mes commandes</strong> — c&apos;est plus rapide.
          </p>
        </div>
      </aside>
    </div>
  )
}
