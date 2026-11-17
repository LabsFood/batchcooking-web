'use client'

import { Skeleton } from '@/components/shared/Skeleton'
import { useState } from 'react'
import { AlertTriangle, Check, Loader2, Pencil, RotateCcw, X } from 'lucide-react'
import { Card } from '@/components/chef/ChefPage'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { apiMessage } from '@/lib/api/messages'
import {
  useConservation,
  useSetEatBefore,
  type Booking,
  type ConservationDish,
} from '@/lib/api/bookings'

/* ─────────────────────────────────────────────────────────────────────────────
   Dates « à manger avant » (Recettes lot 3, LF-0274).

   La plateforme propose une date par plat : le jour de la prestation plus les
   jours au frais de la recette figée. Le batch cooker la corrige jusqu'à 24 h
   après la fin de la prestation (décision du 13/11) ; chaque changement est
   gardé. Au-delà du seuil de la console (4 jours par défaut), une alerte —
   jamais un blocage. L'API reste l'autorité : elle refuse ce qui sort des bornes.
   ───────────────────────────────────────────────────────────────────────────── */

const EDIT_HOURS_AFTER = 24

/** « lun. 23 nov. », lu comme un jour de calendrier. */
const shortDay = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

export default function EatBeforeCard({ booking }: { booking: Booking }) {
  const sheet = useConservation(booking.id)
  // Une seule lecture de l'heure, au montage : l'API tranche de toute façon.
  const [maintenant] = useState(() => Date.now())
  const open = maintenant < new Date(booking.endsAt).getTime() + EDIT_HOURS_AFTER * 3_600_000
  const firstDay = booking.bookingDate ?? booking.startsAt.slice(0, 10)

  return (
    <Card
      title="Dates « à manger avant »"
      action={
        <InfoPopover label="Comment ces dates sont-elles fixées ?">
          Date calculée par la plateforme : le jour de la prestation plus la durée de
          conservation de la recette. Vous pouvez la modifier jusqu’à 24 h après la fin
          de la prestation ; chaque changement est enregistré. Au-delà de{' '}
          {sheet.data?.fridgeAlertDays ?? 4} jours au frais, une alerte s’affiche, sans
          rien bloquer.
        </InfoPopover>
      }
    >
      {sheet.isPending ? (
        <Skeleton className="h-24 rounded-2xl"/>
      ) : sheet.isError || !sheet.data ? (
        <p className="text-sm text-ink-mid">
          {apiMessage(sheet.error, 'Les dates n’ont pas pu être lues.')}
        </p>
      ) : (sheet.data.dishes ?? []).length === 0 ? (
        <p className="text-sm text-ink-mid">Aucun plat dans cette prestation.</p>
      ) : (
        <>
          <ul className="divide-y divide-[rgba(31,42,55,0.07)]">
            {(sheet.data.dishes ?? []).map((dish) => (
              <DateRow
                key={dish.mealId}
                missionId={booking.id}
                dish={dish}
                open={open}
                firstDay={firstDay}
              />
            ))}
          </ul>
          {!open && (
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              Les dates ne se modifient plus : 24 h sont passées depuis la fin de la
              prestation.
            </p>
          )}
        </>
      )}
    </Card>
  )
}

function DateRow({
  missionId,
  dish,
  open,
  firstDay,
}: {
  missionId: string
  dish: ConservationDish
  open: boolean
  firstDay: string
}) {
  const save = useSetEatBefore()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(dish.eatBefore.date ?? '')
  const e = dish.eatBefore

  const submit = (date: string | null) =>
    save.mutate(
      { missionId, dishId: dish.mealId, date },
      { onSuccess: () => setEditing(false) },
    )

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">{dish.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-mid">
            {e.date ? (
              <>
                À manger avant le <span className="font-semibold text-navy">{shortDay(e.date)}</span>
                {e.fridgeDays !== null && ` · ${e.fridgeDays} j au frais`}
                {e.setByChef ? ' · votre date' : ' · date proposée'}
              </>
            ) : (
              'La recette ne donne pas de durée au frais : fixez la date vous-même.'
            )}
          </p>
          {e.fridgeAlert && (
            <p className="mt-1 flex items-start gap-1 text-xs text-[#8B6200]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Plus de {e.fridgeDays} jours au frais : le client verra une alerte.
            </p>
          )}
        </div>
        {open && !editing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setValue(e.date ?? firstDay)
                setEditing(true)
              }}
              className="btn btn-outline px-3 py-1.5 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
            </button>
            {e.setByChef && (
              <button
                type="button"
                onClick={() => submit(null)}
                disabled={save.isPending}
                className="btn btn-outline px-3 py-1.5 text-xs"
                title={e.proposed ? `Date proposée : ${shortDay(e.proposed)}` : undefined}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Date proposée
              </button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <form
          onSubmit={(ev) => {
            ev.preventDefault()
            if (value) submit(value)
          }}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <label className="sr-only" htmlFor={`eat-${dish.mealId}`}>
            À manger avant, pour {dish.name}
          </label>
          <input
            id={`eat-${dish.mealId}`}
            type="date"
            min={firstDay}
            value={value}
            onChange={(ev) => setValue(ev.target.value)}
            className="input-base w-auto"
            required
          />
          <button type="submit" disabled={save.isPending || !value} className="btn btn-primary text-xs">
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Enregistrer
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn btn-outline text-xs">
            <X className="h-3.5 w-3.5" aria-hidden /> Annuler
          </button>
        </form>
      )}
      {save.isError && (
        <p role="alert" className="mt-1.5 text-xs text-red-700">
          {apiMessage(save.error, 'La date n’a pas pu être enregistrée.')}
        </p>
      )}
    </li>
  )
}
