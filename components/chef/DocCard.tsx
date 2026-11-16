'use client'

import { FileText, ShieldCheck } from 'lucide-react'

/**
 * Vignette d'aperçu d'une pièce justificative (page A4 simulée).
 * Pendant côté chef du composant admin `DocPreview`.
 */
export default function DocThumb({
  label,
  chefName,
  certificate = false,
  empty = false,
}: {
  label: string
  chefName: string
  certificate?: boolean
  empty?: boolean
}) {
  if (empty) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border-2 border-dashed border-[rgba(31,42,55,0.15)] text-xs text-ink-soft"
        style={{ aspectRatio: '1 / 1.414' }}
      >
        Non fourni
      </div>
    )
  }

  return (
    <div
      className="rounded-xl bg-white p-3 shadow-[0_6px_18px_-10px_rgba(31,42,55,0.4)] border border-[rgba(31,42,55,0.06)]"
      style={{ aspectRatio: '1 / 1.414' }}
    >
      {certificate ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-soft text-amber-ink">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <p className="mt-1.5 font-display text-xs font-bold text-navy leading-tight">
            {label}
          </p>
          <p className="mt-0.5 text-[8px] text-ink-soft">{chefName}</p>
          <div className="mt-2 w-full space-y-1">
            {[70, 50].map((w, i) => (
              <div
                key={i}
                className="mx-auto h-1 rounded-full bg-cream-deep"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <FileText className="h-3.5 w-3.5 text-amber-ink" />
          <p className="mt-1 font-display text-xs font-bold text-navy leading-tight">
            {label}
          </p>
          <div className="mt-1 h-0.5 w-8 rounded-full bg-amber" />
          <div className="mt-2 space-y-1">
            {[100, 88, 94, 70].map((w, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-cream-deep"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
