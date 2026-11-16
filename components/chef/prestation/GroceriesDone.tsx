'use client'

import { useState } from 'react'
import { Check, Loader2, Pencil, ShoppingBag } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { apiMessage } from '@/lib/api/messages'
import { euros, longDate, useValidateGroceries, type Groceries } from '@/lib/api/bookings'

/* ─────────────────────────────────────────────────────────────────────────────
   « Courses faites » (Recettes lot 4, LF-0290).

   Les courses sont une étape que le batch cooker valide avant le jour de la
   prestation. Le total du ticket est facultatif (décision du 13/11) : il est
   montré au client à titre d'information, aucun paiement des courses ne passe
   par la plateforme pour l'instant. Confirmer de nouveau remplace le montant.
   ───────────────────────────────────────────────────────────────────────────── */

/** « 64,80 » ou « 64.8 » → 6480 ; vide → null ; illisible → NaN. */
function toCents(text: string): number | null {
  const clean = text.trim().replace(',', '.')
  if (!clean) return null
  const value = Number(clean)
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : Number.NaN
}

export default function GroceriesDone({
  missionId,
  groceries,
  open,
}: {
  missionId: string
  groceries?: Groceries
  /** La prestation est confirmée, en courses ou en cuisine : l'étape se valide. */
  open: boolean
}) {
  const validate = useValidateGroceries()
  const done = !!groceries?.validatedAt
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(
    groceries?.amountCents != null ? (groceries.amountCents / 100).toFixed(2).replace('.', ',') : '',
  )
  const cents = toCents(amount)
  const invalid = Number.isNaN(cents)

  const submit = () => {
    if (invalid) return
    validate.mutate({ missionId, amountCents: cents }, { onSuccess: () => setEditing(false) })
  }

  if (done && !editing) {
    return (
      <div className="mb-3 rounded-xl bg-mint/40 px-3 py-2.5">
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-mint-ink">
          <Check className="h-3.5 w-3.5" aria-hidden /> Courses faites
          <span className="font-normal first-letter:lowercase">
            le {longDate(groceries!.validatedAt)}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-ink-mid">
          {groceries!.amountCents != null
            ? `Ticket : ${euros(groceries!.amountCents)}, montré au client à titre d’information.`
            : 'Aucun montant de ticket saisi.'}
        </p>
        {open && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-deep hover:underline"
          >
            <Pencil className="h-3 w-3" aria-hidden /> Modifier le montant
          </button>
        )}
      </div>
    )
  }

  if (!open) return null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="mb-3 rounded-xl border border-[rgba(31,42,55,0.08)] px-3 py-2.5"
    >
      <p className="flex flex-wrap items-center gap-1 text-[13px] font-semibold text-navy">
        <ShoppingBag className="h-3.5 w-3.5 text-amber-deep" aria-hidden />
        Courses faites ?
        <InfoPopover label="À quoi sert cette étape ?">
          Les courses doivent être validées avant le jour de la prestation : un rappel
          vous est envoyé la veille tant que ce n’est pas fait. Le montant du ticket est
          facultatif. Il est montré au client à titre d’information : aucun paiement des
          courses ne passe par la plateforme pour l’instant.
        </InfoPopover>
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-ink-soft">
            Total du ticket, en euros (facultatif)
          </span>
          <input
            id={`groceries-amount-${missionId}`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="64,80"
            aria-invalid={invalid}
            className="input-base w-32"
          />
        </label>
        <button
          type="submit"
          disabled={invalid || validate.isPending}
          className="btn btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {validate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          {done ? 'Enregistrer' : 'Courses faites'}
        </button>
        {editing && (
          <button type="button" onClick={() => setEditing(false)} className="btn btn-outline px-3 py-1.5 text-xs">
            Annuler
          </button>
        )}
      </div>
      {invalid && (
        <p role="alert" className="mt-1.5 text-xs text-red-700">
          Écrivez un montant en euros, par exemple 64,80.
        </p>
      )}
      {validate.isError && (
        <p role="alert" className="mt-1.5 text-xs text-red-700">
          {apiMessage(validate.error, 'Les courses n’ont pas pu être validées.')}
        </p>
      )}
    </form>
  )
}
