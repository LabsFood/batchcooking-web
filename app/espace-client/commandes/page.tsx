'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarRange, Filter } from 'lucide-react'
import {
  DASHBOARD_ORDERS,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from '@/lib/dashboard-mock'

const FILTERS: { id: 'all' | OrderStatus; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'En attente' },
  { id: 'confirmed', label: 'À venir' },
  { id: 'delivered', label: 'Livrées' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'bg-amber-soft text-amber-deep',
  confirmed: 'bg-mint text-mint-ink',
  shopping: 'bg-mint text-mint-ink',
  cooking: 'bg-amber text-navy',
  delivered: 'bg-cream-deep text-navy',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrdersListPage() {
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')

  const orders = DASHBOARD_ORDERS.filter((o) => (filter === 'all' ? true : o.status === filter))

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-navy text-amber'
                  : 'bg-paper text-ink-mid border border-[rgba(31,42,55,0.08)] hover:border-amber'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-paper border border-[rgba(31,42,55,0.08)] text-xs text-ink-mid">
          <Filter className="w-3.5 h-3.5" /> Trier
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {orders.map((o, i) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)] hover:border-amber/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-soft">
                  {o.reference}
                </p>
                <p className="font-display text-lg font-bold text-navy mt-1 truncate">
                  Formule {o.formula}
                </p>
              </div>
              <span
                className={`text-[10px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLOR[o.status]}`}
              >
                {ORDER_STATUS_LABEL[o.status]}
              </span>
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4 text-xs text-ink-mid">
              <li className="flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5 text-amber" /> {formatDate(o.date)}</li>
              <li>{o.timeSlot}</li>
              <li>Chef · {o.chef.split(' ')[0]}</li>
              <li>{o.meals.length} plats · {o.persons} pers.</li>
            </ul>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">Total TTC</p>
                <p className="font-display text-2xl font-bold text-navy">{o.amountTTC} €</p>
                <p className="text-[11px] text-amber font-semibold">soit {o.amountAfterTax} € après crédit d&apos;impôt</p>
              </div>
              <Link
                href={`/espace-client/commandes/${o.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-navy text-amber font-semibold text-xs hover:bg-navy-deep transition-colors"
              >
                Détail
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        ))}
        {orders.length === 0 && (
          <div className="lg:col-span-2 text-center py-16 text-ink-soft">
            Aucune commande dans cette catégorie pour l&apos;instant.
          </div>
        )}
      </div>
    </div>
  )
}
