'use client'

import { useMemo, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, Lock, MapPin, Plus, Trash2, X } from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import StatusBadge, { MissionBadge } from '@/components/chef/StatusBadge'
import { CHEF_MISSIONS, CHEF_REQUESTS, CHEF_PROFILE } from '@/lib/chef/mock'
import {
  DEFAULT_WEEKLY_SLOTS,
  WEEKDAYS,
  dayKey,
  newSlotId,
  rangeLabel,
  timeLabel,
  toHHMM,
  toMinutes,
  weekdayIndex,
  weeklyHours,
  workingRanges,
  type DateException,
  type WeeklySlot,
  type WeekdayIndex,
} from '@/lib/chef/schedule'

/* ─────────────────────────────────────────────────────────────────────────────
   Agenda.

   Quatre échelles de lecture — jour, semaine, mois, année — sur les mêmes
   données : les prestations acceptées, les demandes en attente de réponse, et
   les horaires de travail que le batch cooker pose lui-même. Les horaires se
   déclinent en une trame hebdomadaire, ajustable jour par jour.
   ───────────────────────────────────────────────────────────────────────────── */

type View = 'day' | 'week' | 'month' | 'year'

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** « 9h00 – 11h30 » → minutes depuis minuit. */
function parseSlot(slot: string): { start: number; end: number } {
  const parts = [...slot.matchAll(/(\d{1,2})\s*h\s*(\d{0,2})/g)].map(
    (m) => Number(m[1]) * 60 + Number(m[2] || 0),
  )
  return { start: parts[0] ?? 9 * 60, end: parts[1] ?? (parts[0] ?? 9 * 60) + 120 }
}

interface AgendaEvent {
  id: string
  kind: 'mission' | 'request'
  title: string
  subtitle: string
  date: Date
  start: number
  end: number
  status?: (typeof CHEF_MISSIONS)[number]['status']
}

const EVENTS: AgendaEvent[] = [
  ...CHEF_MISSIONS.filter((m) => m.status !== 'cancelled').map((m) => {
    const { start, end } = parseSlot(m.timeSlot)
    return {
      id: m.id,
      kind: 'mission' as const,
      title: m.client,
      subtitle: m.city,
      date: new Date(m.date),
      start,
      end,
      status: m.status,
    }
  }),
  ...CHEF_REQUESTS.filter((r) => r.status === 'new').map((r) => {
    const { start, end } = parseSlot(r.timeSlot)
    return {
      id: r.id,
      kind: 'request' as const,
      title: r.client,
      subtitle: 'Demande à confirmer',
      date: new Date(r.date),
      start,
      end,
    }
  }),
]

const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b)
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const startOfWeek = (d: Date) => addDays(d, -weekdayIndex(d))

export default function ChefAgendaPage() {
  const [view, setView] = useState<View>('week')
  const [cursor, setCursor] = useState(() => new Date())
  const [weekly, setWeekly] = useState<WeeklySlot[]>(DEFAULT_WEEKLY_SLOTS)
  const [exceptions, setExceptions] = useState<DateException[]>([])
  const [selected, setSelected] = useState<Date | null>(null)

  const eventsOf = (d: Date) => EVENTS.filter((e) => sameDay(e.date, d)).sort((a, b) => a.start - b.start)
  const rangesOf = (d: Date) => workingRanges(d, weekly, exceptions)

  const step = (dir: -1 | 1) => {
    const d = new Date(cursor)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir)
    else if (view === 'month') d.setMonth(d.getMonth() + dir)
    else d.setFullYear(d.getFullYear() + dir)
    setCursor(d)
  }

  const label =
    view === 'day'
      ? cursor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : view === 'week'
        ? `Semaine du ${startOfWeek(cursor).getDate()} ${MONTHS[startOfWeek(cursor).getMonth()]}`
        : view === 'month'
          ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
          : String(cursor.getFullYear())

  const openDay = (d: Date) => {
    setCursor(d)
    setSelected(d)
  }

  return (
    <ChefPage title="Agenda" subtitle="Vos prestations et vos horaires de travail.">
      <div className="space-y-5">
        {/* Barre de navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => step(-1)}
              aria-label="Période précédente"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mid hover:bg-paper hover:text-navy"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCursor(new Date())}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-mid hover:bg-paper hover:text-navy"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Période suivante"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mid hover:bg-paper hover:text-navy"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <p className="ml-2 font-display text-lg font-bold capitalize text-navy">{label}</p>
          </div>

          <div className="flex rounded-full border border-[rgba(31,42,55,0.1)] bg-paper p-0.5">
            {([
              { id: 'day' as View, label: 'Jour' },
              { id: 'week' as View, label: 'Semaine' },
              { id: 'month' as View, label: 'Mois' },
              { id: 'year' as View, label: 'Année' },
            ]).map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  view === v.id ? 'bg-navy text-white' : 'text-ink-mid hover:text-navy'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {view === 'day' && <DayView date={cursor} events={eventsOf(cursor)} ranges={rangesOf(cursor)} />}
            {view === 'week' && (
              <WeekView start={startOfWeek(cursor)} eventsOf={eventsOf} rangesOf={rangesOf} onOpenDay={openDay} />
            )}
            {view === 'month' && (
              <MonthView cursor={cursor} eventsOf={eventsOf} rangesOf={rangesOf} onOpenDay={openDay} />
            )}
            {view === 'year' && (
              <YearView
                year={cursor.getFullYear()}
                onOpenMonth={(m) => {
                  setCursor(new Date(cursor.getFullYear(), m, 1))
                  setView('month')
                }}
              />
            )}

            {/* Journée sélectionnée */}
            {selected && (
              <DayPanel
                date={selected}
                events={eventsOf(selected)}
                ranges={rangesOf(selected)}
                closed={exceptions.some((e) => e.date === dayKey(selected) && e.kind === 'closed')}
                onClose={() => setSelected(null)}
                onAddSlot={(start, end) =>
                  setExceptions((prev) => [
                    ...prev.filter((e) => !(e.date === dayKey(selected) && e.kind === 'closed')),
                    { id: newSlotId(), date: dayKey(selected), kind: 'extra', start, end },
                  ])
                }
                onToggleClosed={() =>
                  setExceptions((prev) => {
                    const key = dayKey(selected)
                    const isClosed = prev.some((e) => e.date === key && e.kind === 'closed')
                    return isClosed
                      ? prev.filter((e) => !(e.date === key && e.kind === 'closed'))
                      : [...prev.filter((e) => e.date !== key), { id: newSlotId(), date: key, kind: 'closed' }]
                  })
                }
                onRemoveExtra={(id) => setExceptions((prev) => prev.filter((e) => e.id !== id))}
                exceptions={exceptions.filter((e) => e.date === dayKey(selected))}
              />
            )}
          </div>

          {/* Horaires de travail */}
          <aside className="space-y-5">
            <WeeklyHoursEditor weekly={weekly} onChange={setWeekly} />
            <Card title="Zone d’intervention">
              <p className="flex items-start gap-2 text-sm text-ink-mid">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
                {CHEF_PROFILE.city} et alentours
              </p>
              <p className="mt-2 text-[13px] text-ink-soft">
                Vos zones se modifient depuis <span className="font-semibold text-navy">Ma vitrine</span>.
              </p>
            </Card>
          </aside>
        </div>
      </div>
    </ChefPage>
  )
}

// ── Vue jour ────────────────────────────────────────────────────────────────

const DAY_START = 6 * 60
const DAY_END = 23 * 60
const pct = (min: number) => ((min - DAY_START) / (DAY_END - DAY_START)) * 100

function DayView({
  date,
  events,
  ranges,
}: {
  date: Date
  events: AgendaEvent[]
  ranges: { id: string; start: number; end: number }[]
}) {
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60)

  return (
    <Card title={date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}>
      <div className="relative" style={{ height: 620 }}>
        {/* Grille horaire */}
        {hours.map((h) => (
          <div key={h} className="absolute left-0 right-0 flex items-start gap-3" style={{ top: `${pct(h)}%` }}>
            <span className="w-10 shrink-0 text-[11px] tabular-nums text-ink-soft">{timeLabel(h)}</span>
            <span className="mt-1.5 h-px flex-1 bg-[rgba(31,42,55,0.07)]" />
          </div>
        ))}

        {/* Horaires de travail */}
        <div className="absolute inset-y-0 left-14 right-0">
          {ranges.map((r) => (
            <div
              key={r.id}
              className="absolute left-0 right-0 rounded-lg bg-mint/40"
              style={{ top: `${pct(r.start)}%`, height: `${pct(r.end) - pct(r.start)}%` }}
            >
              <span className="sr-only">Disponible {rangeLabel(r.start, r.end)}</span>
            </div>
          ))}

          {/* Prestations */}
          {events.map((e, i) => (
            <div
              key={e.id}
              className={`absolute rounded-xl px-3 py-2 text-white shadow-[0_6px_16px_-8px_rgba(15,23,32,0.6)] ${
                e.kind === 'mission' ? 'bg-navy' : 'bg-amber text-navy'
              }`}
              style={{
                top: `${pct(e.start)}%`,
                height: `${Math.max(pct(e.end) - pct(e.start), 5)}%`,
                left: `${i * 4}%`,
                right: 0,
              }}
            >
              <p className="truncate text-xs font-semibold">{e.title}</p>
              <p className={`truncate text-[11px] ${e.kind === 'mission' ? 'text-white/70' : 'text-navy/70'}`}>
                {rangeLabel(e.start, e.end)} · {e.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>

      {events.length === 0 && ranges.length === 0 && (
        <p className="mt-3 text-center text-[13px] text-ink-soft">Journée libre, aucun horaire posé.</p>
      )}
    </Card>
  )
}

// ── Vue semaine ─────────────────────────────────────────────────────────────

function WeekView({
  start,
  eventsOf,
  rangesOf,
  onOpenDay,
}: {
  start: Date
  eventsOf: (d: Date) => AgendaEvent[]
  rangesOf: (d: Date) => { id: string; start: number; end: number }[]
  onOpenDay: (d: Date) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const today = new Date()

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[rgba(31,42,55,0.08)]">
        {days.map((d) => {
          const isToday = sameDay(d, today)
          return (
            <button
              key={d.toISOString()}
              onClick={() => onOpenDay(d)}
              className={`px-2 py-2.5 text-center transition-colors hover:bg-cream-soft ${isToday ? 'bg-amber-soft/40' : ''}`}
            >
              <span className="block text-[11px] uppercase tracking-wide text-ink-soft">
                {WEEKDAYS[weekdayIndex(d)].slice(0, 3)}
              </span>
              <span className={`block text-sm font-bold tabular-nums ${isToday ? 'text-amber-deep' : 'text-navy'}`}>
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-7" style={{ height: 520 }}>
        {days.map((d) => {
          const events = eventsOf(d)
          const ranges = rangesOf(d)
          return (
            <div
              key={d.toISOString()}
              className="relative border-r border-[rgba(31,42,55,0.06)] last:border-r-0"
            >
              {ranges.map((r) => (
                <div
                  key={r.id}
                  className="absolute left-0.5 right-0.5 rounded bg-mint/40"
                  style={{ top: `${pct(r.start)}%`, height: `${pct(r.end) - pct(r.start)}%` }}
                />
              ))}
              {events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onOpenDay(d)}
                  className={`absolute left-0.5 right-0.5 overflow-hidden rounded-lg px-1.5 py-1 text-left ${
                    e.kind === 'mission' ? 'bg-navy text-white' : 'bg-amber text-navy'
                  }`}
                  style={{ top: `${pct(e.start)}%`, height: `${Math.max(pct(e.end) - pct(e.start), 6)}%` }}
                >
                  <span className="block truncate text-[10px] font-bold">{timeLabel(e.start)}</span>
                  <span className="block truncate text-[11px] font-semibold">{e.title}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Vue mois ────────────────────────────────────────────────────────────────

function MonthView({
  cursor,
  eventsOf,
  rangesOf,
  onOpenDay,
}: {
  cursor: Date
  eventsOf: (d: Date) => AgendaEvent[]
  rangesOf: (d: Date) => { id: string; start: number; end: number }[]
  onOpenDay: (d: Date) => void
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = addDays(first, -weekdayIndex(first))
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const today = new Date()

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[rgba(31,42,55,0.08)] bg-cream-soft/60">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            {d.slice(0, 3)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const events = eventsOf(d)
          const works = rangesOf(d).length > 0
          const isToday = sameDay(d, today)
          return (
            <button
              key={d.toISOString()}
              onClick={() => onOpenDay(d)}
              className={`min-h-[92px] border-b border-r border-[rgba(31,42,55,0.06)] p-1.5 text-left align-top transition-colors hover:bg-cream-soft ${
                inMonth ? '' : 'bg-cream-soft/40'
              }`}
            >
              <span className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    isToday ? 'bg-amber text-navy' : inMonth ? 'text-navy' : 'text-ink-soft/60'
                  }`}
                >
                  {d.getDate()}
                </span>
                {works && <span className="h-1.5 w-1.5 rounded-full bg-mint-deep" title="Horaires posés" />}
              </span>
              <span className="mt-1 block space-y-0.5">
                {events.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className={`block truncate rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      e.kind === 'mission' ? 'bg-navy text-white' : 'bg-amber text-navy'
                    }`}
                  >
                    {timeLabel(e.start)} {e.title}
                  </span>
                ))}
                {events.length > 2 && (
                  <span className="block px-1 text-[10px] text-ink-soft">+{events.length - 2} autre(s)</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ── Vue année ───────────────────────────────────────────────────────────────

function YearView({ year, onOpenMonth }: { year: number; onOpenMonth: (month: number) => void }) {
  const counts = useMemo(() => {
    const out = Array(12).fill(0)
    for (const e of EVENTS) if (e.date.getFullYear() === year) out[e.date.getMonth()]++
    return out
  }, [year])

  return (
    <Card title={`Année ${year}`}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MONTHS.map((m, i) => (
          <li key={m}>
            <button
              onClick={() => onOpenMonth(i)}
              className="w-full rounded-xl border border-[rgba(31,42,55,0.08)] p-4 text-left transition-colors hover:border-navy hover:bg-cream-soft"
            >
              <p className="font-display text-base font-bold capitalize text-navy">{m}</p>
              <p className="mt-1 text-[13px] text-ink-soft">
                {counts[i] === 0 ? 'Aucune prestation' : `${counts[i]} prestation${counts[i] > 1 ? 's' : ''}`}
              </p>
              {counts[i] > 0 && (
                <span className="mt-2 flex gap-1" aria-hidden>
                  {Array.from({ length: Math.min(counts[i], 8) }, (_, k) => (
                    <span key={k} className="h-1.5 w-1.5 rounded-full bg-navy" />
                  ))}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ── Journée sélectionnée ────────────────────────────────────────────────────

function DayPanel({
  date,
  events,
  ranges,
  closed,
  exceptions,
  onClose,
  onAddSlot,
  onToggleClosed,
  onRemoveExtra,
}: {
  date: Date
  events: AgendaEvent[]
  ranges: { id: string; start: number; end: number }[]
  closed: boolean
  exceptions: DateException[]
  onClose: () => void
  onAddSlot: (start: number, end: number) => void
  onToggleClosed: () => void
  onRemoveExtra: (id: string) => void
}) {
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('13:00')
  const invalid = toMinutes(end) <= toMinutes(start)

  return (
    <Card
      title={date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      action={
        <button
          onClick={onClose}
          aria-label="Fermer le détail du jour"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy"
        >
          <X className="h-4 w-4" />
        </button>
      }
    >
      {/* Prestations du jour */}
      {events.length === 0 ? (
        <Empty text="Aucune prestation ce jour-là." />
      ) : (
        <ul className="mb-5 space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(31,42,55,0.08)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{e.title}</p>
                <p className="text-xs text-ink-soft">
                  {rangeLabel(e.start, e.end)} · {e.subtitle}
                </p>
              </div>
              {e.kind === 'mission' && e.status ? (
                <MissionBadge status={e.status} />
              ) : (
                <StatusBadge tone="warning">À confirmer</StatusBadge>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Horaires du jour */}
      <div className="border-t border-[rgba(31,42,55,0.08)] pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-navy">Mes horaires ce jour-là</h3>
          <button
            onClick={onToggleClosed}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              closed ? 'bg-navy text-white' : 'text-ink-mid hover:bg-cream-soft hover:text-navy'
            }`}
          >
            <Lock className="h-3.5 w-3.5" aria-hidden /> {closed ? 'Journée fermée' : 'Fermer la journée'}
          </button>
        </div>

        {closed ? (
          <p className="rounded-xl bg-cream-soft px-4 py-3 text-[13px] text-ink-mid">
            Vous ne recevrez aucune demande pour cette date.
          </p>
        ) : (
          <>
            {ranges.length === 0 ? (
              <p className="mb-3 text-[13px] text-ink-soft">Aucun horaire posé : ajoutez un créneau ponctuel.</p>
            ) : (
              <ul className="mb-3 flex flex-wrap gap-2">
                {ranges.map((r) => {
                  const extra = exceptions.find((e) => e.id === r.id)
                  return (
                    <li key={r.id}>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/60 py-1 pl-3 pr-1 text-xs font-semibold text-mint-ink">
                        <Clock className="h-3 w-3" aria-hidden /> {rangeLabel(r.start, r.end)}
                        {extra ? (
                          <button
                            onClick={() => onRemoveExtra(r.id)}
                            aria-label={`Retirer le créneau ${rangeLabel(r.start, r.end)}`}
                            className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-mint-deep"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="pr-2 text-[10px] font-normal text-mint-ink/70">hebdo</span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-ink-soft">
                De
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="input-base ml-2 w-auto py-2 text-sm"
                />
              </label>
              <label className="text-xs text-ink-soft">
                à
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="input-base ml-2 w-auto py-2 text-sm"
                />
              </label>
              <button
                onClick={() => onAddSlot(toMinutes(start), toMinutes(end))}
                disabled={invalid}
                className="btn btn-outline px-4 py-2 text-xs disabled:opacity-50"
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Ajouter ce créneau
              </button>
            </div>
            {invalid && <p className="mt-2 text-[13px] text-red-700">L’heure de fin doit suivre l’heure de début.</p>}
          </>
        )}
      </div>
    </Card>
  )
}

// ── Trame hebdomadaire ──────────────────────────────────────────────────────

function WeeklyHoursEditor({ weekly, onChange }: { weekly: WeeklySlot[]; onChange: (v: WeeklySlot[]) => void }) {
  const [openDay, setOpenDay] = useState<WeekdayIndex | null>(null)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('13:00')

  const add = (weekday: WeekdayIndex) => {
    const s = toMinutes(start)
    const e = toMinutes(end)
    if (e <= s) return
    onChange([...weekly, { id: newSlotId(), weekday, start: s, end: e }])
    setOpenDay(null)
  }

  return (
    <Card title="Mes horaires de travail">
      <p className="mb-4 text-[13px] leading-relaxed text-ink-mid">
        Cette trame se répète chaque semaine. Les clients ne peuvent réserver que sur ces créneaux ; ajustez un jour
        précis depuis le calendrier.
      </p>

      <ul className="space-y-2">
        {WEEKDAYS.map((label, i) => {
          const weekday = i as WeekdayIndex
          const slots = weekly.filter((s) => s.weekday === weekday).sort((a, b) => a.start - b.start)
          return (
            <li key={label} className="rounded-xl border border-[rgba(31,42,55,0.08)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-navy">{label}</span>
                <button
                  onClick={() => setOpenDay(openDay === weekday ? null : weekday)}
                  aria-label={`Ajouter un créneau le ${label.toLowerCase()}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {slots.length === 0 ? (
                <p className="mt-1 text-xs text-ink-soft">Indisponible</p>
              ) : (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {slots.map((s) => (
                    <li key={s.id}>
                      <span className="inline-flex items-center gap-1 rounded-full bg-mint/60 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-mint-ink">
                        {rangeLabel(s.start, s.end)}
                        <button
                          onClick={() => onChange(weekly.filter((x) => x.id !== s.id))}
                          aria-label={`Retirer ${rangeLabel(s.start, s.end)} le ${label.toLowerCase()}`}
                          className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-mint-deep"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {openDay === weekday && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-[rgba(31,42,55,0.06)] pt-2">
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    aria-label="Début"
                    className="input-base w-auto py-1.5 text-xs"
                  />
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    aria-label="Fin"
                    className="input-base w-auto py-1.5 text-xs"
                  />
                  <button onClick={() => add(weekday)} className="btn btn-primary px-3 py-1.5 text-[11px]">
                    Ajouter
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-4 text-[13px] text-ink-soft">
        Total : <span className="font-semibold tabular-nums text-navy">{weeklyHours(weekly)} h</span> par semaine
        {weekly.length > 0 && <> · premier créneau à {toHHMM(Math.min(...weekly.map((s) => s.start)))}</>}
      </p>
    </Card>
  )
}
