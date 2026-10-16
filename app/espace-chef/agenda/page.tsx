'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CalendarOff,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
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
import AgendaTimeGrid, { thingsOn } from '@/components/chef/AgendaTimeGrid'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DatePicker, { DayLegend } from '@/components/shared/DatePicker'
import { SlotPicker, TimeRange } from '@/components/shared/TimeField'
import { useToast } from '@/components/shared/Toaster'
import { atTime, durationLabel } from '@/lib/time'
import {
  closedReason,
  dayKey,
  minutesOf,
  minuteLabel,
  overlaps,
  rangeLabel,
  toMinutes,
  useAddBlock,
  useAgenda,
  useAgendaSummary,
  useAvailability,
  useCalendarFeed,
  useCreateCalendarFeed,
  useDeleteCalendarFeed,
  useOwnSlots,
  useRemoveBlock,
  useSaveAvailability,
  weekdayIndex,
  weekdayLabel,
  weeklyHours,
  workingRanges,
  WEEKDAYS,
  type Agenda,
  type AvailabilityException,
  type WeeklySlot,
} from '@/lib/api/agenda'

/* ─────────────────────────────────────────────────────────────────────────────
   Agenda.

   Trois échelles sur les données de l'API : `GET /chef/agenda` rend la fusion
   déjà faite (horaire, prestations, demandes, blocs) pour une fenêtre de 42
   jours au plus, et `GET /chef/agenda/summary` donne le compte par mois.

   Ce qu'un agenda doit faire, et que des listes ne font pas : montrer le temps
   **à l'échelle**. Le jour et la semaine sont donc une vraie grille horaire —
   une prestation de 9 h à 13 h y occupe quatre heures de hauteur, les trous se
   voient, et deux rendez-vous qui se chevauchent se posent côte à côte. Le
   mois, lui, n'a pas besoin de la grille : il a besoin de dire d'un coup d'œil
   quels jours sont pris, fermés, ou encore libres — c'est le calendrier
   partagé (`react-day-picker`) qui le fait, avec ses pastilles.

   Deux choses distinctes, qu'il faut garder distinctes :

   - **les horaires** (`PUT /chef/availability`) sont une trame hebdomadaire et
     des exceptions sur une date. On enregistre tout d'un bloc avec le
     `version` relu — une sauvegarde depuis un onglet périmé est refusée
     plutôt que d'écraser l'autre ;
   - **les blocs** (`POST /chef/agenda/blocks`) prennent deux heures un jour
     donné. Une journée entière se ferme dans les horaires, pas ici.

   Sans horaires, aucun créneau n'est proposé aux clients : l'écran le dit en
   premier, et la carte « Ce qu'un client voit » le prouve en appelant la même
   route que le public (`GET /chef/availability/slots`).
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

  /** Les colonnes de la grille : une le jour, sept la semaine. */
  const colonnes = useMemo(
    () =>
      view === 'day'
        ? [cursor]
        : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(cursor), i)),
    [view, cursor],
  )

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
              <div className="h-[32rem] animate-pulse rounded-3xl bg-paper" />
            ) : view === 'month' ? (
              <MonthView
                month={cursor}
                agenda={agenda.data}
                selected={jour}
                onSelect={setSelected}
                onMonthChange={(m) => {
                  setCursor(m)
                  setSelected(null)
                }}
              />
            ) : (
              <AgendaTimeGrid
                days={colonnes}
                agenda={agenda.data}
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

            {view !== 'month' && view !== 'year' && (
              <Card title="Aller à une date">
                <DatePicker
                  mode="single"
                  selected={jour ?? cursor}
                  month={cursor}
                  onMonthChange={setCursor}
                  onSelect={(d) => {
                    if (!d) return
                    setCursor(d)
                    setSelected(d)
                  }}
                  className="mx-auto w-fit"
                />
              </Card>
            )}

            <SlotsCard date={jour ?? cursor} />

            <HoursEditor />

            <CalendarFeedCard />
          </aside>
        </div>
      </div>
    </ChefPage>
  )
}

/* ── Le mois ───────────────────────────────────────────────────────────────── */

/**
 * Le mois ne montre pas le temps à l'échelle, il montre l'état des jours : le
 * calendrier partagé s'en charge, et la liste dessous donne la suite dans
 * l'ordre — ce qu'une grille de cases ne sait pas faire lisiblement.
 */
function MonthView({
  month,
  agenda,
  selected,
  onSelect,
  onMonthChange,
}: {
  month: Date
  agenda: Agenda
  selected: Date | null
  onSelect: (d: Date) => void
  onMonthChange: (d: Date) => void
}) {
  const jourDe = (iso: string) => dayKey(new Date(iso))

  const modifiers = useMemo(() => {
    const booked = agenda.prestations.map((p) => new Date(p.startsAt))
    const pending = agenda.requests
      .filter((r) => r.startsAt)
      .map((r) => new Date(r.startsAt!))
    const blocked = agenda.blocks.map((b) => new Date(b.startsAt))
    const pris = new Set([...booked, ...pending].map((d) => dayKey(d)))

    /* « Libre » ne se devine pas : c'est un jour travaillé où rien n'est
       encore posé. Sans ça, un mois vide et un mois fermé se ressemblent. */
    const free: Date[] = []
    const closed: Date[] = []
    const premier = new Date(month.getFullYear(), month.getMonth(), 1)
    for (let i = 0; i < 31; i += 1) {
      const d = new Date(premier)
      d.setDate(premier.getDate() + i)
      if (d.getMonth() !== month.getMonth()) break
      const ouvre = workingRanges(d, agenda.schedule).length > 0
      if (!ouvre) closed.push(d)
      else if (!pris.has(dayKey(d))) free.push(d)
    }
    return { booked, pending, blocked, free, closed }
  }, [agenda, month])

  const suite = useMemo(() => {
    const items = [
      ...agenda.prestations.map((p) => ({
        id: p.id,
        at: p.startsAt,
        title: p.client?.name ?? 'Client',
        sub: [p.timeSlot, p.city].filter(Boolean).join(' · '),
        href: '/espace-chef/prestations',
        ton: 'bg-navy text-white',
      })),
      ...agenda.requests
        .filter((r) => r.startsAt)
        .map((r) => ({
          id: r.id,
          at: r.startsAt!,
          title: r.title ?? 'Demande sur-mesure',
          sub: r.stage === 'to_answer' ? 'À chiffrer' : 'Offre envoyée',
          href: '/espace-chef/offres',
          ton: 'bg-amber-soft text-navy',
        })),
    ]
      .filter((i) => new Date(i.at).getMonth() === month.getMonth())
      .sort((a, b) => a.at.localeCompare(b.at))
    return items
  }, [agenda, month])

  return (
    <div className="space-y-5">
      <Card>
        <DatePicker
          mode="single"
          month={month}
          onMonthChange={onMonthChange}
          selected={selected ?? undefined}
          onSelect={(d) => d && onSelect(d)}
          modifiers={modifiers}
          /* Le mois est déjà titré par la barre du haut. */
          hideNavigation
          classNames={{ month_caption: 'hidden' }}
          className="lf-rdp-wide mx-auto w-full"
        />
        <DayLegend
          className="mt-3 justify-center border-t border-[rgba(31,42,55,0.07)] pt-3"
          items={[
            { tone: 'booked', label: 'Prestation' },
            { tone: 'pending', label: 'Demande' },
            { tone: 'blocked', label: 'Créneau bloqué' },
            { tone: 'free', label: 'Encore libre' },
            { tone: 'closed', label: 'Fermé' },
          ]}
        />
      </Card>

      <Card title="Dans ce mois">
        {suite.length === 0 ? (
          <Empty text="Rien de prévu ce mois-ci." />
        ) : (
          <ul className="space-y-2">
            {suite.map((i) => (
              <li key={`${i.id}-${i.at}`}>
                <Link
                  href={i.href}
                  className={`flex items-center gap-3 rounded-xl p-2.5 transition-opacity hover:opacity-90 ${i.ton}`}
                >
                  <span className="w-12 shrink-0 text-center">
                    <span className="block text-[10px] uppercase tracking-wide opacity-70">
                      {new Date(i.at).toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </span>
                    <span className="block font-display text-lg font-bold tabular-nums leading-none">
                      {new Date(i.at).getDate()}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{i.title}</span>
                    {i.sub && (
                      <span className="block truncate text-[11px] opacity-70">{i.sub}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      onSelect(new Date(i.at))
                    }}
                    aria-label={`Ouvrir le ${new Date(i.at).getDate()}`}
                    className="shrink-0 rounded-full p-1 opacity-60 hover:opacity-100"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/* ── L'année ───────────────────────────────────────────────────────────────── */

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

/* ── Ce qu'un client voit ──────────────────────────────────────────────────── */

const DUREES = [120, 180, 240, 300]

/**
 * La même route que le public (`GET /chef/availability/slots`), sur la journée
 * ouverte. C'est la seule façon de vérifier qu'un horaire produit vraiment des
 * créneaux : une semaine type pleine dont tout est bloqué ne se voit pas
 * autrement.
 */
function SlotsCard({ date }: { date: Date }) {
  const [duree, setDuree] = useState(180)
  const query = useOwnSlots(dayKey(date), dayKey(addDays(date, 1)), duree)

  return (
    <Card title="Ce qu’un client voit">
      <p className="text-[13px] leading-relaxed text-ink-mid">
        Les créneaux réservables le{' '}
        <strong className="font-semibold text-navy">
          {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
        </strong>{' '}
        pour une prestation de {durationLabel(duree)}.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {DUREES.map((d) => (
          <button
            key={d}
            onClick={() => setDuree(d)}
            aria-pressed={duree === d}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              duree === d
                ? 'border-navy bg-navy text-white'
                : 'border-[rgba(31,42,55,0.12)] text-ink-mid hover:border-navy hover:text-navy'
            }`}
          >
            {durationLabel(d)}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {query.isPending ? (
          <div className="h-8 animate-pulse rounded-full bg-cream-soft" />
        ) : query.isError ? (
          <p className="text-[12px] text-ink-soft">
            Les créneaux n’ont pas pu être lus.{' '}
            <button onClick={() => query.refetch()} className="font-semibold underline">
              Réessayer
            </button>
          </p>
        ) : query.data?.scheduled === false ? (
          <p className="text-[12px] text-amber-deep">
            Aucun horaire posé : rien n’est proposé, quelle que soit la durée.
          </p>
        ) : (
          <SlotPicker
            slots={query.data?.slots ?? []}
            empty="Aucun créneau de cette durée ce jour-là : la journée est fermée, prise, ou trop courte."
          />
        )}
      </div>
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
  agenda: Agenda
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

  const [bloc, setBloc] = useState({ from: '14:00', to: '16:00' })
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
          <TimeRange
            idPrefix="bloc"
            from={bloc.from}
            to={bloc.to}
            onChange={setBloc}
            presets={[
              { label: 'Matin', from: '09:00', to: '12:00' },
              { label: 'Après-midi', from: '14:00', to: '18:00' },
              { label: 'Journée', from: '09:00', to: '18:00' },
            ]}
            className="mt-2"
          />
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif (pour vous seul)"
            className="input-base mt-2 py-2"
          />
          <button
            onClick={() =>
              ajouterBloc.mutate(
                {
                  startsAt: atTime(date, bloc.from).toISOString(),
                  endsAt: atTime(date, bloc.to).toISOString(),
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
            }
            disabled={ajouterBloc.isPending || toMinutes(bloc.to) <= toMinutes(bloc.from)}
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
  const [plage, setPlage] = useState({ from: '09:00', to: '13:00' })

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
    startMinute: toMinutes(plage.from),
    endMinute: toMinutes(plage.to),
  }
  const invalide = nouveau.endMinute <= nouveau.startMinute || chevauche(nouveau)

  /** Une ligne par jour de la semaine : la trame se lit comme un planning. */
  const parJour = WEEKDAYS.map((_, i) => ({
    weekday: i,
    slots: weekly
      .filter((s) => s.weekday === i)
      .sort((a, b) => a.startMinute - b.startMinute),
  }))

  return (
    <Card title="Ma semaine type">
      <p className="text-[13px] leading-relaxed text-ink-mid">
        Les heures où un client peut vous réserver. Vous les ajustez ensuite jour
        par jour, dans le panneau d’une journée.
      </p>

      {weekly.length === 0 ? (
        <Empty text="Aucun créneau. Personne ne peut vous réserver." />
      ) : (
        <ul className="mt-3 space-y-1">
          {parJour.map(({ weekday, slots }) => (
            <li
              key={weekday}
              className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] ${
                slots.length === 0 ? '' : 'bg-cream-soft'
              }`}
            >
              <span
                className={`w-20 shrink-0 font-semibold ${
                  slots.length === 0 ? 'text-ink-soft' : 'text-navy'
                }`}
              >
                {weekdayLabel(weekday)}
              </span>
              {slots.length === 0 ? (
                <span className="text-ink-soft">Repos</span>
              ) : (
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  {slots.map((s, i) => (
                    <span key={`${s.startMinute}-${i}`} className="flex items-center gap-2">
                      <span className="flex-1 tabular-nums text-ink-mid">
                        {rangeLabel(s.startMinute, s.endMinute)}
                      </span>
                      <button
                        onClick={() => setBrouillon(weekly.filter((x) => x !== s))}
                        aria-label={`Retirer ${weekdayLabel(weekday)} ${rangeLabel(s.startMinute, s.endMinute)}`}
                        className="shrink-0 text-ink-soft hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </span>
              )}
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
        <label className="block">
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
        <TimeRange
          idPrefix="semaine"
          from={plage.from}
          to={plage.to}
          onChange={setPlage}
          className="mt-2"
        />
        <button
          onClick={() => setBrouillon([...weekly, nouveau])}
          disabled={invalide}
          className="btn btn-outline mt-2 w-full justify-center text-xs disabled:opacity-55"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter ce créneau
        </button>
        {chevauche(nouveau) && nouveau.endMinute > nouveau.startMinute && (
          <p className="mt-1.5 text-[12px] text-amber-deep">
            Ce créneau en chevauche un autre le {weekdayLabel(jour).toLowerCase()} — l’API
            le refuserait.
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
