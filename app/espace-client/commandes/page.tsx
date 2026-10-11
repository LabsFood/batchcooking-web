'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  ChefHat,
  Clock,
  Info,
  RotateCw,
  UtensilsCrossed,
} from 'lucide-react'
import {
  bookingMealNames,
  bookingPortions,
  bookingStatusText,
  euros,
  isBookingOpen,
  longDate,
  slot,
  useMyBookings,
  type Booking,
} from '@/lib/api/bookings'

/* ─────────────────────────────────────────────────────────────────────────────
   Mes commandes — `GET /bookings/me`.

   L'écran tournait sur `lib/dashboard-mock.ts`, et montrait des choses que
   l'API ne sait pas dire : un statut de règlement, une formule, un montant
   après crédit d'impôt, un créneau nommé. Un booking porte une référence, deux
   bornes horaires, un statut, un prix TTC en centimes et ses plats. C'est ce
   qui est affiché.

   Le reste à charge est une **estimation** du front — 50 % au titre du service
   à la personne — et il est dit comme tel : l'API ne renvoie ce montant que
   sur les formules et dans les totaux de la console, jamais sur une commande.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = 'all' | 'open' | 'history'

const FILTERS: { id: Filter; label: string; match: (b: Booking) => boolean }[] = [
  { id: 'all', label: 'Toutes', match: () => true },
  { id: 'open', label: 'À venir', match: isBookingOpen },
  { id: 'history', label: 'Passées', match: (b) => !isBookingOpen(b) },
]

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-soft text-amber-deep',
  confirmed: 'bg-mint text-mint-ink',
  shopping: 'bg-mint text-mint-ink',
  cooking: 'bg-amber text-navy',
  completed: 'bg-cream-deep text-navy',
  delivered: 'bg-cream-deep text-navy',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-red-50 text-red-700',
}

export default function OrdersListPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const query = useMyBookings({ limit: 50 })

  const toutes = query.data?.data ?? []
  const liste = toutes.filter(FILTERS.find((f) => f.id === filter)!.match)

  if (query.isError) {
    return (
      <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-6">
        <p className="flex items-start gap-2 font-display text-lg font-bold text-navy">
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-red-700" aria-hidden />
          Vos commandes n’ont pas pu être chargées
        </p>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-mid">
          Rien n’est perdu : réessayez dans un instant.
        </p>
        <button onClick={() => query.refetch()} className="btn btn-primary mt-4 text-xs">
          <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const n = toutes.filter(f.match).length
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                active
                  ? 'bg-navy text-amber'
                  : 'border border-[rgba(31,42,55,0.08)] bg-paper text-ink-mid hover:border-amber'
              }`}
            >
              {f.label}
              {!query.isPending && (
                <span className={`ml-1.5 tabular-nums ${active ? 'text-amber' : 'text-ink-soft'}`}>
                  {n}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-3xl bg-paper" />
          ))}
        </div>
      ) : toutes.length === 0 ? (
        <div className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper px-6 py-14 text-center">
          <UtensilsCrossed className="mx-auto h-7 w-7 text-ink-soft" aria-hidden />
          <p className="mt-3 font-display text-lg font-bold text-navy">
            Aucune commande pour l’instant
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-mid">
            Choisissez un batch cooker et les plats que vous voulez retrouver dans
            votre frigo : votre première session apparaîtra ici.
          </p>
          <Link href="/espace-client/reservation" className="btn btn-primary mt-5 text-xs">
            Voir les cartes de la semaine
            <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : liste.length === 0 ? (
        <p className="py-16 text-center text-ink-soft">
          Aucune commande dans cette catégorie.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {liste.map((b, i) => (
            <OrderCard key={b.id} booking={b} index={i} />
          ))}
        </div>
      )}

      {/* Ce que l'API ne sait pas encore dire, plutôt qu'un chiffre inventé. */}
      {toutes.length > 0 && (
        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Le règlement d’une prestation n’est pas encore suivi par l’API : une
          commande n’affiche donc pas si elle est payée. Le reste à charge est une
          estimation à 50 %, au titre du service à la personne.
        </p>
      )}
    </div>
  )
}

function OrderCard({ booking: b, index }: { booking: Booking; index: number }) {
  const plats = bookingMealNames(b)
  const portions = bookingPortions(b)
  const ttc = euros(b.priceCents)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-[rgba(31,42,55,0.06)] bg-paper p-5 transition-colors hover:border-amber/50"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {b.reference && (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {b.reference}
            </p>
          )}
          <p className="mt-1 font-display text-lg font-bold capitalize text-navy">
            {longDate(b.startsAt) ?? 'Date à confirmer'}
          </p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
            STATUS_COLOR[b.status ?? ''] ?? 'bg-cream-deep text-navy'
          }`}
        >
          {bookingStatusText(b.status)}
        </span>
      </div>

      <ul className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-mid">
        {slot(b) && (
          <li className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber" aria-hidden /> {slot(b)}
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <CalendarRange className="h-3.5 w-3.5 text-amber" aria-hidden />
          {b.endsAt && b.startsAt
            ? `${Math.max(
                1,
                Math.round(
                  (new Date(b.endsAt).getTime() - new Date(b.startsAt).getTime()) / 3600000,
                ),
              )} h sur place`
            : 'Durée à confirmer'}
        </li>
        <li className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5 text-amber" aria-hidden />
          {plats.length > 0
            ? `${plats.length} plat${plats.length > 1 ? 's' : ''}`
            : 'Plats à définir'}
        </li>
        {portions > 0 && <li>{portions} portions</li>}
      </ul>

      {plats.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {plats.slice(0, 4).map((nom) => (
            <span key={nom} className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-navy">
              {nom}
            </span>
          ))}
          {plats.length > 4 && (
            <span className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] text-ink-soft">
              +{plats.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div>
          {ttc ? (
            <>
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">Total TTC</p>
              <p className="font-display text-2xl font-bold text-navy">{ttc}</p>
            </>
          ) : (
            <p className="text-[13px] text-ink-soft">Montant non communiqué</p>
          )}
        </div>
        <Link
          href={`/espace-client/commandes/${b.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-amber transition-colors hover:bg-navy-deep"
        >
          Détail
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {b.chefProfileId && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-[rgba(31,42,55,0.06)] pt-3 text-[11px] text-ink-soft">
          <ChefHat className="h-3.5 w-3.5" aria-hidden />
          Session avec votre batch cooker
        </p>
      )}
    </motion.div>
  )
}
