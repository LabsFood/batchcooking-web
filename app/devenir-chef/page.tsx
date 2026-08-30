'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChefHat,
  ClipboardCheck,
  FileText,
  Info,
  Mail,
  MapPin,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import Logo from '@/components/shared/Logo'
import StatusBadge from '@/components/chef/StatusBadge'
import { DOC_DEFINITIONS } from '@/lib/chef/mock'
import { REGIONS, regionLabel } from '@/lib/chef/regions'
import { applicableDocuments, SAP_PATH_LABEL, type SapPath } from '@/lib/chef/states'

/* ─────────────────────────────────────────────────────────────────────────────
   Onboarding batch cooker.

   Parcours volontairement **reprenable** : chaque étape est enregistrée, et le
   dépôt des pièces peut s'étaler sur plusieurs jours. L'étape « Pièces » ne
   force rien : on peut la quitter et revenir plus tard depuis Mon dossier.
   ───────────────────────────────────────────────────────────────────────────── */

const STEPS = [
  { id: 'account', label: 'Candidature', Icon: ChefHat },
  { id: 'right', label: "Droit d'exercer", Icon: ShieldCheck },
  { id: 'company', label: 'Entreprise', Icon: Building2 },
  { id: 'sap', label: 'Voie SAP', Icon: FileText },
  { id: 'docs', label: 'Pièces', Icon: Upload },
  { id: 'recap', label: 'Récapitulatif', Icon: ClipboardCheck },
] as const

type StepId = (typeof STEPS)[number]['id']

const RIGHT_OPTIONS = [
  { id: 'a', label: 'Ressortissant français ou UE', doc: "Pièce d'identité" },
  { id: 'b', label: 'Titre de séjour avec droit au travail', doc: 'Titre de séjour' },
  { id: 'c', label: 'Titre de séjour à renouveler', doc: 'Récépissé de renouvellement' },
  { id: 'd', label: 'Autre situation', doc: 'Étude au cas par cas' },
]

const COMPANY_FORMS = [
  { id: 'micro', label: 'Micro-entreprise' },
  { id: 'ei', label: 'Entreprise individuelle' },
  { id: 'sasu', label: 'SASU / EURL' },
  { id: 'pending', label: 'Pas encore immatriculé' },
]

export default function BecomeChefPage() {
  const [step, setStep] = useState<StepId>('account')
  const [submitted, setSubmitted] = useState(false)

  // Identité
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [regions, setRegions] = useState<string[]>([])

  // Parcours
  const [right, setRight] = useState('a')
  const [companyForm, setCompanyForm] = useState('micro')
  const [sapPath, setSapPath] = useState<SapPath>('type-b')
  const [acceptsCesu, setAcceptsCesu] = useState(true)
  const [uploaded, setUploaded] = useState<string[]>([])
  const [consent, setConsent] = useState(false)

  const index = STEPS.findIndex((s) => s.id === step)
  const notRegistered = companyForm === 'pending'

  const docs = applicableDocuments(DOC_DEFINITIONS, {
    sapPath,
    acceptsCesu,
    vulnerablePublics: false,
  }).filter((d) => d.family === 'blocking' || d.family === 'conditional')

  const toggleRegion = (id: string) =>
    setRegions((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))

  const go = (dir: 1 | -1) => {
    const next = STEPS[index + dir]
    if (next) setStep(next.id)
  }

  // ── Écran de confirmation après envoi ──────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-5 py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-paper rounded-3xl border border-[rgba(31,42,55,0.06)] p-8 text-center"
          >
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-navy text-amber">
              <Mail className="h-7 w-7" />
            </span>
            <h1 className="font-display text-2xl font-bold text-navy mb-3">
              Votre candidature est envoyée
            </h1>
            <p className="text-sm text-ink-mid leading-relaxed mb-6">
              Consultez votre boîte mail : nous venons d&apos;envoyer à{' '}
              <strong className="text-navy">{email || 'votre adresse'}</strong> vos
              identifiants de connexion. Ils vous donnent accès à votre espace chef pour
              suivre votre dossier et compléter vos pièces.
            </p>

            <div className="rounded-2xl bg-cream-soft p-4 text-left mb-6">
              <p className="text-xs font-semibold text-navy mb-2">La suite</p>
              <ol className="space-y-1.5 text-xs text-ink-mid list-decimal list-inside">
                <li>Connectez-vous avec le mot de passe reçu par email.</li>
                <li>Complétez les pièces manquantes depuis « Mon dossier ».</li>
                <li>Notre équipe vérifie votre dossier sous 48 h ouvrées.</li>
                <li>Une fois validé, votre vitrine devient visible et réservable.</li>
              </ol>
            </div>

            <p className="text-[11px] text-ink-soft mb-5">
              Pas d&apos;email reçu ? Pensez à vérifier vos spams.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/login" className="btn btn-primary">
                Me connecter <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/" className="btn btn-outline">
                Retour au site
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <div className="max-w-4xl mx-auto px-5 py-8 lg:py-12">
        {/* Fil d'étapes */}
        <ol className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const done = i < index
            const current = i === index
            return (
              <li key={s.id} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    current
                      ? 'bg-navy text-white'
                      : done
                        ? 'bg-mint text-mint-ink'
                        : 'bg-paper text-ink-soft border border-[rgba(31,42,55,0.08)]'
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <s.Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <span className="w-4 h-px bg-[rgba(31,42,55,0.12)]" />}
              </li>
            )
          })}
        </ol>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-paper rounded-3xl border border-[rgba(31,42,55,0.06)] p-6 lg:p-8"
        >
          {step === 'account' && (
            <Section
              title="Devenir batch cooker"
              lead="Quelques minutes suffisent pour démarrer. Vous pourrez compléter votre dossier à votre rythme."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Prénom" placeholder="Marie" value={firstName} onChange={setFirstName} />
                <Input label="Nom" placeholder="Dupont" value={lastName} onChange={setLastName} />
                <Input label="Email" placeholder="marie@exemple.fr" type="email" value={email} onChange={setEmail} />
                <Input label="Téléphone" placeholder="06 12 34 56 78" value={phone} onChange={setPhone} />
              </div>

              {/* Régions d'intervention — multi-sélection */}
              <div className="mt-6">
                <label className="label-muted block mb-1">
                  Régions d&apos;intervention <span className="text-terra">*</span>
                </label>
                <p className="text-[11px] text-ink-soft mb-3">
                  Sélectionnez toutes les régions où vous acceptez de vous déplacer.
                </p>

                {regions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {regions.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleRegion(id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber text-navy text-xs font-semibold"
                      >
                        {regionLabel(id)}
                        <X className="w-3 h-3 opacity-70" />
                      </button>
                    ))}
                  </div>
                )}

                {(['Métropole', 'Outre-mer'] as const).map((group) => (
                  <div key={group} className="mb-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-soft mb-2">
                      {group}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {REGIONS.filter((r) => r.group === group).map((r) => {
                        const on = regions.includes(r.id)
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => toggleRegion(r.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              on
                                ? 'bg-navy text-white'
                                : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
                            }`}
                          >
                            {r.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {step === 'right' && (
            <Section
              title="Votre droit d'exercer"
              lead="Cette réponse détermine la pièce justificative qui vous sera demandée."
            >
              <ul className="space-y-2.5">
                {RIGHT_OPTIONS.map((o) => (
                  <li key={o.id}>
                    <button
                      onClick={() => setRight(o.id)}
                      className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                        right === o.id
                          ? 'border-amber bg-amber-soft/30'
                          : 'border-[rgba(31,42,55,0.08)] hover:bg-cream-soft'
                      }`}
                    >
                      <p className="text-sm font-semibold text-navy">{o.label}</p>
                      <p className="text-xs text-ink-soft mt-0.5">Pièce attendue : {o.doc}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {step === 'company' && (
            <Section
              title="Votre statut d'entreprise"
              lead="Vous pouvez candidater même sans être encore immatriculé."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMPANY_FORMS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCompanyForm(f.id)}
                    className={`text-left rounded-2xl border p-4 transition-colors ${
                      companyForm === f.id
                        ? 'border-amber bg-amber-soft/30'
                        : 'border-[rgba(31,42,55,0.08)] hover:bg-cream-soft'
                    }`}
                  >
                    <p className="text-sm font-semibold text-navy">{f.label}</p>
                  </button>
                ))}
              </div>

              {notRegistered && (
                <div className="mt-4 rounded-2xl border border-amber/30 bg-amber-soft/40 px-4 py-3 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-deep mt-0.5 shrink-0" />
                  <p className="text-xs text-ink-mid leading-relaxed">
                    Votre dossier passera en{' '}
                    <strong>« En attente d&apos;immatriculation »</strong>. Vous pourrez
                    tout préparer et ajouter votre SIRET dès que vous l&apos;aurez : les
                    autres pièces restent valables.
                  </p>
                </div>
              )}
            </Section>
          )}

          {step === 'sap' && (
            <Section
              title="Votre voie services à la personne"
              lead="Elle détermine qui facture le client et quelles pièces sont demandées."
            >
              <div className="space-y-3">
                {(['type-b', 'type-a'] as SapPath[]).map((p) => {
                  const active = sapPath === p
                  const available = p === 'type-b'
                  return (
                    <button
                      key={p}
                      disabled={!available}
                      onClick={() => setSapPath(p)}
                      className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                        active
                          ? 'border-amber bg-amber-soft/30'
                          : available
                            ? 'border-[rgba(31,42,55,0.08)] hover:bg-cream-soft'
                            : 'border-[rgba(31,42,55,0.06)] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-navy">{SAP_PATH_LABEL[p]}</p>
                        {!available && <StatusBadge tone="neutral">Bientôt</StatusBadge>}
                      </div>
                      <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                        {p === 'type-b'
                          ? "La coopérative porte la déclaration SAP et émet la facture au client. Vous n'avez pas de déclaration NOVA à gérer."
                          : 'Vous portez votre propre déclaration NOVA et facturez directement.'}
                      </p>
                    </button>
                  )
                })}
              </div>

              <label className="flex items-start gap-3 mt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptsCesu}
                  onChange={(e) => setAcceptsCesu(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-navy">J&apos;accepte le CESU préfinancé</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Une affiliation CRCESU vous sera demandée.
                  </p>
                </div>
              </label>
            </Section>
          )}

          {step === 'docs' && (
            <Section
              title="Vos pièces justificatives"
              lead="Déposez ce que vous avez sous la main — vous pourrez compléter plus tard."
            >
              <ul className="space-y-2.5">
                {docs.map((d) => {
                  const done = uploaded.includes(d.id)
                  return (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(31,42,55,0.08)] p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-navy">{d.label}</p>
                          <StatusBadge tone={d.family === 'blocking' ? 'danger' : 'warning'}>
                            {d.family === 'blocking' ? 'Bloquant' : 'Conditionnel'}
                          </StatusBadge>
                        </div>
                        {d.hint && <p className="text-xs text-ink-soft mt-0.5">{d.hint}</p>}
                      </div>
                      {done ? (
                        <StatusBadge tone="success">
                          <Check className="w-3 h-3" /> Déposé
                        </StatusBadge>
                      ) : (
                        <button
                          onClick={() => setUploaded((p) => [...p, d.id])}
                          className="btn btn-outline text-xs px-3.5 py-2 shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" /> Déposer
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="mt-5 rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3 flex items-start gap-3">
                <Info className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
                <p className="text-xs text-mint-ink leading-relaxed">
                  Vous n&apos;êtes pas obligé de tout fournir maintenant :{' '}
                  {uploaded.length}/{docs.length} déposées. Les pièces manquantes vous
                  attendront dans <strong>Mon dossier</strong>.
                </p>
              </div>
            </Section>
          )}

          {/* ── Récapitulatif ─────────────────────────────────────────── */}
          {step === 'recap' && (
            <Section
              title="Vérifiez votre dossier"
              lead="Relisez ces informations avant de nous les envoyer."
            >
              <div className="space-y-4">
                <RecapBlock title="Identité" onEdit={() => setStep('account')}>
                  <RecapRow label="Nom" value={`${firstName} ${lastName}`.trim() || '—'} />
                  <RecapRow label="Email" value={email || '—'} />
                  <RecapRow label="Téléphone" value={phone || '—'} />
                </RecapBlock>

                <RecapBlock title="Régions d'intervention" onEdit={() => setStep('account')}>
                  {regions.length === 0 ? (
                    <p className="text-xs text-red-700">Aucune région sélectionnée.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {regions.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream-soft text-navy text-[11px] font-medium"
                        >
                          <MapPin className="w-3 h-3 text-terra" /> {regionLabel(id)}
                        </span>
                      ))}
                    </div>
                  )}
                </RecapBlock>

                <RecapBlock title="Situation" onEdit={() => setStep('right')}>
                  <RecapRow
                    label="Droit d'exercer"
                    value={RIGHT_OPTIONS.find((o) => o.id === right)?.label ?? '—'}
                  />
                  <RecapRow
                    label="Statut d'entreprise"
                    value={COMPANY_FORMS.find((f) => f.id === companyForm)?.label ?? '—'}
                  />
                  <RecapRow label="Voie SAP" value={SAP_PATH_LABEL[sapPath]} />
                  <RecapRow label="CESU préfinancé" value={acceptsCesu ? 'Accepté' : 'Non accepté'} />
                </RecapBlock>

                <RecapBlock title="Pièces déposées" onEdit={() => setStep('docs')}>
                  <RecapRow label="Déposées" value={`${uploaded.length} sur ${docs.length}`} />
                  {uploaded.length < docs.length && (
                    <p className="text-[11px] text-ink-soft mt-1.5">
                      Les pièces manquantes pourront être ajoutées depuis votre espace.
                    </p>
                  )}
                </RecapBlock>

                {/* Consentement */}
                <label className="flex items-start gap-3 rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs text-ink-mid leading-relaxed">
                    J&apos;accepte que Lab&apos;s Food traite mes données pour instruire ma
                    candidature, et j&apos;ai pris connaissance de la{' '}
                    <Link href="/confidentialite" className="text-terra font-semibold hover:underline">
                      politique de confidentialité
                    </Link>{' '}
                    et des{' '}
                    <Link href="/cgv" className="text-terra font-semibold hover:underline">
                      conditions générales
                    </Link>
                    . <span className="text-terra">*</span>
                  </span>
                </label>
              </div>
            </Section>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-[rgba(31,42,55,0.08)]">
            <button
              onClick={() => go(-1)}
              disabled={index === 0}
              className="btn btn-outline text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
            <p className="text-xs text-ink-soft hidden sm:block">
              Étape {index + 1} sur {STEPS.length} — progression enregistrée
            </p>
            {step === 'recap' ? (
              <button
                onClick={() => setSubmitted(true)}
                disabled={!consent || regions.length === 0}
                className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Envoyer ma candidature <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => go(1)}
                disabled={step === 'account' && regions.length === 0}
                className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {step === 'recap' && !consent && (
            <p className="text-[11px] text-ink-soft text-right mt-2">
              Cochez la case de consentement pour envoyer votre dossier.
            </p>
          )}
          {step === 'account' && regions.length === 0 && (
            <p className="text-[11px] text-ink-soft text-right mt-2">
              Sélectionnez au moins une région d&apos;intervention.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-[rgba(31,42,55,0.06)] bg-paper">
      <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
        <Logo size="sm" />
        <Link href="/" className="text-xs text-ink-mid hover:text-navy inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour au site
        </Link>
      </div>
    </header>
  )
}

function Section({
  title,
  lead,
  children,
}: {
  title: string
  lead: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy mb-1.5">{title}</h1>
      <p className="text-sm text-ink-mid mb-6 leading-relaxed">{lead}</p>
      {children}
    </div>
  )
}

function Input({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  label: string
  placeholder: string
  type?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="label-muted block mb-2">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base"
      />
    </div>
  )
}

function RecapBlock({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-cream-soft p-4">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <p className="text-sm font-semibold text-navy">{title}</p>
        <button onClick={onEdit} className="text-xs text-terra font-semibold hover:underline">
          Modifier
        </button>
      </div>
      {children}
    </div>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs text-ink-soft">{label}</span>
      <span className="text-sm font-medium text-navy text-right">{value}</span>
    </div>
  )
}
