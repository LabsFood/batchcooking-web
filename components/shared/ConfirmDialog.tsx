'use client'

import { useRef, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
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

   Construit sur Radix, comme DocDialog : posé par-dessus une fiche Radix, il
   reste cliquable. Un simple <div> à côté de la fiche, lui, ne recevait plus
   aucun clic (Radix coupe les clics hors de sa propre pile).
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

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-navy/50" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            action.current?.focus()
          }}
          className="fixed left-1/2 top-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-paper p-6 shadow-[0_24px_60px_-20px_rgba(31,42,55,0.3)] focus:outline-none"
        >
          <Dialog.Title className="font-display text-lg font-bold leading-snug text-navy">
            {title}
          </Dialog.Title>
          <Dialog.Description asChild>
            <p className="mt-2 text-sm leading-relaxed text-ink-mid">{lead}</p>
          </Dialog.Description>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
