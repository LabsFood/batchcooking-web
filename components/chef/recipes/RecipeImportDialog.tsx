'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, ArrowRight, Camera, FileUp, Link2, Loader2, Sparkles, Type, X } from 'lucide-react'
import ActivityTrail, { type ActivityStep } from '@/components/shared/ActivityTrail'
import { Onglets } from '@/components/shared/Onglets'
import { apiMessage } from '@/lib/api/messages'
import {
  checkImportFiles,
  IMPORT_MAX_FILES,
  IMPORT_MAX_MB,
  useChooseImport,
  useRecipeImport,
  useStartImport,
  ESTIMATED_LABEL,
  type ImportSourceType,
  type RecipeImport,
  type UploadEvent,
} from '@/lib/api/recipe-imports'
import { track } from '@/lib/analytics'

/* ─────────────────────────────────────────────────────────────────────────────
   Importer une recette.

   Quatre façons de donner la recette : un fichier ou une photo (prise sur le
   moment au téléphone), un texte collé, un lien, ou juste le nom du plat. On
   envoie, et la fenêtre reste ouverte : elle montre le fil de ce que l'IA a
   fait (envoi, lecture, liaison à la liste d'ingrédients, points à relire),
   tiré des seuls événements réels, jamais d'un récit inventé. Le cuisinier
   ouvre ensuite le brouillon dans le formulaire habituel, à relire. Rien n'est
   publié, et les allergènes restent à confirmer par le cuisinier.

   En cas d'échec, l'étape en cause passe en rouge, avec le message de l'API et
   une sortie : « Saisir à la main ».
   ───────────────────────────────────────────────────────────────────────────── */

const TABS: { id: ImportSourceType; label: string; Icon: typeof FileUp }[] = [
  { id: 'file', label: 'Fichier ou photo', Icon: FileUp },
  { id: 'text', label: 'Coller un texte', Icon: Type },
  { id: 'url', label: 'Lien', Icon: Link2 },
  { id: 'title', label: 'Partir d’un titre', Icon: Sparkles },
]

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'

/** Ce que le navigateur sait de l'envoi, avant que l'API ne prenne le relais. */
type Progress = { current: string | null; done: number; total: number; created: boolean }
const NO_PROGRESS: Progress = { current: null, done: 0, total: 0, created: false }

export default function RecipeImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [tab, setTab] = useState<ImportSourceType>('file')
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress>(NO_PROGRESS)
  const [trailOpen, setTrailOpen] = useState(true)
  const start = useStartImport(onUploadEvent)
  const choose = useChooseImport()
  const current = useRecipeImport(importId)
  const data = current.data
  const opened = useRef(false)

  useEffect(() => {
    if (open && !opened.current) {
      opened.current = true
      track('recipe_import_opened', {})
    }
  }, [open])

  function onUploadEvent(e: UploadEvent) {
    setProgress((p) =>
      e.kind === 'upload'
        ? { ...p, current: e.name, total: e.total }
        : e.kind === 'uploaded'
          ? { ...p, done: e.index + 1, total: e.total, current: null }
          : { ...p, created: true },
    )
  }

  // Le brouillon est prêt : la fenêtre reste ouverte sur le fil, le cuisinier
  // l'ouvre quand il a vu ce que l'IA a fait.
  useEffect(() => {
    if (data?.status === 'done' && data.meals[0]) {
      track('recipe_import_done', {
        source: data.sourceType,
        seconds: data.finishedAt ? Math.round((Date.parse(data.finishedAt) - Date.parse(data.createdAt)) / 1000) : 0,
        linked: data.linked ?? 0,
        toVerify: data.toVerify ?? 0,
      })
    }
    if (data?.status === 'failed') track('recipe_import_failed', { source: data.sourceType, code: data.error?.code ?? 'unknown' })
  }, [data?.status]) // eslint-disable-line react-hooks/exhaustive-deps -- une fois par changement d'état

  function openDraft() {
    if (!data?.meals[0]) return
    router.push(`/espace-chef/recettes/${data.meals[0].id}?import=${data.id}`)
  }

  function reset() {
    setImportId(null)
    setLocalError(null)
    setProgress(NO_PROGRESS)
    setTrailOpen(true)
    start.reset()
  }

  function close() {
    if (start.isPending) return
    reset()
    setFiles([])
    onClose()
  }

  function addFiles(list: FileList | null) {
    setLocalError(null)
    if (!list) return
    const next = [...files, ...Array.from(list)].slice(0, IMPORT_MAX_FILES + 1)
    setFiles(next)
    setLocalError(checkImportFiles(next))
  }

  function submit() {
    setLocalError(null)
    if (tab === 'file') {
      const problem = checkImportFiles(files)
      if (problem) return setLocalError(problem)
    }
    if (tab === 'text' && text.trim().length < 20) return setLocalError('Collez le texte de la recette.')
    if (tab === 'url' && !/^https:\/\//i.test(url.trim())) return setLocalError('Collez un lien qui commence par https://')
    if (tab === 'title' && title.trim().length < 3) return setLocalError('Donnez le nom du plat.')
    const input =
      tab === 'file'
        ? { sourceType: 'file' as const, files }
        : tab === 'text'
          ? { sourceType: 'text' as const, text }
          : tab === 'url'
            ? { sourceType: 'url' as const, url: url.trim() }
            : { sourceType: 'title' as const, title: title.trim() }
    setProgress(NO_PROGRESS)
    setTrailOpen(true)
    start.mutate(input, { onSuccess: (res) => setImportId(res.id) })
  }

  const error = localError ?? (start.error ? apiMessage(start.error) : null)
  // Le fil s'affiche dès l'envoi et reste jusqu'à la fermeture.
  const started = start.isPending || Boolean(importId) || (start.isError && !localError)
  const uploadFailed = start.isError ? apiMessage(start.error) : null
  const steps = started ? buildSteps({ tab, files, text, url, title, progress, data, uploadFailed }) : []
  const summary = summarize(data, uploadFailed, start.isPending)

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-navy/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-paper p-6 shadow-[0_24px_60px_-20px_rgba(31,42,55,0.3)] focus:outline-none">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-lg font-bold leading-snug text-navy">
              Importer une recette
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="hit -m-2 rounded-full p-2 text-ink-soft hover:text-navy" aria-label="Fermer" disabled={start.isPending}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description asChild>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">
              L’IA prépare un brouillon que vous relisez dans le formulaire habituel. Vous restez responsable des recettes que vous publiez.
            </p>
          </Dialog.Description>

          {started ? (
            <div className="mt-5 space-y-4">
              <ActivityTrail
                title="Comment l’IA a lu la recette"
                summary={summary}
                steps={steps}
                open={trailOpen}
                onToggle={() => setTrailOpen((v) => !v)}
              />
              {data?.status === 'review' ? (
                <Review
                  data={data}
                  pending={choose.isPending}
                  error={choose.error ? apiMessage(choose.error) : null}
                  onChoose={(index) => choose.mutate({ id: data.id, index })}
                  onCancel={close}
                />
              ) : data?.status === 'done' ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" autoFocus onClick={openDraft} className="btn btn-primary text-xs">
                    Ouvrir le brouillon <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button type="button" onClick={reset} className="btn btn-outline text-xs">
                    Importer une autre recette
                  </button>
                </div>
              ) : data?.status === 'failed' || uploadFailed ? (
                <Failed message={data?.error?.message ?? uploadFailed ?? 'L’import a échoué.'} onRetry={reset} />
              ) : (
                <p className="text-[13px] text-ink-soft">
                  Comptez de quelques secondes à une minute pour une photo. Vous pouvez fermer : l’import continue, le brouillon
                  apparaîtra dans vos plats.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mt-5">
                <Onglets label="Source de la recette" value={tab} onChange={(t) => { setTab(t); setLocalError(null) }} items={TABS} />
              </div>

              <div className="mt-4">
                {tab === 'file' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="btn btn-outline cursor-pointer justify-center text-xs">
                        <FileUp className="h-3.5 w-3.5" aria-hidden /> Choisir un fichier
                        <input type="file" accept={ACCEPT} multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                      </label>
                      <label className="btn btn-outline cursor-pointer justify-center text-xs sm:hidden">
                        <Camera className="h-3.5 w-3.5" aria-hidden /> Prendre une photo
                        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                      </label>
                    </div>
                    <p className="text-[13px] text-ink-soft">
                      Un PDF, une capture de l’app Notes ou des photos d’une même recette ({IMPORT_MAX_FILES} au plus, {IMPORT_MAX_MB} Mo chacune). Photo nette, bien éclairée, page à plat.
                    </p>
                    {files.length > 0 && (
                      <ul className="space-y-1.5">
                        {files.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-2xl bg-cream-soft px-3 py-2 text-[13px] text-ink">
                            <span className="truncate">{f.name}</span>
                            <button type="button" className="hit shrink-0 text-ink-soft hover:text-red-700" aria-label={`Retirer ${f.name}`} onClick={() => { const next = files.filter((_, j) => j !== i); setFiles(next); setLocalError(next.length ? checkImportFiles(next) : null) }}>
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {tab === 'text' && (
                  <label className="block">
                    <span className="sr-only">Texte de la recette</span>
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={30000} placeholder="Collez ici la recette : ingrédients, étapes, portions…" className="input-base min-h-40 w-full resize-y text-sm" />
                  </label>
                )}
                {tab === 'url' && (
                  <label className="block">
                    <span className="text-[13px] font-semibold text-navy">Lien de la page</span>
                    <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="input-base mt-1.5 w-full text-sm" />
                    <span className="mt-1.5 block text-[13px] text-ink-soft">Une page publique en https. Reformulez les étapes à votre façon avant de publier.</span>
                  </label>
                )}
                {tab === 'title' && (
                  <label className="block">
                    <span className="text-[13px] font-semibold text-navy">Nom du plat</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} placeholder="Ex. : Poulet basquaise" className="input-base mt-1.5 w-full text-sm" />
                    <span className="mt-1.5 block text-[13px] text-ink-soft">L’IA propose une base classique, tous les champs marqués « estimés » : à adapter à votre recette.</span>
                  </label>
                )}
              </div>

              {error && <ErrorLine message={error} />}

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={submit} className="btn btn-primary text-xs">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Importer
                </button>
                <Link href="/espace-chef/recettes/nouveau" className="btn btn-outline text-xs" onClick={close}>
                  Saisir à la main
                </Link>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[13px] leading-relaxed text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  )
}

function Review({
  data,
  pending,
  error,
  onChoose,
  onCancel,
}: {
  data: RecipeImport
  pending: boolean
  error: string | null
  onChoose: (index: number) => void
  onCancel: () => void
}) {
  const [index, setIndex] = useState(0)
  const several = data.candidates.length > 1
  return (
    <div>
      {several ? (
        <fieldset>
          <legend className="text-sm font-semibold text-navy">Plusieurs recettes trouvées : laquelle importer ?</legend>
          <div className="mt-3 space-y-2">
            {data.candidates.map((c) => (
              <label key={c.index} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-cream-soft px-3 py-2.5 text-sm text-ink">
                <input type="radio" name="candidate" checked={index === c.index} onChange={() => setIndex(c.index)} />
                <span className="flex-1">{c.name}</span>
                <span className="text-[12px] text-ink-soft">{c.ingredients} ingrédients</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-ink-soft">Une recette à la fois : relancez l’import pour les autres.</p>
        </fieldset>
      ) : (
        <p className="text-sm leading-relaxed text-ink">
          Vous avez déjà « {data.duplicateOf?.name} ». Créer quand même un nouveau brouillon (une variante) ?
        </p>
      )}
      {several && data.duplicateOf && (
        <p className="mt-2 text-[13px] text-ink-soft">Vous avez déjà un plat nommé « {data.duplicateOf.name} ».</p>
      )}
      {error && <ErrorLine message={error} />}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => onChoose(several ? index : 0)} className="btn btn-primary text-xs disabled:opacity-55">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />}
          {several ? 'Importer cette recette' : 'Créer une variante'}
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className="btn btn-outline text-xs">
          Annuler
        </button>
      </div>
    </div>
  )
}

function Failed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div>
      <ErrorLine message={message} />
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onRetry} className="btn btn-primary text-xs">
          Réessayer
        </button>
        <Link href="/espace-chef/recettes/nouveau" className="btn btn-outline text-xs">
          Saisir à la main
        </Link>
      </div>
    </div>
  )
}

function seconds(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null
  const ms = Date.parse(to) - Date.parse(from)
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 1000) : null
}

function summarize(data: RecipeImport | undefined, uploadFailed: string | null, uploading: boolean): string {
  if (uploadFailed || data?.status === 'failed') return 'L’import s’est arrêté : voir l’étape en échec.'
  if (uploading) return 'Envoi en cours…'
  if (data?.status === 'done') {
    const s = seconds(data.createdAt, data.finishedAt)
    return `Terminé : brouillon prêt${s !== null ? ` en ${s} s` : ''}.`
  }
  if (data?.status === 'review') return 'Lecture terminée : un choix à faire.'
  return 'Lecture en cours…'
}

/** Les étapes du fil, tirées des seuls événements réels (envoi, statut de l'import, trace de l'API). */
function buildSteps({
  tab,
  files,
  text,
  url,
  title,
  progress,
  data,
  uploadFailed,
}: {
  tab: ImportSourceType
  files: File[]
  text: string
  url: string
  title: string
  progress: Progress
  data: RecipeImport | undefined
  uploadFailed: string | null
}): ActivityStep[] {
  const steps: ActivityStep[] = []
  const created = progress.created || Boolean(data)
  const n = files.length

  // 1. La source part vers l'API.
  if (tab === 'file') {
    steps.push({
      id: 'send',
      label: created
        ? `${n} fichier${n > 1 ? 's' : ''} envoyé${n > 1 ? 's' : ''} au stockage privé`
        : progress.current
          ? `Envoi de « ${progress.current} » (${progress.done + 1} sur ${progress.total || n})`
          : 'Préparation et envoi des fichiers',
      status: created ? 'done' : uploadFailed ? 'error' : 'active',
      meta: uploadFailed && !created ? uploadFailed : undefined,
      detail: (
        <ul className="list-disc pl-4">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              {f.name} · {(f.size / 1024 / 1024).toFixed(1)} Mo
            </li>
          ))}
        </ul>
      ),
    })
  } else {
    let host = url
    try {
      host = new URL(url).hostname
    } catch {
      /* lien déjà vérifié avant l'envoi */
    }
    steps.push({
      id: 'send',
      label:
        tab === 'text'
          ? `Texte envoyé (${text.trim().length} caractères)`
          : tab === 'url'
            ? `Lien envoyé : ${host}`
            : `Titre envoyé : « ${title.trim()} »`,
      status: created ? 'done' : uploadFailed ? 'error' : 'active',
      meta: uploadFailed && !created
        ? uploadFailed
        : tab === 'title'
          ? 'Pas de source : l’IA propose une recette classique, entièrement à relire.'
          : tab === 'url'
            ? 'Une source publiée : les étapes seront reformulées.'
            : undefined,
    })
  }

  // 2. Lecture par le modèle.
  const reading = data?.status === 'pending' || data?.status === 'processing'
  const readFailed = data?.status === 'failed'
  const trace = data?.trace
  const finished = data?.status === 'done' || data?.status === 'review'
  const readSeconds = seconds(trace?.startedAt ?? data?.createdAt, data?.finishedAt)
  steps.push({
    id: 'read',
    label: readFailed
      ? 'Lecture interrompue'
      : finished
        ? `Recette lue${trace?.model ? ` par ${trace.model}` : ''}`
        : data?.status === 'processing'
          ? 'Lecture par l’IA'
          : 'En attente de lecture',
    status: !data ? 'pending' : readFailed ? 'error' : reading ? 'active' : trace?.belowThreshold ? 'warning' : 'done',
    meta: finished
      ? [trace?.provider ? `Fournisseur : ${trace.provider}` : null, readSeconds !== null ? `${readSeconds} s` : null]
          .filter(Boolean)
          .join(' · ') || undefined
      : readFailed
        ? (data?.error?.message ?? undefined)
        : undefined,
    detail: trace?.belowThreshold ? (
      <p>Une partie des ingrédients n’a pas pu être reliée avec certitude : relisez la liste de près.</p>
    ) : undefined,
  })

  // 3. Liaison à la liste d'ingrédients.
  if (finished && data.linked !== null) {
    const linked = data.linked ?? 0
    const toVerify = data.toVerify ?? 0
    const unlinked = trace?.unlinkedNames ?? []
    steps.push({
      id: 'link',
      label: `${linked} ingrédient${linked > 1 ? 's' : ''} relié${linked > 1 ? 's' : ''} à la liste`,
      status: toVerify > 0 ? 'warning' : 'done',
      meta: toVerify > 0 ? `${toVerify} à vérifier` : undefined,
      detail: unlinked.length > 0 ? <p>Pas encore dans la liste : {unlinked.join(', ')}.</p> : undefined,
    })
  } else if (!finished) {
    steps.push({ id: 'link', label: 'Liaison à la liste d’ingrédients', status: 'pending' })
  }

  // 4. Ce qui a été estimé ou soupçonné : à relire.
  if (data?.status === 'done') {
    const estimated = data.estimatedFields.map((f) => ESTIMATED_LABEL[f]).filter(Boolean)
    const allergens = data.allergenGaps.length
    const notes = data.warnings
    steps.push({
      id: 'review',
      label: estimated.length + allergens + notes.length > 0 ? 'Points à relire relevés' : 'Rien de particulier à relire',
      status: estimated.length + allergens + notes.length > 0 ? 'warning' : 'done',
      meta:
        [
          estimated.length ? `Estimé : ${estimated.join(', ')}` : null,
          allergens ? `${allergens} allergène${allergens > 1 ? 's' : ''} possible${allergens > 1 ? 's' : ''}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
      detail:
        notes.length > 0 ? (
          <ul className="list-disc pl-4">
            {notes.slice(0, 8).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : undefined,
    })
  }

  // 5. Le brouillon.
  steps.push(
    data?.status === 'done'
      ? { id: 'ready', label: `Brouillon créé : « ${data.meals[0]?.name ?? 'recette'} »`, status: 'done', meta: 'Rien n’est publié.' }
      : data?.status === 'review'
        ? {
            id: 'ready',
            label: data.candidates.length > 1 ? `${data.candidates.length} recettes trouvées : choisissez-en une` : 'Un plat du même nom existe déjà',
            status: 'warning',
          }
        : { id: 'ready', label: 'Brouillon', status: 'pending' },
  )
  return steps
}
