'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarOff, Lock } from 'lucide-react'
import { Card } from '@/components/chef/ChefPage'
import {
  closedReason,
  dayKey,
  minutesOf,
  minuteLabel,
  weekdayIndex,
  workingRanges,
  WEEKDAYS,
  type Agenda,
} from '@/lib/api/agenda'

/* ──────────────────────────────────────────────────────────────────────────────
   La grille horaire de l'agenda — une colonne le jour, sept la semaine.

   Un agenda doit montrer le temps **à l'échelle** : une prestation de 9 h à
   13 h occupe quatre heures de hauteur, les trous se voient, et deux
   rendez-vous qui se chevauchent se posent côte à côte. Une liste par jour ne
   dit rien de tout cela.

   La grille s'ajuste à ce qu'elle contient plutôt que de figer 7 h – 22 h :
   une prestation à 6 h du matin reste visible, et une journée qui s'arrête à
   16 h ne laisse pas six heures de vide en bas.
   ───────────────────────────────────────────────────────────────────────────── */

const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b)

/* ── Ce qui se passe un jour donné ─────────────────────────────────────────── */

export function thingsOn(date: Date, a: Agenda) {
  const cle = dayKey(date)
  return {
    prestations: a.prestations.filter((p) => dayKey(new Date(p.startsAt)) === cle),
    requests: a.requests.filter((r) => r.startsAt && dayKey(new Date(r.startsAt)) === cle),
    blocks: a.blocks.filter((b) => dayKey(new Date(b.startsAt)) === cle),
  }
}

/* ── La grille horaire ─────────────────────────────────────────────────────── */

/** Une heure de hauteur. La grille entière en découle. */
const HAUTEUR_HEURE = 52
const MARGE_HEURES = 1

interface GridItem {
  id: string
  kind: 'prestation' | 'request' | 'block'
  start: number
  end: number
  title: string
  sub: string | null
  href: string | null
  alerte: boolean
}

function itemsOf(date: Date, agenda: Agenda): GridItem[] {
  const { prestations, requests, blocks } = thingsOn(date, agenda)
  return [
    ...prestations.map((p) => ({
      id: p.id,
      kind: 'prestation' as const,
      start: minutesOf(p.startsAt),
      end: p.endsAt ? minutesOf(p.endsAt) : minutesOf(p.startsAt) + 120,
      title: p.client?.name ?? 'Client',
      sub: [p.timeSlot, p.city].filter(Boolean).join(' · ') || null,
      href: '/espace-chef/prestations',
      alerte: p.rescheduleTo !== null,
    })),
    ...requests.map((r) => ({
      id: r.id,
      kind: 'request' as const,
      start: minutesOf(r.startsAt!),
      end: r.endsAt ? minutesOf(r.endsAt) : minutesOf(r.startsAt!) + 180,
      title: r.title ?? 'Demande sur-mesure',
      sub: r.stage === 'to_answer' ? 'À chiffrer' : 'Offre envoyée',
      href: '/espace-chef/offres',
      alerte: r.stage === 'to_answer',
    })),
    ...blocks.map((b) => ({
      id: b.id,
      kind: 'block' as const,
      start: minutesOf(b.startsAt),
      end: minutesOf(b.endsAt),
      title: b.reason || 'Indisponible',
      sub: null,
      href: null,
      alerte: false,
    })),
  ]
}

/**
 * Deux rendez-vous qui se chevauchent se posent côte à côte, et seulement eux :
 * une prestation seule garde toute la largeur de sa journée. On regroupe donc
 * par grappe de chevauchement avant de compter les colonnes.
 */
function place(items: GridItem[]): Array<GridItem & { lane: number; lanes: number }> {
  const tries = [...items].sort((a, b) => a.start - b.start || a.end - b.end)
  const out: Array<GridItem & { lane: number; lanes: number }> = []
  let grappe: Array<GridItem & { lane: number }> = []
  let fin = -1

  const vider = () => {
    const lanes = Math.max(1, ...grappe.map((g) => g.lane + 1))
    for (const g of grappe) out.push({ ...g, lanes })
    grappe = []
  }

  for (const it of tries) {
    if (grappe.length > 0 && it.start >= fin) {
      vider()
      fin = -1
    }
    const prises = new Set(grappe.filter((g) => g.end > it.start).map((g) => g.lane))
    let lane = 0
    while (prises.has(lane)) lane += 1
    grappe.push({ ...it, lane })
    fin = Math.max(fin, it.end)
  }
  if (grappe.length > 0) vider()
  return out
}

const TON: Record<GridItem['kind'], string> = {
  prestation: 'bg-navy text-white hover:bg-navy-mid',
  request: 'border-[1.5px] border-dashed border-amber bg-amber-soft/80 text-navy hover:bg-amber-soft',
  block: 'bg-[rgba(31,42,55,0.08)] text-ink-mid hover:bg-[rgba(31,42,55,0.12)]',
}

export default function AgendaTimeGrid({
  days,
  agenda,
  selected,
  onSelect,
}: {
  days: Date[]
  agenda: Agenda
  selected: Date | null
  onSelect: (d: Date) => void
}) {
  /** L'heure courante, pour le trait de « maintenant ». Relue chaque minute. */
  const [maintenant, setMaintenant] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const parJour = useMemo(
    () => days.map((d) => ({ date: d, items: place(itemsOf(d, agenda)) })),
    [days, agenda],
  )

  /* La grille s'ajuste à ce qu'elle contient : pas de 7 h–22 h figé qui
     coupe une prestation matinale ou laisse trois heures vides en bas. */
  const { debut, fin } = useMemo(() => {
    const bornes: number[] = []
    for (const { date, items } of parJour) {
      for (const r of workingRanges(date, agenda.schedule)) bornes.push(r.startMinute, r.endMinute)
      for (const i of items) bornes.push(i.start, i.end)
    }
    if (bornes.length === 0) return { debut: 8 * 60, fin: 20 * 60 }
    const bas = Math.min(...bornes) - MARGE_HEURES * 60
    const haut = Math.max(...bornes) + MARGE_HEURES * 60
    return {
      debut: Math.max(0, Math.floor(bas / 60) * 60),
      fin: Math.min(24 * 60, Math.ceil(haut / 60) * 60),
    }
  }, [parJour, agenda.schedule])

  const heures = Array.from({ length: (fin - debut) / 60 + 1 }, (_, i) => debut + i * 60)
  const hauteur = ((fin - debut) / 60) * HAUTEUR_HEURE
  const y = (minute: number) => ((Math.min(Math.max(minute, debut), fin) - debut) / 60) * HAUTEUR_HEURE

  return (
    <Card className="!p-0 overflow-hidden">
      {/* Sept colonnes ne tiennent pas sur un téléphone : plutôt que de les
          réduire à des traits illisibles, la semaine se fait glisser. */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: days.length > 1 ? 620 : undefined }}>
          {/* En-têtes de colonnes */}
          <div
            className="grid border-b border-[rgba(31,42,55,0.07)]"
            style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <span />
            {days.map((d) => {
              const estAujourdhui = sameDay(d, maintenant)
              const choisi = selected ? sameDay(d, selected) : false
              const ferme = closedReason(d, agenda.schedule) !== null
              const ranges = workingRanges(d, agenda.schedule)
              return (
                <button
                  key={dayKey(d)}
                  onClick={() => onSelect(d)}
                  aria-current={estAujourdhui ? 'date' : undefined}
                  className={`border-l border-[rgba(31,42,55,0.07)] px-2 py-2.5 text-center transition-colors hover:bg-cream-soft ${
                    choisi ? 'bg-cream-soft' : ''
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wide text-ink-soft">
                    {WEEKDAYS[weekdayIndex(d)].slice(0, 3)}
                  </p>
                  <p
                    className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                      estAujourdhui ? 'bg-amber text-navy' : 'text-navy'
                    }`}
                  >
                    {d.getDate()}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] tabular-nums text-ink-soft">
                    {ferme
                      ? 'Fermé'
                      : ranges.length === 0
                        ? '—'
                        : `${minuteLabel(ranges[0].startMinute)}–${minuteLabel(ranges[ranges.length - 1].endMinute)}`}
                  </p>
                </button>
              )
            })}
          </div>

          {/* La grille */}
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))`,
              height: hauteur,
            }}
          >
            {/* Gouttière des heures */}
            <div className="relative">
              {heures.slice(0, -1).map((h) => (
                <span
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-ink-soft"
                  style={{ top: y(h) }}
                >
                  {minuteLabel(h)}
                </span>
          ))}
        </div>

        {parJour.map(({ date, items }) => {
          const ranges = workingRanges(date, agenda.schedule)
          const ferme = closedReason(date, agenda.schedule)
          return (
            <div
              key={dayKey(date)}
              className="relative border-l border-[rgba(31,42,55,0.07)] bg-cream-soft"
            >
              {/* Les heures travaillées, en clair sur le fond fermé. */}
              {ranges.map((r, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="absolute inset-x-0 bg-paper"
                  style={{ top: y(r.startMinute), height: y(r.endMinute) - y(r.startMinute) }}
                />
              ))}

              {/* Les lignes d'heures. */}
              {heures.map((h) => (
                <div
                  key={h}
                  aria-hidden
                  className="absolute inset-x-0 border-t border-[rgba(31,42,55,0.06)]"
                  style={{ top: y(h) }}
                />
              ))}

              {ferme !== null && items.length === 0 && (
                <p className="absolute inset-x-1 top-2 flex items-center justify-center gap-1 text-center text-[10px] text-ink-soft">
                  <CalendarOff className="h-3 w-3 shrink-0" aria-hidden />
                  {ferme || 'Fermé'}
                </p>
              )}

              {/* Le trait de maintenant, sur la bonne colonne seulement. */}
              {sameDay(date, maintenant) &&
                (() => {
                  const m = maintenant.getHours() * 60 + maintenant.getMinutes()
                  if (m < debut || m > fin) return null
                  return (
                    <div
                      aria-hidden
                      className="absolute inset-x-0 z-20 border-t-[1.5px] border-amber-deep"
                      style={{ top: y(m) }}
                    >
                      <span className="absolute -left-0.5 -top-[3px] h-1.5 w-1.5 rounded-full bg-amber-deep" />
                    </div>
                  )
                })()}

              {items.map((it) => {
                const haut = y(it.start)
                const bas = Math.max(y(it.end), haut + 22)
                const largeur = 100 / it.lanes
                const corps = (
                  <>
                    <p className="truncate text-[11px] font-semibold leading-tight">
                      {it.kind === 'block' && (
                        <Lock className="mr-1 inline h-2.5 w-2.5 align-[-1px]" aria-hidden />
                      )}
                      {it.title}
                    </p>
                    {it.sub && bas - haut > 34 && (
                      <p className="truncate text-[10px] leading-tight opacity-70">{it.sub}</p>
                    )}
                    {it.alerte && bas - haut > 50 && (
                      <p className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-amber">
                        {it.kind === 'prestation' ? 'Report proposé' : 'En attente de vous'}
                      </p>
                    )}
                  </>
                )
                const classe = `absolute z-10 overflow-hidden rounded-lg px-2 py-1 text-left transition-colors ${TON[it.kind]}`
                const style = {
                  top: haut + 1,
                  height: bas - haut - 2,
                  left: `calc(${it.lane * largeur}% + 2px)`,
                  width: `calc(${largeur}% - 4px)`,
                }
                return it.href ? (
                  <Link key={it.id} href={it.href} className={classe} style={style}>
                    {corps}
                  </Link>
                ) : (
                  <button
                    key={it.id}
                    onClick={() => onSelect(date)}
                    className={classe}
                    style={style}
                  >
                    {corps}
                  </button>
                )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[rgba(31,42,55,0.07)] px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span aria-hidden className="h-2 w-2 rounded-full bg-navy" /> Prestation
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span aria-hidden className="h-2 w-2 rounded-full bg-amber" /> Demande sur-mesure
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span aria-hidden className="h-2 w-2 rounded-full bg-ink-soft" /> Créneau bloqué
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span aria-hidden className="h-2 w-2 rounded-full bg-cream-deep" /> Hors horaires
        </span>
      </div>
    </Card>
  )
}

