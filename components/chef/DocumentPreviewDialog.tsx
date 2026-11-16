'use client'

import { useEffect, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Download, ExternalLink, FileText, Loader2, X } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────────────
   Aperçu d'une pièce.

   Deux sources, un seul écran : le fichier qu'on vient de choisir (lu
   localement, avant tout envoi) et celui déjà déposé (URL signée de l'API).
   Un PDF s'affiche dans un cadre, une image telle quelle ; tout autre format
   se télécharge, parce qu'un aperçu qu'on ne peut pas lire ne vaut rien.
   ───────────────────────────────────────────────────────────────────────────── */

export interface PreviewSource {
  label: string
  /** Fichier local pas encore envoyé. */
  file?: File
  /** URL signée d'une pièce déjà déposée. */
  url?: string
  mimeType?: string
  fileName?: string
}

export default function DocumentPreviewDialog({
  source,
  onClose,
  loading = false,
}: {
  source: PreviewSource | null
  onClose: () => void
  loading?: boolean
}) {
  // L'URL locale est dérivée du fichier, pas stockée dans un état : la poser
  // depuis un effet déclencherait un rendu en cascade.
  const objectUrl = useMemo(
    () => (source?.file ? URL.createObjectURL(source.file) : null),
    [source],
  )

  // Elle vit le temps de l'aperçu, et pas une seconde de plus.
  useEffect(() => {
    if (!objectUrl) return
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const href = source?.url ?? objectUrl
  const mime = source?.mimeType ?? source?.file?.type ?? ''
  const name = source?.fileName ?? source?.file?.name ?? 'document'

  /*
   * Le type se lit d'abord sur le MIME, puis sur l'extension du **nom de
   * fichier**. Surtout pas sur l'URL : une URL signée finit par sa signature,
   * pas par « .pdf », et tout document y passait pour un format illisible.
   */
  const ext = name.toLowerCase().split('.').pop() ?? ''
  const isPdf = mime === 'application/pdf' || (!mime && ext === 'pdf')
  const isImage =
    mime.startsWith('image/') ||
    (!mime && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext))

  return (
    <Dialog.Root open={Boolean(source)} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 top-10 z-[90] flex flex-col overflow-hidden rounded-t-3xl bg-cream focus:outline-none sm:inset-8 sm:rounded-3xl lg:inset-x-[14%] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]">
          <header className="flex items-center gap-4 border-b border-[rgba(31,42,55,0.08)] bg-paper px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate font-display text-base font-bold text-navy">
                {source?.label ?? 'Aperçu'}
              </Dialog.Title>
              <Dialog.Description className="truncate text-xs text-ink-soft">
                {name}
                {source?.file && ' · pas encore envoyé'}
              </Dialog.Description>
            </div>
            {href && (
              <>
                {/* Un cadre peut rester vide si le stockage refuse d'être
                    encadré : il faut toujours une porte de sortie. */}
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  title="Ouvrir dans un nouvel onglet"
                  aria-label="Ouvrir dans un nouvel onglet"
                  className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid transition-colors hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={href}
                  download={name}
                  title="Télécharger"
                  aria-label="Télécharger"
                  className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid transition-colors hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                >
                  <Download className="h-4 w-4" />
                </a>
              </>
            )}
            <Dialog.Close
              aria-label="Fermer l’aperçu"
              className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-auto bg-cream-soft p-4">
            {loading ? (
              <p className="flex h-full items-center justify-center gap-2 text-sm text-ink-mid">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Ouverture du document…
              </p>
            ) : !href ? (
              <p className="flex h-full items-center justify-center text-sm text-ink-mid">
                Rien à afficher.
              </p>
            ) : isPdf ? (
              /*
               * `<object>` et non `<iframe>` : si le stockage refuse d'être
               * encadré, ou si le navigateur ne sait pas rendre un PDF, c'est
               * l'enfant qui s'affiche. Un cadre blanc sans explication est
               * pire qu'un message.
               */
              <object
                data={href}
                type="application/pdf"
                aria-label={source?.label ?? 'Document'}
                className="h-full w-full rounded-2xl bg-paper"
              >
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <FileText className="h-8 w-8 text-ink-soft" aria-hidden />
                  <p className="max-w-sm text-sm leading-relaxed text-ink-mid">
                    Votre navigateur n’affiche pas ce PDF directement ici.
                  </p>
                  <a href={href} target="_blank" rel="noreferrer" className="btn btn-outline text-xs">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ouvrir dans un onglet
                  </a>
                </div>
              </object>
            ) : isImage ? (
              <div className="flex h-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={href}
                  alt={source?.label ?? 'Document'}
                  className="max-h-full max-w-full rounded-2xl object-contain"
                />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <FileText className="h-8 w-8 text-ink-soft" aria-hidden />
                <p className="max-w-sm text-sm leading-relaxed text-ink-mid">
                  Ce format ne s’affiche pas dans le navigateur
                  {ext ? ` (.${ext})` : ''}. Ouvrez-le dans un onglet ou
                  téléchargez-le.
                </p>
                <a href={href} target="_blank" rel="noreferrer" className="btn btn-outline text-xs">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ouvrir dans un onglet
                </a>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
