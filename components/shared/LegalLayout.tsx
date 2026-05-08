'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Props = {
  eyebrow: string
  title: string
  subtitle?: string
  updatedAt?: string
  children: React.ReactNode
}

export default function LegalLayout({
  eyebrow,
  title,
  subtitle,
  updatedAt,
  children,
}: Props) {
  return (
    <div className="page-transition pt-24 bg-cream min-h-screen">
      <section className="bg-navy text-white py-16 lg:py-20 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber/20 blur-3xl pointer-events-none" />
        <div className="container-xl relative">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Retour à l&apos;accueil
          </Link>
          <p className="eyebrow mb-4" style={{ color: '#F39C12' }}>
            {eyebrow}
          </p>
          <h1
            className="font-display font-bold leading-[0.95] mb-3"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/65 max-w-2xl leading-relaxed">{subtitle}</p>
          )}
          {updatedAt && (
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/40 mt-5">
              Dernière mise à jour · {updatedAt}
            </p>
          )}
        </div>
      </section>

      <article className="container-xl py-14 lg:py-20 max-w-3xl">
        <div className="prose-legal space-y-7 text-ink-mid leading-relaxed">
          {children}
        </div>
      </article>

      <style jsx global>{`
        .prose-legal h2 {
          font-family: var(--font-fraunces), serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--navy);
          letter-spacing: -0.015em;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.2;
        }
        .prose-legal h3 {
          font-family: var(--font-fraunces), serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--navy);
          margin-top: 1.75rem;
          margin-bottom: 0.6rem;
        }
        .prose-legal p { margin-bottom: 0.85rem; }
        .prose-legal ul, .prose-legal ol {
          padding-left: 1.4rem;
          margin-bottom: 1rem;
        }
        .prose-legal ul { list-style: disc; }
        .prose-legal ol { list-style: decimal; }
        .prose-legal li { margin-bottom: 0.4rem; }
        .prose-legal a {
          color: var(--amber-deep);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .prose-legal strong { color: var(--navy); font-weight: 600; }
      `}</style>
    </div>
  )
}
