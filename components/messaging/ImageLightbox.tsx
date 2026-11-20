'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, X } from 'lucide-react'

/**
 * Aperçu plein écran d'une image reçue dans une conversation.
 *
 * Se ferme avec Échap, la croix ou un clic hors de l'image. Rendu dans `body` :
 * le fil a un `overflow` qui rognerait un calque posé dedans.
 */
export default function ImageLightbox({
  url,
  fileName,
  onClose,
}: {
  /** Lien signé, valable quelques minutes. */
  url: string
  fileName: string
  onClose: () => void
}) {
  const closeButton = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButton.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // La page derrière ne défile pas pendant l'aperçu.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      // Le focus revient sur la vignette qui a ouvert l'aperçu.
      previouslyFocused?.focus()
    }
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${fileName}`}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex flex-col bg-navy/90 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-3 px-4 py-3 text-white sm:px-6"
      >
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{fileName}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Ouvrir dans un onglet</span>
        </a>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="hit flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        {/* Lien signé vers le stockage privé : `next/image` ne sait pas l'optimiser. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body,
  )
}
