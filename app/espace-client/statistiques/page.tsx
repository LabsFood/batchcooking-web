'use client'

import { useState } from 'react'
import {
  ChefHat,
  Clock,
  Wallet,
  Soup,
  ArrowRight,
  ChefHat as ChefIcon,
  Salad,
  Globe2,
  Sprout,
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/shared/Skeleton'
import {
  bookingPortions,
  euros,
  useMyBookings,
  type Booking,
} from '@/lib/api/bookings'

/* ──────────────────────────────────────────────────────────────────────────────
   Mes statistiques — `GET /me/bookings`.

   Cet écran lisait quatre nombres écrits en dur, dont un histogramme de sept
   semaines qui ne bougeait jamais. Tout se calcule maintenant sur les
   prestations réellement **terminées** : une session annulée n'a fait gagner
   de temps à personne, et un plat non cuisiné ne se compte pas.

   Deux hypothèses restent, et elles sont dites à l'écran plutôt que glissées
   dans le calcul : deux heures gagnées par session, et le crédit d'impôt
   cumulé tel que l'API le rend (`amountTtc − amountAfterTax`).
   ────────────────────────────────────────────────────────────────────────────── */

const HEURES_PAR_SESSION = 2

/** Les sept dernières semaines ISO, et ce qui y a été cuisiné. */
function parSemaine(prestations: Booking[], depuis: Date) {
  const semaines: { week: string; meals: number }[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const fin = new Date(depuis)
    fin.setDate(depuis.getDate() - i * 7)
    const debut = new Date(fin)
    debut.setDate(fin.getDate() - 6)
    const meals = prestations
      .filter((b) => {
        const d = new Date(b.startsAt)
        return d >= debut && d <= fin
      })
      .reduce((n, b) => n + bookingPortions(b), 0)
    semaines.push({
      week: fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      meals,
    })
  }
  return semaines
}

const HIGHLIGHTS = [
  {
    Icon: Salad,
    title: 'Plus de fait maison',
    text: 'Chaque session remplace en moyenne 4 repas industriels — gain qualité immédiat.',
  },
  {
    Icon: Globe2,
    title: 'Des cuisines variées',
    text: 'Italien, méditerranéen, asiatique, africain : vous goûtez plus large que d’habitude.',
  },
  {
    Icon: Sprout,
    title: 'Moins de gaspillage',
    text: 'Les portions sont calibrées : ce qui est cuisiné est consommé.',
  },
] as const

export default function StatistiquesPage() {
  const query = useMyBookings({ limit: 100 })
  const toutes = query.data?.data ?? []
  const terminees = toutes.filter(
    (b) => b.status === 'completed' || b.status === 'delivered',
  )

  const portions = terminees.reduce((n, b) => n + bookingPortions(b), 0)
  const credit = terminees.reduce(
    (n, b) =>
      n + (b.amountTtc != null && b.amountAfterTax != null ? b.amountTtc - b.amountAfterTax : 0),
    0,
  )

  /* Une seule lecture de l'heure : comparer des dates pendant le rendu avec
     `Date.now()` rendrait l'écran impur. */
  const [aujourdhui] = useState(() => new Date())
  const semaines = parSemaine(terminees, aujourdhui)
  const max = Math.max(...semaines.map((w) => w.meals)) || 1

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <KpiTile
          Icon={ChefHat}
          label="Sessions"
          value={terminees.length}
          loading={query.isPending}
          sub="réalisées depuis votre inscription"
          tone="amber"
        />
        <KpiTile
          Icon={Soup}
          label="Portions cuisinées"
          value={portions}
          loading={query.isPending}
          sub="fraîches & maison"
          tone="mint"
        />
        <KpiTile
          Icon={Clock}
          label="Heures gagnées"
          value={`${terminees.length * HEURES_PAR_SESSION} h`}
          loading={query.isPending}
          sub={`à faire autre chose · ${HEURES_PAR_SESSION} h par session`}
          tone="navy"
        />
        <KpiTile
          Icon={Wallet}
          label="Crédit d’impôt"
          value={euros(credit) ?? '0 €'}
          loading={query.isPending}
          sub="cumulé sur vos prestations"
          tone="amber"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bars chart */}
        <section className="panel p-5 lg:col-span-2 lg:p-6">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            {/* Ce sont des portions qui sont comptées, pas des plats : le titre le dit. */}
            <h3 className="panel-title">Portions cuisinées par semaine</h3>
            <span className="text-xs text-ink-soft">Sept dernières semaines</span>
          </div>

          {/*
            Chaque colonne prend toute la hauteur, et la barre grandit dans la
            zone au-dessus du libellé. Avant, la colonne n'avait pas de hauteur :
            un pourcentage n'y voulait rien dire, et toutes les barres restaient
            à leurs 8 px de plancher, quelle que soit la semaine.
          */}
          <ol className="flex h-48 items-stretch gap-2 lg:gap-3">
            {semaines.map((w) => {
              const h = Math.round((w.meals / max) * 100)
              return (
                <li key={w.week} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 flex-col items-center justify-end">
                    <span
                      className={`mb-1 text-sm font-semibold tabular-nums ${
                        w.meals > 0 ? 'text-navy' : 'text-ink-soft'
                      }`}
                    >
                      {w.meals}
                    </span>
                    <div
                      className={`w-full rounded-t-lg ${w.meals > 0 ? 'bg-amber' : 'bg-cream-deep'}`}
                      style={{ height: w.meals > 0 ? `${Math.max(h, 4)}%` : 2 }}
                    />
                  </div>
                  <span className="truncate text-xs text-ink-soft">{w.week.replace('.', '')}</span>
                </li>
              )
            })}
          </ol>
        </section>

        {/* Reserve next session CTA */}
        <section
          className="bg-navy text-white rounded-3xl p-6 relative overflow-hidden"
        >
          <div className="relative">
            <p className="font-display text-2xl font-bold leading-tight">
              Une nouvelle semaine, une cuisine nouvelle.
            </p>
            <p className="text-white/65 text-sm mt-3 leading-relaxed">
              Continuez d’explorer le monde par vos plats. Les cartes de la semaine sont
              renouvelées chaque lundi.
            </p>
            <Link
              href="/espace-client/menus"
              className="btn btn-amber mt-5"
            >
              Réserver une session
              <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </div>

      {/* Highlights */}
      <section className="bg-paper rounded-2xl p-6 border border-[rgba(31,42,55,0.06)]">
        <div className="mb-5">
          <h3 className="font-display text-xl font-bold text-navy">
            Ce que vous y gagnez
          </h3>
          <p className="text-xs text-ink-mid mt-1">
            Au-delà des chiffres, les habitudes qui changent.
          </p>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {HIGHLIGHTS.map(({ Icon, title, text }) => (
            <li
              key={title}
              className="rounded-2xl bg-cream-soft border border-[rgba(31,42,55,0.04)] p-5"
            >
              <span className="w-10 h-10 rounded-xl bg-mint/40 text-mint-ink flex items-center justify-center mb-3">
                <Icon className="w-4 h-4" />
              </span>
              <p className="font-display text-base font-bold text-navy">{title}</p>
              <p className="text-xs text-ink-mid leading-relaxed mt-1">{text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function KpiTile({
  Icon,
  label,
  value,
  sub,
  tone,
  loading,
}: {
  Icon: any
  label: string
  value: string | number
  sub: string
  /** Les chiffres dépendent des sessions : tant qu'elles arrivent, un bloc à la hauteur du nombre. */
  loading?: boolean
  tone: 'amber' | 'mint' | 'navy'
}) {
  const styles =
    tone === 'amber'
      ? 'bg-amber-soft text-amber-ink'
      : tone === 'mint'
        ? 'bg-mint text-mint-ink'
        : 'bg-navy text-amber'
  return (
    <div
      className="card-shell rounded-2xl p-5"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles} mb-4`}>
        <Icon className="w-4 h-4" />
      </div>
      {loading ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <p className="font-display text-3xl font-bold text-navy">{value}</p>
      )}
      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft mt-1.5 font-semibold">
        {label}
      </p>
      <p className="text-xs text-ink-soft mt-1">{sub}</p>
    </div>
  )
}
