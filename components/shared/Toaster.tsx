'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────────────
   Retours d'action.

   Une action qui part sans rien dire laisse le doute ; une action qui échoue
   en silence fait recommencer. Chaque mutation annonce donc son issue ici.

   Un message d'erreur reste jusqu'à ce qu'on le ferme : on n'a pas le droit de
   faire disparaître ce qui n'a pas marché avant que la personne l'ait lu.
   ───────────────────────────────────────────────────────────────────────────── */

type Tone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: Tone
  title: string
  description?: string
}

interface ToastApi {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** Hors provider, les appels ne cassent rien : ils ne font simplement rien. */
const NOOP: ToastApi = { success: () => {}, error: () => {}, info: () => {} }

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP
}

const ICON: Record<Tone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const COLOR: Record<Tone, string> = {
  success: 'text-mint-ink',
  error: 'text-red-700',
  info: 'text-navy',
}

export default function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((tone: Tone, title: string, description?: string) => {
    setItems((prev) => [...prev.slice(-3), { id: Date.now() + Math.random(), tone, title, description }])
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  )

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={api}>
      <Toast.Provider swipeDirection="right" duration={5000}>
        {children}

        {items.map((t) => {
          const Icon = ICON[t.tone]
          return (
            <Toast.Root
              key={t.id}
              // Une erreur attend d'être lue ; une réussite s'efface toute seule.
              duration={t.tone === 'error' ? Infinity : 5000}
              onOpenChange={(open) => !open && dismiss(t.id)}
              className="flex items-start gap-3 rounded-2xl bg-paper p-4 shadow-[0_18px_50px_-18px_rgba(31,42,55,0.4)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-right-4 data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR[t.tone]}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <Toast.Title className="text-sm font-semibold text-navy">{t.title}</Toast.Title>
                {t.description && (
                  <Toast.Description className="mt-0.5 text-[13px] leading-relaxed text-ink-mid">
                    {t.description}
                  </Toast.Description>
                )}
              </div>
              <Toast.Close
                aria-label="Fermer"
                className="shrink-0 text-ink-soft transition-colors hover:text-navy"
              >
                <X className="h-3.5 w-3.5" />
              </Toast.Close>
            </Toast.Root>
          )
        })}

        <Toast.Viewport className="fixed bottom-4 right-4 z-[120] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}
