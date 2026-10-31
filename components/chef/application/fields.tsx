'use client'

import { forwardRef, useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, Check, Minus } from 'lucide-react'

/* Primitives du formulaire de candidature : libellé, aide et erreur reliés au
   champ (aria-describedby), cases à cocher tri-état, cartes radio. */

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-red-700">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  optional?: boolean
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, className = '', id: idProp, ...rest },
  ref,
) {
  const auto = useId()
  const id = idProp ?? auto
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-navy">
        {label}
        {optional && <span className="text-xs font-normal text-ink-soft">Facultatif</span>}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`input-base ${error ? '!border-red-600 focus:!shadow-[0_0_0_4px_rgba(220,38,38,0.12)]' : ''}`}
        {...rest}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] leading-snug text-ink-soft">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
})

/** Case à cocher dessinée, native en dessous (clavier, lecteurs d'écran). */
export function CheckBox({
  checked,
  indeterminate = false,
  disabled,
  onChange,
  label,
  className = '',
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])

  const on = checked || indeterminate
  return (
    <span className={`relative inline-flex h-[18px] w-[18px] shrink-0 ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[5px] disabled:cursor-default"
      />
      <span
        aria-hidden
        className={`pointer-events-none flex h-full w-full items-center justify-center rounded-[5px] border-[1.5px] transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-amber peer-focus-visible:ring-offset-2 ${
          on ? 'border-navy bg-navy text-white' : 'border-[rgba(31,42,55,0.28)] bg-paper'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        {checked ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : indeterminate ? (
          <Minus className="h-3 w-3" strokeWidth={3} />
        ) : null}
      </span>
    </span>
  )
}

/** Carte de choix unique, construite sur un vrai bouton radio. */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  children,
}: {
  name: string
  value: string
  checked: boolean
  onChange: (value: string) => void
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <label
      className={`group relative flex cursor-pointer gap-3 rounded-xl border-[1.5px] p-4 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
        checked
          ? 'border-navy bg-cream-soft'
          : 'border-[rgba(31,42,55,0.1)] bg-paper hover:border-[rgba(31,42,55,0.24)]'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
          checked ? 'border-navy' : 'border-[rgba(31,42,55,0.28)]'
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full bg-navy transition-transform duration-150 ${checked ? 'scale-100' : 'scale-0'}`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-navy">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-ink-mid">{description}</span>}
        {children}
      </span>
    </label>
  )
}

/** Encadré d'information : fond teinté, pas de filet latéral. */
export function Note({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: 'neutral' | 'amber' | 'mint'
  icon: ReactNode
  children: ReactNode
}) {
  const tones = {
    neutral: 'bg-cream-soft text-ink-mid',
    amber: 'bg-amber-soft/50 text-[#7A4A05]',
    mint: 'bg-mint/60 text-mint-ink',
  }
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-[13px] leading-relaxed ${tones[tone]}`}>
      <span className="mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
