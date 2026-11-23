'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, Camera, FileUp, Link2, Loader2, Sparkles, Type, X } from 'lucide-react'
import { Onglets } from '@/components/shared/Onglets'
import { apiMessage } from '@/lib/api/messages'
import {
  checkImportFiles,
  IMPORT_MAX_FILES,
  IMPORT_MAX_MB,
  useChooseImport,
  useRecipeImport,
  useStartImport,
  type ImportSourceType,
  type RecipeImport,
} from '@/lib/api/recipe-imports'
import { track } from '@/lib/analytics'

/* ─────────────────────────────────────────────────────────────────────────────
   Importer une recette.

   Quatre façons de donner la recette : un fichier ou une photo (prise sur le
   moment au téléphone), un texte collé, un lien, ou juste le nom du plat. On
   envoie, on attend sur place (quelques secondes), et le brouillon s'ouvre dans
   le formulaire habituel, à relire. Rien n'est publié, et les allergènes restent
   à confirmer par le cuisinier.

   L'attente montre une progression honnête (envoi, lecture, brouillon), sans
   animation décorative. En cas d'échec, le message de l'API et une sortie :
   « Saisir à la main ».
   ───────────────────────────────────────────────────────────────────────────── */

const TABS: { id: ImportSourceType; label: string; Icon: typeof FileUp }[] = [
  { id: 'file', label: 'Fichier ou photo', Icon: FileUp },
  { id: 'text', label: 'Coller un texte', Icon: Type },
  { id: 'url', label: 'Lien', Icon: Link2 },
  { id: 'title', label: 'Partir d’un titre', Icon: Sparkles },
]

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'

export default function RecipeImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [tab, setTab] = useState<ImportSourceType>('file')
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const start = useStartImport()
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

  // Le brouillon est prêt : il s'ouvre dans le formulaire, avec le bandeau « à relire ».
  useEffect(() => {
    if (data?.status === 'done' && data.meals[0]) {
      track('recipe_import_done', {
        source: data.sourceType,
        seconds: data.finishedAt ? Math.round((Date.parse(data.finishedAt) - Date.parse(data.createdAt)) / 1000) : 0,
        linked: data.linked ?? 0,
        toVerify: data.toVerify ?? 0,
      })
      router.push(`/espace-chef/recettes/${data.meals[0].id}?import=${data.id}`)
    }
    if (data?.status === 'failed') track('recipe_import_failed', { source: data.sourceType, code: data.error?.code ?? 'unknown' })
  }, [data, router])

  function reset() {
    setImportId(null)
    setLocalError(null)
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
    start.mutate(input, { onSuccess: (res) => setImportId(res.id) })
  }

  const waiting = start.isPending || data?.status === 'pending' || data?.status === 'processing'
  const error = localError ?? (start.error ? apiMessage(start.error) : null)

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

          {waiting ? (
            <Waiting uploading={start.isPending} />
          ) : data?.status === 'review' ? (
            <Review
              data={data}
              pending={choose.isPending}
              error={choose.error ? apiMessage(choose.error) : null}
              onChoose={(index) => choose.mutate({ id: data.id, index })}
              onCancel={close}
            />
          ) : data?.status === 'failed' ? (
            <Failed message={data.error?.message ?? 'L’import a échoué.'} onRetry={reset} />
          ) : data?.status === 'done' ? (
            <Waiting uploading={false} opening />
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

function Waiting({ uploading, opening = false }: { uploading: boolean; opening?: boolean }) {
  const steps = [
    { label: 'Envoi', done: !uploading },
    { label: 'Lecture de la recette', done: opening },
    { label: 'Ouverture du brouillon', done: false },
  ]
  const active = uploading ? 0 : opening ? 2 : 1
  return (
    <div className="mt-6" role="status" aria-live="polite">
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={s.label} className={`flex items-center gap-2.5 text-sm ${i <= active ? 'text-navy' : 'text-ink-soft'}`}>
            {i === active ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <span className={`h-2 w-2 rounded-full ${s.done || i < active ? 'bg-mint-deep' : 'bg-ink-soft/40'}`} aria-hidden />
            )}
            {s.label}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[13px] text-ink-soft">Comptez de quelques secondes à une minute pour une photo.</p>
    </div>
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
    <div className="mt-5">
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
    <div className="mt-5">
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
