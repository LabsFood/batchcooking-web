'use client'

import type { ReactNode } from 'react'
import { ChefTopbar } from './ChefNav'

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
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-28 lg:pb-12">
        {children}
      </main>
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
      className={`bg-paper rounded-3xl p-5 lg:p-6 border border-[rgba(31,42,55,0.06)] ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && (
            <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
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
