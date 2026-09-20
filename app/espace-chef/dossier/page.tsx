'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FileWarning,
  Info,
  Upload,
} from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge, { DocBadge, DossierBadge } from '@/components/chef/StatusBadge'
import DocThumb from '@/components/chef/DocCard'
import { CHEF_DOCS, CHEF_PROFILE, DOC_DEFINITIONS } from '@/lib/chef/mock'
import {
  DOSSIER_STATUS_LABEL,
  DOC_FAMILY_LABEL,
  SAP_PATH_LABEL,
  applicableDocuments,
  canAcceptMissions,
  completionScore,
  deriveDossierStatus,
  type DocFamily,
  type DocState,
  type DossierStatus,
} from '@/lib/chef/states'

const FAMILY_ORDER: DocFamily[] = ['blocking', 'conditional', 'recommended']

const FAMILY_HINT: Record<DocFamily, string> = {
  blocking: 'Sans ces pièces, votre compte ne peut pas être activé.',
  conditional: 'Demandées d’après la situation que vous avez déclarée à la candidature.',
  recommended: 'Elles renforcent votre vitrine et rassurent les clients.',
}

/** Étapes visibles de la machine à états (hors cas d'exception). */
const PIPELINE: DossierStatus[] = ['draft', 'incomplete', 'reviewing', 'validated']

const CERTIFICATE_IDS = ['haccp', 'rc-pro', 'sap-coop', 'crcesu', 'approval', 'ddpp']

const TABS = ['pieces', 'progression', 'historique'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = {
  pieces: 'Mes pièces',
  progression: 'Ma progression',
  historique: 'Historique',
}

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')

export default function ChefDossierPage() {
  const [docs, setDocs] = useState<DocState[]>(CHEF_DOCS)
  const [tab, setTab] = useState<Tab>('pieces')

  const definitions = useMemo(
    () => applicableDocuments(DOC_DEFINITIONS, CHEF_PROFILE),
    [],
  )

  const status = deriveDossierStatus(docs, definitions, {
    registered: CHEF_PROFILE.registered,
  })
  const score = completionScore(docs, definitions)
  const active = canAcceptMissions(status)

  const submit = (definitionId: string) =>
    setDocs((prev) => {
      const next: DocState = {
        definitionId,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
      }
      return prev.some((d) => d.definitionId === definitionId)
        ? prev.map((d) => (d.definitionId === definitionId ? next : d))
        : [...prev, next]
    })

  const stateOf = (id: string): DocState =>
    docs.find((d) => d.definitionId === id) ?? { definitionId: id, status: 'missing' }

  // Compteurs pour l'onglet Pièces
  const counts = {
    todo: definitions.filter((d) =>
      ['missing', 'rejected', 'expired'].includes(stateOf(d.id).status),
    ).length,
    waiting: definitions.filter((d) =>
      ['submitted', 'reviewing'].includes(stateOf(d.id).status),
    ).length,
  }

  const history = [...docs]
    .filter((d) => d.submittedAt)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))

  return (
    <ChefPage
      title="Mes documents"
      subtitle="Déposez vos pièces à votre rythme — l'état se met à jour automatiquement."
    >
      <div className="space-y-5">
        {/* En-tête */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                État du dossier
              </p>
              <DossierBadge status={status} />
              <p className="text-xs text-ink-mid mt-2 max-w-sm leading-relaxed">
                {active
                  ? 'Votre dossier est complet : vous apparaissez dans la recherche et pouvez accepter des prestations.'
                  : "Vous pouvez préparer votre offre dès maintenant. L'acceptation de prestations sera débloquée une fois vos pièces obligatoires validées."}
              </p>
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="flex justify-between text-xs text-ink-mid mb-1.5">
                <span>Pièces obligatoires validées</span>
                <span className="font-semibold text-navy">{score} %</span>
              </div>
              <div className="h-2.5 rounded-full bg-cream-deep overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-amber"
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone="neutral">{SAP_PATH_LABEL[CHEF_PROFILE.sapPath]}</StatusBadge>
                {CHEF_PROFILE.acceptsCesu && <StatusBadge tone="neutral">CESU accepté</StatusBadge>}
                {counts.todo > 0 && (
                  <StatusBadge tone="warning">{counts.todo} à traiter</StatusBadge>
                )}
                {counts.waiting > 0 && (
                  <StatusBadge tone="info">{counts.waiting} en vérification</StatusBadge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Onglets */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === t
                  ? 'bg-navy text-white'
                  : 'bg-paper text-ink-mid border border-[rgba(31,42,55,0.1)]'
              }`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        {/* ── Onglet : pièces ─────────────────────────────────────────── */}
        {tab === 'pieces' && (
          <>
            <div className="rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3 flex items-start gap-3">
              <Info className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
              <p className="text-xs text-mint-ink leading-relaxed">
                Chaque pièce suit son propre parcours (à fournir → déposée → en
                vérification → validée). Envoyez-les dans l&apos;ordre que vous voulez,
                sur plusieurs jours : l&apos;état global se recalcule seul.
              </p>
            </div>

            {FAMILY_ORDER.map((family) => {
              const items = definitions.filter((d) => d.family === family)
              if (items.length === 0) return null
              return (
                <Card key={family}>
                  <div className="mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-lg font-bold text-navy">
                        {family === 'blocking'
                          ? 'Pièces obligatoires'
                          : family === 'conditional'
                            ? 'Selon votre situation'
                            : 'Pièces facultatives'}
                      </h2>
                      <StatusBadge
                        tone={
                          family === 'blocking'
                            ? 'danger'
                            : family === 'conditional'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {DOC_FAMILY_LABEL[family]}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-ink-soft mt-1">{FAMILY_HINT[family]}</p>
                  </div>

                  <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {items.map((def) => {
                      const st = stateOf(def.id)
                      const expiry = st.expiresAt ? daysUntil(st.expiresAt) : null
                      const missing = st.status === 'missing'
                      return (
                        <li
                          key={def.id}
                          className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4"
                        >
                          <div className="flex gap-4">
                            <div className="w-16 shrink-0">
                              <DocThumb
                                label={def.label}
                                chefName={CHEF_PROFILE.name}
                                certificate={CERTIFICATE_IDS.includes(def.id)}
                                empty={missing}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-navy">{def.label}</p>
                                <DocBadge status={st.status} />
                                {def.badge && st.status === 'valid' && (
                                  <StatusBadge tone="success">
                                    <BadgeCheck className="w-3 h-3" /> {def.badge}
                                  </StatusBadge>
                                )}
                              </div>
                              {def.hint && (
                                <p className="text-xs text-ink-soft mt-1">{def.hint}</p>
                              )}

                              {st.status === 'rejected' && st.rejectionReason && (
                                <div className="mt-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
                                  <FileWarning className="w-3.5 h-3.5 text-red-700 mt-0.5 shrink-0" />
                                  <p className="text-xs text-red-700 leading-relaxed">
                                    <span className="font-semibold">Motif : </span>
                                    {st.rejectionReason}
                                  </p>
                                </div>
                              )}

                              {expiry !== null && !missing && (
                                <p
                                  className={`text-xs mt-2 inline-flex items-center gap-1.5 ${
                                    expiry <= 7
                                      ? 'text-red-700'
                                      : expiry <= 60
                                        ? 'text-amber-deep'
                                        : 'text-ink-soft'
                                  }`}
                                >
                                  <CalendarClock className="w-3.5 h-3.5" />
                                  {expiry > 0
                                    ? `Expire dans ${expiry} j`
                                    : `Expirée depuis ${Math.abs(expiry)} j`}
                                </p>
                              )}

                              {st.status === 'reviewing' && (
                                <p className="text-xs text-ink-soft mt-2 inline-flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> Vérification en cours
                                </p>
                              )}

                              <div className="mt-3">
                                {st.status === 'valid' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-mint-ink font-semibold">
                                    <CheckCircle2 className="w-4 h-4" /> Validée
                                  </span>
                                ) : st.status === 'submitted' || st.status === 'reviewing' ? (
                                  <span className="text-xs text-ink-soft">En attente</span>
                                ) : (
                                  <button
                                    onClick={() => submit(def.id)}
                                    className="btn btn-primary text-xs px-3.5 py-2"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    {st.status === 'rejected' ? 'Renvoyer' : 'Déposer'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              )
            })}
          </>
        )}

        {/* ── Onglet : progression ────────────────────────────────────── */}
        {tab === 'progression' && (
          <Card title="Où en est mon dossier ?">
            <ol className="space-y-1">
              {PIPELINE.map((s, i) => {
                const current = s === status
                const reached = PIPELINE.indexOf(status) >= i
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          reached ? 'bg-amber text-navy' : 'bg-cream-deep text-ink-soft'
                        }`}
                      >
                        {reached ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                      </span>
                      {i < PIPELINE.length - 1 && (
                        <span
                          className={`w-px flex-1 min-h-[28px] ${reached ? 'bg-amber/50' : 'bg-cream-deep'}`}
                        />
                      )}
                    </div>
                    <div className="pb-5">
                      <p
                        className={`text-sm font-semibold ${current ? 'text-navy' : reached ? 'text-ink-mid' : 'text-ink-soft'}`}
                      >
                        {DOSSIER_STATUS_LABEL[s]}
                        {current && (
                          <StatusBadge tone="warning" className="ml-2">
                            Étape en cours
                          </StatusBadge>
                        )}
                      </p>
                      <p className="text-xs text-ink-soft mt-0.5 max-w-md leading-relaxed">
                        {s === 'draft' && 'Votre candidature est enregistrée.'}
                        {s === 'incomplete' &&
                          'Il reste des pièces obligatoires à fournir ou à corriger.'}
                        {s === 'reviewing' &&
                          "Toutes vos pièces obligatoires sont déposées : l'équipe les vérifie sous 48 h ouvrées."}
                        {s === 'validated' &&
                          'Votre vitrine est visible et vous pouvez accepter des prestations.'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>

            {(status === 'awaiting-registration' || status === 'suspended') && (
              <div
                className={`mt-2 rounded-2xl px-4 py-3 flex items-start gap-3 border ${
                  status === 'suspended'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber/30 bg-amber-soft/40'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${status === 'suspended' ? 'text-red-700' : 'text-amber-deep'}`}
                />
                <p
                  className={`text-xs leading-relaxed ${status === 'suspended' ? 'text-red-700' : 'text-ink-mid'}`}
                >
                  {status === 'suspended'
                    ? 'Votre compte est suspendu : une pièce obligatoire a expiré. Renouvelez-la pour réactiver automatiquement votre visibilité.'
                    : "Votre dossier est complet, sauf l'immatriculation. Ajoutez votre SIRET dès que vous l'avez : les autres pièces restent valables."}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* ── Onglet : historique ─────────────────────────────────────── */}
        {tab === 'historique' && (
          <Card title="Historique des dépôts">
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-soft">
                Aucun dépôt enregistré pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-[rgba(31,42,55,0.06)]">
                {history.map((d) => {
                  const def = definitions.find((x) => x.id === d.definitionId)
                  return (
                    <li key={d.definitionId} className="py-3 flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-cream-soft flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-terra" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy truncate">
                          {def?.label ?? d.definitionId}
                        </p>
                        <p className="text-xs text-ink-soft">
                          Déposée le {shortDate(d.submittedAt!)}
                        </p>
                      </div>
                      <DocBadge status={d.status} />
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-[11px] text-ink-soft mt-4 leading-relaxed">
              Chaque dépôt et chaque décision sont horodatés et conservés dans le journal
              d&apos;audit de la plateforme.
            </p>
          </Card>
        )}
      </div>
    </ChefPage>
  )
}
