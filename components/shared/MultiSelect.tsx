'use client'

import { useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Une liste déroulante à choix multiples.

   Vingt-quatre pastilles alignées à plat, c'est un mur : on les parcourt
   toutes pour en trouver deux, et le champ pèse plus lourd que le formulaire
   qui l'entoure. Replié, le choix tient sur une ligne ; déplié, il se
   cherche.

   Le composant s'appuie sur le menu de Radix pour le clavier et l'ARIA. Une
   `CheckboxItem` ne referme pas le menu quand on la coche : on en prend
   plusieurs d'affilée, ce qui est précisément le but.

   Ce qui est choisi reste visible une fois replié — des pastilles sous le
   champ, retirables d'un clic. Sans elles, il faudrait rouvrir la liste pour
   savoir ce qu'on a déclaré.
   ───────────────────────────────────────────────────────────────────────────── */

export interface Option {
  code: string
  label: string
}

export default function MultiSelect({
  options,
  values,
  onChange,
  placeholder = 'Choisir…',
  /** Au-delà de ce nombre d'options, un champ de recherche apparaît. */
  searchFrom = 10,
  id,
  className,
  disabled = false,
}: {
  options: Option[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  searchFrom?: number
  id?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const choisies = useMemo(
    () => values.map((code) => options.find((o) => o.code === code) ?? { code, label: code }),
    [values, options],
  )

  const visibles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const basculer = (code: string) =>
    onChange(values.includes(code) ? values.filter((c) => c !== code) : [...values, code])

  const resume =
    choisies.length === 0
      ? placeholder
      : choisies.length <= 2
        ? choisies.map((o) => o.label).join(', ')
        : `${choisies[0].label}, ${choisies[1].label} +${choisies.length - 2}`

  return (
    <div className={className}>
      <DropdownMenu.Root
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setQuery('')
        }}
      >
        <DropdownMenu.Trigger
          id={id}
          disabled={disabled}
          className="input-base flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60 data-[state=open]:border-terra data-[state=open]:shadow-[0_0_0_4px_rgba(243,156,18,0.12)]"
        >
          <span className={cn('truncate', choisies.length === 0 && 'text-ink-soft')}>
            {resume}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 max-h-[18rem] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem] overflow-y-auto rounded-xl border border-[rgba(31,42,55,0.1)] bg-paper p-1.5 shadow-[0_20px_50px_-20px_rgba(31,42,55,0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]"
          >
            {options.length >= searchFrom && (
              <div className="sticky top-0 -m-1.5 mb-1 bg-paper p-1.5 pb-2">
                <div className="flex items-center gap-2 rounded-lg bg-cream-soft px-2.5 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-ink-soft" aria-hidden />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    // Le menu de Radix déplace le focus à la frappe : la
                    // recherche le garderait sinon une lettre sur deux.
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Rechercher…"
                    aria-label="Filtrer la liste"
                    className="w-full bg-transparent text-sm text-navy outline-none placeholder:text-ink-soft"
                  />
                </div>
              </div>
            )}

            {visibles.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] text-ink-soft">
                Rien ne correspond à « {query.trim()} ».
              </p>
            ) : (
              visibles.map((o) => {
                const on = values.includes(o.code)
                return (
                  <DropdownMenu.CheckboxItem
                    key={o.code}
                    checked={on}
                    onCheckedChange={() => basculer(o.code)}
                    onSelect={(e) => e.preventDefault()}
                    className="flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-navy outline-none data-[highlighted]:bg-cream-soft"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        on
                          ? 'border-navy bg-navy text-white'
                          : 'border-[rgba(31,42,55,0.25)] bg-paper',
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </DropdownMenu.CheckboxItem>
                )
              })
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {choisies.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {choisies.map((o) => (
            <li key={o.code}>
              <button
                type="button"
                onClick={() => basculer(o.code)}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy py-1.5 pl-3 pr-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
              >
                {o.label}
                <X className="h-3 w-3 opacity-70" aria-hidden />
                <span className="sr-only">Retirer</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
