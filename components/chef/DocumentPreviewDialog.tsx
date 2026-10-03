'use client'

import { useEffect, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Download, FileText, Loader2, X } from 'lucide-react'

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
  const isImage = mime.startsWith('image/')
  const isPdf = mime === 'application/pdf' || (!mime && (href ?? '').includes('.pdf'))

  return (
    <Dialog.Root open={Boolean(source)} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 top-10 z-[90] flex flex-col overflow-hidden rounded-t-3xl bg-cream focus:outline-none sm:inset-8 sm:rounded-3xl lg:inset-x-[14%] data-[state=open]:animate-in data-[state=open]:fade-in-0">
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
              <a
                href={href}
                download={name}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline text-xs"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Télécharger
              </a>
            )}
            <Dialog.Close
              aria-label="Fermer l’aperçu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
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
              <iframe src={href} title={source?.label ?? 'Document'} className="h-full w-full rounded-2xl bg-paper" />
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
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <FileText className="h-8 w-8 text-ink-soft" aria-hidden />
                <p className="text-sm text-ink-mid">
                  Ce format ne s’affiche pas dans le navigateur.
                  <br />
                  Téléchargez-le pour l’ouvrir.
                </p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
