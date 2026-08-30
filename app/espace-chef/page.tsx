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

export default function ChefHomePage() {
  const definitions = applicableDocuments(DOC_DEFINITIONS, CHEF_PROFILE)
  const dossierStatus = deriveDossierStatus(CHEF_DOCS, definitions, {
    registered: CHEF_PROFILE.registered,
  })
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
        {/* Bandeau du document le plus urgent — ambre = à traiter, rouge = bloquant */}
        {urgent && urgentDef && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border px-4 py-3.5 flex items-start gap-3 ${
              blocking
                ? 'border-red-200 bg-red-50'
                : 'border-amber/30 bg-amber-soft/40'
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 shrink-0 ${blocking ? 'text-red-700' : 'text-amber-deep'}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy">
                {urgentDef.label} — {DOC_STATUS_LABEL[urgent.status]}
              </p>
              <p className="text-xs text-ink-mid mt-0.5">
                {urgent.rejectionReason ??
                  (urgent.status === 'expiring'
                    ? 'Cette pièce arrive à échéance. Renouvelez-la pour éviter une suspension.'
                    : 'Cette pièce est nécessaire pour compléter votre dossier.')}
              </p>
            </div>
            <Link href="/espace-chef/dossier" className="btn btn-primary text-xs px-4 py-2 shrink-0">
              Traiter
            </Link>
          </motion.div>
        )}

        {/* Statut du dossier + complétude */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-navy text-amber flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <p className="eyebrow mb-1">Mon dossier</p>
                <DossierBadge status={dossierStatus} />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-ink-mid mb-1.5">
                <span>Complétude des pièces bloquantes</span>
                <span className="font-semibold text-navy">{score} %</span>
              </div>
              <div className="h-2 rounded-full bg-cream-deep overflow-hidden">
                <div className="h-full rounded-full bg-amber" style={{ width: `${score}%` }} />
              </div>
            </div>
            <Link href="/espace-chef/dossier" className="btn btn-outline text-xs">
              Voir le dossier <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

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
