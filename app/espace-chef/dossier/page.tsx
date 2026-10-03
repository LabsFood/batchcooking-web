'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  RotateCw,
  Upload,
} from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge, { type Tone } from '@/components/chef/StatusBadge'
import {
  DOC_STATUS_LABEL,
  DOSSIER_LABEL,
  EXPIRING_TYPES,
  FAMILY_HINT,
  FAMILY_LABEL,
  MAX_FILE_MB,
  UploadError,
  checkFile,
  useChefDocuments,
  useUploadDocument,
  type ChefDocument,
  type DocumentFamily,
  type DocumentStatus,
  type DossierStatus,
} from '@/lib/api/chef-documents'

/* ─────────────────────────────────────────────────────────────────────────────
   Mes documents — `GET /me/chef-documents`.

   C'est l'écran qui tient la promesse faite à la candidature : « vous
   déposerez vos pièces depuis votre espace ». Il marche avant comme après
   l'approbation, puisque les pièces expirent et se renouvellent.

   La liste des pièces est décidée par l'API d'après les réponses du candidat :
   on ne la calcule pas ici, on la rend.
   ───────────────────────────────────────────────────────────────────────────── */

const FAMILY_ORDER: DocumentFamily[] = ['blocking', 'conditional', 'recommended']

const DOC_TONE: Record<DocumentStatus, Tone> = {
  missing: 'neutral',
  submitted: 'info',
  reviewing: 'info',
  valid: 'success',
  rejected: 'danger',
  expiring: 'warning',
  expired: 'danger',
}

const DOSSIER_TONE: Record<DossierStatus, Tone> = {
  draft: 'neutral',
  incomplete: 'warning',
  reviewing: 'info',
  'awaiting-registration': 'warning',
  validated: 'success',
  suspended: 'danger',
  disabled: 'danger',
}

/** Ce que le batch cooker doit comprendre en une phrase, selon son dossier. */
const DOSSIER_LEAD: Record<DossierStatus, string> = {
  draft: 'Votre dossier est ouvert. Déposez vos pièces obligatoires pour que nous puissions l’instruire.',
  incomplete: 'Il manque une pièce obligatoire, ou l’une d’elles a été refusée. Tant qu’elle n’est pas validée, votre compte ne peut pas être activé.',
  reviewing: 'Tout est déposé. Notre équipe vérifie vos pièces — comptez 48 h ouvrées.',
  'awaiting-registration': 'Vos pièces sont bonnes. Il ne manque que votre immatriculation : ajoutez votre SIRET dès que vous l’avez.',
  validated: 'Votre dossier est complet et validé. Pensez à renouveler les pièces avant leur expiration.',
  suspended: 'Une pièce obligatoire a expiré, votre vitrine est hors ligne. Déposez la nouvelle version : vous repassez en ligne immédiatement.',
  disabled: 'Votre compte a été désactivé par notre équipe. Contactez-nous depuis la messagerie.',
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const formatSize = (b: number) =>
  b < 1024 * 1024
    ? `${Math.max(1, Math.round(b / 1024))} Ko`
    : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`

export default function DossierPage() {
  const { data, isPending, isError, error, refetch } = useChefDocuments()

  if (isPending) {
    return (
      <ChefPage title="Mes documents">
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-3xl bg-paper" />
          <div className="h-64 animate-pulse rounded-3xl bg-paper" />
        </div>
      </ChefPage>
    )
  }

  if (isError || !data) {
    return (
      <ChefPage title="Mes documents">
        <Card>
          <p className="font-display text-lg font-bold text-navy">Dossier indisponible</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-mid">
            {error instanceof Error
              ? error.message
              : 'Votre dossier n’a pas pu être chargé.'}
          </p>
          <button onClick={() => refetch()} className="btn btn-primary mt-5 text-xs">
            <RotateCw className="h-3.5 w-3.5" /> Réessayer
          </button>
        </Card>
      </ChefPage>
    )
  }

  const { dossierStatus, documents } = data
  const blocking = documents.filter((d) => d.family === 'blocking')
  const done = blocking.filter((d) => d.status === 'valid').length

  return (
    <ChefPage
      title="Mes documents"
      subtitle="Vos justificatifs, leur état, et ce qu’il reste à fournir."
    >
      <div className="space-y-5">
        {/* ── Où en est le dossier ─────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-navy p-6 text-white lg:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-sm text-amber">Dossier {DOSSIER_LABEL[dossierStatus]}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-white/80">
                {DOSSIER_LEAD[dossierStatus]}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold tabular-nums text-amber">
                {done}/{blocking.length}
              </p>
              <p className="text-xs text-white/55">pièces obligatoires validées</p>
            </div>
          </div>
        </motion.section>

        {/* ── Les pièces, par famille ──────────────────────────────────── */}
        {FAMILY_ORDER.map((family) => {
          const docs = documents.filter((d) => d.family === family)
          if (docs.length === 0) return null
          return (
            <Card key={family}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-navy">
                  {FAMILY_LABEL[family]}
                </h2>
                <p className="text-xs text-ink-soft">{FAMILY_HINT[family]}</p>
              </div>
              <ul className="divide-y divide-[rgba(31,42,55,0.08)]">
                {docs.map((doc) => (
                  <DocumentRow key={doc.type} doc={doc} />
                ))}
              </ul>
            </Card>
          )
        })}

        <p className="flex items-start gap-2.5 rounded-2xl bg-cream-soft px-4 py-3 text-xs leading-relaxed text-ink-mid">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
          <span>
            PDF, JPG, PNG ou WebP, {MAX_FILE_MB} Mo au maximum. Vos fichiers partent chiffrés
            vers un stockage privé : ils ne transitent pas par le site, et seule notre équipe de
            vérification peut les ouvrir.
          </span>
        </p>
      </div>
    </ChefPage>
  )
}

function DocumentRow({ doc }: { doc: ChefDocument }) {
  const upload = useUploadDocument()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [expiresOn, setExpiresOn] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const needsDate = EXPIRING_TYPES.has(doc.type)
  const deposited = doc.version > 0

  function pick(file: File | null) {
    setLocalError(null)
    if (!file) return
    const problem = checkFile(file)
    if (problem) {
      setLocalError(problem)
      return
    }
    // Une pièce qui expire ne part pas sans sa date : l'API la refuserait.
    if (needsDate) setPendingFile(file)
    else send(file)
  }

  function send(file: File, date?: string) {
    upload.mutate(
      { type: doc.type, file, expiresOn: date },
      {
        onSuccess: () => {
          setPendingFile(null)
          setExpiresOn('')
          if (inputRef.current) inputRef.current.value = ''
        },
      },
    )
  }

  const busy = upload.isPending
  const failure = upload.error instanceof UploadError ? upload.error : null

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">
            {doc.label}
            {doc.required && <span className="ml-2 text-[11px] font-normal text-terra">requise</span>}
          </p>

          <p className="mt-0.5 text-xs text-ink-soft">
            {deposited
              ? [
                  doc.fileName,
                  doc.sizeBytes ? formatSize(doc.sizeBytes) : null,
                  doc.submittedAt ? `déposée le ${formatDate(doc.submittedAt)}` : null,
                  doc.version > 1 ? `version ${doc.version}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Aucun dépôt'}
          </p>

          {doc.expiresOn && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-mid">
              <CalendarClock className="h-3.5 w-3.5 text-amber" aria-hidden />
              Expire le {formatDate(doc.expiresOn)}
            </p>
          )}

          {/* Le motif de refus est écrit par l'équipe : on le montre tel quel. */}
          {doc.status === 'rejected' && doc.reason && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] leading-relaxed text-red-800">
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
                ? 'Le transfert du fichier s’est interrompu. Rien n’a été enregistré — réessayez.'
                : failure.message}
            </p>
          )}

          {upload.isSuccess && !busy && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-mint-ink">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Déposée. Notre équipe la vérifie.
            </p>
          )}

          {/* Date d'expiration : demandée avant l'envoi, pas après un refus. */}
          {pendingFile && (
            <div className="mt-3 rounded-2xl bg-cream-soft p-3.5">
              <label
                htmlFor={`exp-${doc.type}`}
                className="block text-[13px] font-semibold text-navy"
              >
                Date d’expiration de ce document
              </label>
              <p className="mt-0.5 text-xs text-ink-soft">
                Elle figure sur la pièce. Nous vous préviendrons avant l’échéance.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  id={`exp-${doc.type}`}
                  type="date"
                  value={expiresOn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setExpiresOn(e.target.value)}
                  className="input-base w-auto py-2"
                />
                <button
                  type="button"
                  disabled={!expiresOn || busy}
                  onClick={() => send(pendingFile, expiresOn)}
                  className="btn btn-primary text-xs disabled:opacity-50"
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
                  onClick={() => {
                    setPendingFile(null)
                    setExpiresOn('')
                  }}
                  className="text-xs text-ink-soft hover:text-navy"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge tone={DOC_TONE[doc.status]}>{DOC_STATUS_LABEL[doc.status]}</StatusBadge>

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
            className={`btn btn-outline cursor-pointer text-xs ${busy ? 'pointer-events-none opacity-50' : ''}`}
          >
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Envoi…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" aria-hidden />
                {deposited ? 'Remplacer' : 'Déposer'}
              </>
            )}
          </label>
        </div>
      </div>
    </li>
  )
}
