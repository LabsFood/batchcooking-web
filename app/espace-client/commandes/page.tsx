'use client'

import { Onglets } from '@/components/shared/Onglets'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/motion'
import { AllergyBadge } from '@/components/shared/AllergyStatus'
import { Prix } from '@/components/shared/Prix'
import {
  AlertTriangle,
  ArrowRight,
  ChefHat,
  Clock,
  Info,
  MapPin,
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
   Mes commandes — `GET /me/bookings`.

   La route a changé le 16/10 : `/bookings/me` servait le client et le batch
   cooker, elle est dépréciée. `/me/bookings` est la vue du client, paginée et
   filtrable, et elle rend bien plus : l'adresse, le nom du batch cooker, le
   créneau déjà calculé dans le bon fuseau, ce qui a été payé — et
   `amountAfterTax`, le reste à charge après crédit d'impôt.

   Ce dernier point compte : on affichait une estimation à 50 % calculée ici,
   faute de mieux. C'est l'API qui le dit maintenant, et c'est elle qui a
   raison — une formule peut avoir son propre prix après crédit.

   Une commande `pending` n'est pas confirmée : **c'est le paiement qui
   confirme**, et le créneau n'est tenu que 72 h. La carte le dit, avec le
   chemin pour régler.
   ───────────────────────────────────────────────────────────────────────────── */

type Filter = 'all' | 'open' | 'history'

const FILTERS: { id: Filter; label: string; match: (b: Booking) => boolean }[] = [
  { id: 'all', label: 'Toutes', match: () => true },
  { id: 'open', label: 'À venir', match: isBookingOpen },
  { id: 'history', label: 'Passées', match: (b) => !isBookingOpen(b) },
]

/** La famille d'état d'une session : les mêmes étiquettes que sur l'accueil. */
const STATUS_TONE: Record<string, string> = {
  pending: 'status-warn',
  confirmed: 'status-ok',
  shopping: 'status-ok',
  cooking: 'status-ok',
  delivered: '',
  completed: '',
  cancelled: 'status-bad',
  disputed: 'status-bad',
}

export default function OrdersListPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const query = useMyBookings({ limit: 50 })

  const toutes = query.data?.data ?? []
  const liste = toutes.filter(FILTERS.find((f) => f.id === filter)!.match)
  const aRegler = toutes.filter((b) => b.status === 'pending')

  if (query.isError) {
    return (
      <div className="rounded-2xl card-shell p-6">
        <p className="flex items-start gap-2 font-display text-lg font-bold text-navy">
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-red-700" aria-hidden />
          Vos sessions n’ont pas pu être chargées
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
      <Onglets
        label="Filtrer mes sessions"
        value={filter}
        onChange={setFilter}
        items={FILTERS.map((f) => ({
          id: f.id,
          label: f.label,
          count: query.isPending ? undefined : toutes.filter(f.match).length,
        }))}
      />

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-paper" />
          ))}
        </div>
      ) : toutes.length === 0 ? (
        <div className="rounded-2xl card-shell px-6 py-14 text-center">
          <UtensilsCrossed className="mx-auto h-7 w-7 text-ink-soft" aria-hidden />
          <p className="mt-3 font-display text-lg font-bold text-navy">
            Aucune session pour l’instant
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
          Aucune session dans cette catégorie.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {liste.map((b, i) => (
            <OrderCard key={b.id} booking={b} index={i} />
          ))}
        </div>
      )}

      {aRegler.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-soft/60 px-4 py-3 text-[13px] leading-relaxed text-[#8B6200]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {aRegler.length === 1
            ? 'Une session attend son règlement : c’est le paiement qui la confirme, et le créneau n’est tenu que 72 heures.'
            : `${aRegler.length} sessions attendent leur règlement : c’est le paiement qui les confirme, et le créneau n’est tenu que 72 heures.`}
        </p>
      )}
    </div>
  )
}

function OrderCard({ booking: b, index }: { booking: Booking; index: number }) {
  const plats = bookingMealNames(b)
  const portions = bookingPortions(b)
  const ttc = euros(b.amountTtc ?? b.priceCents)
  const reste = euros(b.amountAfterTax)
  const aRegler = b.status === 'pending'

  return (
    <motion.div
      // slow-out : la carte se pose en 240 ms, décalée de 40 ms par rang
      {...fadeUp(Math.min(index * 0.04, 0.16))}
      className="panel flex flex-col p-5 transition-colors hover:border-[var(--line-strong)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {b.reference && (
            <p className="font-mono text-xs text-ink-soft">{b.reference}</p>
          )}
          <p className="mt-0.5 font-display text-lg font-bold cap-first text-navy">
            {longDate(b.startsAt) ?? 'Date à confirmer'}
          </p>
        </div>
        <span className={`status shrink-0 ${b.withdrawnAt ? 'status-bad' : (STATUS_TONE[b.status ?? ''] ?? '')}`}>
          {b.withdrawnAt ? 'Rétractée' : aRegler ? 'À régler' : bookingStatusText(b.status)}
        </span>
      </div>

      {b.allergyCheck === 'unverified' && (
        <div className="mb-3">
          <AllergyBadge check={b.allergyCheck} reasons={b.allergyCheckReasons} />
        </div>
      )}

      {/* Les icônes repèrent, elles ne décorent pas : l'ambre reste au prix et au bouton. */}
      <ul className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm tabular-nums text-ink-mid">
        {slot(b) && (
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden /> {slot(b)}
          </li>
        )}
        {b.chef?.displayName && (
          <li className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden /> {b.chef.displayName}
          </li>
        )}
        <li className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
          {plats.length > 0
            ? `${plats.length} plat${plats.length > 1 ? 's' : ''}`
            : 'Plats à définir'}
          {portions > 0 && ` · ${portions} portions`}
        </li>
        {b.city && (
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden /> {b.city}
          </li>
        )}
      </ul>

      {plats.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {plats.slice(0, 4).map((nom) => (
            <span key={nom} className="rounded-lg bg-cream-soft px-2.5 py-1 text-xs text-navy">
              {nom}
            </span>
          ))}
          {plats.length > 4 && (
            <span className="rounded-lg bg-cream-soft px-2.5 py-1 text-xs tabular-nums text-ink-soft">
              +{plats.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Le pied se cale en bas : deux cartes côte à côte alignent leurs prix. */}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[var(--line)] pt-4">
        {ttc || reste ? (
          <Prix apresCredit={reste} total={ttc} />
        ) : (
          <p className="text-sm text-ink-soft">Montant non communiqué</p>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/espace-client/commandes/${b.id}`} className="btn btn-outline">
            Détail
          </Link>
          {/* Le seul bouton plein de la carte : ce qui demande un geste. */}
          {aRegler && (
            <Link href={`/espace-client/commandes/${b.id}/paiement`} className="btn btn-amber">
              Régler
              <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      {aRegler && (
        <p className="mt-3 text-xs leading-relaxed text-ink-soft">
          Le créneau est tenu 72 h, puis la réservation est annulée.
        </p>
      )}
    </motion.div>
  )
}
