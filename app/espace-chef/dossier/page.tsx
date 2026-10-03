'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Eye,
  Info,
  Loader2,
  Lock,
  RotateCw,
  Upload,
} from 'lucide-react'
import ChefPage from '@/components/chef/ChefPage'
import { useToast } from '@/components/shared/Toaster'
import DocumentPreviewDialog, {
  type PreviewSource,
} from '@/components/chef/DocumentPreviewDialog'
import { useMe } from '@/lib/api/me'
import {
  DOC_STATUS_LABEL,
  DOSSIER_LABEL,
  EXPIRING_TYPES,
  FAMILY_HINT,
  FAMILY_LABEL,
  MAX_FILE_MB,
  PreviewUnavailable,
  UploadError,
  checkFile,
  useChefApplication,
  useChefDocuments,
  useDocumentPreview,
  useUploadDocument,
  type ChefDocument,
  type DocumentFamily,
  type DocumentStatus,
  type DossierStatus,
} from '@/lib/api/chef-documents'

/* ─────────────────────────────────────────────────────────────────────────────
   Mon dossier — les pièces et les informations déclarées, sur un seul écran.

   Les deux étaient séparés, et c'était faux : ce sont les réponses de la
   candidature qui décident des pièces demandées. Quelqu'un à qui l'on réclame
   un justificatif d'immatriculation doit pouvoir, au même endroit, voir qu'il
   s'est déclaré sans entreprise et corriger.

   Ce que l'API ne permet pas encore de modifier est montré quand même, et dit
   pourquoi : cacher un champ ne fait pas disparaître le besoin.
   ───────────────────────────────────────────────────────────────────────────── */

const FAMILY_ORDER: DocumentFamily[] = ['blocking', 'conditional', 'recommended']

/** Couleur d'état : une seule famille de tons pour tout l'écran. */
const DOC_STYLE: Record<DocumentStatus, { dot: string; text: string }> = {
  missing: { dot: 'bg-ink-soft/40', text: 'text-ink-soft' },
  submitted: { dot: 'bg-amber', text: 'text-amber-deep' },
  reviewing: { dot: 'bg-amber', text: 'text-amber-deep' },
  valid: { dot: 'bg-mint-deep', text: 'text-mint-ink' },
  rejected: { dot: 'bg-red-500', text: 'text-red-700' },
  expiring: { dot: 'bg-terra', text: 'text-terra' },
  expired: { dot: 'bg-red-500', text: 'text-red-700' },
}

const DOSSIER_LEAD: Record<DossierStatus, string> = {
  draft: 'Déposez vos pièces obligatoires pour que nous puissions instruire votre dossier.',
  incomplete: 'Une pièce obligatoire manque ou a été refusée. Tant qu’elle n’est pas validée, votre compte ne peut pas être activé.',
  reviewing: 'Tout est déposé. Notre équipe vérifie vos pièces — comptez 48 h ouvrées.',
  'awaiting-registration': 'Vos pièces sont bonnes. Il ne manque que votre immatriculation : ajoutez votre SIRET dès que vous l’avez.',
  validated: 'Votre dossier est complet et validé. Pensez à renouveler vos pièces avant leur échéance.',
  suspended: 'Une pièce obligatoire a expiré et votre vitrine est hors ligne. Déposez la nouvelle version : vous repassez en ligne immédiatement.',
  disabled: 'Votre compte a été désactivé par notre équipe. Écrivez-nous depuis la messagerie.',
}

/** Teinte du bandeau d'état : ce qui va bien, ce qui attend, ce qui bloque. */
const DOSSIER_TONE: Record<DossierStatus, string> = {
  draft: 'bg-navy text-white',
  incomplete: 'bg-navy text-white',
  reviewing: 'bg-navy text-white',
  'awaiting-registration': 'bg-navy text-white',
  validated: 'bg-mint text-navy',
  suspended: 'bg-red-50 text-navy',
  disabled: 'bg-red-50 text-navy',
}

const WORK_STATUS_LABEL: Record<string, string> = {
  'eu-citizen': 'Ressortissant français ou de l’Union européenne',
  'residence-permit': 'Titre de séjour autorisant à travailler',
  'renewal-pending': 'Titre de séjour en cours de renouvellement',
  other: 'Autre situation',
}

const LEGAL_FORM_LABEL: Record<string, string> = {
  micro: 'Micro ou auto-entrepreneur',
  'other-company': 'Autre forme d’entreprise',
  'not-registered': 'Je n’ai pas d’entreprise',
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const formatSize = (b: number) =>
  b < 1024 * 1024
    ? `${Math.max(1, Math.round(b / 1024))} Ko`
    : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`

export default function DossierPage() {
  const { data, isPending, isError, error, refetch } = useChefDocuments()
  const application = useChefApplication()
  const me = useMe()
  const [preview, setPreview] = useState<PreviewSource | null>(null)
  const remote = useDocumentPreview()

  if (isPending) {
    return (
      <ChefPage title="Mon dossier">
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-paper" />
          <div className="h-80 animate-pulse rounded-2xl bg-paper" />
        </div>
      </ChefPage>
    )
  }

  if (isError || !data) {
    return (
      <ChefPage title="Mon dossier">
        <div className="rounded-2xl bg-paper p-6">
          <p className="font-display text-lg font-bold text-navy">Dossier indisponible</p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-mid">
            {error instanceof Error ? error.message : 'Votre dossier n’a pas pu être chargé.'}
          </p>
          <button onClick={() => refetch()} className="btn btn-primary mt-5 text-xs">
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
          </button>
        </div>
      </ChefPage>
    )
  }

  const { dossierStatus, documents } = data
  const blocking = documents.filter((d) => d.family === 'blocking')
  const valid = blocking.filter((d) => d.status === 'valid').length
  const app = application.data

  /** Ouvre une pièce déjà déposée : l'API signe une URL de courte durée. */
  function openDeposited(doc: ChefDocument) {
    setPreview({ label: doc.label, fileName: doc.fileName ?? undefined })
    remote.mutate(doc.type, {
      onSuccess: (r) =>
        setPreview({ label: doc.label, url: r.url, fileName: doc.fileName ?? undefined }),
      onError: () => setPreview(null),
    })
  }

  return (
    <ChefPage title="Mon dossier" subtitle="Vos pièces, vos informations, et ce qu’il reste à faire.">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* ── Où en est le dossier ──────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`rounded-2xl p-6 ${DOSSIER_TONE[dossierStatus]}`}
        >
          <p className="font-display text-xl font-bold leading-tight">
            {DOSSIER_LABEL[dossierStatus]}
          </p>
          <p
            className={`mt-2 max-w-prose text-sm leading-relaxed ${
              DOSSIER_TONE[dossierStatus].includes('text-white') ? 'text-white/75' : 'text-ink-mid'
            }`}
          >
            {DOSSIER_LEAD[dossierStatus]}
          </p>

          {blocking.length > 0 && (
            <div className="mt-5">
              <div
                className={`flex items-baseline justify-between text-xs ${
                  DOSSIER_TONE[dossierStatus].includes('text-white')
                    ? 'text-white/60'
                    : 'text-ink-mid'
                }`}
              >
                <span>Pièces obligatoires validées</span>
                <span className="font-semibold tabular-nums">
                  {valid} sur {blocking.length}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/15">
                <div
                  className="h-full rounded-full bg-amber transition-all duration-500"
                  style={{ width: `${(valid / blocking.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {app?.reference && (
            <p
              className={`mt-4 font-mono text-[11px] uppercase tracking-[0.16em] ${
                DOSSIER_TONE[dossierStatus].includes('text-white')
                  ? 'text-white/40'
                  : 'text-ink-soft'
              }`}
            >
              Candidature {app.reference}
            </p>
          )}
        </motion.section>

        {/* Un refus se lit avant tout le reste. */}
        {app?.refusal?.reason && (
          <section className="rounded-2xl bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-800">Votre candidature a été refusée</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{app.refusal.reason}</p>
            {app.refusal.allowReapplyAfter && (
              <p className="mt-2 text-xs text-ink-mid">
                Vous pourrez candidater à nouveau à partir du{' '}
                {formatDate(app.refusal.allowReapplyAfter)}.
              </p>
            )}
          </section>
        )}

        {/* ── Les pièces ───────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display text-xl font-bold text-navy">Mes pièces</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-mid">
            La liste est établie d’après vos réponses à la candidature. PDF, JPG, PNG ou WebP,
            {' '}
            {MAX_FILE_MB} Mo au maximum.
          </p>

          <div className="mt-5 space-y-6">
            {FAMILY_ORDER.map((family) => {
              const docs = documents.filter((d) => d.family === family)
              if (docs.length === 0) return null
              return (
                <div key={family}>
                  <div className="flex items-baseline justify-between gap-4 border-b border-[rgba(31,42,55,0.1)] pb-2">
                    <h3 className="text-sm font-semibold text-navy">{FAMILY_LABEL[family]}</h3>
                    <p className="text-xs text-ink-soft">{FAMILY_HINT[family]}</p>
                  </div>
                  <ul className="divide-y divide-[rgba(31,42,55,0.07)]">
                    {docs.map((doc) => (
                      <DocumentRow
                        key={doc.type}
                        doc={doc}
                        onPreviewLocal={(file) => setPreview({ label: doc.label, file })}
                        onPreviewDeposited={() => openDeposited(doc)}
                        previewPending={remote.isPending}
                      />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          {remote.error instanceof PreviewUnavailable && (
            <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-cream-soft px-4 py-3 text-xs leading-relaxed text-ink-mid">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
              Relire une pièce déjà envoyée n’est pas encore possible : l’API ne sait pas
              rouvrir un fichier déposé. Vous pouvez toujours la remplacer, et relire ce que
              vous vous apprêtez à envoyer.
            </p>
          )}
        </section>

        {/* ── Les informations déclarées ────────────────────────────────── */}
        <section>
          <h2 className="font-display text-xl font-bold text-navy">Mes informations</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-mid">
            Ce que vous avez déclaré en candidatant. C’est à partir de là que les pièces
            ci-dessus sont demandées.
          </p>

          <div className="mt-5 space-y-6">
            <InfoBlock title="Identité">
              <InfoRow label="Nom" value={me.data?.fullName ?? undefined} />
              <InfoRow label="Email" value={me.data?.email} mono />
              <InfoRow label="Téléphone" value={me.data?.phone ?? undefined} mono />
            </InfoBlock>

            <InfoBlock
              title="Votre activité"
              note="C’est ce choix qui décide du justificatif d’immatriculation."
            >
              <InfoRow
                label="Statut"
                value={
                  app?.company?.legalForm
                    ? (LEGAL_FORM_LABEL[app.company.legalForm] ?? app.company.legalForm)
                    : undefined
                }
              />
              <InfoRow label="SIRET" value={app?.company?.siret ?? undefined} mono />
              <InfoRow
                label="Situation"
                value={
                  app?.workAuthorization?.status
                    ? (WORK_STATUS_LABEL[app.workAuthorization.status] ??
                      app.workAuthorization.status)
                    : undefined
                }
              />
            </InfoBlock>

            {app?.interventionZones && app.interventionZones.length > 0 && (
              <InfoBlock title="Zones d’intervention">
                <ul className="space-y-2 text-sm">
                  {app.interventionZones.map((z, i) => (
                    <li key={z.regionCode ?? i}>
                      <span className="font-semibold text-navy">
                        {z.regionLabel ?? z.regionCode}
                      </span>
                      <span className="block text-xs text-ink-mid">
                        {z.scope === 'cities' && z.cities?.length
                          ? z.cities.map((c) => c.name).join(', ')
                          : 'Toute la région'}
                      </span>
                    </li>
                  ))}
                </ul>
              </InfoBlock>
            )}
          </div>

          {/* Ce qu'on ne peut pas encore corriger, et pourquoi. */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-cream-soft p-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
            <div className="text-[13px] leading-relaxed text-ink-mid">
              <p className="font-semibold text-navy">
                Ces informations ne sont pas encore modifiables ici.
              </p>
              <p className="mt-1">
                L’API ne propose pas de modification du statut d’entreprise, du SIRET ni des
                zones d’intervention après la candidature. Si l’une d’elles a changé — vous
                venez d’obtenir votre immatriculation, par exemple — écrivez-nous depuis la{' '}
                <Link href="/espace-chef/messagerie" className="font-semibold text-terra underline">
                  messagerie
                </Link>
                {' '}: notre équipe la corrige pour vous.
              </p>
            </div>
          </div>
        </section>
      </div>

      <DocumentPreviewDialog
        source={preview}
        loading={remote.isPending}
        onClose={() => setPreview(null)}
      />
    </ChefPage>
  )
}

// ── Une pièce ───────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onPreviewLocal,
  onPreviewDeposited,
  previewPending,
}: {
  doc: ChefDocument
  onPreviewLocal: (file: File) => void
  onPreviewDeposited: () => void
  previewPending: boolean
}) {
  const toast = useToast()
  const upload = useUploadDocument()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [expiresOn, setExpiresOn] = useState('')
  const [staged, setStaged] = useState<File | null>(null)

  const needsDate = EXPIRING_TYPES.has(doc.type)
  const deposited = doc.version > 0
  const busy = upload.isPending
  const failure = upload.error instanceof UploadError ? upload.error : null
  const style = DOC_STYLE[doc.status]

  function pick(file: File | null) {
    setLocalError(null)
    if (!file) return
    const problem = checkFile(file)
    if (problem) {
      setLocalError(problem)
      return
    }
    // On met le fichier de côté : le chef le relit, et complète la date si la
    // pièce expire. Rien ne part tant qu'il n'a pas confirmé.
    setStaged(file)
  }

  function send() {
    if (!staged) return
    upload.mutate(
      { type: doc.type, file: staged, expiresOn: needsDate ? expiresOn : undefined },
      {
        onSuccess: (saved) => {
          setStaged(null)
          setExpiresOn('')
          if (inputRef.current) inputRef.current.value = ''
          toast.success(
            `${doc.label} déposée`,
            saved.reactivated
              ? 'Votre vitrine repasse en ligne immédiatement.'
              : 'Notre équipe la vérifie sous 48 h ouvrées.',
          )
        },
        onError: (e) =>
          toast.error(
            `${doc.label} n’a pas été déposée`,
            e instanceof UploadError && e.step === 'transfer'
              ? 'Le transfert s’est interrompu. Rien n’a été enregistré.'
              : e instanceof Error
                ? e.message
                : undefined,
          ),
      },
    )
  }

  const meta = [
    doc.fileName,
    doc.sizeBytes ? formatSize(doc.sizeBytes) : null,
    doc.submittedAt ? `déposée le ${formatDate(doc.submittedAt)}` : null,
    doc.version > 1 ? `version ${doc.version}` : null,
  ].filter(Boolean)

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[15px] font-semibold text-navy">{doc.label}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${style.text}`}>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {DOC_STATUS_LABEL[doc.status]}
            </span>
          </p>

          <p className="mt-1 text-[13px] text-ink-soft">
            {meta.length > 0 ? meta.join(' · ') : 'Aucun dépôt'}
          </p>

          {doc.expiresOn && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[13px] text-ink-mid">
              <CalendarClock className="h-3.5 w-3.5 text-amber" aria-hidden />
              Expire le {formatDate(doc.expiresOn)}
            </p>
          )}

          {doc.status === 'rejected' && doc.reason && (
            <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-red-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {doc.reason}
            </p>
          )}

          {localError && (
            <p role="alert" className="mt-2 text-[13px] text-red-700">
              {localError}
            </p>
          )}

          {failure && (
            <p role="alert" className="mt-2 text-[13px] leading-relaxed text-red-700">
              {failure.step === 'transfer'
                ? 'Le transfert s’est interrompu. Rien n’a été enregistré — réessayez.'
                : failure.message}
            </p>
          )}

          {upload.isSuccess && !busy && !staged && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-mint-ink">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Envoyée. Notre équipe la vérifie.
            </p>
          )}

          {/* Le fichier choisi, relu avant départ. */}
          {staged && (
            <div className="mt-3 rounded-xl bg-cream-soft p-4">
              <p className="text-[13px] font-semibold text-navy">
                Prêt à envoyer : <span className="font-normal">{staged.name}</span>
                <span className="font-normal text-ink-soft"> · {formatSize(staged.size)}</span>
              </p>

              {needsDate && (
                <div className="mt-3">
                  <label
                    htmlFor={`exp-${doc.type}`}
                    className="block text-[13px] font-semibold text-navy"
                  >
                    Date d’expiration du document
                  </label>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Elle figure sur la pièce. Nous vous préviendrons avant l’échéance.
                  </p>
                  <input
                    id={`exp-${doc.type}`}
                    type="date"
                    value={expiresOn}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setExpiresOn(e.target.value)}
                    className="input-base mt-2 w-auto py-2"
                  />
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={send}
                  disabled={busy || (needsDate && !expiresOn)}
                  className="btn btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Envoi…
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden /> Envoyer
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onPreviewLocal(staged)}
                  className="btn btn-outline text-xs"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden /> Relire
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaged(null)
                    setExpiresOn('')
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                  className="text-xs text-ink-soft hover:text-navy"
                >
                  Changer de fichier
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {deposited && !staged && (
            <button
              type="button"
              onClick={onPreviewDeposited}
              disabled={previewPending}
              className="btn btn-outline text-xs"
            >
              {previewPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Eye className="h-3.5 w-3.5" aria-hidden />
              )}
              Aperçu
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            id={`file-${doc.type}`}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          <label
            htmlFor={`file-${doc.type}`}
            className={`btn text-xs ${deposited ? 'btn-outline' : 'btn-primary'} cursor-pointer ${
              busy ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {deposited ? 'Remplacer' : 'Déposer'}
          </label>
        </div>
      </div>
    </li>
  )
}

// ── Informations ────────────────────────────────────────────────────────────

function InfoBlock({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 border-b border-[rgba(31,42,55,0.1)] pb-2">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        {note && <p className="text-xs text-ink-soft">{note}</p>}
      </div>
      <div className="pt-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={`text-navy ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value ?? <span className="text-ink-soft">Non renseigné</span>}
      </span>
    </div>
  )
}
