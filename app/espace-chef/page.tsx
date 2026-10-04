'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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
import { DossierBadge, MissionBadge } from '@/components/chef/StatusBadge'
import {
  CHEF_DOCS,
  CHEF_EARNINGS,
  CHEF_MISSIONS,
  CHEF_PROFILE,
  CHEF_REQUESTS,
  DOC_DEFINITIONS,
} from '@/lib/chef/mock'
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

  const nextMission = CHEF_MISSIONS.find(
    (m) => m.status === 'upcoming' || m.status === 'in-progress',
  )
  const newRequests = CHEF_REQUESTS.filter((r) => r.status === 'new')
  const ceilingRatio = CHEF_EARNINGS.yearRevenue / MICRO_CEILING_EUR
  const ceilingAlert = ceilingRatio >= MICRO_ALERT_RATIO

  return (
    <ChefPage title="Accueil" subtitle="Votre activité en un coup d'œil.">
      <div className="space-y-5">
        {/* État du dossier — la seule chose qui puisse bloquer une prestation */}
        <DossierCard
          status={dossier.data?.dossierStatus}
          documents={dossier.data?.documents ?? []}
          loading={dossier.isPending}
          attendMiseEnLigne={attendMiseEnLigne}
        />

        {/* Indicateurs du mois */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Stat Icon={Wallet} label="Solde" value={euros(CHEF_EARNINGS.balance)} hint={`Versement le ${new Date(CHEF_EARNINGS.nextPayoutAt).toLocaleDateString('fr-FR')}`} />
          <Stat Icon={TrendingUp} label="Net ce mois" value={euros(CHEF_EARNINGS.monthNet)} />
          <Stat Icon={Inbox} label="Nouvelles demandes" value={`${newRequests.length}`} />
          <Stat Icon={CalendarRange} label="Prestations à venir" value={`${CHEF_MISSIONS.filter((m) => m.status === 'upcoming').length}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          {/* Prochaine prestation */}
          <Card
            title="Prochaine prestation"
            action={
              <Link href="/espace-chef/prestations" className="text-xs text-terra font-semibold hover:underline">
                Toutes
              </Link>
            }
          >
            {nextMission ? (
              <div className="rounded-2xl bg-cream-soft p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-display text-lg font-bold text-navy">{nextMission.client}</p>
                    <p className="text-xs text-ink-soft">{nextMission.city}</p>
                  </div>
                  <MissionBadge status={nextMission.status} />
                </div>
                <p className="text-sm text-ink-mid capitalize">
                  {shortDate(nextMission.date)} · {nextMission.timeSlot}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {nextMission.meals.map((m) => (
                    <span key={m} className="text-[11px] px-2.5 py-1 rounded-full bg-paper text-navy">
                      {m}
                    </span>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[rgba(31,42,55,0.08)] flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-ink-soft">Net perçu</p>
                    <p className="font-display text-2xl font-bold text-navy">{euros(nextMission.net)}</p>
                  </div>
                  {/* Le règlement a lieu après la prestation : pas de moyen de
                      paiement affiché sur une session à venir. */}
                  <span className="text-[11px] text-ink-soft">Réglé après la prestation</span>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-ink-soft">Aucune prestation planifiée.</p>
            )}
          </Card>

          {/* Jauge CA vs plafond micro */}
          <Card title="Plafond micro-entreprise">
            <p className="font-display text-3xl font-bold text-navy">
              {euros(CHEF_EARNINGS.yearRevenue)}
            </p>
            <p className="text-xs text-ink-soft mb-4">
              sur {euros(MICRO_CEILING_EUR)} autorisés cette année
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
            <Link href="/espace-chef/demandes" className="text-xs text-terra font-semibold hover:underline">
              Tout voir
            </Link>
          }
        >
          {newRequests.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">Aucune demande en attente.</p>
          ) : (
            <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
              {newRequests.map((r) => (
                <li key={r.id} className="py-3 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy truncate">
                      {r.client} · {r.city}
                    </p>
                    <p className="text-xs text-ink-soft capitalize">
                      {shortDate(r.date)} · {r.persons} pers. · {r.dishes.length} plats
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-base font-bold text-navy">{euros(r.net)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-soft">net</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-terra shrink-0" />
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
    return <div className="h-28 animate-pulse rounded-2xl bg-paper" />
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
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl p-5 lg:p-6 ${urgent ? 'bg-navy text-white' : 'bg-paper'}`}
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
    </motion.section>
  )
}

function Stat({
  Icon,
  label,
  value,
  hint,
}: {
  Icon: typeof Wallet
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="bg-paper rounded-2xl p-4 border border-[rgba(31,42,55,0.06)]">
      <Icon className="w-4 h-4 text-terra mb-2" />
      <p className="font-display text-xl font-bold text-navy leading-none">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-ink-soft mt-1">{label}</p>
      {hint && <p className="text-[10px] text-ink-soft mt-1">{hint}</p>}
    </div>
  )
}

function Quick({ href, Icon, label }: { href: string; Icon: typeof Wallet; label: string }) {
  return (
    <Link
      href={href}
      className="bg-navy text-white rounded-2xl p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform"
    >
      <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-amber" />
      </span>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </Link>
  )
}
