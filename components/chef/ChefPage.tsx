'use client'

import type { ReactNode } from 'react'
import { ChefTopbar } from './ChefNav'
import { EspaceMain } from '@/components/espace/EspaceShell'

/** Enveloppe commune des écrans de l'espace chef : topbar + zone de contenu. */
export default function ChefPage({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <>
      <ChefTopbar title={title} subtitle={subtitle} />
      <EspaceMain>{children}</EspaceMain>
    </>
  )
}

/** Carte de contenu — reprend le style des cartes du dashboard client. */
export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`card-shell rounded-2xl p-5 lg:p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-4">
          {title && (
            <h2 className="min-w-0 font-display text-lg font-bold text-navy">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** Bloc vide, cohérent sur tous les écrans. */
export function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-ink-soft">{text}</p>
}
