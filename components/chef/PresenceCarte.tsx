'use client'

import Link from 'next/link'
import { CalendarCheck, CheckCircle2, Info } from 'lucide-react'
import { useServiceOffers } from '@/lib/api/service-offers'
import { useOwnSlots } from '@/lib/api/agenda'
import { semaineCourte, semainesAVenir } from '@/lib/api/menus'

/* ─────────────────────────────────────────────────────────────────────────────
   « Pourquoi je n'apparais pas sur la carte de cette semaine ? »

   La question est arrivée dès la première formule créée, et la réponse n'était
   écrite nulle part. Elle tient en deux règles de l'API, qui se combinent mal
   si on ne les connaît pas :

   - la carte d'une semaine ne montre que ceux **qui ne sont pas complets** ;
   - « complet » veut dire : aucune session entière ne tient encore, à la durée
     de votre formule la plus courte.

   Avant toute formule, un batch cooker était affiché en permanence, dans la
   catégorie « sur demande ». En créant la sienne il est passé à « affiché
   quand il reste de la place, et réservable » — ce qui est mieux, mais ce qui
   le fait disparaître les fins de semaine. Sans explication, il croit à une
   panne ou à une sanction.

   On ne montre rien quand tout va bien : un bandeau qui répète « vous êtes
   visible » devient du bruit en trois jours.
   ───────────────────────────────────────────────────────────────────────────── */

export default function PresenceCarte() {
  const offres = useServiceOffers()
  const actives = (offres.data ?? []).filter((o) => o.active)

  /* La plus courte : c'est elle qui décide, puisqu'il suffit qu'une seule
     session tienne pour ne pas être complet. */
  const plusCourte = actives.reduce(
    (min, o) => Math.min(min, o.durationMinutes),
    Number.POSITIVE_INFINITY,
  )

  const [cette, suivante] = semainesAVenir(new Date(), 2)
  const fin = finDeSemaine(cette)

  const creneaux = useOwnSlots(
    actives.length > 0 ? cette : undefined,
    actives.length > 0 ? fin : undefined,
    Number.isFinite(plusCourte) ? plusCourte : 0,
  )

  // Sans formule, la question ne se pose pas : on reste affiché « sur demande ».
  if (actives.length === 0 || creneaux.isPending || creneaux.isError) return null

  const libres = creneaux.data?.slots.length ?? 0
  if (libres > 0) return null

  const heures = plusCourte / 60

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber/40 bg-amber-soft/60 p-4">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-navy">
          Vous n’apparaissez pas sur la carte de cette semaine
        </p>
        <p className="mt-1 leading-relaxed text-ink-mid">
          Il ne reste plus de créneau de {heures} h d’ici dimanche, et la carte
          ne montre que les batch cookers qui ont encore de la place. Rien n’est
          cassé&nbsp;: vous êtes bien en ligne, et vous réapparaissez{' '}
          <span className="font-semibold text-navy">
            la semaine du {semaineCourte(suivante).split(' – ')[0]}
          </span>
          .
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Pour être visible plus souvent&nbsp;: ouvrez des créneaux, ou créez une
          formule plus courte.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/espace-chef/agenda" className="btn btn-outline text-xs">
            Mes disponibilités
          </Link>
          <Link href="/espace-chef/tarifs" className="btn btn-outline text-xs">
            Mes formules
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Le dimanche de la semaine commencée ce lundi, en `AAAA-MM-JJ`. */
function finDeSemaine(lundi: string): string {
  const d = new Date(`${lundi}T00:00:00`)
  d.setDate(d.getDate() + 6)
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mois}-${jour}`
}

/* ── Le pendant positif, pour l'écran des formules ─────────────────────────── */

/**
 * Sur l'écran des tarifs, la question se pose dans l'autre sens : « qu'est-ce
 * que ça change de créer une formule ? ». Elle change deux choses à la fois,
 * et la seconde surprend.
 */
export function CeQueChangeUneFormule({ aUneOffre }: { aUneOffre: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-cream-soft p-4">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink"
        aria-hidden
      />
      <div className="min-w-0 text-[13px] leading-relaxed text-ink-mid">
        {aUneOffre ? (
          <>
            <span className="font-semibold text-navy">
              Vos clients peuvent vous réserver en ligne.
            </span>{' '}
            En contrepartie, la carte de la semaine ne vous montre que lorsqu’il
            vous reste un créneau entier à la durée de votre formule la plus
            courte. Une semaine complète vous retire de la carte — c’est bon
            signe, et vous revenez la semaine suivante.
          </>
        ) : (
          <>
            <span className="font-semibold text-navy">
              Sans formule, vous êtes affiché « sur demande ».
            </span>{' '}
            Visible en permanence, mais personne ne peut réserver sans vous
            écrire. Créez-en une et vous devenez réservable en ligne — la carte
            ne vous montrera alors que les semaines où il vous reste de la
            place.
          </>
        )}
      </div>
    </div>
  )
}
