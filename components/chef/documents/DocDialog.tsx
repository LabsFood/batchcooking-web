'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Printer, X } from 'lucide-react'
import type { ReactNode } from 'react'

/** Visionneuse de document : fiche recette, liste de courses, mandat de débours. */
export default function DocDialog({
  open,
  onOpenChange,
  title,
  description,
  printable = true,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  printable?: boolean
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/70 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
        <Dialog.Content className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_30px_80px_-20px_rgba(15,23,32,0.55)] focus:outline-none sm:inset-x-8 sm:inset-y-6 lg:inset-x-[14%] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=closed]:[animation-duration:120ms]">
          <div className="flex items-center gap-3 border-b border-[rgba(31,42,55,0.08)] px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-sm font-semibold text-navy">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="truncate text-xs text-ink-soft">{description}</Dialog.Description>
              )}
            </div>
            {printable && (
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream-soft sm:inline-flex"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden /> Imprimer
              </button>
            )}
            <Dialog.Close
              aria-label="Fermer"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-cream-soft/50">
            <div className="mx-auto max-w-3xl p-4 sm:p-6">
              <div className="overflow-hidden rounded-xl border border-[rgba(31,42,55,0.08)] bg-paper">{children}</div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
