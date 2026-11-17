'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MessageCircle, TriangleAlert } from 'lucide-react'
import ChefPage from '@/components/chef/ChefPage'
import {
  DOC_STATUS_LABEL as API_DOC_STATUS_LABEL,
  DOSSIER_LABEL,
  useChefApplication,
  useChefDocuments,
  type ChefDocument,
  type DossierStatus,
} from '@/lib/api/chef-documents'
import { useMeProfile } from '@/lib/api/me-profile'
import type { ChefProfile } from '@/lib/api/types'
import PresenceCarte from '@/components/chef/PresenceCarte'
import {
  bookingStatusText,
  hour,
  isBookingOpen,
  longDate,
  useChefBookings,
  type Booking,
} from '@/lib/api/bookings'
import { useChefQuotes } from '@/lib/api/quotes'
import { moneyCents } from '@/lib/api/chef-money'
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import { MICRO_ALERT_RATIO, MICRO_CEILING_EUR } from '@/lib/chef/states'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Accueil batch cooker.

   Même ordre que l'accueil client, vu de l'autre côté de la table : ce qui
   bloque d'abord (la vitrine hors ligne, une pièce du dossier), puis ce qui
   arrive (la prochaine prestation), puis ce qu'il y a à faire (les demandes à
   chiffrer, la semaine) et ce que ça rapporte.

   Les chiffres viennent des mêmes routes que les écrans qu'ils résument : des
   prestations et des devis réels. L'écran affichait auparavant un score de
   dossier calculé sur des données d'exemple ; il a disparu avec elles.
   ───────────────────────────────────────────────────────────────────────────── */

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`
const JOUR_MS = 86_400_000

/** Ce que le batch cooker doit retenir de son dossier, en une phrase. */
const DOSSIER_LEAD: Record<DossierStatus, string> = {
  draft: 'Vos pièces obligatoires n’ont pas encore été déposées.',
  incomplete: 'Une pièce obligatoire manque ou a été refusée.',
  reviewing: 'Tout est déposé, notre équipe vérifie — 48 h ouvrées.',
  'awaiting-registration': 'Il ne manque que votre immatriculation.',
  validated: 'Dossier complet. Pensez aux échéances de vos pièces.',
  suspended: 'Une pièce a expiré : votre vitrine est hors ligne.',
  disabled: 'Votre compte a été désactivé par notre équipe.',
}

/** Un dossier qui bloque se voit ; un dossier qui avance se lit. */
const DOSSIER_URGENT = new Set<DossierStatus>(['incomplete', 'suspended', 'disabled'])

const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** « Aujourd'hui », « Demain », « Dans 4 jours » — en jours de calendrier. */
function echeance(iso: string, maintenant: Date): string {
  const debut = new Date(iso)
  const a = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
  const b = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate())
  const n = Math.round((b.getTime() - a.getTime()) / JOUR_MS)
  if (n <= 0) return 'Aujourd’hui'
  if (n === 1) return 'Demain'
  return `Dans ${n} jours`
}

export default function ChefHomePage() {
  /* Une seule lecture de l'heure, au montage : comparer des dates pendant le
     rendu avec `Date.now()` rendrait l'écran impur. */
  const [maintenant] = useState(() => new Date())
  const dossier = useChefDocuments()
  const application = useChefApplication()
  const profil = useMeProfile()

  /*
   * `disabled` veut dire deux choses que l'API ne distingue pas : mis hors
   * ligne par sanction, ou tout juste approuvé et pas encore publié —
   * approuver vérifie le batch cooker sans le rendre réservable. Le profil
   * tranche, et évite d'annoncer une sanction à quelqu'un qu'on vient
   * d'accepter.
   */
  const moi =
    profil.data?.profileType === 'chef' ? (profil.data.profile as ChefProfile | null) : null
  const attendMiseEnLigne =
    dossier.data?.dossierStatus === 'disabled' &&
    (moi?.isVerified === true || application.data?.status === 'approved') &&
    moi?.isActive !== true

  const bookings = useChefBookings()
  const quotes = useChefQuotes()

  const prestations = bookings.data?.data ?? []
  const aVenir = prestations
    .filter((b) => isBookingOpen(b) && new Date(b.startsAt) >= maintenant)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const prochaine = aVenir[0] ?? null

  const annee = maintenant.getFullYear()
  // Ce qui est entré, pas ce que la prestation rapportera une fois payée en entier.
  const payees = prestations.filter(
    (b) => b.paidCents && new Date(b.startsAt).getFullYear() === annee,
  )
  const reglees = payees.filter((b) => b.commissionEstimated === false)
  const netAnnee = payees.reduce((n, b) => n + (b.collectedNetCents ?? 0), 0)
  const netMois = payees
    .filter((b) => new Date(b.startsAt).getMonth() === maintenant.getMonth())
    .reduce((n, b) => n + (b.collectedNetCents ?? 0), 0)

  /** Les demandes qui attendent une offre de ma part. */
  const aRepondre = (quotes.data ?? []).filter((q) =>
    ['submitted', 'in_review', 'declined'].includes(q.status),
  )

  const ceilingRatio = netAnnee / 100 / MICRO_CEILING_EUR
  const ceilingAlert = ceilingRatio >= MICRO_ALERT_RATIO

  const prenom = (profil.data?.user.fullName ?? '').split(' ')[0]

  return (
    <ChefPage
      title={prenom ? `Bonjour ${prenom}` : 'Accueil'}
      subtitle="Ce qui arrive, ce qui attend, ce qui est entré."
    >
      <div className="space-y-6">
        {/* « Pourquoi je n'apparais plus ? » — avant tout le reste. */}
        <PresenceCarte />

        {/* État du dossier — la seule chose qui puisse bloquer une prestation */}
        <DossierCard
          status={dossier.data?.dossierStatus}
          documents={dossier.data?.documents ?? []}
          loading={dossier.isPending}
          attendMiseEnLigne={attendMiseEnLigne}
        />

        {/* ── Ce qui arrive ───────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-3xl bg-navy text-white">
          {bookings.isPending ? (
            <SkeletonGroup className="p-6 lg:p-8">
              <Skeleton className="h-6 w-44 bg-white/10" />
              <Skeleton className="mt-4 h-10 w-3/4 bg-white/10" />
              <Skeleton className="mt-4 h-5 w-2/3 bg-white/10" />
              <Skeleton className="mt-6 h-8 w-full max-w-md rounded-full bg-white/10" />
            </SkeletonGroup>
          ) : prochaine ? (
            <ProchainePrestation b={prochaine} maintenant={maintenant} />
          ) : (
            <div className="p-6 lg:p-10">
              <h2 className="text-sm font-semibold text-white/70">Aucune prestation planifiée</h2>
              <p className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight lg:text-[2.5rem]">
                Votre agenda est libre
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                Les clients réservent sur vos créneaux ouverts. Plus vous en ouvrez, plus
                votre carte apparaît.
              </p>
              <Link href="/espace-chef/agenda" className="btn btn-amber mt-7">
                Ouvrir des créneaux
                <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* ── Demandes à chiffrer ─────────────────────────────────── */}
            <section className="panel overflow-hidden">
              <div className="panel-head pb-3">
                <h2 className="panel-title">
                  Demandes à chiffrer
                  {aRepondre.length > 0 && (
                    <span className="ml-2 align-middle font-sans text-sm font-semibold tabular-nums text-ink-soft">
                      {aRepondre.length}
                    </span>
                  )}
                </h2>
                <Link href="/espace-chef/offres" className="panel-link hit">
                  Tout voir
                </Link>
              </div>

              {quotes.isPending ? (
                <SkeletonGroup className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 lg:px-6">
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-5 w-56 max-w-full" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-4 w-4" />
                    </div>
                  ))}
                </SkeletonGroup>
              ) : aRepondre.length === 0 ? (
                <p className="border-t border-[var(--line)] px-5 py-8 text-sm leading-relaxed text-ink-mid lg:px-6">
                  Aucune demande en attente. Une nouvelle demande sur-mesure s’affichera ici
                  dès qu’un client vous l’adresse.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                  {aRepondre.slice(0, 5).map((q) => (
                    <li key={q.id}>
                      <Link href="/espace-chef/offres" className="row-link group">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-navy">
                            {q.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs tabular-nums text-ink-soft">
                            {[
                              q.client?.name,
                              q.desiredDate
                                ? new Date(q.desiredDate).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                  })
                                : null,
                              q.persons ? `${q.persons} personnes` : null,
                              q.mealsCount ? `${q.mealsCount} plats` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        <span className="hidden text-sm font-semibold text-amber-ink sm:inline">
                          Composer une offre
                        </span>
                        {/* action secondaire : la flèche avance de 2 px */}
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-navy"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ── La semaine ──────────────────────────────────────────── */}
            <Semaine prestations={prestations} maintenant={maintenant} loading={bookings.isPending} />
          </div>

          {/* ── Ce qui est entré ──────────────────────────────────────── */}
          <aside>
            <section className="panel">
              <div className="panel-head">
                <h2 className="panel-title">Revenus</h2>
                <Link href="/espace-chef/revenus" className="panel-link hit">
                  Détail
                </Link>
              </div>
              <div className="px-5 pb-5 pt-3 lg:px-6 lg:pb-6">
                <p className="text-sm text-ink-mid">Net ce mois</p>
                {bookings.isPending ? (
                  <Skeleton className="mt-1 h-9 w-36" />
                ) : (
                  <p className="mt-1 font-display text-3xl font-bold leading-tight tabular-nums text-navy">
                    {moneyCents(netMois) ?? '0 €'}
                  </p>
                )}

                <dl className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                  <Ligne
                    label={`Net en ${annee}`}
                    value={moneyCents(netAnnee) ?? '0 €'}
                    loading={bookings.isPending}
                  />
                  <Ligne
                    label="Prestations réglées"
                    value={String(reglees.length)}
                    loading={bookings.isPending}
                  />
                  <Ligne
                    label="Prestations à venir"
                    value={String(aVenir.length)}
                    loading={bookings.isPending}
                  />
                </dl>

                {/* Le plafond de la micro-entreprise : une jauge, parce que c'est une limite. */}
                <div className="mt-4 border-t border-[var(--line)] pt-4">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink-mid">Plafond micro-entreprise</span>
                    <span className="font-semibold tabular-nums text-navy">
                      {Math.round(ceilingRatio * 100)} %
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-cream-deep"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(Math.min(1, ceilingRatio) * 100)}
                    aria-label="Part du plafond de la micro-entreprise atteinte"
                  >
                    <div
                      className={cn('h-full rounded-full', ceilingAlert ? 'bg-[var(--bad-ink)]' : 'bg-mint-ink')}
                      style={{ width: `${Math.min(100, ceilingRatio * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed tabular-nums text-ink-soft">
                    Sur {euros(MICRO_CEILING_EUR)} par an, d’après vos seules prestations Lab’s
                    Food.
                  </p>
                  {ceilingAlert && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--bad-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--bad-ink)]">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      Vous approchez du plafond. Au-delà, votre régime fiscal change.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ChefPage>
  )
}

/** La prochaine prestation : chez qui, quand, quoi — et ce qu'il ne faut pas servir. */
function ProchainePrestation({ b, maintenant }: { b: Booking; maintenant: Date }) {
  const plats = (b.meals ?? []).map((m) => m.name ?? 'Plat')
  const interdits = [...(b.allergies ?? []), ...(b.diets ?? [])]
  const prenom = b.client?.name?.split(' ')[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="p-6 lg:p-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-sm font-semibold text-white/70">Prochaine prestation</h2>
          <span className="status status-on-dark">{echeance(b.startsAt, maintenant)}</span>
          <span className="status status-on-dark">{bookingStatusText(b.status)}</span>
        </div>

        <p className="cap-first mt-3 font-display text-3xl font-bold leading-tight lg:text-[2.5rem]">
          {longDate(b.startsAt) ?? 'Date à confirmer'}
        </p>

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums text-white/75">
          {hour(b.startsAt) && (
            <span>
              {hour(b.startsAt)}
              {hour(b.endsAt) ? ` → ${hour(b.endsAt)}` : ''}
            </span>
          )}
          <span>chez {b.client?.name ?? 'votre client'}</span>
          <span>{b.city ?? b.addressLine ?? 'Adresse à confirmer'}</span>
          {b.persons ? <span>{b.persons} personnes</span> : null}
        </p>

        {plats.length > 0 && (
          <p className="mt-4 max-w-[65ch] text-sm leading-relaxed text-white/60">
            {plats.join(' · ')}
          </p>
        )}

        {/* Ce que le client ne peut pas manger : dit ici, avant d'aller faire les courses. */}
        {interdits.length > 0 && (
          <p className="mt-5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-white/[0.08] px-3 py-2 text-sm text-white">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber" aria-hidden />
            <span className="font-semibold">À respecter :</span>
            <span className="text-white/80">{interdits.join(', ')}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col justify-between gap-6 border-t border-white/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
        <div>
          <p className="text-xs text-white/55">{b.commissionEstimated ? 'Net estimé' : 'Net perçu'}</p>
          <p className="mt-1.5 font-display text-3xl font-bold leading-none tabular-nums text-amber">
            {moneyCents(b.netCents) ?? '—'}
          </p>
          <p className="mt-1.5 text-xs text-white/55">
            {b.paidCents ? 'Déjà réglée par le client.' : 'Réglée par le client après la prestation.'}
          </p>
        </div>
        <div className="space-y-2">
          <Link href="/espace-chef/prestations" className="btn btn-amber w-full">
            Préparer la prestation
            <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
          </Link>
          <Link href="/espace-chef/messagerie" className="btn btn-outline-light w-full">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Écrire à {prenom ?? 'mon client'}
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Les sept prochains jours. Pas un agenda de plus : la réponse à « quels jours
 * suis-je pris cette semaine ? », lisible sans ouvrir l'agenda.
 */
function Semaine({
  prestations,
  maintenant,
  loading,
}: {
  prestations: Booking[]
  maintenant: Date
  loading: boolean
}) {
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i)
    return {
      d,
      du: prestations
        .filter((b) => isBookingOpen(b) && memeJour(new Date(b.startsAt), d))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }
  })

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Vos sept prochains jours</h2>
        <Link href="/espace-chef/agenda" className="panel-link hit">
          Agenda
        </Link>
      </div>
      <div className="p-5 pt-4 lg:p-6 lg:pt-4">
        {loading ? (
          <SkeletonGroup className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </SkeletonGroup>
        ) : (
          <ol className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {jours.map(({ d, du }, i) => {
              const pris = du.length > 0
              return (
                <li
                  key={d.toISOString()}
                  className={cn(
                    'flex min-h-[4.5rem] flex-col rounded-xl p-2 text-center sm:min-h-28 sm:p-2.5 sm:text-left',
                    pris ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid',
                  )}
                >
                  <span className={cn('text-xs', pris ? 'text-white/70' : 'text-ink-soft')}>
                    {i === 0
                      ? 'Auj.'
                      : d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                  </span>
                  <span
                    className={cn(
                      'font-display text-lg font-bold leading-tight tabular-nums',
                      pris ? 'text-white' : 'text-navy',
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {pris ? (
                    <span className="mt-auto pt-1.5">
                      {/* Étroit : un point par prestation. L'heure ne tient pas dans 40 px. */}
                      <span className="flex justify-center gap-1 sm:hidden" aria-hidden>
                        {du.slice(0, 3).map((b) => (
                          <span key={b.id} className="h-1.5 w-1.5 rounded-full bg-amber" />
                        ))}
                      </span>
                      <span className="sr-only sm:not-sr-only sm:block sm:space-y-1">
                        {du.slice(0, 2).map((b) => (
                          <span key={b.id} className="block text-xs leading-tight">
                            <span className="block font-semibold tabular-nums text-amber">
                              {hour(b.startsAt)}
                            </span>
                            <span className="block truncate text-white/80">
                              {b.client?.name ?? 'Client'}
                            </span>
                          </span>
                        ))}
                      </span>
                    </span>
                  ) : (
                    <span className="sr-only">Libre</span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

/**
 * État du dossier. Le libellé porte l'information, pas une pastille collée à
 * un surtitre : on lit l'état, puis ce qu'il implique, puis ce qu'il reste.
 *
 * Un dossier validé et sans échéance proche ne s'affiche pas : un bandeau qui
 * répète « tout va bien » devient du bruit en trois jours.
 */
function DossierCard({
  status,
  documents,
  loading,
  attendMiseEnLigne,
}: {
  status?: DossierStatus
  documents: ChefDocument[]
  loading: boolean
  /** `disabled` après approbation : une attente, pas une sanction. */
  attendMiseEnLigne?: boolean
}) {
  if (loading) {
    return (
      <SkeletonGroup>
        <SkeletonCard className="flex h-24 items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </SkeletonCard>
      </SkeletonGroup>
    )
  }
  if (!status) return null

  const blocking = documents.filter((d) => d.family === 'blocking')
  const valid = blocking.filter((d) => d.status === 'valid').length
  const urgent = DOSSIER_URGENT.has(status) && !attendMiseEnLigne

  // La pièce qui coince, s'il y en a une : c'est elle qu'on va traiter.
  const stuck = documents.find(
    (d) => d.family === 'blocking' && (d.status === 'rejected' || d.status === 'expired'),
  )
  // Une pièce qui arrive à échéance : rien n'est bloqué, mais ça le sera.
  const bientot = documents.find((d) => d.status === 'expiring')

  if (status === 'validated' && !stuck && !bientot) return null

  if (status === 'validated' && bientot) {
    return (
      <Link
        href="/espace-chef/dossier"
        className="group flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-amber/50 bg-[var(--warn-soft)] px-5 py-3.5 transition-colors hover:border-amber"
      >
        <span className="min-w-0 flex-1 basis-72 text-sm leading-relaxed text-navy">
          <span className="font-semibold">{bientot.label}</span> arrive à échéance
          {bientot.expiresOn
            ? ` le ${new Date(bientot.expiresOn).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
            : ''}
          . Déposez la nouvelle pièce avant cette date pour rester en ligne.
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-navy">
          Renouveler
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Link>
    )
  }

  return (
    <section className={cn('rounded-2xl p-5 lg:p-6', urgent ? 'bg-navy text-white' : 'panel')}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-prose">
          <h2
            className={cn(
              'font-display text-lg font-bold leading-tight',
              urgent ? 'text-white' : 'text-navy',
            )}
          >
            {attendMiseEnLigne
              ? 'Dossier approuvé, vitrine pas encore en ligne'
              : `Dossier ${DOSSIER_LABEL[status].toLowerCase()}`}
          </h2>
          <p className={cn('mt-1 text-sm leading-relaxed', urgent ? 'text-white/75' : 'text-ink-mid')}>
            {attendMiseEnLigne
              ? 'Vos pièces sont validées. Notre équipe relit votre vitrine avant de la rendre visible aux clients — vous n’avez rien à faire.'
              : DOSSIER_LEAD[status]}
          </p>
          {stuck?.reason && (
            <p
              className={cn(
                'mt-2 text-[0.8125rem] leading-relaxed',
                urgent ? 'text-amber' : 'text-[var(--bad-ink)]',
              )}
            >
              {stuck.label} — {API_DOC_STATUS_LABEL[stuck.status] ?? stuck.status} : {stuck.reason}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-5">
          {blocking.length > 0 && (
            <div>
              <p
                className={cn(
                  'font-display text-2xl font-bold leading-none tabular-nums',
                  urgent ? 'text-amber' : 'text-navy',
                )}
              >
                {valid}/{blocking.length}
              </p>
              <p className={cn('mt-1 text-xs', urgent ? 'text-white/60' : 'text-ink-soft')}>
                pièces obligatoires validées
              </p>
            </div>
          )}
          <Link
            href="/espace-chef/dossier"
            className={cn('btn', urgent ? 'btn-amber' : 'btn-outline')}
          >
            {status === 'validated' ? 'Voir mon dossier' : 'Compléter'}
            <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Ligne({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-mid">{label}</dt>
      {loading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <dd className="shrink-0 text-sm font-semibold tabular-nums text-navy">{value}</dd>
      )}
    </div>
  )
}
