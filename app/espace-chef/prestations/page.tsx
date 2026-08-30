'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, MapPin, PlayCircle, Users } from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import StatusBadge, { MissionBadge } from '@/components/chef/StatusBadge'
import { CHEF_MISSIONS, HYGIENE_CHECKLIST, type ChefMission } from '@/lib/chef/mock'
import { PAYMENT_METHOD_LABEL } from '@/lib/chef/states'

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

type Tab = 'upcoming' | 'current' | 'history'

export default function ChefMissionsPage() {
  const [tab, setTab] = useState<Tab>('upcoming')

  const groups: Record<Tab, ChefMission[]> = {
    upcoming: CHEF_MISSIONS.filter((m) => m.status === 'upcoming' || m.status === 'confirmed'),
    current: CHEF_MISSIONS.filter((m) => m.status === 'in-progress'),
    history: CHEF_MISSIONS.filter((m) =>
      ['done', 'cancelled', 'disputed'].includes(m.status),
    ),
  }

  const list = groups[tab]

  return (
    <ChefPage title="Prestations" subtitle="Vos sessions à venir, en cours et passées.">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'upcoming' as Tab, label: 'À venir' },
              { id: 'current' as Tab, label: 'En cours' },
              { id: 'history' as Tab, label: 'Historique' },
            ]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-navy text-white'
                  : 'bg-paper text-ink-mid border border-[rgba(31,42,55,0.1)]'
              }`}
            >
              {t.label} ({groups[t.id].length})
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <Card>
            <Empty text="Aucune prestation dans cette catégorie." />
          </Card>
        ) : (
          <div className="space-y-4">
            {list.map((m) => (
              <MissionCard key={m.id} mission={m} showChecklist={tab === 'current'} />
            ))}
          </div>
        )}
      </div>
    </ChefPage>
  )
}

function MissionCard({
  mission: m,
  showChecklist,
}: {
  mission: ChefMission
  showChecklist: boolean
}) {
  const [done, setDone] = useState<string[]>([])
  const toggle = (item: string) =>
    setDone((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))
  const allDone = done.length === HYGIENE_CHECKLIST.length

  return (
    <Card>
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-display text-lg font-bold text-navy">{m.client}</p>
            <MissionBadge status={m.status} />
          </div>
          <p className="font-mono text-[11px] text-ink-soft">{m.reference}</p>
          <p className="text-sm text-ink-mid capitalize mt-1">
            {shortDate(m.date)} · {m.timeSlot}
          </p>
          <p className="text-xs text-ink-soft inline-flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5" /> {m.city}
            <span className="mx-1">·</span>
            <Users className="w-3.5 h-3.5" /> {m.persons} pers.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {m.meals.map((meal) => (
              <span key={meal} className="text-[11px] px-2.5 py-1 rounded-full bg-cream-soft text-navy">
                {meal}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:w-64 shrink-0 rounded-2xl bg-cream-soft p-4">
          <StatusBadge tone="neutral" className="mb-3">
            {PAYMENT_METHOD_LABEL[m.paymentMethod]}
          </StatusBadge>
          <p className="text-[10px] uppercase tracking-wide text-ink-soft">Net perçu</p>
          <p className="font-display text-2xl font-bold text-navy">{euros(m.net)}</p>
          <p className="text-[11px] text-ink-soft mt-1">
            Client {euros(m.amountTTC)} · commission {euros(m.commission)}
          </p>
          {m.status === 'upcoming' && (
            <button className="btn btn-primary w-full justify-center text-xs mt-3 py-2.5">
              <PlayCircle className="w-3.5 h-3.5" /> Démarrer
            </button>
          )}
        </div>
      </div>

      {/* Checklist hygiène — prestation en cours */}
      {showChecklist && (
        <div className="mt-5 pt-5 border-t border-[rgba(31,42,55,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-bold text-navy">Checklist hygiène</h3>
            <StatusBadge tone={allDone ? 'success' : 'warning'}>
              {done.length}/{HYGIENE_CHECKLIST.length}
            </StatusBadge>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HYGIENE_CHECKLIST.map((item) => {
              const checked = done.includes(item)
              return (
                <li key={item}>
                  <button
                    onClick={() => toggle(item)}
                    className={`w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-xl border transition-colors ${
                      checked
                        ? 'border-mint-deep bg-mint/40'
                        : 'border-[rgba(31,42,55,0.08)] hover:bg-cream-soft'
                    }`}
                  >
                    {checked ? (
                      <CheckCircle2 className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
                    )}
                    <span className={`text-xs ${checked ? 'text-mint-ink' : 'text-ink-mid'}`}>
                      {item}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <button
            disabled={!allDone}
            className="btn btn-primary w-full justify-center text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Terminer la prestation
          </button>
          {!allDone && (
            <p className="text-[11px] text-ink-soft text-center mt-2">
              Complétez la checklist pour clôturer.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
