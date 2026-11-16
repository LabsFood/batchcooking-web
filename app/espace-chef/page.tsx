'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  FileText,
  Inbox,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import {
  DOC_STATUS_LABEL as API_DOC_STATUS_LABEL,
  DOSSIER_LABEL,
  useChefApplication,
  useChefDocuments,
  type DossierStatus,
} from '@/lib/api/chef-documents'
import { useMeProfile } from '@/lib/api/me-profile'
import type { ChefProfile } from '@/lib/api/types'
import { DossierBadge } from '@/components/chef/StatusBadge'
import PresenceCarte from '@/components/chef/PresenceCarte'
import { CHEF_DOCS, CHEF_PROFILE, DOC_DEFINITIONS } from '@/lib/chef/mock'
import { bookingStatusText, hour, isBookingOpen, longDate, useChefBookings } from '@/lib/api/bookings'
import { useChefQuotes } from '@/lib/api/quotes'
import { moneyCents } from '@/lib/api/chef-money'
import { Skeleton, SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import {
  MICRO_ALERT_RATIO,
  MICRO_CEILING_EUR,
  applicableDocuments,
  completionScore,
  deriveDossierStatus,
  DOC_STATUS_LABEL,
} from '@/lib/chef/states'

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

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
  const definitions = applicableDocuments(DOC_DEFINITIONS, CHEF_PROFILE)
  const score = completionScore(CHEF_DOCS, definitions)

  // Document le plus urgent : refusé/expiré d'abord, puis expirant, puis manquant.
  const byId = new Map(definitions.map((d) => [d.id, d]))
  const urgent = [...CHEF_DOCS]
    .filter((d) => byId.has(d.definitionId))
    .sort((a, b) => rank(a.status) - rank(b.status))
    .find((d) => rank(d.status) < 4)
  const urgentDef = urgent ? byId.get(urgent.definitionId) : undefined
  const blocking = urgentDef?.family === 'blocking'

  /*
   * Les chiffres de cet écran viennent des mêmes routes que les écrans
   * qu'il résume : des prestations et des devis réels. Il affichait jusqu'ici
   * un solde et une date de versement qui n'existent nulle part.
   */
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

  return (
    <ChefPage title="Accueil" subtitle="Votre activité en un coup d'œil.">
      <div className="space-y-5">
        {/* « Pourquoi je n'apparais plus ? » — avant tout le reste. */}
        <PresenceCarte />

        {/* État du dossier — la seule chose qui puisse bloquer une prestation */}
        <DossierCard
          status={dossier.data?.dossierStatus}
          documents={dossier.data?.documents ?? []}
          loading={dossier.isPending}
          attendMiseEnLigne={attendMiseEnLigne}
        />

        {/* Indicateurs du mois */}
        <div className="tabular-nums grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Stat
            Icon={TrendingUp}
            label="Net ce mois"
            value={moneyCents(netMois) ?? '0 €'}
            loading={bookings.isPending}
          />
          <Stat
            Icon={Wallet}
            label={`Net en ${annee}`}
            value={moneyCents(netAnnee) ?? '0 €'}
            loading={bookings.isPending}
            hint={`${reglees.length} prestation${reglees.length > 1 ? 's' : ''} réglée${reglees.length > 1 ? 's' : ''}`}
          />
          <Stat
            Icon={Inbox}
            label="Demandes à chiffrer"
            value={`${aRepondre.length}`}
            loading={quotes.isPending}
          />
          <Stat
            Icon={CalendarRange}
            label="Prestations à venir"
            value={`${aVenir.length}`}
            loading={bookings.isPending}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          {/* Prochaine prestation */}
          <Card
            title="Prochaine prestation"
            action={
              <Link href="/espace-chef/prestations" className="hit text-xs text-amber-ink font-semibold hover:underline">
                Toutes
              </Link>
            }
          >
            {bookings.isPending ? (
              // Le bloc de la prochaine prestation : nom + statut, date, plats, étape.
              <SkeletonGroup className="space-y-3 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </SkeletonGroup>
            ) : prochaine ? (
              <Link
                href="/espace-chef/prestations"
                className="block rounded-2xl bg-cream-soft p-4 transition-colors hover:bg-cream-deep"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold text-navy">
                      {prochaine.client?.name ?? 'Client'}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {prochaine.city ?? prochaine.addressLine ?? 'Adresse à confirmer'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-paper px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-mid">
                    {bookingStatusText(prochaine.status)}
                  </span>
                </div>
                <p className="text-sm capitalize text-ink-mid">
                  {longDate(prochaine.startsAt)} · {hour(prochaine.startsAt)}
                  {hour(prochaine.endsAt) ? ` → ${hour(prochaine.endsAt)}` : ''}
                </p>
                {(prochaine.meals?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {prochaine.meals!.slice(0, 6).map((m) => (
                      <span
                        key={m.mealId}
                        className="rounded-full bg-paper px-2.5 py-1 text-xs text-navy"
                      >
                        {m.name ?? 'Plat'}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-end justify-between border-t border-[rgba(31,42,55,0.08)] pt-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-soft">
                      {prochaine.commissionEstimated ? 'Net estimé' : 'Net perçu'}
                    </p>
                    <p className="font-display text-2xl font-bold text-navy">
                      {moneyCents(prochaine.netCents) ?? '—'}
                    </p>
                  </div>
                  <span className="text-xs text-ink-soft">
                    {prochaine.paidCents ? 'Déjà réglée' : 'Réglée par le client'}
                  </span>
                </div>
              </Link>
            ) : (
              <p className="py-6 text-center text-sm text-ink-soft">Aucune prestation planifiée.</p>
            )}
          </Card>

          {/* Jauge CA vs plafond micro */}
          <Card title="Plafond micro-entreprise">
            {bookings.isPending ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <p className="tabular-nums font-display text-3xl font-bold text-navy">
                {moneyCents(netAnnee) ?? '0 €'}
              </p>
            )}
            <p className="tabular-nums mb-4 text-xs text-ink-soft">
              sur {euros(MICRO_CEILING_EUR)} autorisés — d’après vos seules
              prestations Lab’s Food
            </p>
            <div className="h-3 rounded-full bg-cream-deep overflow-hidden">
              <div
                className={`h-full rounded-full ${ceilingAlert ? 'bg-red-500' : 'bg-mint-deep'}`}
                style={{ width: `${Math.min(100, ceilingRatio * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-mid">
              {Math.round(ceilingRatio * 100)} % du plafond atteint
            </p>
            {ceilingAlert && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs text-red-700 leading-relaxed">
                  Vous approchez du plafond. Au-delà, votre régime fiscal change.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Nouvelles demandes */}
        <Card
          title="Nouvelles demandes"
          action={
            <Link href="/espace-chef/offres" className="hit text-xs text-amber-ink font-semibold hover:underline">
              Tout voir
            </Link>
          }
        >
          {quotes.isPending ? (
            <SkeletonGroup className="divide-y divide-[rgba(31,42,55,0.06)]">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56 max-w-full" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </SkeletonGroup>
          ) : aRepondre.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">Aucune demande en attente.</p>
          ) : (
            <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
              {aRepondre.slice(0, 5).map((q) => (
                <li key={q.id}>
                  <Link href="/espace-chef/offres" className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{q.title}</p>
                      <p className="text-xs capitalize text-ink-soft">
                        {[
                          q.desiredDate ? shortDate(q.desiredDate) : null,
                          q.persons ? `${q.persons} pers.` : null,
                          q.mealsCount ? `${q.mealsCount} plats` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-amber-ink" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Actions rapides */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Quick href="/espace-chef/offres" Icon={FileText} label="Composer une offre" />
          <Quick href="/espace-chef/recettes" Icon={CalendarRange} label="Mes recettes" />
          <Quick href="/espace-chef/tarifs" Icon={Wallet} label="Mes tarifs" />
          <Quick href="/espace-chef/agenda" Icon={CalendarRange} label="Mes disponibilités" />
        </div>
      </div>
    </ChefPage>
  )
}

function rank(status: string) {
  return { rejected: 0, expired: 1, expiring: 2, missing: 3 }[status] ?? 9
}

/**
 * État du dossier. Le libellé porte l'information, pas une pastille collée à
 * un surtitre : on lit l'état, puis ce qu'il implique, puis ce qu'il reste.
 */
function DossierCard({
  status,
  documents,
  loading,
  attendMiseEnLigne,
}: {
  status?: DossierStatus
  documents: { label: string; family: string; status: string; reason: string | null }[]
  loading: boolean
  /** `disabled` après approbation : une attente, pas une sanction. */
  attendMiseEnLigne?: boolean
}) {
  if (loading) {
    return (
      <SkeletonGroup>
        <SkeletonCard className="flex h-28 items-center gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
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

  return (
    <section
      className={`rounded-2xl p-5 lg:p-6 ${urgent ? 'bg-navy text-white' : 'card-shell'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-prose">
          <p
            className={`font-display text-lg font-bold leading-tight ${
              urgent ? 'text-white' : 'text-navy'
            }`}
          >
            {attendMiseEnLigne
              ? 'Dossier approuvé, vitrine pas encore en ligne'
              : `Dossier ${DOSSIER_LABEL[status].toLowerCase()}`}
          </p>
          <p className={`mt-1 text-sm leading-relaxed ${urgent ? 'text-white/75' : 'text-ink-mid'}`}>
            {attendMiseEnLigne
              ? 'Vos pièces sont validées. Notre équipe relit votre vitrine avant de la rendre visible aux clients — vous n’avez rien à faire.'
              : DOSSIER_LEAD[status]}
          </p>
          {stuck?.reason && (
            <p className={`mt-2 text-[13px] leading-relaxed ${urgent ? 'text-amber' : 'text-red-700'}`}>
              {stuck.label} — {API_DOC_STATUS_LABEL[stuck.status as keyof typeof API_DOC_STATUS_LABEL] ?? stuck.status} : {stuck.reason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-5">
          {blocking.length > 0 && (
            <div className="min-w-[8rem]">
              <p
                className={`font-display text-2xl font-bold tabular-nums ${
                  urgent ? 'text-amber' : 'text-navy'
                }`}
              >
                {valid}/{blocking.length}
              </p>
              <p className={`text-xs ${urgent ? 'text-white/55' : 'text-ink-soft'}`}>
                pièces obligatoires validées
              </p>
            </div>
          )}
          <Link
            href="/espace-chef/dossier"
            className={`btn text-xs ${urgent ? 'btn-amber' : 'btn-outline'}`}
          >
            {status === 'validated' ? 'Voir mon dossier' : 'Compléter'}
            <ArrowRight className="h-3.5 w-3.5 icon-arrow" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Stat({
  Icon,
  label,
  value,
  hint,
  loading,
}: {
  Icon: typeof Wallet
  label: string
  value: string
  hint?: string
  /** Un bloc à la hauteur du chiffre (text-xl, leading-none = 20 px) tant que la donnée arrive. */
  loading?: boolean
}) {
  return (
    <div className="card-shell rounded-2xl p-4">
      <Icon className="w-4 h-4 text-amber-ink mb-2" />
      {loading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <p className="font-display text-xl font-bold text-navy leading-none">{value}</p>
      )}
      <p className="text-xs uppercase tracking-wide text-ink-soft mt-1">{label}</p>
      {hint && <p className="text-xs text-ink-soft mt-1">{hint}</p>}
    </div>
  )
}

function Quick({ href, Icon, label }: { href: string; Icon: typeof Wallet; label: string }) {
  return (
    <Link
      href={href}
      className="bg-navy text-white rounded-2xl p-4 flex items-center gap-3 transition-colors hover:bg-navy-deep"
    >
      <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-amber-ink" />
      </span>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </Link>
  )
}
