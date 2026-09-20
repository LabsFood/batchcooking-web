'use client'

import { useState } from 'react'
import { CheckCircle2, LifeBuoy, Paperclip, PhoneCall, Plus, X } from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import {
  CHEF_DISPUTES,
  CHEF_MISSIONS,
  DISPUTE_STATUS_LABEL,
  DISPUTE_SUBJECTS,
  type DisputeSubject,
} from '@/lib/chef/mock'

/* ─────────────────────────────────────────────────────────────────────────────
   Litiges et support.

   Un litige ne porte pas forcément sur une prestation : le sujet est choisi
   d'abord, et la prestation n'est demandée que lorsqu'elle a du sens. Pour une
   question rapide, le batch cooker demande à être rappelé plutôt que d'ouvrir
   un dossier.
   ───────────────────────────────────────────────────────────────────────────── */

const TONE = { open: 'warning', processing: 'info', resolved: 'success' } as const

const CALLBACK_SLOTS = [
  { id: 'asap', label: 'Dès que possible' },
  { id: 'morning', label: 'Le matin (9h – 12h)' },
  { id: 'afternoon', label: "L'après-midi (14h – 18h)" },
]

export default function ChefDisputesPage() {
  const [form, setForm] = useState<'none' | 'dispute' | 'callback'>('none')
  const [subject, setSubject] = useState<DisputeSubject>('mission')
  const [missionRef, setMissionRef] = useState(CHEF_MISSIONS[0]?.reference ?? '')
  const [description, setDescription] = useState('')
  const [slot, setSlot] = useState(CALLBACK_SLOTS[0].id)
  const [sent, setSent] = useState<'dispute' | 'callback' | null>(null)

  const needsMission = DISPUTE_SUBJECTS.find((s) => s.id === subject)?.needsMission ?? false
  const canSend = description.trim().length >= 10

  const reset = () => {
    setForm('none')
    setSent(null)
    setDescription('')
  }

  return (
    <ChefPage title="Litiges & support" subtitle="Ouvrez un dossier ou demandez à être rappelé.">
      <div className="space-y-5">
        <Card
          title={`Mes dossiers (${CHEF_DISPUTES.length})`}
          action={
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setForm(form === 'callback' ? 'none' : 'callback')
                  setSent(null)
                }}
                className="btn btn-outline px-4 py-2 text-xs"
              >
                <PhoneCall className="h-3.5 w-3.5" aria-hidden /> Être rappelé
              </button>
              <button
                onClick={() => {
                  setForm(form === 'dispute' ? 'none' : 'dispute')
                  setSent(null)
                }}
                className="btn btn-primary px-4 py-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden /> Ouvrir un litige
              </button>
            </div>
          }
        >
          {CHEF_DISPUTES.length === 0 ? (
            <Empty text="Aucun dossier en cours." />
          ) : (
            <ul className="space-y-2.5">
              {CHEF_DISPUTES.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-4 rounded-2xl border border-[rgba(31,42,55,0.08)] p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-soft">
                    <LifeBuoy className="h-4 w-4 text-terra" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">{d.category}</p>
                    <p className="text-xs text-ink-soft">
                      {DISPUTE_SUBJECTS.find((s) => s.id === d.subject)?.label}
                      {d.missionRef && ` · prestation n° ${d.missionRef}`}
                      {d.client && ` · ${d.client}`} · ouvert le{' '}
                      {new Date(d.openedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[d.status]} dot>
                    {DISPUTE_STATUS_LABEL[d.status]}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Demande de rappel */}
        {form === 'callback' && (
          <Card
            title="Être rappelé"
            action={
              <button
                onClick={reset}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy"
              >
                <X className="h-4 w-4" />
              </button>
            }
          >
            {sent === 'callback' ? (
              <Sent
                title="Demande de rappel envoyée"
                text="Nous vous appelons au numéro de votre compte, sur le créneau choisi."
                onDone={reset}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] leading-relaxed text-ink-mid">
                  Pour une question rapide, laissez-nous vous appeler : pas de dossier à ouvrir. Nous utilisons le
                  numéro enregistré sur votre compte.
                </p>
                <div>
                  <p className="mb-2 text-sm font-semibold text-navy">Quand vous rappeler ?</p>
                  <div className="flex flex-wrap gap-2">
                    {CALLBACK_SLOTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSlot(s.id)}
                        aria-pressed={slot === s.id}
                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                          slot === s.id ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="callback-reason" className="mb-1.5 block text-sm font-semibold text-navy">
                    Votre question
                  </label>
                  <textarea
                    id="callback-reason"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="En deux mots, pour préparer l’appel…"
                    className="input-base resize-none"
                  />
                </div>
                <button
                  onClick={() => setSent('callback')}
                  disabled={!canSend}
                  className="btn btn-primary w-full justify-center text-sm disabled:opacity-50"
                >
                  Demander un rappel
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Nouveau litige */}
        {form === 'dispute' && (
          <Card
            title="Nouveau dossier"
            action={
              <button
                onClick={reset}
                aria-label="Fermer"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy"
              >
                <X className="h-4 w-4" />
              </button>
            }
          >
            {sent === 'dispute' ? (
              <Sent
                title="Dossier ouvert"
                text="Le support revient vers vous sous 48 h ouvrées, dans la messagerie."
                onDone={reset}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-navy">Sur quoi porte votre demande ?</p>
                  <div className="flex flex-wrap gap-2">
                    {DISPUTE_SUBJECTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSubject(s.id)}
                        aria-pressed={subject === s.id}
                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                          subject === s.id ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {needsMission && (
                  <div>
                    <label htmlFor="dispute-mission" className="mb-1.5 block text-sm font-semibold text-navy">
                      Prestation concernée
                    </label>
                    <select
                      id="dispute-mission"
                      value={missionRef}
                      onChange={(e) => setMissionRef(e.target.value)}
                      className="input-base"
                    >
                      {CHEF_MISSIONS.map((m) => (
                        <option key={m.id} value={m.reference}>
                          n° {m.reference} — {m.client} ·{' '}
                          {new Date(m.date).toLocaleDateString('fr-FR')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="dispute-description" className="mb-1.5 block text-sm font-semibold text-navy">
                    Description
                  </label>
                  <textarea
                    id="dispute-description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez la situation, les dates et ce que vous attendez de nous…"
                    className="input-base resize-none"
                  />
                  {description.trim().length > 0 && !canSend && (
                    <p className="mt-1.5 text-[13px] text-ink-soft">Encore quelques mots pour que nous puissions agir.</p>
                  )}
                </div>

                <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-terra">
                  <Paperclip className="h-3.5 w-3.5" aria-hidden /> Joindre une pièce
                </button>

                <button
                  onClick={() => setSent('dispute')}
                  disabled={!canSend}
                  className="btn btn-primary w-full justify-center text-sm disabled:opacity-50"
                >
                  Ouvrir le dossier
                </button>
              </div>
            )}
          </Card>
        )}
      </div>
    </ChefPage>
  )
}

function Sent({ title, text, onDone }: { title: string; text: string; onDone: () => void }) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-mint-ink">
        <CheckCircle2 className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-display text-lg font-bold text-navy">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-mid">{text}</p>
      <button onClick={onDone} className="btn btn-outline mt-4 text-xs">
        Fermer
      </button>
    </div>
  )
}
