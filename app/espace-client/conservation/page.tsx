'use client'

import Link from 'next/link'
import { ChefHat, Flame, Info, MessageSquareQuote, Refrigerator } from 'lucide-react'
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import {
  longDate,
  useMissionRecipeSheet,
  useMyBookings,
  type Booking,
  type BookingMeal,
} from '@/lib/api/bookings'
import { useReheatModes } from '@/lib/api/referentials'
import { REHEAT_MODES, reheatingLine, storageLine } from '@/lib/recipe-fields'

/**
 * Réchauffage & conservation (CL-09), prestation par prestation.
 *
 * Jusqu'au 10/11 la page montrait des fiches d'exemple, dérivées des recettes.
 * Retour de test du 09/11 : ces consignes valent pour une prestation réalisée,
 * pas pour une recette dans l'absolu. On liste donc les prestations terminées
 * et, pour chaque plat cuisiné, les consignes de sa fiche **et** les notes que
 * le batch cooker a écrites pour cette prestation-là.
 *
 * Jamais la recette elle-même (§ 6.5) : seulement réchauffage et conservation.
 * La fiche n'est remise qu'après la prestation, d'où le filtre `completed`.
 */
export default function ConservationPage() {
  const q = useMyBookings({ status: 'completed', limit: 6 })
  const prestations = (q.data?.data ?? []).filter((b) => (b.meals?.length ?? 0) > 0)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
        <p className="text-xs text-mint-ink leading-relaxed">
          Les durées de conservation démarrent au jour de la prestation. Respectez la
          chaîne du froid : replacez au réfrigérateur dans les deux heures.
        </p>
      </div>

      {q.isPending ? (
        // Une prestation : sa date, puis des fiches à deux lignes (réchauffage, conservation).
        <SkeletonGroup>
          <Skeleton className="mb-3 h-5 w-56 bg-paper" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[0, 1].map((i) => (
              <SkeletonCard key={i} className="rounded-3xl lg:p-6">
                <Skeleton className="mb-4 h-7 w-40" />
                <div className="space-y-3">
                  <Skeleton className="h-[4.25rem] rounded-2xl" />
                  <Skeleton className="h-[4.25rem] rounded-2xl" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </SkeletonGroup>
      ) : q.isError ? (
        <p className="card-shell rounded-3xl p-6 text-sm text-ink-mid">
          Vos fiches n’ont pas pu être chargées. Réessayez dans un instant.
        </p>
      ) : prestations.length === 0 ? (
        <div className="card-shell rounded-3xl p-6">
          <p className="font-display text-lg font-bold text-navy">Pas encore de fiche</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-mid">
            Après chaque prestation terminée, vous retrouvez ici, plat par plat, comment
            réchauffer et conserver ce que votre batch cooker a cuisiné.
          </p>
          <Link href="/espace-client/commandes" className="btn btn-outline mt-4 text-xs">
            Voir mes sessions
          </Link>
        </div>
      ) : (
        prestations.map((b) => <Prestation key={b.id} booking={b} />)
      )}
    </div>
  )
}

function Prestation({ booking }: { booking: Booking }) {
  return (
    <section aria-labelledby={`presta-${booking.id}`}>
      <h2
        id={`presta-${booking.id}`}
        className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-navy first-letter:uppercase"
      >
        {longDate(booking.bookingDate ?? booking.startsAt)}
        {booking.chef?.displayName && (
          <span className="inline-flex items-center gap-1 font-normal text-ink-mid">
            <ChefHat className="h-3.5 w-3.5 text-amber-ink" aria-hidden /> {booking.chef.displayName}
          </span>
        )}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {booking.meals!.map((meal) => (
          <DishCare key={meal.mealId} bookingId={booking.id} meal={meal} />
        ))}
      </div>
    </section>
  )
}

function DishCare({ bookingId, meal }: { bookingId: string; meal: BookingMeal }) {
  const sheet = useMissionRecipeSheet(bookingId, meal.mealId)
  const modes = useReheatModes(REHEAT_MODES)
  const f = sheet.data

  const rechauffage = f ? reheatingLine(f.recipe.reheating, modes) : null
  const conservation = f ? storageLine(f.recipe.storage) : null
  const notes = f?.notes

  return (
    <article className="card-shell rounded-3xl p-5 lg:p-6">
      <h3 className="font-display text-lg font-bold text-navy mb-4">
        {f?.dish.name ?? meal.name ?? 'Plat'}
      </h3>

      {sheet.isPending ? (
        <SkeletonGroup className="space-y-3">
          <Skeleton className="h-[4.25rem] rounded-2xl" />
          <Skeleton className="h-[4.25rem] rounded-2xl" />
        </SkeletonGroup>
      ) : sheet.isError || !f ? (
        <p className="text-sm text-ink-mid">La fiche de ce plat n’est pas disponible.</p>
      ) : (
        <div className="space-y-3">
          <Ligne Icon={Flame} titre="Réchauffage" texte={rechauffage} />
          {f.recipe.reheating?.note && (
            <p className="-mt-1 pl-7 text-xs leading-relaxed text-ink-mid">{f.recipe.reheating.note}</p>
          )}
          <Ligne Icon={Refrigerator} titre="Conservation" texte={conservation} />

          {(notes?.reheating || notes?.storage) && (
            <div className="rounded-xl border border-amber/30 bg-amber-soft/40 px-3.5 py-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-navy">
                <MessageSquareQuote className="h-3.5 w-3.5 text-amber-ink" aria-hidden />
                Le mot de votre batch cooker, pour cette prestation
              </p>
              {notes.reheating && (
                <p className="text-xs leading-relaxed text-ink-mid">
                  <span className="font-semibold">Réchauffage — </span>
                  {notes.reheating}
                </p>
              )}
              {notes.storage && (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-mid">
                  <span className="font-semibold">Conservation — </span>
                  {notes.storage}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function Ligne({
  Icon,
  titre,
  texte,
}: {
  Icon: typeof Flame
  titre: string
  texte: string | null
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-cream-soft p-3.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${texte ? 'text-amber-ink' : 'text-ink-soft'}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-ink-soft">{titre}</p>
        <p className={`text-sm ${texte ? 'font-semibold text-navy' : 'text-ink-soft'}`}>
          {texte ?? 'Non précisé sur la fiche.'}
        </p>
      </div>
    </div>
  )
}
