'use client'

import { Onglets } from '@/components/shared/Onglets'
import Link from 'next/link'

import { Suspense, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  IdCard,
  Loader2,
  Receipt,
  RotateCw,
  Upload,
} from 'lucide-react'
import ChefPageSkeleton from '@/components/chef/ChefPageSkeleton'
import ChefPage from '@/components/chef/ChefPage'
import AnswerSections from '@/components/chef/dossier/AnswerSections'
import { PaymentInvoiceList, PaymentInvoicesInfo } from '@/components/shared/PaymentInvoiceList'
import { useToast } from '@/components/shared/Toaster'
import { SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import DocumentPreviewDialog, {
  type PreviewSource,
} from '@/components/chef/DocumentPreviewDialog'
import { cn } from '@/lib/utils'
import { useMeProfile } from '@/lib/api/me-profile'
import { useChefApproved } from '@/lib/chef/approval'
import type { ChefProfile } from '@/lib/api/types'
import {
  DOC_STATUS_LABEL,
  DOSSIER_LABEL,
  EXPIRING_TYPES,
  SYSTEM_TYPES,
  FAMILY_HINT,
  FAMILY_LABEL,
  MAX_FILE_MB,
  PreviewUnavailable,
  UploadError,
  checkFile,
  reapplyTooEarly,
  useChefApplication,
  useChefDocuments,
  useDocumentPreview,
  useUploadDocument,
  type ChefDocument,
  type DocumentFamily,
  type DocumentStatus,
  type DossierStatus,
} from '@/lib/api/chef-documents'
import { apiMessage } from '@/lib/api/messages'

/* ─────────────────────────────────────────────────────────────────────────────
   Mon dossier — les pièces et les réponses déclarées, au même endroit.

   Les deux étaient séparés, et c'était faux : ce sont les réponses qui
   décident des pièces demandées. Quelqu'un à qui l'on réclame un justificatif
   d'immatriculation doit pouvoir, au même endroit, voir qu'il s'est déclaré
   sans entreprise — et le corriger.

   L'écran répond à une seule question, en haut et sans défilement : **qu'est-ce
   que je dois faire maintenant ?** Le détail vient après, en deux onglets,
   parce que déposer une pièce et corriger une réponse sont deux gestes
   différents.
   ───────────────────────────────────────────────────────────────────────────── */

const FAMILY_ORDER: DocumentFamily[] = ['blocking', 'conditional', 'recommended']

/** Un statut se lit : le point porte la couleur, le fond reste du papier. */
const DOC_STYLE: Record<DocumentStatus, { dot: string; text: string }> = {
  missing: { dot: 'bg-ink-soft/40', text: 'text-ink-soft' },
  submitted: { dot: 'bg-amber', text: 'text-amber-ink' },
  reviewing: { dot: 'bg-amber', text: 'text-amber-ink' },
  valid: { dot: 'bg-mint-deep', text: 'text-mint-ink' },
  rejected: { dot: 'bg-red-500', text: 'text-red-700' },
  expiring: { dot: 'bg-terra', text: 'text-amber-ink' },
  expired: { dot: 'bg-red-500', text: 'text-red-700' },
}

const DOSSIER_LEAD: Record<DossierStatus, string> = {
  draft:
    'Déposez vos pièces obligatoires pour que nous puissions instruire votre dossier.',
  incomplete:
    'Une pièce obligatoire manque ou a été refusée. Tant qu’elle n’est pas validée, votre compte ne peut pas être activé.',
  reviewing: 'Tout est déposé. Notre équipe vérifie vos pièces — comptez 48 h ouvrées.',
  'awaiting-registration':
    'Vos pièces sont bonnes. Il ne manque que votre immatriculation : ajoutez votre SIRET dès que vous l’avez.',
  validated:
    'Votre dossier est complet et validé. Pensez à renouveler vos pièces avant leur échéance.',
  suspended:
    'Une pièce obligatoire a expiré et votre vitrine est hors ligne. Déposez la nouvelle version : vous repassez en ligne immédiatement.',
  disabled:
    'Votre compte a été désactivé par notre équipe. Écrivez-nous depuis la messagerie.',
}

/** La couleur du filet et du point. Le reste de la carte reste sobre. */
const DOSSIER_TONE: Record<DossierStatus, { rule: string; dot: string }> = {
  draft: { rule: 'bg-ink-soft/40', dot: 'bg-ink-soft' },
  incomplete: { rule: 'bg-red-500', dot: 'bg-red-500' },
  reviewing: { rule: 'bg-amber', dot: 'bg-amber' },
  'awaiting-registration': { rule: 'bg-terra', dot: 'bg-terra' },
  validated: { rule: 'bg-mint-deep', dot: 'bg-mint-deep' },
  suspended: { rule: 'bg-red-500', dot: 'bg-red-500' },
  disabled: { rule: 'bg-ink-soft/40', dot: 'bg-ink-soft' },
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

const formatSize = (b: number) =>
  b < 1024 * 1024
    ? `${Math.max(1, Math.round(b / 1024))} Ko`
    : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`

type Onglet = 'pieces' | 'infos' | 'factures'

/** Les sections de réponses, telles qu'on peut y arriver depuis un lien. */
const SECTIONS = ['identity', 'address', 'work', 'company', 'zones'] as const
type Section = (typeof SECTIONS)[number]

/**
 * On arrive ici depuis la vitrine pour une seule chose — ses zones, par
 * exemple. `?section=zones` ouvre l'onglet et la section voulue, plutôt que de
 * laisser chercher dans une page qui en contient cinq.
 */
export default function DossierPage() {
  return (
    <Suspense fallback={<ChefPageSkeleton />}>
      <Dossier />
    </Suspense>
  )
}

function Dossier() {
  const { data, isPending, isError, error, refetch } = useChefDocuments()
  const application = useChefApplication()
  const profil = useMeProfile()
  const demandee = useSearchParams().get('section')
  const section = SECTIONS.find((s) => s === demandee)
  const [onglet, setOnglet] = useState<Onglet>(section ? 'infos' : 'pieces')
  const [preview, setPreview] = useState<PreviewSource | null>(null)
  const remote = useDocumentPreview()

  if (isPending) {
    return (
      <ChefPage title="Mon dossier">
        <SkeletonGroup className="mx-auto max-w-5xl space-y-4">
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-12 w-72 rounded-full p-0" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-44" />
            ))}
          </div>
        </SkeletonGroup>
      </ChefPage>
    )
  }

  if (isError || !data) {
    return (
      <ChefPage title="Mon dossier">
        <div className="mx-auto max-w-lg rounded-2xl bg-paper p-6 text-center">
          <p className="font-display text-lg font-bold text-navy">Dossier indisponible</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-mid">
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
  const app = application.data

  /*
   * `disabled` recouvre deux situations très différentes, et l'API ne les
   * distingue pas : un compte mis hors ligne par sanction, et un compte
   * fraîchement approuvé qui attend sa mise en ligne — approuver vérifie le
   * batch cooker sans le rendre réservable, c'est un second geste côté admin.
   *
   * Le profil tranche : vérifié mais pas actif, c'est une attente, pas une
   * sanction. Dire « votre compte a été désactivé » à quelqu'un qui vient
   * d'être accepté serait à la fois faux et inquiétant.
   */
  const moi =
    profil.data?.profileType === 'chef' ? (profil.data.profile as ChefProfile | null) : null
  const attendMiseEnLigne =
    dossierStatus === 'disabled' &&
    (moi?.isVerified === true || app?.status === 'approved') &&
    moi?.isActive !== true
  const blocking = documents.filter((d) => d.family === 'blocking')
  const valides = blocking.filter((d) => d.status === 'valid').length

  /** Ce qui attend une action de la part du chef, pour l'onglet. */
  const aTraiter = documents.filter(
    (d) =>
      d.status === 'rejected' ||
      d.status === 'expired' ||
      d.status === 'expiring' ||
      (d.status === 'missing' && d.required),
  ).length

  /** La phrase qui dit quoi faire maintenant, et rien d'autre. */
  const prochaineChose = (() => {
    const refusee = documents.find((d) => d.status === 'rejected')
    if (refusee) return `redéposer « ${refusee.label} », qui a été refusée.`
    const expiree = documents.find((d) => d.status === 'expired')
    if (expiree) return `remplacer « ${expiree.label} », qui a expiré.`
    const manquante = documents.find((d) => d.status === 'missing' && d.required)
    if (manquante) return `déposer « ${manquante.label} ».`
    if (dossierStatus === 'awaiting-registration') {
      return 'renseigner votre immatriculation, dans l’onglet « Mes informations ».'
    }
    const bientot = documents.find((d) => d.status === 'expiring')
    if (bientot) return `anticiper le renouvellement de « ${bientot.label} ».`
    if (dossierStatus === 'reviewing') return 'rien — la balle est dans notre camp.'
    if (attendMiseEnLigne) return 'rien — votre vitrine est relue avant d’être publiée.'
    return null
  })()

  const tone = attendMiseEnLigne
    ? { rule: 'bg-amber', dot: 'bg-amber' }
    : DOSSIER_TONE[dossierStatus]
  const titre = attendMiseEnLigne
    ? 'En attente de mise en ligne'
    : DOSSIER_LABEL[dossierStatus]
  const chapeau = attendMiseEnLigne
    ? 'Votre candidature est approuvée et vos pièces sont validées. Notre équipe relit votre vitrine avant de la rendre visible aux clients — vous n’avez rien à faire.'
    : DOSSIER_LEAD[dossierStatus]

  function openDeposited(doc: ChefDocument) {
    setPreview({ label: doc.label, fileName: doc.fileName ?? undefined })
    remote.mutate(doc.type, {
      onSuccess: (r) =>
        setPreview({
          label: doc.label,
          url: r.url,
          // Sans le type, la modale ne reconnaissait pas le PDF et proposait
          // de le télécharger au lieu de l'afficher.
          mimeType: r.mimeType,
          fileName: r.fileName ?? doc.fileName ?? undefined,
        }),
      onError: () => setPreview(null),
    })
  }

  return (
    <ChefPage
      title="Mon dossier"
      subtitle="Vos pièces, vos informations, et ce qu’il reste à faire."
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── Où en est le dossier, sans faire défiler ─────────────────── */}
        <section
          className="relative overflow-hidden rounded-2xl bg-paper p-5 lg:p-6"
        >
          <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', tone.rule)} />

          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 pl-3">
            <div className="min-w-0 max-w-prose">
              <p className="flex items-center gap-2">
                <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} />
                <span className="font-display text-xl font-bold leading-tight text-navy">
                  {titre}
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-mid">{chapeau}</p>

              {prochaineChose && (
                <p className="mt-3.5 rounded-xl bg-cream-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-navy">
                  <span className="font-semibold">La prochaine chose à faire&nbsp;:</span>{' '}
                  {prochaineChose}
                </p>
              )}
            </div>

            {blocking.length > 0 && (
              <div className="w-full max-w-[14rem] shrink-0">
                <div className="flex items-baseline justify-between text-xs text-ink-mid">
                  <span>Pièces obligatoires</span>
                  <span className="font-semibold tabular-nums text-navy">
                    {valides}/{blocking.length}
                  </span>
                </div>
                {/* Un segment par pièce : on voit laquelle bloque, pas juste
                    un pourcentage. */}
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={blocking.length}
                  aria-valuenow={valides}
                  aria-label="Pièces obligatoires validées"
                  className="mt-2 flex gap-1"
                >
                  {blocking.map((d) => (
                    <span
                      key={d.type}
                      title={`${d.label} — ${DOC_STATUS_LABEL[d.status]}`}
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        d.status === 'valid'
                          ? 'bg-mint-deep'
                          : d.status === 'rejected' || d.status === 'expired'
                            ? 'bg-red-400'
                            : d.status === 'missing'
                              ? 'bg-cream-deep'
                              : 'bg-amber',
                      )}
                    />
                  ))}
                </div>
                {app?.reference && (
                  <p className="mt-3 text-xs uppercase tracking-[0.12em] text-ink-soft">
                    {app.reference}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Un refus se lit avant tout le reste. */}
        {app?.refusal?.reason && (
          <section className="rounded-2xl bg-red-50 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Votre candidature a été refusée
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{app.refusal.reason}</p>
            {reapplyTooEarly(app) ? (
              <p className="mt-2 text-xs text-ink-mid">
                Vous pourrez candidater à nouveau à partir du{' '}
                {formatDate(app.refusal.allowReapplyAfter!)}.
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs text-ink-mid">
                  Vous pouvez corriger votre dossier et le redéposer. Vos
                  réponses sont conservées, vos pièces aussi.
                </p>
                <Link href="/devenir-chef" className="btn btn-primary mt-3 text-xs">
                  Corriger et redéposer
                </Link>
              </>
            )}
          </section>
        )}

        {/* ── Deux gestes, deux onglets ─────────────────────────────────── */}
        <Onglets
          label="Mon dossier"
          value={onglet}
          onChange={setOnglet}
          items={[
            { id: 'pieces', Icon: FileText, label: 'Mes pièces', alert: aTraiter },
            { id: 'infos', Icon: IdCard, label: 'Mes informations' },
            { id: 'factures', Icon: Receipt, label: 'Mes factures' },
          ]}
        />

        {onglet === 'pieces' ? (
          <section>
            <p className="max-w-prose text-sm leading-relaxed text-ink-mid">
              La liste est établie d’après vos réponses — ni plus, ni moins. PDF, JPG, PNG ou
              WebP, {MAX_FILE_MB} Mo au maximum.
            </p>

            <div className="mt-5 space-y-7">
              {FAMILY_ORDER.map((family) => {
                const docs = documents.filter((d) => d.family === family)
                if (docs.length === 0) return null
                return (
                  <div key={family}>
                    <h2 className="font-display text-base font-bold text-navy">
                      {FAMILY_LABEL[family]}
                    </h2>
                    <p className="mt-0.5 max-w-prose text-[13px] leading-relaxed text-ink-soft">
                      {FAMILY_HINT[family]}
                    </p>
                    <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
                      {docs.map((doc) => (
                        <DocumentCard
                          key={doc.type}
                          doc={doc}
                          onPreviewLocal={(file) => setPreview({ label: doc.label, file })}
                          onPreviewDeposited={() => openDeposited(doc)}
                          previewPending={remote.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {remote.error instanceof PreviewUnavailable && (
              <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-cream-soft px-4 py-3 text-[13px] leading-relaxed text-ink-mid">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                Aucun fichier déposé pour cette pièce — il n’y a donc rien à relire.
              </p>
            )}
          </section>
        ) : onglet === 'factures' ? (
          <section>
            <p className="flex max-w-prose items-start gap-1 text-sm leading-relaxed text-ink-mid">
              Les factures émises en votre nom pour les paiements par carte de vos clients.
              <PaymentInvoicesInfo side="chef" />
            </p>
            <div className="mt-4">
              <PaymentInvoiceList side="chef" emptyText="Aucune facture pour l’instant." />
            </div>
          </section>
        ) : (
          <AnswerSections app={app} section={section} />
        )}
      </div>

      <DocumentPreviewDialog
        source={preview}
        loading={remote.isPending}
        onClose={() => setPreview(null)}
      />
    </ChefPage>
  )
}

/* ── Les actions d'une carte ───────────────────────────────────────────────── */

/**
 * Une action secondaire tient dans une icône : le mot n'ajoute rien à côté
 * d'un dossier déjà dense. L'intitulé reste accessible, en `aria-label` et en
 * infobulle — sans lui, un bouton rond ne dit rien à personne.
 */
function IconAction({
  Icon,
  label,
  onClick,
  disabled,
  busy,
}: {
  Icon: typeof Eye
  label: string
  onClick: () => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      title={label}
      aria-label={label}
      className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(31,42,55,0.1)] bg-paper text-ink-mid transition-colors hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}

/** La même chose pour le dépôt, qui passe par un `<label>` et non un bouton. */
function IconUpload({
  htmlFor,
  label,
  disabled,
}: {
  htmlFor: string
  label: string
  disabled?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[rgba(31,42,55,0.1)] bg-paper text-ink-mid transition-colors hover:border-navy hover:text-navy',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      <Upload className="h-4 w-4" aria-hidden />
    </label>
  )
}

/* ── Une pièce ─────────────────────────────────────────────────────────────── */

function DocumentCard({
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
  const { candidate } = useChefApproved()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [expiresOn, setExpiresOn] = useState('')
  const [staged, setStaged] = useState<File | null>(null)

  // Sept pièces sur dix portent une échéance : on ne demande la date que pour
  // celles-là, et on dit pourquoi. Les autres n'en entendent jamais parler.
  const needsDate = EXPIRING_TYPES.has(doc.type)
  // Le mandat SEPA se signe chez Stripe : il se relit ici, il ne se dépose pas.
  const systeme = SYSTEM_TYPES.has(doc.type)
  const deposited = doc.version > 0
  const busy = upload.isPending
  const failure = upload.error instanceof UploadError ? upload.error : null
  const style = DOC_STYLE[doc.status]

  /*
   * Quatre états, quatre allures. Une pièce à déposer est un emplacement vide,
   * en pointillés : on voit le trou avant de lire le mot. Une pièce qui pose
   * problème est cerclée de rouge. Une pièce validée se tait — elle est faite,
   * elle n'a plus à attirer l'œil. Et une pièce en vérification attend.
   */
  const aDeposer = doc.status === 'missing'
  const probleme = doc.status === 'rejected' || doc.status === 'expired'
  const bientot = doc.status === 'expiring'
  const validee = doc.status === 'valid'

  function pick(file: File | null) {
    setLocalError(null)
    if (!file) return
    const problem = checkFile(file)
    if (problem) {
      setLocalError(problem)
      return
    }
    // Le fichier est mis de côté : on le relit, on complète la date si la pièce
    // expire. Rien ne part avant confirmation.
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
              : apiMessage(e),
          ),
      },
    )
  }

  const meta = [
    doc.fileName,
    doc.sizeBytes ? formatSize(doc.sizeBytes) : null,
    doc.version > 1 ? `version ${doc.version}` : null,
  ].filter(Boolean)

  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl p-4 lg:p-5',
        aDeposer
          ? 'border-2 border-dashed border-[rgba(31,42,55,0.16)] bg-transparent'
          : 'bg-paper',
        probleme && 'ring-1 ring-red-300',
        bientot && 'ring-1 ring-terra/30',
      )}
    >
      {/* Un filet vertical porte l'état sur les pièces déposées. */}
      {!aDeposer && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-[3px]',
            validee ? 'bg-mint-deep' : style.dot,
          )}
        />
      )}

      <header className={cn('flex items-start justify-between gap-3', !aDeposer && 'pl-2.5')}>
        <h3
          className={cn(
            'min-w-0 text-[15px] font-semibold leading-snug',
            aDeposer ? 'text-ink-mid' : 'text-navy',
          )}
        >
          {doc.label}
          {doc.required && (
            <span className="ml-1.5 align-middle text-xs font-normal text-ink-soft">
              obligatoire
            </span>
          )}
        </h3>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold',
            style.text,
          )}
        >
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
          {DOC_STATUS_LABEL[doc.status]}
        </span>
      </header>

      <div className={cn(!aDeposer && 'pl-2.5')}>
        {aDeposer ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            Rien de déposé pour l’instant.
          </p>
        ) : (
          <>
            <p className="mt-1.5 truncate text-[13px] text-ink-soft">
              {meta.join(' · ')}
            </p>
            {doc.submittedAt && (
              <p className="text-[13px] text-ink-soft">
                déposée le {formatDate(doc.submittedAt)}
              </p>
            )}
          </>
        )}

      {doc.expiresOn && (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1.5 text-[13px]',
            doc.status === 'expired' ? 'text-red-700' : 'text-ink-mid',
          )}
        >
          <CalendarClock
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              doc.status === 'expired' ? 'text-red-500' : 'text-amber-ink',
            )}
            aria-hidden
          />
          {doc.status === 'expired' ? 'A expiré le' : 'Expire le'} {formatDate(doc.expiresOn)}
        </p>
      )}

      {doc.status === 'rejected' && doc.reason && (
        <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] leading-relaxed text-red-800">
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
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Envoyée. Notre équipe la vérifie.
        </p>
      )}

      {/* Le fichier choisi, relu avant départ. */}
      {staged && (
        <div className="mt-3 rounded-xl bg-cream-soft p-3.5">
          <p className="text-[13px] font-semibold text-navy">
            Prêt à envoyer
            <span className="mt-0.5 block truncate font-normal text-ink-mid">
              {staged.name} · {formatSize(staged.size)}
            </span>
          </p>

          {needsDate && (
            <div className="mt-3">
              <label
                htmlFor={`exp-${doc.type}`}
                className="block text-[13px] font-semibold text-navy"
              >
                Date d’expiration
              </label>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                Cette pièce a une échéance : elle figure dessus. Nous vous préviendrons 60,
                30 et 7 jours avant.
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
              className="hit text-xs text-ink-soft hover:text-navy"
            >
              Changer
            </button>
          </div>
        </div>
      )}

      </div>

      {/*
       * Les actions restent en bas, alignées d'une carte à l'autre. Seule
       * celle qui demande un geste porte un mot : déposer ce qui manque,
       * remplacer ce qui pose problème. Le reste tient dans une icône.
       */}
      <div className={cn('mt-auto flex flex-wrap items-center gap-2 pt-4', !aDeposer && 'pl-2.5')}>
        {systeme ? (
          // La rémunération se règle après validation : avant, le lien mènerait
          // à une page fermée.
          !candidate && (
            <Link
              href="/espace-chef/remuneration"
              className="hit text-xs font-semibold text-navy underline-offset-2 hover:underline"
            >
              Changer de compte bancaire
            </Link>
          )
        ) : (
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            id={`file-${doc.type}`}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        )}

        {systeme ? null : aDeposer || probleme ? (
          <label
            htmlFor={`file-${doc.type}`}
            className={cn(
              'btn btn-primary cursor-pointer text-xs',
              busy && 'pointer-events-none opacity-50',
            )}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            {aDeposer ? 'Déposer' : 'Remplacer'}
          </label>
        ) : (
          <IconUpload
            htmlFor={`file-${doc.type}`}
            label={bientot ? 'Déposer la nouvelle version' : 'Remplacer cette pièce'}
            disabled={busy}
          />
        )}

        {deposited && !staged && (
          <IconAction
            Icon={Eye}
            label="Relire ma pièce"
            onClick={onPreviewDeposited}
            busy={previewPending}
          />
        )}
      </div>
    </article>
  )
}
