'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────────────
   Demander confirmation, et dire ce qui va se passer.

   Un geste dont les conséquences sortent de l'écran mérite une phrase avant,
   pas un regret après : publier une carte la rend visible de tous les clients,
   la dépublier la retire des semaines où elle était programmée. Le dialogue
   n'est pas là pour ralentir, il est là pour nommer.

   Échap et le fond ferment, le focus part sur l'action, le défilement se
   bloque : un dialogue qu'on ne peut pas fermer est un bug qu'on a déjà payé
   une fois dans ce projet.
   ───────────────────────────────────────────────────────────────────────────── */

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  lead,
  detail,
  confirmLabel,
  cancelLabel = 'Annuler',
  tone = 'primary',
  pending = false,
  error = null,
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  /** Ce que le geste fait, en une phrase. */
  lead: ReactNode
  /** Ce qu'il entraîne ailleurs, s'il y a lieu. */
  detail?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  pending?: boolean
  error?: string | null
  children?: ReactNode
}) {
  const action = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    action.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKey)

    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, pending, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-paper p-6 shadow-[0_24px_60px_-20px_rgba(31,42,55,0.3)]"
      >
        <h2 className="font-display text-lg font-bold leading-snug text-navy">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-mid">{lead}</p>
        {detail && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{detail}</p>
        )}
        {children}

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[13px] leading-relaxed text-red-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            ref={action}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`btn text-xs disabled:opacity-55 ${
              tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'
            }`}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-outline text-xs"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
