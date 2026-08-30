'use client'

import { useState } from 'react'
import { LifeBuoy, Paperclip, Plus } from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import { CHEF_DISPUTES, CHEF_MISSIONS, DISPUTE_STATUS_LABEL } from '@/lib/chef/mock'

const TONE = { open: 'warning', processing: 'info', resolved: 'success' } as const

const CATEGORIES = [
  'Contestation de paiement',
  'Annulation tardive',
  'Litige sur la prestation',
  'Problème technique',
  'Autre',
]

export default function ChefDisputesPage() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [mission, setMission] = useState(CHEF_MISSIONS[0]?.reference ?? '')
  const [sent, setSent] = useState(false)

  return (
    <ChefPage title="Litiges & support" subtitle="Ouvrez un dossier et suivez son traitement.">
      <div className="space-y-5">
        <Card
          title={`Mes dossiers (${CHEF_DISPUTES.length})`}
          action={
            <button onClick={() => setOpen((v) => !v)} className="btn btn-primary text-xs px-4 py-2">
              <Plus className="w-3.5 h-3.5" /> Ouvrir un litige
            </button>
          }
        >
          {CHEF_DISPUTES.length === 0 ? (
            <Empty text="Aucun litige en cours." />
          ) : (
            <ul className="space-y-2.5">
              {CHEF_DISPUTES.map((d) => (
                <li
                  key={d.id}
                  className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 flex items-center gap-4"
                >
                  <span className="w-10 h-10 rounded-xl bg-cream-soft flex items-center justify-center shrink-0">
                    <LifeBuoy className="w-4 h-4 text-terra" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">{d.category}</p>
                    <p className="text-xs text-ink-soft">
                      {d.missionRef} · {d.client} · ouvert le{' '}
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

        {open && (
          <Card title="Nouveau litige">
            {sent ? (
              <div className="py-6 text-center">
                <p className="font-display text-lg font-bold text-navy">Dossier ouvert</p>
                <p className="text-sm text-ink-mid mt-1">
                  Le support revient vers vous sous 48 h ouvrées.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label-muted block mb-2">Prestation concernée</label>
                  <select
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    className="input-base"
                  >
                    {CHEF_MISSIONS.map((m) => (
                      <option key={m.id} value={m.reference}>
                        {m.reference} — {m.client}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-muted block mb-2">Catégorie</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                          category === c
                            ? 'bg-navy text-white'
                            : 'bg-cream-soft text-ink-mid'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-muted block mb-2">Description</label>
                  <textarea rows={4} className="input-base resize-none" placeholder="Décrivez la situation…" />
                </div>

                <button className="text-xs text-terra font-semibold inline-flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Joindre une pièce
                </button>

                <button
                  onClick={() => setSent(true)}
                  className="btn btn-primary w-full justify-center text-sm"
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
