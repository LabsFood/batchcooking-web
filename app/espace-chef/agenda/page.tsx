'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CalendarOff,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Plus,
  RotateCw,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/shared/Toaster'
import {
  closedReason,
  dayKey,
  minutesOf,
  minuteLabel,
  overlaps,
  rangeLabel,
  toHHMM,
  toMinutes,
  useAddBlock,
  useAgenda,
  useAgendaSummary,
  useAvailability,
  useCalendarFeed,
  useCreateCalendarFeed,
  useDeleteCalendarFeed,
  useRemoveBlock,
  useSaveAvailability,
  weekdayIndex,
  weekdayLabel,
  weeklyHours,
  workingRanges,
  WEEKDAYS,
  type AgendaPrestation,
  type AgendaRequest,
  type AvailabilityException,
  type TimeBlock,
  type WeeklySlot,
} from '@/lib/api/agenda'

/* ─────────────────────────────────────────────────────────────────────────────
   Agenda.

   Quatre échelles — jour, semaine, mois, année — sur les données de l'API :
   `GET /chef/agenda` rend la fusion déjà faite pour une fenêtre de 42 jours au
   plus (la grille d'un mois fait six semaines), et `GET /chef/agenda/summary`
   donne le compte par mois pour l'année.

   Deux choses distinctes, qu'il faut garder distinctes :

   - **les horaires** (`PUT /chef/availability`) sont une trame hebdomadaire et
     des exceptions sur une date. On enregistre tout l'horaire à venir d'un
     bloc, avec le `version` relu — une sauvegarde depuis un onglet périmé est
     refusée plutôt que d'écraser l'autre ;
   - **les blocs** (`POST /chef/agenda/blocks`) prennent deux heures un jour
     donné : un rendez-vous, une après-midi. Une journée entière se ferme dans
     les horaires, pas ici.

   Sans horaires, aucun créneau n'est proposé aux clients : l'écran le dit en
   premier, parce que c'est la cause la plus fréquente d'un agenda vide.
   ───────────────────────────────────────────────────────────────────────────── */

type View = 'day' | 'week' | 'month' | 'year'

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b)

/** Le lundi de la semaine de `d`. */
const mondayOf = (d: Date) => addDays(d, -weekdayIndex(d))

/** La fenêtre que l'API doit rendre pour la vue courante. */
function windowOf(view: View, cursor: Date): { from: Date; to: Date } {
  if (view === 'day') return { from: cursor, to: addDays(cursor, 1) }
  if (view === 'week') {
    const lundi = mondayOf(cursor)
    return { from: lundi, to: addDays(lundi, 7) }
  }
  // Mois : la grille de six semaines, bornée à 42 jours comme l'API l'exige.
  const premier = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const debut = mondayOf(premier)
  return { from: debut, to: addDays(debut, 42) }
}

export default function ChefAgendaPage() {
  const [view, setView] = useState<View>('week')
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | null>(null)

  const { from, to } = windowOf(view === 'year' ? 'month' : view, cursor)
  const agenda = useAgenda(
    view === 'year' ? undefined : dayKey(from),
    view === 'year' ? undefined : dayKey(to),
  )
  const annee = useAgendaSummary(cursor.getFullYear())
  const horaires = useAvailability()

  const schedule = agenda.data?.schedule ?? horaires.data
  const pasDHoraires =
    (agenda.data && agenda.data.scheduled === false) ||
    (horaires.data && horaires.data.scheduled === false)

  const deplacer = (dir: 1 | -1) => {
    const d = new Date(cursor)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir)
    else if (view === 'month') d.setMonth(d.getMonth() + dir)
    else d.setFullYear(d.getFullYear() + dir)
    setCursor(d)
    setSelected(null)
  }

  const titre =
    view === 'day'
      ? cursor.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : view === 'week'
        ? `Semaine du ${mondayOf(cursor).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
        : view === 'month'
          ? `${MOIS[cursor.getMonth()]} ${cursor.getFullYear()}`
          : String(cursor.getFullYear())

  const jour = selected ?? (view === 'day' ? cursor : null)

  return (
    <ChefPage title="Agenda" subtitle="Vos horaires, vos prestations et vos demandes.">
      <div className="space-y-5">
        {pasDHoraires && (
          <Card className="!border-amber/40 !bg-amber-soft/50">
            <p className="flex items-start gap-2 font-display text-base font-bold text-navy">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
              Aucun horaire de travail posé
            </p>
            <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-mid">
              Tant qu’ils ne sont pas renseignés, aucun créneau n’est proposé aux
              clients : personne ne peut vous réserver. Posez votre semaine
              type ci-dessous — vous l’ajusterez jour par jour ensuite.
            </p>
          </Card>
        )}

        {/* ── Barre de navigation ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => deplacer(-1)}
              aria-label="Période précédente"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mid hover:bg-paper hover:text-navy"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-44 px-1 text-center font-display text-base font-bold capitalize text-navy">
              {titre}
            </p>
            <button
              onClick={() => deplacer(1)}
              aria-label="Période suivante"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mid hover:bg-paper hover:text-navy"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setCursor(new Date())
                setSelected(null)
              }}
              className="ml-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-mid hover:bg-paper hover:text-navy"
            >
              Aujourd’hui
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Échelle"
            className="flex rounded-full border border-[rgba(31,42,55,0.1)] bg-paper p-0.5"
          >
            {(
              [
                { id: 'day' as const, label: 'Jour' },
                { id: 'week' as const, label: 'Semaine' },
                { id: 'month' as const, label: 'Mois' },
                { id: 'year' as const, label: 'Année' },
              ]
            ).map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={view === v.id}
                onClick={() => {
                  setView(v.id)
                  setSelected(null)
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === v.id ? 'bg-navy text-white' : 'text-ink-mid hover:text-navy'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ── Le calendrier ────────────────────────────────────────────── */}
          <div className="space-y-5">
            {view === 'year' ? (
              <YearView
                query={annee}
                onOpenMonth={(m) => {
                  setCursor(new Date(cursor.getFullYear(), m - 1, 1))
                  setView('month')
                }}
              />
            ) : agenda.isError ? (
              <Card>
                <p className="flex items-start gap-2 font-display text-base font-bold text-navy">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden />
                  L’agenda n’a pas pu être chargé
                </p>
                <button onClick={() => agenda.refetch()} className="btn btn-primary mt-4 text-xs">
                  <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
                </button>
              </Card>
            ) : agenda.isPending ? (
              <div className="h-96 animate-pulse rounded-3xl bg-paper" />
            ) : view === 'day' ? (
              <DayColumn
                date={cursor}
                agenda={agenda.data!}
                onSelect={() => setSelected(cursor)}
              />
            ) : view === 'week' ? (
              <WeekGrid
                start={mondayOf(cursor)}
                agenda={agenda.data!}
                selected={jour}
                onSelect={setSelected}
              />
            ) : (
              <MonthGrid
                start={from}
                month={cursor.getMonth()}
                agenda={agenda.data!}
                selected={jour}
                onSelect={setSelected}
              />
            )}
          </div>

          {/* ── Le panneau ───────────────────────────────────────────────── */}
          <aside className="space-y-5">
            {jour && agenda.data && (
              <DayPanel date={jour} agenda={agenda.data} onClose={() => setSelected(null)} />
            )}

            <HoursEditor />

            <CalendarFeedCard />
          </aside>
        </div>
      </div>
    </ChefPage>
  )
}

/* ── Les vues ──────────────────────────────────────────────────────────────── */

/** Ce qui se passe un jour donné, extrait de la fenêtre lue. */
function thingsOn(date: Date, a: { prestations: AgendaPrestation[]; requests: AgendaRequest[]; blocks: TimeBlock[] }) {
  const cle = dayKey(date)
  return {
    prestations: a.prestations.filter((p) => dayKey(new Date(p.startsAt)) === cle),
    requests: a.requests.filter((r) => r.startsAt && dayKey(new Date(r.startsAt)) === cle),
    blocks: a.blocks.filter((b) => dayKey(new Date(b.startsAt)) === cle),
  }
}

const DEBUT_GRILLE = 7 * 60
const FIN_GRILLE = 22 * 60

/** Position verticale d'un créneau sur la grille horaire, en pourcentage. */
function band(startMinute: number, endMinute: number) {
  const span = FIN_GRILLE - DEBUT_GRILLE
  const haut = Math.max(0, ((startMinute - DEBUT_GRILLE) / span) * 100)
  const hauteur = Math.max(4, ((endMinute - startMinute) / span) * 100)
  return { top: `${haut}%`, height: `${Math.min(hauteur, 100 - haut)}%` }
}

function DayColumn({
  date,
  agenda,
  onSelect,
}: {
  date: Date
  agenda: NonNullable<ReturnType<typeof useAgenda>['data']>
  onSelect: () => void
}) {
  const { prestations, requests, blocks } = thingsOn(date, agenda)
  const ranges = workingRanges(date, agenda.schedule)
  const ferme = closedReason(date, agenda.schedule)

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold capitalize text-navy">
          {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <button onClick={onSelect} className="text-xs font-semibold text-terra hover:underline">
          Modifier cette journée
        </button>
      </div>

      {ferme !== null ? (
        <p className="flex items-center gap-2 rounded-xl bg-cream-soft px-4 py-3 text-[13px] text-ink-mid">
          <CalendarOff className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
          Journée fermée{ferme ? ` — ${ferme}` : ''}
        </p>
      ) : ranges.length === 0 ? (
        <Empty text="Vous ne travaillez pas ce jour-là d’après votre semaine type." />
      ) : (
        <p className="text-[13px] text-ink-mid">
          Vous travaillez {ranges.map((r) => rangeLabel(r.startMinute, r.endMinute)).join(' et ')}.
        </p>
      )}

      <div className="relative mt-4 h-96 rounded-2xl bg-cream-soft">
        {/* Les heures travaillées, en fond. */}
        {ranges.map((r, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute inset-x-0 rounded-xl bg-paper"
            style={band(r.startMinute, r.endMinute)}
          />
        ))}
        {blocks.map((b) => (
          <div
            key={b.id}
            className="absolute inset-x-2 flex items-center gap-2 overflow-hidden rounded-xl bg-[rgba(31,42,55,0.08)] px-3 text-[11px] text-ink-mid"
            style={band(minutesOf(b.startsAt), minutesOf(b.endsAt))}
          >
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{b.reason || 'Indisponible'}</span>
          </div>
        ))}
        {prestations.map((p) => (
          <div
            key={p.id}
            className="absolute inset-x-2 overflow-hidden rounded-xl bg-navy px-3 py-1.5 text-[11px] text-white"
            style={band(
              minutesOf(p.startsAt),
              minutesOf(p.endsAt) || minutesOf(p.startsAt) + 120,
            )}
          >
            <p className="truncate font-semibold">{p.client?.name ?? 'Client'}</p>
            <p className="truncate text-white/70">
              {[p.timeSlot, p.city].filter(Boolean).join(' · ')}
            </p>
          </div>
        ))}
        {requests.map((r) => (
          <div
            key={r.id}
            className="absolute inset-x-2 overflow-hidden rounded-xl border-[1.5px] border-dashed border-amber bg-amber-soft/70 px-3 py-1.5 text-[11px] text-navy"
            style={band(
              minutesOf(r.startsAt!),
              r.endsAt ? minutesOf(r.endsAt) : minutesOf(r.startsAt!) + 180,
            )}
          >
            <p className="truncate font-semibold">{r.title ?? 'Demande sur-mesure'}</p>
            <p className="truncate text-ink-mid">
              {r.stage === 'to_answer' ? 'À chiffrer' : 'Offre envoyée'}
            </p>
          </div>
        ))}

        {/* Repères horaires. */}
        {[8, 12, 16, 20].map((h) => (
          <span
            key={h}
            aria-hidden
            className="absolute left-2 -translate-y-1/2 text-[10px] tabular-nums text-ink-soft"
            style={{ top: `${((h * 60 - DEBUT_GRILLE) / (FIN_GRILLE - DEBUT_GRILLE)) * 100}%` }}
          >
            {h}h
          </span>
        ))}
      </div>
    </Card>
  )
}

function WeekGrid({
  start,
  agenda,
  selected,
  onSelect,
}: {
  start: Date
  agenda: NonNullable<ReturnType<typeof useAgenda>['data']>
  selected: Date | null
  onSelect: (d: Date) => void
}) {
  const jours = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const today = new Date()

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="grid grid-cols-7">
        {jours.map((d) => {
          const { prestations, requests, blocks } = thingsOn(d, agenda)
          const ranges = workingRanges(d, agenda.schedule)
          const ferme = closedReason(d, agenda.schedule) !== null
          const estAujourdhui = sameDay(d, today)
          const choisi = selected ? sameDay(d, selected) : false

          return (
            <button
              key={dayKey(d)}
              onClick={() => onSelect(d)}
              aria-current={estAujourdhui ? 'date' : undefined}
              className={`min-h-48 border-b border-r border-[rgba(31,42,55,0.07)] p-2 text-left align-top transition-colors last:border-r-0 hover:bg-cream-soft ${
                choisi ? 'bg-cream-soft' : ''
              }`}
            >
              <p className="mb-1.5 flex items-baseline justify-between gap-1">
                <span className="text-[10px] uppercase tracking-wide text-ink-soft">
                  {WEEKDAYS[weekdayIndex(d)].slice(0, 3)}
                </span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    estAujourdhui ? 'bg-amber text-navy' : 'text-navy'
                  }`}
                >
                  {d.getDate()}
                </span>
              </p>

              {ferme ? (
                <p className="text-[10px] text-ink-soft">Fermé</p>
              ) : ranges.length === 0 ? (
                <p className="text-[10px] text-ink-soft">—</p>
              ) : (
                <p className="text-[10px] tabular-nums text-ink-soft">
                  {minuteLabel(ranges[0].startMinute)}–
                  {minuteLabel(ranges[ranges.length - 1].endMinute)}
                </p>
              )}

              <ul className="mt-1.5 space-y-1">
                {prestations.map((p) => (
                  <li
                    key={p.id}
                    className="truncate rounded bg-navy px-1.5 py-1 text-[10px] text-white"
                  >
                    {p.timeSlot?.split('-')[0] ?? ''} {p.client?.name ?? 'Client'}
                  </li>
                ))}
                {requests.map((r) => (
                  <li
                    key={r.id}
                    className="truncate rounded border border-dashed border-amber bg-amber-soft/70 px-1.5 py-1 text-[10px] text-navy"
                  >
                    {r.title ?? 'Demande'}
                  </li>
                ))}
                {blocks.map((b) => (
                  <li
                    key={b.id}
                    className="truncate rounded bg-[rgba(31,42,55,0.08)] px-1.5 py-1 text-[10px] text-ink-mid"
                  >
                    {b.reason || 'Indisponible'}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function MonthGrid({
  start,
  month,
  agenda,
  selected,
  onSelect,
}: {
  start: Date
  month: number
  agenda: NonNullable<ReturnType<typeof useAgenda>['data']>
  selected: Date | null
  onSelect: (d: Date) => void
}) {
  const jours = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const today = new Date()

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[rgba(31,42,55,0.07)]">
        {WEEKDAYS.map((j) => (
          <p
            key={j}
            className="px-2 py-2 text-center text-[10px] uppercase tracking-wide text-ink-soft"
          >
            {j.slice(0, 3)}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {jours.map((d) => {
          const { prestations, requests, blocks } = thingsOn(d, agenda)
          const ranges = workingRanges(d, agenda.schedule)
          const ferme = closedReason(d, agenda.schedule) !== null
          const horsMois = d.getMonth() !== month
          const estAujourdhui = sameDay(d, today)
          const choisi = selected ? sameDay(d, selected) : false
          const occupe = prestations.length + requests.length + blocks.length

          return (
            <button
              key={dayKey(d)}
              onClick={() => onSelect(d)}
              className={`min-h-20 border-b border-r border-[rgba(31,42,55,0.07)] p-1.5 text-left align-top transition-colors hover:bg-cream-soft ${
                horsMois ? 'opacity-40' : ''
              } ${choisi ? 'bg-cream-soft' : ''}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                  estAujourdhui ? 'bg-amber text-navy' : 'text-navy'
                }`}
              >
                {d.getDate()}
              </span>
              {ferme ? (
                <span className="mt-1 block text-[10px] text-ink-soft">Fermé</span>
              ) : (
                ranges.length === 0 && (
                  <span className="mt-1 block text-[10px] text-ink-soft">—</span>
                )
              )}
              {occupe > 0 && (
                <span className="mt-1 flex flex-wrap gap-0.5">
                  {prestations.map((p) => (
                    <span key={p.id} aria-hidden className="h-1.5 w-1.5 rounded-full bg-navy" />
                  ))}
                  {requests.map((r) => (
                    <span key={r.id} aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber" />
                  ))}
                  {blocks.map((b) => (
                    <span
                      key={b.id}
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-ink-soft/50"
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function YearView({
  query,
  onOpenMonth,
}: {
  query: ReturnType<typeof useAgendaSummary>
  onOpenMonth: (month: number) => void
}) {
  if (query.isPending) return <div className="h-72 animate-pulse rounded-3xl bg-paper" />
  if (query.isError) {
    return (
      <Card>
        <p className="text-sm text-ink-mid">Le récapitulatif de l’année n’a pas pu être lu.</p>
        <button onClick={() => query.refetch()} className="btn btn-primary mt-4 text-xs">
          <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
        </button>
      </Card>
    )
  }

  const parMois = new Map((query.data?.months ?? []).map((m) => [m.month, m.prestations]))
  const max = Math.max(1, ...[...parMois.values()])

  return (
    <Card title={`Prestations en ${query.data?.year ?? ''}`}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MOIS.map((nom, i) => {
          const n = parMois.get(i + 1) ?? 0
          return (
            <li key={nom}>
              <button
                onClick={() => onOpenMonth(i + 1)}
                className="w-full rounded-2xl bg-cream-soft p-3 text-left transition-colors hover:bg-cream-deep"
              >
                <p className="text-[11px] uppercase tracking-wide text-ink-soft">{nom}</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-navy">
                  {n}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full bg-amber"
                    style={{ width: `${(n / max) * 100}%` }}
                  />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
        Les prestations annulées ne sont pas comptées.
      </p>
    </Card>
  )
}

/* ── Le panneau d'une journée ──────────────────────────────────────────────── */

function DayPanel({
  date,
  agenda,
  onClose,
}: {
  date: Date
  agenda: NonNullable<ReturnType<typeof useAgenda>['data']>
  onClose: () => void
}) {
  const toast = useToast()
  const save = useSaveAvailability()
  const ajouterBloc = useAddBlock()
  const retirerBloc = useRemoveBlock()

  const { prestations, requests, blocks } = thingsOn(date, agenda)
  const ranges = workingRanges(date, agenda.schedule)
  const ferme = closedReason(date, agenda.schedule)
  const cle = dayKey(date)

  const [blocDe, setBlocDe] = useState('14:00')
  const [blocA, setBlocA] = useState('16:00')
  const [motif, setMotif] = useState('')
  const [aFermer, setAFermer] = useState(false)

  /** Pose ou retire une exception sur cette date, l'horaire partant d'un bloc. */
  function changerExceptions(next: AvailabilityException[]) {
    const s = agenda.schedule
    save.mutate(
      { weekly: s.weekly, exceptions: next, version: s.version },
      {
        onError: (e) =>
          toast.error(
            'La journée n’a pas été modifiée',
            e instanceof Error ? e.message : undefined,
          ),
      },
    )
  }

  const fermer = () =>
    changerExceptions([
      ...agenda.schedule.exceptions.filter((e) => e.date !== cle),
      { date: cle, kind: 'closed', reason: motif.trim() || undefined },
    ])

  const rouvrir = () =>
    changerExceptions(
      agenda.schedule.exceptions.filter((e) => !(e.date === cle && e.kind === 'closed')),
    )

  return (
    <Card
      title={date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      action={
        <button
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-cream-soft hover:text-navy"
        >
          <X className="h-4 w-4" />
        </button>
      }
    >
      {/* Les heures de la journée */}
      {ferme !== null ? (
        <div className="rounded-xl bg-cream-soft px-3.5 py-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-navy">
            <CalendarOff className="h-4 w-4 text-ink-soft" aria-hidden /> Journée fermée
          </p>
          {ferme && <p className="mt-0.5 text-[12px] text-ink-mid">{ferme}</p>}
          <button
            onClick={rouvrir}
            disabled={save.isPending}
            className="btn btn-outline mt-2.5 text-xs"
          >
            {save.isPending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            Rouvrir cette journée
          </button>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-ink-mid">
            {ranges.length === 0
              ? 'Vous ne travaillez pas ce jour-là.'
              : `Vous travaillez ${ranges
                  .map((r) => rangeLabel(r.startMinute, r.endMinute))
                  .join(' et ')}.`}
          </p>
          <button
            onClick={() => setAFermer(true)}
            disabled={save.isPending}
            className="btn btn-outline mt-2.5 text-xs"
          >
            <CalendarOff className="h-3.5 w-3.5" aria-hidden /> Fermer cette journée
          </button>
        </>
      )}

      {/* Ce qui s'y passe */}
      <div className="mt-4 space-y-2 border-t border-[rgba(31,42,55,0.07)] pt-4">
        {prestations.length === 0 && requests.length === 0 && blocks.length === 0 ? (
          <p className="text-[13px] text-ink-soft">Rien de prévu ce jour-là.</p>
        ) : (
          <>
            {prestations.map((p) => (
              <Link
                key={p.id}
                href="/espace-chef/prestations"
                className="block rounded-xl bg-navy p-3 text-white transition-opacity hover:opacity-90"
              >
                <p className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                  {p.client?.name ?? 'Client'}
                  <span className="font-mono text-[11px] text-white/70">{p.timeSlot}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-white/70">
                  {p.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden /> {p.city}
                    </span>
                  )}
                  {p.persons != null && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" aria-hidden /> {p.persons}
                    </span>
                  )}
                </p>
                {p.rescheduleTo && (
                  <p className="mt-1 text-[11px] text-amber">
                    Report proposé — une réponse est attendue
                  </p>
                )}
              </Link>
            ))}

            {requests.map((r) => (
              <Link
                key={r.id}
                href="/espace-chef/offres"
                className="block rounded-xl border-[1.5px] border-dashed border-amber bg-amber-soft/60 p-3 transition-colors hover:bg-amber-soft"
              >
                <p className="text-[13px] font-semibold text-navy">
                  {r.title ?? 'Demande sur-mesure'}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-mid">
                  {r.stage === 'to_answer'
                    ? 'À chiffrer'
                    : 'Offre envoyée, en attente du client'}
                  {r.city ? ` · ${r.city}` : ''}
                </p>
              </Link>
            ))}

            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 rounded-xl bg-cream-soft p-3 text-[13px]"
              >
                <Lock className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-ink-mid">
                  {b.reason || 'Indisponible'}
                  <span className="ml-1.5 font-mono text-[11px] text-ink-soft">
                    {minuteLabel(minutesOf(b.startsAt))}–{minuteLabel(minutesOf(b.endsAt))}
                  </span>
                </span>
                <button
                  onClick={() =>
                    retirerBloc.mutate(b.id, {
                      onSuccess: () => toast.success('Créneau libéré'),
                      onError: () => toast.error('Le créneau n’a pas été libéré'),
                    })
                  }
                  aria-label="Libérer ce créneau"
                  className="shrink-0 text-ink-soft hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Bloquer un créneau */}
      {ferme === null && (
        <div className="mt-4 border-t border-[rgba(31,42,55,0.07)] pt-4">
          <p className="text-[13px] font-semibold text-navy">Bloquer un créneau</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            Un rendez-vous, une course : personne ne pourra réserver dessus.
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-ink-soft">De</span>
              <input
                type="time"
                value={blocDe}
                onChange={(e) => setBlocDe(e.target.value)}
                className="input-base py-2"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-ink-soft">À</span>
              <input
                type="time"
                value={blocA}
                onChange={(e) => setBlocA(e.target.value)}
                className="input-base py-2"
              />
            </label>
          </div>
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif (pour vous seul)"
            className="input-base mt-2 py-2"
          />
          <button
            onClick={() => {
              const debut = new Date(date)
              debut.setHours(Math.floor(toMinutes(blocDe) / 60), toMinutes(blocDe) % 60, 0, 0)
              const fin = new Date(date)
              fin.setHours(Math.floor(toMinutes(blocA) / 60), toMinutes(blocA) % 60, 0, 0)
              ajouterBloc.mutate(
                {
                  startsAt: debut.toISOString(),
                  endsAt: fin.toISOString(),
                  reason: motif.trim() || undefined,
                },
                {
                  onSuccess: () => {
                    setMotif('')
                    toast.success('Créneau bloqué')
                  },
                  onError: (e) =>
                    toast.error(
                      'Le créneau n’a pas été bloqué',
                      e instanceof Error ? e.message : undefined,
                    ),
                },
              )
            }}
            disabled={ajouterBloc.isPending || toMinutes(blocA) <= toMinutes(blocDe)}
            className="btn btn-outline mt-2 w-full justify-center text-xs disabled:opacity-55"
          >
            {ajouterBloc.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Lock className="h-3.5 w-3.5" aria-hidden />
            )}
            Bloquer ce créneau
          </button>
        </div>
      )}

      <ConfirmDialog
        open={aFermer}
        onClose={() => setAFermer(false)}
        onConfirm={() => {
          fermer()
          setAFermer(false)
        }}
        pending={save.isPending}
        tone="danger"
        title="Fermer cette journée ?"
        lead="Aucun client ne pourra réserver ce jour-là, quelle que soit votre semaine type."
        detail={
          prestations.length > 0
            ? `${prestations.length} prestation${prestations.length > 1 ? 's' : ''} déjà acceptée${prestations.length > 1 ? 's' : ''} ce jour-là ne bouge${prestations.length > 1 ? 'nt' : ''} pas : à vous de prévenir votre client.`
            : 'Le motif reste privé : il ne sort jamais vers un client.'
        }
        confirmLabel="Fermer la journée"
      >
        <input
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif (vacances, repos…)"
          className="input-base mt-4 py-2"
        />
      </ConfirmDialog>
    </Card>
  )
}

/* ── Les horaires ──────────────────────────────────────────────────────────── */

/**
 * La semaine type.
 *
 * On édite une copie, et on envoie tout d'un bloc avec le `version` relu :
 * c'est ce que `PUT /chef/availability` attend, et c'est ce qui protège d'un
 * enregistrement venu d'un autre onglet.
 */
function HoursEditor() {
  const toast = useToast()
  const query = useAvailability()
  const save = useSaveAvailability()

  const serveur = query.data
  const [brouillon, setBrouillon] = useState<WeeklySlot[] | null>(null)
  const weekly = brouillon ?? serveur?.weekly ?? []
  const modifie = brouillon !== null

  const [jour, setJour] = useState(0)
  const [de, setDe] = useState('09:00')
  const [a, setA] = useState('13:00')

  if (query.isPending) {
    return <div className="h-64 animate-pulse rounded-3xl bg-paper" />
  }

  const chevauche = (s: WeeklySlot) =>
    weekly.some(
      (x) =>
        x.weekday === s.weekday &&
        x !== s &&
        overlaps(
          { startMinute: s.startMinute, endMinute: s.endMinute },
          { startMinute: x.startMinute, endMinute: x.endMinute },
        ),
    )

  const nouveau: WeeklySlot = {
    weekday: jour,
    startMinute: toMinutes(de),
    endMinute: toMinutes(a),
  }
  const invalide = nouveau.endMinute <= nouveau.startMinute || chevauche(nouveau)

  return (
    <Card title="Ma semaine type">
      <p className="text-[13px] leading-relaxed text-ink-mid">
        Les heures où un client peut vous réserver. Vous les ajustez ensuite jour
        par jour, dans le panneau d’une journée.
      </p>

      {weekly.length === 0 ? (
        <Empty text="Aucun créneau. Personne ne peut vous réserver." />
      ) : (
        <ul className="mt-3 space-y-1.5">
          {[...weekly]
            .sort((x, y) => x.weekday - y.weekday || x.startMinute - y.startMinute)
            .map((s, i) => (
              <li
                key={`${s.weekday}-${s.startMinute}-${i}`}
                className="flex items-center gap-2 rounded-xl bg-cream-soft px-3 py-2 text-[13px]"
              >
                <span className="w-20 shrink-0 font-semibold text-navy">
                  {weekdayLabel(s.weekday)}
                </span>
                <span className="flex-1 tabular-nums text-ink-mid">
                  {rangeLabel(s.startMinute, s.endMinute)}
                </span>
                <button
                  onClick={() => setBrouillon(weekly.filter((x) => x !== s))}
                  aria-label={`Retirer ${weekdayLabel(s.weekday)} ${rangeLabel(s.startMinute, s.endMinute)}`}
                  className="shrink-0 text-ink-soft hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
        </ul>
      )}

      <p className="mt-2 text-[12px] text-ink-soft">
        {weeklyHours(weekly).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h par
        semaine
      </p>

      {/* Ajouter un créneau */}
      <div className="mt-4 border-t border-[rgba(31,42,55,0.07)] pt-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-28 flex-1">
            <span className="mb-1 block text-[11px] text-ink-soft">Jour</span>
            <select
              value={jour}
              onChange={(e) => setJour(Number(e.target.value))}
              className="input-base py-2"
            >
              {WEEKDAYS.map((j, i) => (
                <option key={j} value={i}>
                  {j}
                </option>
              ))}
            </select>
          </label>
          <label className="w-24">
            <span className="mb-1 block text-[11px] text-ink-soft">De</span>
            <input
              type="time"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="input-base py-2"
            />
          </label>
          <label className="w-24">
            <span className="mb-1 block text-[11px] text-ink-soft">À</span>
            <input
              type="time"
              value={a}
              onChange={(e) => setA(e.target.value)}
              className="input-base py-2"
            />
          </label>
        </div>
        <button
          onClick={() => setBrouillon([...weekly, nouveau])}
          disabled={invalide}
          className="btn btn-outline mt-2 w-full justify-center text-xs disabled:opacity-55"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter ce créneau
        </button>
        {invalide && (
          <p className="mt-1.5 text-[12px] text-amber-deep">
            {nouveau.endMinute <= nouveau.startMinute
              ? 'La fin doit venir après le début.'
              : 'Ce créneau en chevauche un autre le même jour — l’API le refuserait.'}
          </p>
        )}
      </div>

      {modifie && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[rgba(31,42,55,0.07)] pt-4">
          <button
            onClick={() =>
              save.mutate(
                {
                  weekly,
                  exceptions: serveur?.exceptions ?? [],
                  version: serveur?.version,
                },
                {
                  onSuccess: () => {
                    setBrouillon(null)
                    toast.success('Horaires enregistrés')
                  },
                  onError: (e) =>
                    toast.error(
                      'Les horaires n’ont pas été enregistrés',
                      e instanceof Error
                        ? e.message
                        : 'Un autre onglet a peut-être enregistré entre-temps : rechargez.',
                    ),
                },
              )
            }
            disabled={save.isPending}
            className="btn btn-primary flex-1 justify-center text-xs"
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Enregistrer
          </button>
          <button onClick={() => setBrouillon(null)} className="btn btn-outline text-xs">
            Annuler
          </button>
        </div>
      )}
    </Card>
  )
}

/* ── Le flux de calendrier ─────────────────────────────────────────────────── */

function CalendarFeedCard() {
  const toast = useToast()
  const query = useCalendarFeed()
  const creer = useCreateCalendarFeed()
  const supprimer = useDeleteCalendarFeed()
  /** L'API ne remontre jamais le lien : on le garde le temps de la visite. */
  const [lien, setLien] = useState<string | null>(null)
  const [aRevoquer, setARevoquer] = useState(false)

  const f = query.data

  return (
    <Card title="Dans mon calendrier">
      <p className="text-[13px] leading-relaxed text-ink-mid">
        Vos prestations dans votre application de calendrier, en lecture seule.
      </p>

      {query.isPending ? (
        <div className="mt-3 h-10 animate-pulse rounded-xl bg-cream-soft" />
      ) : f?.enabled ? (
        <>
          <p className="mt-3 flex items-center gap-2 text-[13px] text-mint-ink">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Flux actif
            {f.synced === false && (
              <span className="text-ink-soft">— pas encore récupéré</span>
            )}
          </p>
          {lien && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-cream-soft p-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
              <code className="min-w-0 flex-1 truncate text-[11px] text-ink-mid">{lien}</code>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(lien)
                  toast.success('Lien copié')
                }}
                aria-label="Copier le lien"
                className="shrink-0 text-ink-soft hover:text-navy"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
            {lien
              ? 'Collez-le dans votre calendrier. Ce lien ne sera plus affiché : gardez-le maintenant.'
              : 'Le lien n’est montré qu’à sa création. Pour le revoir, il faut en créer un nouveau — l’ancien cesse alors de fonctionner.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                creer.mutate(undefined, {
                  onSuccess: (r) => {
                    setLien(r.url ?? null)
                    toast.success('Nouveau lien créé', 'L’ancien ne fonctionne plus.')
                  },
                  onError: () => toast.error('Le lien n’a pas été créé'),
                })
              }
              disabled={creer.isPending}
              className="btn btn-outline text-xs"
            >
              {creer.isPending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
              Nouveau lien
            </button>
            <button
              onClick={() => setARevoquer(true)}
              className="btn text-xs text-ink-mid hover:text-red-700"
            >
              Désactiver
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={() =>
            creer.mutate(undefined, {
              onSuccess: (r) => {
                setLien(r.url ?? null)
                toast.success('Flux activé')
              },
              onError: () => toast.error('Le flux n’a pas été activé'),
            })
          }
          disabled={creer.isPending}
          className="btn btn-outline mt-3 w-full justify-center text-xs"
        >
          {creer.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
          )}
          Activer le flux
        </button>
      )}

      <ConfirmDialog
        open={aRevoquer}
        onClose={() => setARevoquer(false)}
        onConfirm={() =>
          supprimer.mutate(undefined, {
            onSuccess: () => {
              setARevoquer(false)
              setLien(null)
              toast.success('Flux désactivé')
            },
            onError: () => toast.error('Le flux n’a pas été désactivé'),
          })
        }
        pending={supprimer.isPending}
        tone="danger"
        title="Désactiver le flux ?"
        lead="Votre calendrier cessera de recevoir vos prestations, et le lien actuel ne fonctionnera plus."
        detail="Vous pourrez en créer un nouveau à tout moment — ce sera un autre lien."
        confirmLabel="Désactiver"
      />
    </Card>
  )
}
