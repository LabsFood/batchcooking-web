'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Loader2,
  Mail,
  MapPin,
} from 'lucide-react'
import Logo from '@/components/shared/Logo'
import ZonePicker from '@/components/chef/application/ZonePicker'
import { CheckBox, FieldError, Note, RadioCard, TextField } from '@/components/chef/application/fields'
import { regionLabel } from '@/lib/chef/regions'
import {
  DEFAULT_VALUES,
  LEGAL_FORMS,
  WORK_STATUSES,
  buildPayload,
  labelOf,
  requiredDocuments,
  submitApplication,
  applicationErrorMessage,
  applicationErrorStep,
  type ApplicationCreated,
  type ApplicationDocument,
  validateStep,
  type ApplicationValues,
  type FieldErrors,
  type LegalForm,
  type StepId,
  type WorkStatus,
} from '@/lib/chef/application'

/* ─────────────────────────────────────────────────────────────────────────────
   Candidature batch cooker.

   Six étapes validées une à une. Les pièces peuvent être déposées plus tard :
   une candidature part sans elles, et elles restent à compléter depuis l'espace
   chef. L'envoi construit le multipart exact de `POST /chefs/applications`
   (cf. lib/chef/application.ts) ; l'appel réseau est simulé pour l'instant.
   ───────────────────────────────────────────────────────────────────────────── */

const STEPS: { id: StepId; label: string; detail: string }[] = [
  { id: 'identity', label: 'Vos coordonnées', detail: 'Identité et adresse' },
  { id: 'zones', label: 'Zones d’intervention', detail: 'Régions et villes' },
  { id: 'status', label: 'Votre situation', detail: 'Autorisation de travail' },
  { id: 'company', label: 'Votre activité', detail: 'Statut et services à la personne' },
  { id: 'documents', label: 'Justificatifs', detail: 'À déposer maintenant ou plus tard' },
  { id: 'review', label: 'Relecture et envoi', detail: 'Vérifier puis envoyer' },
]

const SHOW_PAYLOAD = process.env.NODE_ENV !== 'production'

/*
 * Brouillon de session : un rechargement ne doit pas effacer six étapes de
 * saisie. sessionStorage plutôt que localStorage (données personnelles, oubliées
 * à la fermeture de l'onglet). Ni les fichiers ni le consentement ne sont gardés.
 */
const DRAFT_KEY = 'lf:chef-application'

interface Draft {
  values: ApplicationValues
  step: StepId
  furthest: number
}

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<Draft>
    if (!d.values || !STEPS.some((s) => s.id === d.step)) return null
    return {
      values: { ...DEFAULT_VALUES, ...d.values, consent: false },
      step: d.step as StepId,
      furthest: Math.min(Number(d.furthest) || 0, STEPS.length - 1),
    }
  } catch {
    return null
  }
}

function writeDraft(d: Draft | null) {
  try {
    if (d) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, values: { ...d.values, consent: false } }))
    else sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // Navigation privée ou stockage bloqué : le formulaire fonctionne sans brouillon.
  }
}

const noopSubscribe = () => () => {}

/** SIRET affiché par groupes : 123 456 789 00012. */
const formatSiret = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9)].filter(Boolean).join(' ')
}

export default function BecomeChefPage() {
  // Vrai dans le navigateur, faux au rendu serveur : le brouillon n'existe que côté client.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false)
  return isClient ? <ApplicationForm draft={readDraft()} /> : <Shell />
}

function ApplicationForm({ draft }: { draft: Draft | null }) {
  const [values, setValues] = useState<ApplicationValues>(draft?.values ?? DEFAULT_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [step, setStep] = useState<StepId>(draft?.step ?? 'identity')
  const [furthest, setFurthest] = useState(draft?.furthest ?? 0)
  const [attempted, setAttempted] = useState<Set<StepId>>(() => new Set())
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [done, setDone] = useState<ApplicationCreated & { email: string } | null>(null)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  const index = STEPS.findIndex((s) => s.id === step)

  // Le focus suit l'étape : les lecteurs d'écran annoncent le nouveau titre.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  // Ce que l'API demandera. Elle recalcule la liste de son côté : celle-ci
  // sert à l'annoncer avant l'envoi, pas à la décider.
  const requirements = requiredDocuments(values)

  // ── Saisie ───────────────────────────────────────────────────────────────
  function set<K extends keyof ApplicationValues>(key: K, v: ApplicationValues[K]) {
    const next = { ...values, [key]: v }
    setValues(next)
    writeDraft({ values: next, step, furthest })
    // Une étape déjà tentée se revalide à chaque frappe ; sinon on efface
    // seulement l'erreur du champ modifié.
    if (attempted.has(step)) setErrors(validateStep(step, next))
    else if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  // Après le rendu des erreurs (le commit d'un clic est synchrone).
  const focusFirstError = () =>
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)

  const goTo = (i: number) => {
    const target = STEPS[i]
    if (!target) return
    const reached = Math.max(furthest, i)
    setStep(target.id)
    setFurthest(reached)
    writeDraft({ values, step: target.id, furthest: reached })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = () => {
    const stepErrors = validateStep(step, values)
    setAttempted((a) => new Set(a).add(step))
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length) {
      focusFirstError()
      return
    }
    goTo(index + 1)
  }

  const submit = async () => {
    // Revalide tout : une modification a pu invalider une étape déjà passée.
    for (const [i, s] of STEPS.entries()) {
      const stepErrors = validateStep(s.id, values)
      if (Object.keys(stepErrors).length) {
        setAttempted((a) => new Set(a).add(s.id))
        setErrors(stepErrors)
        if (s.id !== step) goTo(i)
        focusFirstError()
        return
      }
    }

    setSending(true)
    setSendError(null)
    try {
      const payload = buildPayload(values, new Date().toISOString())
      const res = await submitApplication(payload)
      writeDraft(null)
      setDone({ ...res, email: payload.identity.email })
      window.scrollTo({ top: 0 })
    } catch (e) {
      setSendError(applicationErrorMessage(e))
      const back = applicationErrorStep(e)
      if (back) {
        const i = STEPS.findIndex((x) => x.id === back)
        if (i >= 0) goTo(i)
      }
    } finally {
      setSending(false)
    }
  }

  if (done) return <Confirmation email={done.email} reference={done.reference} documents={done.documents} />

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-14 lg:py-14">
        {/* ── Étapes ─────────────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-navy lg:text-[32px]">
            Rejoindre Lab’s Food
          </h1>
          <p className="mt-2 hidden text-sm leading-relaxed text-ink-mid lg:block">
            Une dizaine de minutes pour candidater. Notre équipe étudie chaque dossier sous 48 h ouvrées.
          </p>

          {/* Mobile : progression compacte */}
          <div className="mt-4 lg:hidden">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-navy">{STEPS[index].label}</span>
              <span className="tabular-nums text-ink-soft">
                {index + 1} / {STEPS.length}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1" aria-hidden>
              {STEPS.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1 rounded-full transition-colors duration-300 ${
                    i < index ? 'bg-navy' : i === index ? 'bg-amber' : 'bg-cream-deep'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Desktop : fil vertical */}
          <nav aria-label="Étapes de la candidature" className="mt-10 hidden lg:block">
            <ol>
              {STEPS.map((s, i) => {
                const current = i === index
                const isDone = (i < furthest || i < index) && !current
                const reachable = i <= furthest
                return (
                  <li key={s.id} className="relative pb-6 pl-11 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className={`absolute bottom-1 left-[13px] top-8 w-px transition-colors duration-300 ${
                          i < index ? 'bg-navy' : 'bg-[rgba(31,42,55,0.14)]'
                        }`}
                      />
                    )}
                    <span
                      aria-hidden
                      className={`absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors duration-300 ${
                        current
                          ? 'bg-amber text-navy shadow-[0_4px_12px_-4px_rgba(214,139,14,0.6)]'
                          : isDone
                            ? 'bg-navy text-white'
                            : 'border-[1.5px] border-[rgba(31,42,55,0.18)] bg-paper text-ink-soft'
                      }`}
                    >
                      {isDone && !current ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => reachable && goTo(i)}
                      disabled={!reachable || current}
                      aria-current={current ? 'step' : undefined}
                      className="block rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-4 disabled:cursor-default"
                    >
                      <span
                        className={`block text-sm font-semibold leading-7 transition-colors ${
                          current ? 'text-navy' : reachable ? 'text-navy/80 hover:text-navy' : 'text-ink-soft'
                        }`}
                      >
                        {s.label}
                      </span>
                      <span className="block text-xs leading-snug text-ink-soft">{s.detail}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>
        </aside>

        {/* ── Formulaire ─────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper px-5 py-7 sm:px-8 sm:py-9 lg:px-11 lg:py-11">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 'identity' && (
              <Step
                headingRef={headingRef}
                title="Vos coordonnées"
                lead="Elles nous servent à étudier votre candidature et à créer votre espace batch cooker."
              >
                <Group legend="Vous">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <TextField
                      label="Prénom"
                      autoComplete="given-name"
                      value={values.firstName}
                      onChange={(e) => set('firstName', e.target.value)}
                      error={errors.firstName}
                    />
                    <TextField
                      label="Nom"
                      autoComplete="family-name"
                      value={values.lastName}
                      onChange={(e) => set('lastName', e.target.value)}
                      error={errors.lastName}
                    />
                    <TextField
                      label="Email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="prenom@exemple.fr"
                      hint="Nous y envoyons le suivi de votre candidature."
                      value={values.email}
                      onChange={(e) => set('email', e.target.value)}
                      error={errors.email}
                    />
                    <TextField
                      label="Téléphone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="06 12 34 56 78"
                      value={values.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      error={errors.phone}
                    />
                  </div>
                </Group>

                <Group legend="Votre adresse" hint="Adresse de votre domicile ou de votre entreprise, en France métropolitaine.">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <TextField
                      className="sm:col-span-2"
                      label="Adresse"
                      autoComplete="address-line1"
                      placeholder="12 rue des Lilas"
                      value={values.street}
                      onChange={(e) => set('street', e.target.value)}
                      error={errors.street}
                    />
                    <TextField
                      className="sm:col-span-2"
                      label="Complément d’adresse"
                      optional
                      autoComplete="address-line2"
                      placeholder="Bâtiment, étage, digicode"
                      value={values.addressLine2 ?? ''}
                      onChange={(e) => set('addressLine2', e.target.value)}
                    />
                    <TextField
                      label="Code postal"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="75011"
                      value={values.postcode}
                      onChange={(e) => set('postcode', e.target.value.replace(/\D/g, ''))}
                      error={errors.postcode}
                    />
                    <TextField
                      label="Ville"
                      autoComplete="address-level2"
                      value={values.city}
                      onChange={(e) => set('city', e.target.value)}
                      error={errors.city}
                    />
                  </div>
                </Group>
              </Step>
            )}

            {step === 'zones' && (
              <Step
                headingRef={headingRef}
                title="Où intervenez-vous ?"
                lead="Cochez une région entière, ou dépliez-la pour choisir des villes précises. La recherche couvre toutes les communes de France métropolitaine."
              >
                <ZonePicker
                  value={values.zones}
                  onChange={(z) => set('zones', z)}
                  invalid={!!errors.zones}
                  describedBy={errors.zones ? 'zones-error' : undefined}
                />
                <FieldError id="zones-error" message={errors.zones} />
              </Step>
            )}

            {step === 'status' && (
              <Step
                headingRef={headingRef}
                title="Votre situation en France"
                lead="Elle nous indique le justificatif à vous demander pour vérifier votre autorisation de travail."
              >
                <fieldset>
                  <legend className="sr-only">Votre situation</legend>
                  <div
                    className="grid grid-cols-1 gap-2.5"
                    aria-invalid={errors.workStatus ? true : undefined}
                    tabIndex={errors.workStatus ? -1 : undefined}
                  >
                    {WORK_STATUSES.map((o) => (
                      <RadioCard
                        key={o.id}
                        name="workStatus"
                        value={o.id}
                        checked={values.workStatus === o.id}
                        onChange={(v) => set('workStatus', v as WorkStatus)}
                        title={o.label}
                      />
                    ))}
                  </div>
                  <FieldError id="workStatus-error" message={errors.workStatus} />
                </fieldset>

                {values.workStatus === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5">
                      <label htmlFor="workStatusOther" className="mb-1.5 block text-sm font-semibold text-navy">
                        Précisez votre situation
                      </label>
                      <textarea
                        id="workStatusOther"
                        rows={4}
                        maxLength={500}
                        placeholder="Par exemple : étudiant étranger autorisé à travailler à temps partiel, demande d’asile en cours…"
                        value={values.workStatusOther ?? ''}
                        onChange={(e) => set('workStatusOther', e.target.value)}
                        aria-invalid={errors.workStatusOther ? true : undefined}
                        aria-describedby={errors.workStatusOther ? 'workStatusOther-error' : 'workStatusOther-count'}
                        className={`input-base resize-y leading-relaxed ${errors.workStatusOther ? '!border-red-600' : ''}`}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <FieldError id="workStatusOther-error" message={errors.workStatusOther} />
                        <p id="workStatusOther-count" className="ml-auto mt-1.5 text-xs tabular-nums text-ink-soft">
                          {(values.workStatusOther ?? '').length} / 500
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </Step>
            )}

            {step === 'company' && (
              <Step
                headingRef={headingRef}
                title="Votre activité"
                lead="Vous pouvez candidater même si vous n’êtes pas encore immatriculé."
              >
                <Group legend="Statut professionnel">
                  <div
                    className="grid grid-cols-1 gap-2.5"
                    aria-invalid={errors.legalForm ? true : undefined}
                    tabIndex={errors.legalForm ? -1 : undefined}
                  >
                    {LEGAL_FORMS.map((f) => (
                      <RadioCard
                        key={f.id}
                        name="legalForm"
                        value={f.id}
                        checked={values.legalForm === f.id}
                        onChange={(v) => set('legalForm', v as LegalForm)}
                        title={f.label}
                        description={f.hint}
                      />
                    ))}
                  </div>
                  <FieldError id="legalForm-error" message={errors.legalForm} />

                  {values.legalForm && values.legalForm !== 'not-registered' && (
                    <TextField
                      className="mt-5 sm:max-w-xs"
                      label="Numéro SIRET"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="123 456 789 00012"
                      hint="14 chiffres, sur votre avis de situation SIRENE."
                      value={formatSiret(values.siret ?? '')}
                      onChange={(e) => set('siret', e.target.value.replace(/\D/g, '').slice(0, 14))}
                      error={errors.siret}
                    />
                  )}
                  {values.legalForm === 'not-registered' && (
                    <div className="mt-5">
                      <Note tone="amber" icon={<Info className="h-4 w-4" />}>
                        Votre dossier sera placé <strong>en attente d’immatriculation</strong>. Préparez le reste dès
                        maintenant : vous ajouterez votre SIRET depuis votre espace dès que vous l’aurez.
                      </Note>
                    </div>
                  )}
                </Group>

                <Group legend="Services à la personne">
                  <label
                    className={`flex cursor-pointer gap-3 rounded-xl border-[1.5px] p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
                      values.sapTypeA ? 'border-navy bg-cream-soft' : 'border-[rgba(31,42,55,0.1)] hover:border-[rgba(31,42,55,0.24)]'
                    }`}
                  >
                    <CheckBox
                      className="mt-0.5"
                      label="J’ai déjà ma propre déclaration de services à la personne"
                      checked={values.sapTypeA}
                      onChange={(v) => set('sapTypeA', v)}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-navy">
                        J’ai déjà ma propre déclaration de services à la personne
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-ink-mid">
                        Déclaration NOVA à votre nom (Type A). Sinon, rien à faire : la coopérative porte la
                        déclaration pour vous.
                      </span>
                    </span>
                  </label>

                  {values.sapTypeA && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pt-5">
                        <TextField
                          className="sm:max-w-xs"
                          label="Numéro de déclaration SAP"
                          autoComplete="off"
                          placeholder="SAP123456789"
                          value={values.sapNumber ?? ''}
                          onChange={(e) => set('sapNumber', e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 12))}
                          error={errors.sapNumber}
                        />
                        <Note icon={<FileText className="h-4 w-4" />}>
                          Le récépissé de déclaration vous sera demandé à l’étape suivante.
                        </Note>
                      </div>
                    </motion.div>
                  )}
                </Group>
              </Step>
            )}

            {step === 'documents' && (
              <Step
                headingRef={headingRef}
                title="Les pièces qui vous seront demandées"
                lead="Rien à déposer maintenant. Vous recevrez un lien par email juste après l’envoi : vos pièces se déposent depuis votre espace, quand vous les avez sous la main."
              >
                <Group legend="Obligatoires" hint="Votre dossier ne peut pas être validé sans elles.">
                  <ul className="space-y-2.5">
                    {requirements
                      .filter((r) => r.required)
                      .map((r) => (
                        <DocumentPreview key={r.id} doc={r} />
                      ))}
                  </ul>
                </Group>
                <Group
                  legend="Selon votre situation"
                  hint="Déduites de vos réponses. Elles renforcent le dossier sans le bloquer."
                >
                  <ul className="space-y-2.5">
                    {requirements
                      .filter((r) => !r.required)
                      .map((r) => (
                        <DocumentPreview key={r.id} doc={r} />
                      ))}
                  </ul>
                </Group>
              </Step>
            )}

            {step === 'review' && (
              <Step headingRef={headingRef} title="Relisez avant d’envoyer" lead="Un détail à corriger ? Chaque bloc se modifie en un clic.">
                <div className="divide-y divide-[rgba(31,42,55,0.08)] rounded-xl border border-[rgba(31,42,55,0.08)]">
                  <Review title="Coordonnées" onEdit={() => goTo(0)}>
                    <Row label="Nom" value={`${values.firstName} ${values.lastName}`} />
                    <Row label="Email" value={values.email} />
                    <Row label="Téléphone" value={values.phone} />
                    <Row
                      label="Adresse"
                      value={[values.street, values.addressLine2, `${values.postcode} ${values.city}`]
                        .filter(Boolean)
                        .join(', ')}
                    />
                  </Review>

                  <Review title="Zones d’intervention" onEdit={() => goTo(1)}>
                    <ul className="flex flex-wrap gap-1.5 pt-1">
                      {values.zones.map((z) => (
                        <li
                          key={z.regionCode}
                          className="inline-flex items-center gap-1.5 rounded-full bg-cream-soft px-2.5 py-1 text-xs text-navy"
                        >
                          <MapPin className="h-3 w-3 text-amber-deep" aria-hidden />
                          <span className="font-semibold">{regionLabel(z.regionCode)}</span>
                          <span className="text-ink-mid">
                            {z.wholeRegion ? 'toute la région' : z.cities.map((c) => c.name).join(', ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Review>

                  <Review title="Situation et activité" onEdit={() => goTo(2)}>
                    <Row label="Situation" value={labelOf(WORK_STATUSES, values.workStatus)} />
                    {values.workStatus === 'other' && <Row label="Précision" value={values.workStatusOther ?? ''} />}
                    <Row label="Statut" value={labelOf(LEGAL_FORMS, values.legalForm)} />
                    {values.legalForm !== 'not-registered' && <Row label="SIRET" value={formatSiret(values.siret ?? '')} />}
                    <Row
                      label="Services à la personne"
                      value={values.sapTypeA ? `Déclaration propre · ${values.sapNumber}` : 'Portés par la coopérative'}
                    />
                  </Review>

                  <Review title="Justificatifs" onEdit={() => goTo(4)}>
                    <ul className="space-y-1.5 pt-1">
                      {requirements
                        .filter((r) => r.required)
                        .map((r) => (
                          <li key={r.id} className="flex items-start gap-2.5 text-[13px]">
                            <Clock className="mt-px h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                            <span className="min-w-0">
                              <span className="text-navy">{r.label}</span>
                              <span className="block text-xs text-ink-soft">
                                À déposer depuis votre espace
                              </span>
                            </span>
                          </li>
                        ))}
                    </ul>
                  </Review>
                </div>

                <div className="mt-6">
                  <label
                    className={`flex cursor-pointer gap-3 rounded-xl border-[1.5px] p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
                      errors.consent ? 'border-red-600' : values.consent ? 'border-navy bg-cream-soft' : 'border-[rgba(31,42,55,0.1)]'
                    }`}
                    aria-invalid={errors.consent ? true : undefined}
                    tabIndex={errors.consent ? -1 : undefined}
                  >
                    <CheckBox
                      className="mt-0.5"
                      label="J’accepte le traitement de mes données pour l’étude de ma candidature"
                      checked={values.consent}
                      onChange={(v) => set('consent', v)}
                    />
                    <span className="text-[13px] leading-relaxed text-ink-mid">
                      J’accepte que Lab’s Food traite mes données pour étudier ma candidature, et j’ai lu la{' '}
                      <Link href="/confidentialite" target="_blank" className="font-semibold text-navy underline underline-offset-2 hover:text-amber-deep">
                        politique de confidentialité
                      </Link>{' '}
                      et les{' '}
                      <Link href="/cgv" target="_blank" className="font-semibold text-navy underline underline-offset-2 hover:text-amber-deep">
                        conditions générales
                      </Link>
                      .
                    </span>
                  </label>
                  <FieldError id="consent-error" message={errors.consent} />
                </div>

                {sendError && (
                  <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-800">
                    <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden />
                    {sendError}
                  </div>
                )}

                {SHOW_PAYLOAD && (
                  <details className="group mt-6 rounded-xl bg-navy-deep text-white/85">
                    <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-white/90 marker:hidden">
                      Payload envoyé à l’API <span className="font-normal text-white/50">· visible en développement</span>
                    </summary>
                    <pre className="max-h-80 overflow-auto px-4 pb-4 font-mono text-[11px] leading-relaxed">
                      {`POST /chef-applications\n\n${JSON.stringify(
                        buildPayload(values, '<horodaté à l’envoi>'),
                        null,
                        2,
                      )}`}
                    </pre>
                  </details>
                )}
              </Step>
            )}
          </motion.div>

          {/* ── Navigation ─────────────────────────────────────────────── */}
          <div className="mt-10 flex flex-col-reverse gap-3 border-t border-[rgba(31,42,55,0.08)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-ink-mid transition-colors hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Retour
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}

            {step === 'review' ? (
              <button
                type="button"
                onClick={submit}
                disabled={sending}
                aria-busy={sending || undefined}
                className="btn btn-primary disabled:cursor-wait disabled:opacity-80"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Envoi en cours
                  </>
                ) : (
                  <>
                    Envoyer ma candidature <ArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            ) : (
              <button type="button" onClick={next} className="btn btn-primary">
                Continuer
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

/** Rendu serveur et premier affichage : la mise en page, sans le formulaire. */
function Shell() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-14 lg:py-14">
        <aside>
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-navy lg:text-[32px]">
            Rejoindre Lab’s Food
          </h1>
        </aside>
        <section
          aria-busy
          className="min-h-[520px] rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper px-5 py-7 sm:px-8 sm:py-9 lg:px-11 lg:py-11"
        >
          <div className="h-8 w-56 animate-pulse rounded-lg bg-cream-soft" />
          <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-cream-soft" />
        </section>
      </main>
    </div>
  )
}

// ── Écran de confirmation ────────────────────────────────────────────────────

/** Une pièce annoncée, pas encore demandée. */
function DocumentPreview({ doc }: { doc: { label: string; hint: string } }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-[rgba(31,42,55,0.08)] bg-paper p-3.5">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-navy">{doc.label}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-mid">{doc.hint}</span>
      </span>
    </li>
  )
}

function Confirmation({
  email,
  reference,
  documents,
}: {
  email: string
  reference: string
  documents: ApplicationDocument[]
}) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-7 sm:p-10"
        >
          <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-amber">
            <Mail className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-navy">
            Candidature envoyée
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-mid">
            Votre espace est ouvert. Nous venons d’envoyer à{' '}
            <strong className="font-semibold text-navy">{email}</strong> un lien de connexion,
            valable 7 jours et utilisable une fois : c’est par là que vous déposerez vos
            pièces et suivrez l’étude de votre dossier.
          </p>

          {documents.length > 0 && (
            <div className="mt-6 rounded-xl bg-cream-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
                Ce qui vous sera demandé
              </p>
              <ul className="mt-2 space-y-1">
                {documents.map((d) => (
                  <li key={d.type} className="flex items-baseline gap-2 text-[13px] text-navy">
                    <span className="min-w-0 flex-1">{d.label}</span>
                    {d.required && (
                      <span className="shrink-0 text-[11px] font-semibold text-terra">
                        obligatoire
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ol className="mt-7 space-y-3.5">
            {[
              'Ouvrez le lien reçu par email : il vous connecte à votre espace.',
              'Déposez vos pièces depuis « Mes documents », à votre rythme.',
              'Notre équipe étudie votre dossier sous 48 h ouvrées.',
              'Une fois le dossier validé, votre vitrine devient visible et réservable.',
            ].map((t, i) => (
              <li key={t} className="flex gap-3 text-sm text-ink-mid">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream-soft text-xs font-bold tabular-nums text-navy">
                  {i + 1}
                </span>
                <span className="pt-0.5">{t}</span>
              </li>
            ))}
          </ol>

          <p className="mt-7 text-xs text-ink-soft">
            Référence <span className="font-mono tabular-nums text-ink-mid">{reference}</span> · Pas d’email ? Vérifiez vos
            courriers indésirables.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="btn btn-primary">
              Retour au site <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/faq" className="btn btn-outline">
              Questions fréquentes
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

// ── Mise en page ────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="border-b border-[rgba(31,42,55,0.06)] bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo size="sm" />
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-ink-mid hover:text-navy">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Retour au site
        </Link>
      </div>
    </header>
  )
}

function Step({
  title,
  lead,
  headingRef,
  children,
}: {
  title: string
  lead: string
  headingRef: React.RefObject<HTMLHeadingElement | null>
  children: ReactNode
}) {
  return (
    <div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-navy outline-none sm:text-[30px]"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-mid">{lead}</p>
      <div className="mt-8 space-y-9">{children}</div>
    </div>
  )
}

function Group({
  legend,
  hint,
  aside,
  children,
}: {
  legend: string
  hint?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <fieldset>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <legend className="text-base font-semibold text-navy">{legend}</legend>
        {aside}
      </div>
      {hint && <p className="-mt-3 mb-4 text-[13px] text-ink-soft">{hint}</p>}
      {children}
    </fieldset>
  )
}

function Review({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="px-4 py-4 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-amber-deep hover:bg-amber-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          Modifier
        </button>
      </div>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className="break-words text-[13px] font-medium text-navy">{value || '—'}</span>
    </div>
  )
}
