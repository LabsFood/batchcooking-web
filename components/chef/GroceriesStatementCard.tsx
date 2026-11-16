'use client'

import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { apiMessage } from '@/lib/api/messages'
import { euros, useGroceriesStatement } from '@/lib/api/groceries'

/* ─────────────────────────────────────────────────────────────────────────────
   Le relevé mensuel des courses remboursées (Recettes, lot 6).

   La commission de 15 % porte sur la prestation, les suppléments et le forfait
   courses ; jamais sur les courses elles-mêmes, remboursées au centime sur les
   tickets. Une reprise URSSAF vous rend la commission par un avoir.
   ───────────────────────────────────────────────────────────────────────────── */

const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function GroceriesStatementCard() {
  const [month, setMonth] = useState(thisMonth)
  const statement = useGroceriesStatement(month)
  const s = statement.data

  return (
    <section className="rounded-3xl card-shell p-6">
      <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-navy">
        <Receipt className="h-5 w-5 text-amber" aria-hidden /> Courses remboursées
        <InfoPopover label="Quelle commission sur les courses ?">
          Aucune. La commission de 15 % porte sur la prestation, les suppléments et le forfait
          courses. Les courses vous sont remboursées au centime sur vos tickets. Si l’URSSAF reprend
          une prestation, la commission vous est rendue par un avoir, déduit de votre prochaine
          facture de commission.
        </InfoPopover>
      </h3>
      <label className="mt-3 inline-flex items-center gap-2 text-[12px] text-ink-mid">
        Mois
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="input-base py-1 text-xs" />
      </label>
      {statement.isPending ? (
        <div className="mt-3 h-16 animate-pulse rounded-2xl bg-cream-soft" />
      ) : statement.isError ? (
        <p className="mt-3 text-[13px] text-ink-soft">{apiMessage(statement.error)}</p>
      ) : !s || s.rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-soft">Aucunes courses prélevées ce mois-ci.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5 text-[13px]">
            {s.rows.map((row) => (
              <li key={row.bookingId} className="flex flex-wrap justify-between gap-2 rounded-xl bg-cream-soft px-3 py-2">
                <span className="text-navy">
                  {row.reference ?? 'Prestation'} · {new Date(row.startsAt).toLocaleDateString('fr-FR')}
                </span>
                <span className="tabular-nums text-ink-mid">
                  {euros(row.reimbursedCents)}
                  {row.refundedCents > 0 && ` (dont ${euros(row.refundedCents)} rendus au client)`}
                  {row.instantPayoutFeeCents > 0 && ` · frais instantané ${euros(row.instantPayoutFeeCents)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm font-semibold text-navy">
            Total remboursé : {euros(s.totals.reimbursedCents)} · commission : {euros(0)}
          </p>
        </>
      )}
    </section>
  )
}
