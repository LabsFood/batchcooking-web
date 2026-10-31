'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApiFetch } from './client'
import { useMeKey } from './keys'
import { dayKey, weekdayIndex } from '@/lib/time'

/* ─────────────────────────────────────────────────────────────────────────────
   L'agenda du batch cooker.

   Arrivé le 16/10, et construit comme il fallait : deux niveaux, une trame
   hebdomadaire qui se répète et des exceptions posées sur une date. Les
   horaires sont en **minutes depuis minuit, heure de Paris** — `540` vaut
   9 h 00 — et `weekday` 0 est **lundi**, pas dimanche.

   Trois choses qu'on ne devinerait pas :

   - `PUT /chef/availability` envoie **tout l'horaire à venir** ; ce qui n'y est
     pas est supprimé, et les jours passés ne bougent pas. Les identifiants
     sont réémis à chaque enregistrement : il faut les relire ;
   - le `version` lu avec l'horaire doit repartir à l'enregistrement. Une
     sauvegarde depuis un onglet périmé est alors refusée (`409`) au lieu
     d'écraser le travail de l'autre onglet ;
   - une **journée fermée** se pose dans l'horaire (`closed`), un **créneau
     occupé** dans les blocs (`POST /chef/agenda/blocks`). Les deux ne servent
     pas à la même chose : l'un enlève un jour, l'autre réserve deux heures.

   Ce que le client voit n'est pas cet agenda : c'est
   `GET /chefs/{id}/availability`, qui ne dit jamais **ce qui** occupe un
   créneau. Voir `lib/api/bookings.ts`.
   ───────────────────────────────────────────────────────────────────────────── */

export interface WeeklySlot {
  /** Réémis à chaque enregistrement : ne pas le conserver d'une fois sur l'autre. */
  id?: string
  /** 0 = lundi … 6 = dimanche. */
  weekday: number
  startMinute: number
  /** Fin exclue. */
  endMinute: number
}

export interface AvailabilityException {
  id?: string
  /** Jour de calendrier, `YYYY-MM-DD`. */
  date: string
  /** `closed` enlève la journée ; `extra` ajoute un créneau ce jour-là. */
  kind: 'closed' | 'extra'
  startMinute?: number | null
  endMinute?: number | null
  /** Privé : jamais montré à un client. */
  reason?: string | null
}

export interface Schedule {
  weekly: WeeklySlot[]
  exceptions: AvailabilityException[]
  /** À renvoyer tel quel à l'enregistrement. */
  version?: string
  /** `false` : aucun horaire posé — personne ne peut réserver. */
  scheduled?: boolean
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export const weekdayLabel = (i: number) => JOURS[i] ?? `Jour ${i}`
export const WEEKDAYS = JOURS

/* Les conversions d'heures vivent dans `lib/time.ts` : la réservation publique
   s'en sert aussi, et elle n'a pas à charger l'agenda pour cela. On les
   réexporte pour que les appelants historiques n'aient rien à changer. */

export {
  atTime,
  dayKey,
  durationLabel,
  minuteLabel,
  rangeLabel,
  toHHMM,
  toMinutes,
  weekdayIndex,
} from '@/lib/time'

/** Total hebdomadaire, en heures. */
export const weeklyHours = (weekly: WeeklySlot[]) =>
  weekly.reduce((n, s) => n + (s.endMinute - s.startMinute), 0) / 60

/** Deux créneaux du même jour se chevauchent-ils ? L'API le refuse. */
export const overlaps = (
  a: { startMinute: number; endMinute: number },
  b: { startMinute: number; endMinute: number },
) => a.startMinute < b.endMinute && b.startMinute < a.endMinute

/* ── Les horaires ──────────────────────────────────────────────────────────── */

export function useAvailability() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'availability'],
    queryFn: () => apiFetch<Schedule>('/chef/availability'),
  })
}

/**
 * `PUT /chef/availability` — tout l'horaire à venir, d'un bloc.
 *
 * `409` quand le `version` envoyé n'est plus le courant : un autre onglet a
 * enregistré entre-temps. L'écran doit alors recharger, pas insister.
 */
export function useSaveAvailability() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (body: {
      weekly: WeeklySlot[]
      exceptions: AvailabilityException[]
      version?: string
    }) =>
      apiFetch<Schedule>('/chef/availability', {
        method: 'PUT',
        body: {
          // Les ids sont réémis par l'API : les renvoyer n'a pas de sens.
          weekly: body.weekly.map(({ weekday, startMinute, endMinute }) => ({
            weekday,
            startMinute,
            endMinute,
          })),
          exceptions: body.exceptions.map((e) => ({
            date: e.date,
            kind: e.kind,
            ...(e.kind === 'extra'
              ? { startMinute: e.startMinute, endMinute: e.endMinute }
              : {}),
            ...(e.reason ? { reason: e.reason } : {}),
          })),
          ...(body.version ? { version: body.version } : {}),
        },
      }),
    onSuccess: (s) => {
      qc.setQueryData([...meKey, 'availability'], s)
      qc.invalidateQueries({ queryKey: [...meKey, 'agenda'] })
    },
  })
}

/* ── L'agenda ──────────────────────────────────────────────────────────────── */

export interface AgendaPrestation {
  id: string
  reference: string | null
  status: string
  startsAt: string
  endsAt: string
  /** « 09:00-12:00 », déjà en heure de Paris. */
  timeSlot: string | null
  persons: number | null
  city: string | null
  client: { name: string | null } | null
  /** Nouveau début proposé, tant qu'il attend une réponse. */
  rescheduleTo: string | null
}

export interface AgendaRequest {
  id: string
  reference: string | null
  title: string | null
  /** `to_answer` : à chiffrer. `offer_sent` : l'offre attend le client. */
  stage: 'to_answer' | 'offer_sent'
  persons: number | null
  city: string | null
  client: { name: string | null } | null
  /** `null` quand le client n'a donné aucune date. */
  startsAt: string | null
  endsAt: string | null
}

export interface TimeBlock {
  id: string
  startsAt: string
  endsAt: string
  reason?: string | null
}

export interface Agenda {
  scheduled: boolean
  schedule: Schedule
  prestations: AgendaPrestation[]
  requests: AgendaRequest[]
  blocks: TimeBlock[]
}

/**
 * `GET /chef/agenda` — une seule lecture pour le jour, la semaine et le mois.
 *
 * L'API rend la fusion déjà faite : l'horaire de la fenêtre, les prestations,
 * les demandes sur-mesure qui m'ont été confiées, et mes blocs. 42 jours au
 * plus — six semaines, la grille d'un mois.
 */
export function useAgenda(from: string | undefined, to: string | undefined) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'agenda', { from, to }],
    queryFn: () => apiFetch<Agenda>(`/chef/agenda?from=${from}&to=${to}`),
    enabled: !!from && !!to,
  })
}

/**
 * `GET /chef/availability/slots` — ce qu'un client verrait.
 *
 * Les mêmes créneaux que `GET /chefs/{id}/availability` rend au public :
 * horaires déclarés, moins les prestations, moins les blocs, sur une grille de
 * 30 minutes. C'est la seule façon pour un batch cooker de vérifier que ses
 * horaires produisent bien quelque chose — un agenda rempli de créneaux dont
 * aucun n'est réservable est le piège que cette route permet de voir.
 *
 * 31 jours au plus, `to` exclu.
 */
export function useOwnSlots(
  from: string | undefined,
  to: string | undefined,
  durationMinutes: number,
) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'availability', 'slots', { from, to, durationMinutes }],
    queryFn: () =>
      apiFetch<{ scheduled: boolean; slots: string[] }>(
        `/chef/availability/slots?from=${from}&to=${to}&durationMinutes=${durationMinutes}`,
      ),
    enabled: !!from && !!to && durationMinutes > 0,
  })
}

/** `GET /chef/agenda/summary` — le nombre de prestations par mois, pour l'année. */
export function useAgendaSummary(year: number) {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'agenda', 'summary', year],
    queryFn: () =>
      apiFetch<{ year: number; months: { month: number; prestations: number }[] }>(
        `/chef/agenda/summary?year=${year}`,
      ),
  })
}

/* ── Les blocs ─────────────────────────────────────────────────────────────── */

/**
 * `POST /chef/agenda/blocks` — un rendez-vous, une après-midi prise.
 *
 * Aucun client ne peut réserver dessus. 42 jours au plus dans le futur, et le
 * même bloc envoyé deux fois rend le premier. Une **journée entière** se ferme
 * dans l'horaire, pas ici.
 */
export function useAddBlock() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (body: { startsAt: string; endsAt: string; reason?: string }) =>
      apiFetch<TimeBlock>('/chef/agenda/blocks', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...meKey, 'agenda'] }),
  })
}

export function useRemoveBlock() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<unknown>(`/chef/agenda/blocks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...meKey, 'agenda'] }),
  })
}

/* ── Le flux de calendrier ─────────────────────────────────────────────────── */

export interface CalendarFeed {
  /** `false` : aucun flux publié. */
  enabled: boolean
  /** Rendu **une seule fois**, à la création : l'API ne le remontre pas. */
  url?: string | null
  lastFetchedAt?: string | null
  /** Récupéré par une application de calendrier dans les sept derniers jours. */
  synced?: boolean
}

/**
 * Publier ses prestations dans une application de calendrier.
 *
 * Le lien n'est montré **qu'à sa création** : pour le revoir, il faut en
 * fabriquer un nouveau — l'ancien cesse alors de fonctionner. C'est ce qui
 * permet de le révoquer si on l'a partagé par erreur.
 */
export function useCalendarFeed() {
  const apiFetch = useApiFetch()
  const meKey = useMeKey()
  return useQuery({
    queryKey: [...meKey, 'calendar-feed'],
    queryFn: () => apiFetch<CalendarFeed>('/chef/calendar-feed'),
  })
}

export function useCreateCalendarFeed() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: () => apiFetch<CalendarFeed>('/chef/calendar-feed', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...meKey, 'calendar-feed'] }),
  })
}

export function useDeleteCalendarFeed() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const meKey = useMeKey()
  return useMutation({
    mutationFn: () =>
      apiFetch<unknown>('/chef/calendar-feed', { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...meKey, 'calendar-feed'] }),
  })
}

/* ── Fusion locale, pour dessiner une journée ──────────────────────────────── */

export interface Range {
  startMinute: number
  endMinute: number
}

/**
 * Les créneaux travaillés d'une journée : la trame, moins les fermetures, plus
 * les extras.
 *
 * L'API rend l'horaire mais pas le calendrier déplié — c'est à l'écran de
 * poser la trame sur une date. La règle est celle de l'API : **une fermeture
 * gagne sur la trame**.
 */
export function workingRanges(date: Date, s: Schedule | undefined): Range[] {
  if (!s) return []
  const cle = dayKey(date)
  const duJour = s.exceptions.filter((e) => e.date === cle)
  if (duJour.some((e) => e.kind === 'closed')) return []

  const base = s.weekly
    .filter((w) => w.weekday === weekdayIndex(date))
    .map(({ startMinute, endMinute }) => ({ startMinute, endMinute }))

  const extras = duJour
    .filter((e) => e.kind === 'extra' && e.startMinute != null && e.endMinute != null)
    .map((e) => ({ startMinute: e.startMinute!, endMinute: e.endMinute! }))

  return [...base, ...extras].sort((a, b) => a.startMinute - b.startMinute)
}

/** La raison d'une fermeture, si la journée en porte une. */
export const closedReason = (date: Date, s: Schedule | undefined) =>
  s?.exceptions.find((e) => e.date === dayKey(date) && e.kind === 'closed')?.reason ?? null

/** Minutes locales depuis minuit, pour poser un instant sur une grille. */
export const minutesOf = (iso: string) => {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}
