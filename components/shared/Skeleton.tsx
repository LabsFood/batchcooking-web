import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Le chargement d'un écran.

   Un squelette reprend la forme du contenu qu'il remplace : même hauteur, même
   grille, même nombre de cartes. Sinon la page saute quand les données
   arrivent, et le squelette n'a servi à rien.

   Fond : `cream-deep` se voit sur le blanc d'une carte. Les pages connectées
   reposent sur `--shell` : on y pose un `SkeletonCard` blanc, jamais des blocs
   nus (un `cream-soft` sur `--shell` ne se voit pas).
   Mouvement : un fondu lent, coupé en `prefers-reduced-motion`.
   ───────────────────────────────────────────────────────────────────────────── */

/** Un bloc plein. Taille et forme viennent de l'appelant (`h-4 w-32`, `h-52 rounded-2xl`). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-cream-deep motion-reduce:animate-none', className)}
    />
  )
}

/**
 * Entoure un ensemble de blocs : un lecteur d'écran entend « Chargement » une
 * seule fois (les blocs sont `aria-hidden`).
 */
export function SkeletonGroup({
  children,
  label = 'Chargement',
  className,
}: {
  children: ReactNode
  label?: string
  className?: string
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** Une carte blanche de page connectée, qui accueille des blocs `Skeleton`. */
export function SkeletonCard({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div aria-hidden className={cn('card-shell rounded-2xl p-5', className)}>
      {children}
    </div>
  )
}
