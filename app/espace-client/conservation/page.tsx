'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  CalendarClock,
  ChefHat,
  Download,
  Flame,
  Info,
  Loader2,
  MessageSquareQuote,
  Refrigerator,
  Snowflake,
} from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import {
  longDate,
  useConservation,
  useConservationPdf,
  useMyBookings,
  type Booking,
  type ConservationDish,
} from '@/lib/api/bookings'
import { useReheatModes } from '@/lib/api/referentials'
import { REHEAT_MODES, reheatingLine, storageLine } from '@/lib/recipe-fields'

/**
 * Réchauffage & conservation (CL-09), prestation par prestation.
 *
 * Recettes lot 3 (LF-0275) : la fiche vient de `GET /chef-missions/{id}/conservation`.
 * Pour chaque plat, la date « à manger avant » (celle du batch cooker, sinon
 * celle proposée), comment le conserver, le congeler et le réchauffer, et le mot
 * du batch cooker. Jamais la recette elle-même : ni quantités ni étapes.
 *
 * La fiche est remise une fois les plats livrés (décision du 13/11) : on liste les
 * prestations `delivered` et `completed`.
 */
export default function ConservationPage() {
  const delivered = useMyBookings({ status: 'delivered', limit: 6 })
  const completed = useMyBookings({ status: 'completed', limit: 6 })
  const prestations = [...(delivered.data?.data ?? []), ...(completed.data?.data ?? [])]
    .filter((b) => (b.meals?.length ?? 0) > 0)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, 6)
  const pending = delivered.isPending || completed.isPending
  const failed = delivered.isError && completed.isError

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
        <p className="text-xs text-mint-ink leading-relaxed">
          Les durées de conservation démarrent au jour de la prestation. Respectez la
          chaîne du froid : replacez au réfrigérateur dans les deux heures.
        </p>
      </div>

      {pending ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl bg-cream-soft" />
          ))}
        </div>
      ) : failed ? (
        <p className="card-shell rounded-3xl p-6 text-sm text-ink-mid">
          Vos fiches n’ont pas pu être chargées. Réessayez dans un instant.
        </p>
      ) : prestations.length === 0 ? (
        <div className="card-shell rounded-3xl p-6">
          <p className="font-display text-lg font-bold text-navy">Pas encore de fiche</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-mid">
            Dès que vos plats sont livrés, vous retrouvez ici, plat par plat, jusqu’à
            quand les manger et comment les réchauffer et les conserver.
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
  const sheet = useConservation(booking.id)
  const pdf = useConservationPdf()
  const day = booking.bookingDate ?? booking.startsAt.slice(0, 10)

  return (
    <section aria-labelledby={`presta-${booking.id}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          id={`presta-${booking.id}`}
          className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-navy first-letter:uppercase"
        >
          {longDate(booking.bookingDate ?? booking.startsAt)}
          {booking.chef?.displayName && (
            <span className="inline-flex items-center gap-1 font-normal text-ink-mid">
              <ChefHat className="h-3.5 w-3.5 text-amber" aria-hidden /> {booking.chef.displayName}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => pdf.mutate({ missionId: booking.id, day })}
          disabled={pdf.isPending || !sheet.data}
          className="btn btn-outline text-xs"
        >
          {pdf.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          Télécharger la fiche (PDF)
        </button>
      </div>
      {pdf.isError && (
        <p role="alert" className="mb-3 text-xs text-red-700">
          Le PDF n’a pas pu être téléchargé. Réessayez dans un instant.
        </p>
      )}

      {sheet.isPending ? (
        <div className="h-40 animate-pulse rounded-3xl bg-cream-soft" />
      ) : sheet.isError || !sheet.data ? (
        <p className="card-shell rounded-3xl p-5 text-sm text-ink-mid">
          La fiche de cette prestation n’est pas disponible pour l’instant.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sheet.data.dishes.map((dish) => (
            <DishCare key={dish.mealId} dish={dish} />
          ))}
        </div>
      )}
    </section>
  )
}

/** « lundi 23 novembre », lu comme un jour de calendrier (pas d'heure, pas de fuseau). */
const dayLabel = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

function DishCare({ dish }: { dish: ConservationDish }) {
  const modes = useReheatModes(REHEAT_MODES)
  const rechauffage = reheatingLine(dish.reheating ?? undefined, modes)
  const conservation = storageLine(
    dish.storage?.method
      ? {
          method: dish.storage.method,
          days: dish.storage.days ?? 0,
          container: dish.storage.container ?? null,
        }
      : undefined,
  )
  const congelation =
    dish.storage?.freezable === true
      ? [
          dish.storage.freezerMonths ? `Jusqu’à ${dish.storage.freezerMonths} mois` : null,
          dish.storage.thawing,
        ]
          .filter(Boolean)
          .join(' · ') || 'Se congèle'
      : null
  const { eatBefore, notes } = dish

  return (
    <article className="card-shell rounded-3xl p-5 lg:p-6">
      <h3 className="font-display text-lg font-bold text-navy mb-4">{dish.name}</h3>

      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-2xl bg-amber-soft/50 p-3.5">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-soft">
              À manger avant
              <InfoPopover label="Comment cette date est-elle fixée ?">
                Date calculée par la plateforme à partir du jour de la prestation et de
                la durée de conservation de la recette. Votre batch cooker peut l’ajuster
                selon ce qu’il a cuisiné.
              </InfoPopover>
            </p>
            <p className="text-sm font-semibold text-navy first-letter:uppercase">
              {eatBefore.date ? dayLabel(eatBefore.date) : 'Demandez-la à votre batch cooker'}
            </p>
            {eatBefore.fridgeAlert && (
              <p className="mt-1 flex items-start gap-1 text-xs text-[#8B6200]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Plus de {eatBefore.fridgeDays} jours au réfrigérateur : vérifiez l’aspect et
                l’odeur avant de consommer.
              </p>
            )}
          </div>
        </div>

        <Ligne Icon={Refrigerator} titre="Conservation" texte={conservation} />
        {congelation && <Ligne Icon={Snowflake} titre="Congélation" texte={congelation} />}
        <Ligne Icon={Flame} titre="Réchauffage" texte={rechauffage} />
        {dish.reheating?.note && (
          <p className="-mt-1 pl-7 text-xs leading-relaxed text-ink-mid">{dish.reheating.note}</p>
        )}

        {(notes.reheating || notes.storage) && (
          <div className="rounded-xl border border-amber/30 bg-amber-soft/40 px-3.5 py-2.5">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-navy">
              <MessageSquareQuote className="h-3.5 w-3.5 text-amber-deep" aria-hidden />
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
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${texte ? 'text-terra' : 'text-ink-soft'}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-ink-soft">{titre}</p>
        <p className={`text-sm ${texte ? 'font-semibold text-navy' : 'text-ink-soft'}`}>
          {texte ?? 'Non précisé sur la fiche.'}
        </p>
      </div>
    </div>
  )
}
