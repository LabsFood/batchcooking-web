/* ─────────────────────────────────────────────────────────────────────────────
   Horaires de travail du batch cooker.

   Deux niveaux, volontairement : une trame hebdomadaire qui se répète, et des
   exceptions posées sur une date précise (créneau ponctuel ou journée fermée).
   L'agenda affiche la fusion des deux ; les prestations acceptées s'y posent
   par-dessus et ne sont jamais effacées par un changement d'horaires.
   ───────────────────────────────────────────────────────────────────────────── */

export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Minutes depuis minuit — comparable et additionnable, contrairement à « 9h30 ». */
export interface TimeRange {
  id: string
  start: number
  end: number
}

export interface WeeklySlot extends TimeRange {
  weekday: WeekdayIndex
}

/** Exception sur une date : un créneau en plus, ou une journée fermée. */
export interface DateException {
  id: string
  /** Date au format YYYY-MM-DD, sans fuseau : c'est un jour de calendrier. */
  date: string
  kind: 'extra' | 'closed'
  start?: number
  end?: number
  reason?: string
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Libellé court à la française : 9h, 9h30. */
export const timeLabel = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

export const rangeLabel = (start: number, end: number) => `${timeLabel(start)} – ${timeLabel(end)}`

/** Clé de jour stable, indépendante du fuseau (toISOString décale en UTC). */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Lundi = 0, dimanche = 6 (getDay() met dimanche à 0). */
export const weekdayIndex = (d: Date): WeekdayIndex => ((d.getDay() + 6) % 7) as WeekdayIndex

/** Créneaux travaillés d'une journée : trame hebdo, moins les fermetures, plus les extras. */
export function workingRanges(
  date: Date,
  weekly: WeeklySlot[],
  exceptions: DateException[],
): TimeRange[] {
  const key = dayKey(date)
  const onDate = exceptions.filter((e) => e.date === key)
  if (onDate.some((e) => e.kind === 'closed')) return []

  const base: TimeRange[] = weekly
    .filter((s) => s.weekday === weekdayIndex(date))
    .map(({ id, start, end }) => ({ id, start, end }))

  const extras: TimeRange[] = onDate
    .filter((e) => e.kind === 'extra' && e.start != null && e.end != null)
    .map((e) => ({ id: e.id, start: e.start!, end: e.end! }))

  return [...base, ...extras].sort((a, b) => a.start - b.start)
}

/** Total travaillé sur une période, en heures. */
export function weeklyHours(weekly: WeeklySlot[]): number {
  return weekly.reduce((n, s) => n + (s.end - s.start), 0) / 60
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end
}

// ── Données simulées ────────────────────────────────────────────────────────

const id = () => Math.random().toString(36).slice(2, 9)

export const DEFAULT_WEEKLY_SLOTS: WeeklySlot[] = [
  { id: 'w1', weekday: 0, start: toMinutes('09:00'), end: toMinutes('13:00') },
  { id: 'w2', weekday: 1, start: toMinutes('09:00'), end: toMinutes('13:00') },
  { id: 'w3', weekday: 1, start: toMinutes('14:00'), end: toMinutes('18:00') },
  { id: 'w4', weekday: 3, start: toMinutes('09:00'), end: toMinutes('13:00') },
  { id: 'w5', weekday: 4, start: toMinutes('09:00'), end: toMinutes('13:00') },
  { id: 'w6', weekday: 4, start: toMinutes('14:00'), end: toMinutes('17:00') },
  { id: 'w7', weekday: 5, start: toMinutes('10:00'), end: toMinutes('15:00') },
]

export const newSlotId = id
