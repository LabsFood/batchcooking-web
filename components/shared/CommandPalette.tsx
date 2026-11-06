'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, CornerDownLeft, Search, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   La recherche de la barre du haut.

   Un champ qui ne cherche rien est pire qu'un champ absent : il promet. Celui-ci
   cherche ce que le front connaît déjà — les pages de l'espace, et les objets
   que l'écran a chargés : des plats, des menus, des pièces, des clients. Aucun
   endpoint de recherche n'est nécessaire, et le jour où il existera, il
   s'ajoutera comme une source de plus.

   Elle s'ouvre au clavier, parce que c'est son intérêt : ⌘K sur Mac, Ctrl+K
   ailleurs, et « / » quand on n'est pas déjà en train d'écrire.
   ───────────────────────────────────────────────────────────────────────────── */

export interface PaletteItem {
  id: string
  /** Ce qu'on lit dans la liste. */
  label: string
  /** Une précision à droite : un statut, une ville, un pays. */
  hint?: string
  /** Mots en plus pour la recherche, jamais affichés. */
  keywords?: string
  group: string
  href?: string
  run?: () => void
  Icon?: LucideIcon
}

interface PaletteApi {
  open: () => void
}

const PaletteContext = createContext<PaletteApi | null>(null)

export function usePalette(): PaletteApi {
  return useContext(PaletteContext) ?? { open: () => {} }
}

/** « Crème brûlée » doit se trouver en tapant « creme brulee ». */
function plat(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function CommandPaletteProvider({
  items,
  placeholder,
  children,
}: {
  items: PaletteItem[]
  /** Ce que la barre dit chercher. Doit être vrai. */
  placeholder: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const api = useMemo<PaletteApi>(() => ({ open: () => setOpen(true) }), [])

  // ⌘K / Ctrl+K partout, « / » quand on n'écrit pas ailleurs.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase()
      if (k === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = document.activeElement
        const ecrit =
          el instanceof HTMLElement &&
          (el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'SELECT' ||
            el.isContentEditable)
        if (!ecrit) {
          e.preventDefault()
          setOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <PaletteContext.Provider value={api}>
      {children}
      <Palette
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        placeholder={placeholder}
      />
    </PaletteContext.Provider>
  )
}

function Palette({
  open,
  onClose,
  items,
  placeholder,
}: {
  open: boolean
  onClose: () => void
  items: PaletteItem[]
  placeholder: string
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  // Le curseur est rattaché à la requête qui l'a produit : quand on tape, la
  // liste change et la sélection repart en tête, sans effet ni ref.
  const [choix, setChoix] = useState({ q: '', i: 0 })
  const listeRef = useRef<HTMLUListElement>(null)

  const terme = plat(q.trim())

  const trouves = useMemo(() => {
    if (!terme) return items.slice(0, 12)
    const mots = terme.split(/\s+/)
    const note = (it: PaletteItem) => {
      const foin = plat(`${it.label} ${it.hint ?? ''} ${it.keywords ?? ''} ${it.group}`)
      if (!mots.every((m) => foin.includes(m))) return -1
      // Un début de libellé compte plus qu'une occurrence au milieu d'un mot-clé.
      const cible = plat(it.label)
      if (cible.startsWith(terme)) return 3
      if (cible.includes(terme)) return 2
      return 1
    }
    return items
      .map((it) => [it, note(it)] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([it]) => it)
  }, [items, terme])

  const curseur = choix.q === q ? Math.min(choix.i, Math.max(trouves.length - 1, 0)) : 0
  const setCurseur = useCallback(
    (f: (i: number) => number) => setChoix((c) => ({ q, i: f(c.q === q ? c.i : 0) })),
    [q],
  )

  const choisir = useCallback(
    (it: PaletteItem | undefined) => {
      if (!it) return
      onClose()
      setQ('')
      if (it.run) it.run()
      else if (it.href) router.push(it.href)
    },
    [onClose, router],
  )

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault()
      setCurseur((c) => Math.min(c + 1, trouves.length - 1))
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault()
      setCurseur((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choisir(trouves[curseur])
    }
  }

  // Garder la ligne choisie dans le champ de vision.
  useEffect(() => {
    const el = listeRef.current?.querySelector<HTMLElement>('[data-actif="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [curseur])

  // Chaque groupe n'affiche son titre qu'une fois : on le décide avant de
  // rendre, plutôt qu'en mutant une variable au fil de la liste.
  const lignes = trouves.map((it, i) => ({
    it,
    i,
    entete: i === 0 || trouves[i - 1].group !== it.group,
  }))

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:[animation-duration:120ms]" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl bg-paper shadow-[0_30px_80px_-20px_rgba(31,42,55,0.45)] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:[animation-duration:120ms]"
        >
          <Dialog.Title className="sr-only">Rechercher</Dialog.Title>

          <div className="flex items-center gap-3 border-b border-[rgba(31,42,55,0.08)] px-4">
            <Search className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              aria-label="Rechercher"
              className="h-14 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-ink-soft"
            />
            <kbd className="hidden shrink-0 rounded-md bg-cream-soft px-1.5 py-1 font-mono text-[10px] text-ink-soft sm:block">
              Échap
            </kbd>
          </div>

          {trouves.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold text-navy">
                Rien pour «&nbsp;{q.trim()}&nbsp;»
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-soft">
                Cette recherche porte sur les pages de votre espace et sur ce que
                l&apos;écran a déjà chargé. Elle ne va pas encore interroger
                l&apos;API.
              </p>
            </div>
          ) : (
            <ul ref={listeRef} className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
              {lignes.map(({ it, i, entete: nouveauGroupe }) => {
                const actif = i === curseur
                const Icon = it.Icon
                return (
                  <li key={it.id}>
                    {nouveauGroupe && (
                      <p className="px-3 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-soft">
                        {it.group}
                      </p>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={actif}
                      data-actif={actif}
                      onMouseMove={() => setCurseur(() => i)}
                      onClick={() => choisir(it)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        actif ? 'bg-cream-soft' : 'hover:bg-cream-soft/60',
                      )}
                    >
                      {Icon ? (
                        <Icon
                          className={cn('h-4 w-4 shrink-0', actif ? 'text-amber-deep' : 'text-ink-soft')}
                          aria-hidden
                        />
                      ) : (
                        <span aria-hidden className="h-4 w-4 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-navy">
                        {it.label}
                      </span>
                      {it.hint && (
                        <span className="hidden shrink-0 text-[11px] text-ink-soft sm:block">
                          {it.hint}
                        </span>
                      )}
                      {actif ? (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-transparent" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[rgba(31,42,55,0.08)] bg-cream-soft px-4 py-2.5 text-[11px] text-ink-soft">
            <span className="flex items-center gap-3">
              <span>
                <kbd className="rounded bg-paper px-1 font-mono">↑</kbd>
                <kbd className="ml-0.5 rounded bg-paper px-1 font-mono">↓</kbd> parcourir
              </span>
              <span>
                <kbd className="rounded bg-paper px-1 font-mono">↵</kbd> ouvrir
              </span>
            </span>
            <span className="tabular-nums">
              {trouves.length} résultat{trouves.length > 1 ? 's' : ''}
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ── Le déclencheur posé dans la barre du haut ────────────────────────────── */

/**
 * Un bouton, pas un champ : taper dedans ouvrirait la palette de toute façon,
 * et un faux champ laisse croire qu'on peut écrire là. Le raccourci est écrit
 * dessus, c'est ce qui le fait découvrir.
 */
/** Le raccourci s'écrit ⌘K sur un Mac, Ctrl K ailleurs. */
const sAbonner = () => () => {}
const estMac = () =>
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

export function PaletteTrigger({
  label = 'Rechercher',
  className,
}: {
  label?: string
  className?: string
}) {
  const { open } = usePalette()
  // Le serveur ne connaît pas la plateforme : il rend « Ctrl K », le client
  // corrige à l'hydratation. Un effet qui appellerait setState ferait un rendu
  // en cascade pour la même information.
  const mac = useSyncExternalStore(sAbonner, estMac, () => false)

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'group flex items-center gap-2.5 rounded-full border border-[rgba(31,42,55,0.08)] bg-paper py-2.5 pl-4 pr-2.5 text-left text-sm text-ink-soft transition-colors hover:border-amber',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      <kbd className="shrink-0 rounded-md bg-cream-soft px-1.5 py-0.5 font-mono text-[10px] text-ink-mid">
        {mac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  )
}

/** La même chose en rond, pour les largeurs où le champ ne tient pas. */
export function PaletteIconTrigger({ className }: { className?: string }) {
  const { open } = usePalette()
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Rechercher"
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(31,42,55,0.08)] bg-paper text-navy transition-colors hover:border-amber',
        className,
      )}
    >
      <Search className="h-4 w-4" aria-hidden />
    </button>
  )
}
