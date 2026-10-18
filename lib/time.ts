/* ─────────────────────────────────────────────────────────────────────────────
   Les heures, dans une seule langue.

   L'API ne parle que de minutes depuis minuit (Paris) pour les horaires, et
   d'ISO 8601 pour les prestations. Les champs de formulaire, eux, parlent
   « HH:MM ». Ces quatre conversions sont la frontière entre les deux, et elles
   n'ont rien à faire dans un composant : la réservation publique, l'agenda du
   batch cooker et la proposition de report s'en servent tous.

   `lib/api/agenda.ts` les réexporte pour ne pas casser ses appelants.
   ───────────────────────────────────────────────────────────────────────────── */

/** `540` → « 9h », `570` → « 9h30 ». La façon française de dire une heure. */
export const minuteLabel = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

export const rangeLabel = (start: number, end: number) =>
  `${minuteLabel(start)} – ${minuteLabel(end)}`

/** `540` → « 09:00 » — la valeur qu'attend un champ horaire. */
export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Une durée, pas un horaire : « 3 h 30 », jamais « 3h30 » qui se lit comme
 * l'heure qu'il est.
 */
export const durationLabel = (minutes: number) => {
  if (minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

/** Clé de jour locale, stable : `toISOString()` décale en UTC. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`

/** Lundi = 0, dimanche = 6 — l'inverse de `getDay()`, et l'ordre de l'API. */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7

/** Une date locale et une heure « HH:MM » en un instant ISO, sans décalage. */
export const atTime = (date: Date, hhmm: string) => {
  const d = new Date(date)
  const min = toMinutes(hhmm)
  d.setHours(Math.floor(min / 60), min % 60, 0, 0)
  return d
}
