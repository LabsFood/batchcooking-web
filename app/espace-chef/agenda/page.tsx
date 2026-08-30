'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Plus,
  Users,
  X,
} from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge, { MissionBadge } from '@/components/chef/StatusBadge'
import { CHEF_AVAILABILITY, CHEF_MISSIONS, CHEF_REQUESTS } from '@/lib/chef/mock'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** Clé de jour stable, indépendante du fuseau. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type DayEvent =
  | { kind: 'mission'; id: string; label: string; time: string; status: (typeof CHEF_MISSIONS)[number]['status'] }
  | { kind: 'request'; id: string; label: string; time: string }

export default function ChefAgendaPage() {
  // Mois affiché : on part du mois courant, calculé une seule fois.
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [slots, setSlots] = useState(CHEF_AVAILABILITY.slots)

  const todayKey = useMemo(() => dayKey(new Date()), [])

  /** Évènements indexés par jour : prestations confirmées + demandes en attente. */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>()
    const push = (k: string, e: DayEvent) => map.set(k, [...(map.get(k) ?? []), e])

    CHEF_MISSIONS.forEach((m) =>
      push(dayKey(new Date(m.date)), {
        kind: 'mission',
        id: m.id,
        label: m.client,
        time: m.timeSlot,
        status: m.status,
      }),
    )
    CHEF_REQUESTS.filter((r) => r.status === 'new').forEach((r) =>
      push(dayKey(new Date(r.date)), {
        kind: 'request',
        id: r.id,
        label: r.client,
        time: r.timeSlot,
      }),
    )
    return map
  }, [])

  /** Grille du mois : 6 semaines de 7 jours, commençant un lundi. */
  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    // getDay() : 0 = dimanche → on ramène à une semaine commençant lundi.
    const offset = (first.getDay() + 6) % 7
    const start = new Date(cursor.year, cursor.month, 1 - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      return { date: d, key: dayKey(d), inMonth: d.getMonth() === cursor.month }
    })
  }, [cursor])

  const move = (dir: -1 | 1) =>
    setCursor(({ year, month }) => {
      const m = month + dir
      if (m < 0) return { year: year - 1, month: 11 }
      if (m > 11) return { year: year + 1, month: 0 }
      return { year, month: m }
    })

  const openDay = selected ? eventsByDay.get(selected) ?? [] : []

  const toggleDay = (day: string) =>
    setSlots((prev) =>
      prev.map((s) =>
        s.day === day ? { ...s, ranges: s.ranges.length ? [] : ['9h – 13h'] } : s,
      ),
    )

  return (
    <ChefPage title="Agenda" subtitle="Vos prestations, vos demandes et vos disponibilités.">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* ── Calendrier ─────────────────────────────────────────────── */}
        <Card className="p-0 overflow-hidden">
          {/* Barre de navigation du mois */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[rgba(31,42,55,0.08)]">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-navy text-amber flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </span>
              <h2 className="font-display text-xl font-bold text-navy capitalize">
                {MONTHS[cursor.month]} {cursor.year}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => move(-1)}
                aria-label="Mois précédent"
                className="w-9 h-9 rounded-xl border border-[rgba(31,42,55,0.1)] flex items-center justify-center text-navy hover:border-amber transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const n = new Date()
                  setCursor({ year: n.getFullYear(), month: n.getMonth() })
                }}
                className="px-3 h-9 rounded-xl border border-[rgba(31,42,55,0.1)] text-xs font-semibold text-navy hover:border-amber transition-colors"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={() => move(1)}
                aria-label="Mois suivant"
                className="w-9 h-9 rounded-xl border border-[rgba(31,42,55,0.1)] flex items-center justify-center text-navy hover:border-amber transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* En-tête des jours */}
          <div className="grid grid-cols-7 border-b border-[rgba(31,42,55,0.06)] bg-cream-soft">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grille */}
          <div className="grid grid-cols-7">
            {grid.map(({ date, key, inMonth }) => {
              const events = eventsByDay.get(key) ?? []
              const isToday = key === todayKey
              const isSelected = key === selected
              return (
                <button
                  key={key}
                  onClick={() => setSelected(isSelected ? null : key)}
                  className={cn(
                    'relative min-h-[92px] border-b border-r border-[rgba(31,42,55,0.06)] p-2 text-left align-top transition-colors',
                    inMonth ? 'bg-paper' : 'bg-cream-soft/50',
                    isSelected && 'bg-amber-soft/50',
                    'hover:bg-cream-soft',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                      isToday
                        ? 'bg-navy text-amber'
                        : inMonth
                          ? 'text-navy'
                          : 'text-ink-soft/60',
                    )}
                  >
                    {date.getDate()}
                  </span>

                  <div className="mt-1 space-y-1">
                    {events.slice(0, 2).map((e) => (
                      <span
                        key={e.id}
                        className={cn(
                          'block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                          e.kind === 'mission'
                            ? 'bg-navy text-white'
                            : 'bg-amber-soft text-amber-deep',
                        )}
                      >
                        {e.label}
                      </span>
                    ))}
                    {events.length > 2 && (
                      <span className="block text-[10px] text-ink-soft">
                        +{events.length - 2} autre{events.length - 2 > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Légende */}
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-[rgba(31,42,55,0.06)]">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-mid">
              <span className="w-3 h-3 rounded bg-navy" /> Prestation
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-mid">
              <span className="w-3 h-3 rounded bg-amber-soft border border-amber/40" /> Demande en attente
            </span>
          </div>
        </Card>

        {/* ── Colonne latérale ───────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Détail du jour sélectionné */}
          {selected && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                title={new Date(selected).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                action={
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Fermer"
                    className="text-ink-soft hover:text-navy"
                  >
                    <X className="w-4 h-4" />
                  </button>
                }
              >
                {openDay.length === 0 ? (
                  <p className="py-4 text-center text-sm text-ink-soft">
                    Rien de prévu ce jour-là.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {openDay.map((e) => (
                      <li
                        key={e.id}
                        className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-navy">{e.label}</p>
                          {e.kind === 'mission' ? (
                            <MissionBadge status={e.status} />
                          ) : (
                            <StatusBadge tone="warning">Demande</StatusBadge>
                          )}
                        </div>
                        <p className="text-xs text-ink-soft inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> {e.time}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </motion.div>
          )}

          {/* Zone d'intervention */}
          <Card title="Zone d'intervention">
            <p className="text-sm text-navy inline-flex items-start gap-2">
              <MapPin className="w-4 h-4 text-terra mt-0.5 shrink-0" />
              {CHEF_AVAILABILITY.zone}
            </p>
            <p className="text-xs text-ink-soft mt-2">Modifiable depuis votre profil.</p>
          </Card>

          {/* Disponibilités hebdomadaires */}
          <Card
            title="Mes disponibilités"
            action={
              <button className="text-xs text-terra font-semibold hover:underline inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Créneau
              </button>
            }
          >
            <ul className="space-y-1.5">
              {slots.map((s) => {
                const open = s.ranges.length > 0
                return (
                  <li
                    key={s.day}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(31,42,55,0.08)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-navy">{s.day}</p>
                      <p className="text-[11px] text-ink-soft truncate">
                        {open ? s.ranges.join(' · ') : 'Indisponible'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleDay(s.day)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors shrink-0',
                        open ? 'bg-mint text-mint-ink' : 'bg-cream-deep text-ink-mid',
                      )}
                    >
                      {open ? 'Ouvert' : 'Fermé'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          <div className="rounded-2xl bg-cream-soft px-4 py-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
            <p className="text-xs text-ink-mid leading-relaxed">
              La synchronisation Google, Apple et Outlook est prévue dans une version
              ultérieure.
            </p>
          </div>
        </div>
      </div>
    </ChefPage>
  )
}
