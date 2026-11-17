import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/shared/Logo'

/* ─────────────────────────────────────────────────────────────────────────────
   La page d'entrée : connexion et inscription.

   Les deux pages partageaient la même grille, recopiée, avec deux tons
   différents (« vous » à gauche, « tu » à droite) et un témoignage inventé.
   Une seule mise en page, donc une seule voix.

   - À gauche, le formulaire : le logo, un retour au site, le titre, la carte.
   - À droite, sur grand écran, une photo de cuisine sous un voile marine, et
     ce que la page promet — dit en faits, pas en citation.

   Le voile est un dégradé du marine vers le marine : il sert la lisibilité du
   texte posé dessus, sans teinter la photo en orange.
   ───────────────────────────────────────────────────────────────────────────── */

export interface AuthPoint {
  titre: string
  texte: string
}

export default function AuthLayout({
  title,
  lead,
  children,
  footer,
  image,
  asideTitle,
  points,
}: {
  title: string
  lead: string
  /** Le formulaire. */
  children: ReactNode
  /** Les liens sous la carte : autre page, candidature batch cooker. */
  footer: ReactNode
  image: string
  asideTitle: string
  points: AuthPoint[]
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-cream lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <Logo size="sm" />
          <Link
            href="/"
            className="hit inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mid underline-offset-4 hover:text-navy hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour au site
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem]">
            <h1 className="font-display text-[2rem] font-bold leading-tight tracking-[-0.02em] text-navy sm:text-[2.5rem]">
              {title}
            </h1>
            <p className="mt-3 leading-relaxed text-ink-mid">{lead}</p>

            <div className="mt-8 rounded-2xl border border-[var(--line)] bg-paper p-5 shadow-[var(--shadow-card)] sm:p-6">
              {children}
            </div>

            <div className="mt-6 space-y-3 text-sm text-ink-mid">{footer}</div>

            {/*
              L'autre entrée : un batch cooker ne se crée pas de compte ici, il
              candidate. C'est un bouton, parce que c'est un autre chemin, pas
              une précision en bas de page.
            */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl bg-cream-soft px-4 py-3.5">
              <p className="min-w-0 flex-1 basis-48 text-sm leading-relaxed text-ink-mid">
                <span className="font-semibold text-navy">Vous cuisinez ?</span> Le compte batch
                cooker s’ouvre sur candidature.
              </p>
              <Link href="/devenir-chef" className="btn btn-outline shrink-0 px-5 py-2.5 text-xs">
                Nous rejoindre
              </Link>
            </div>
          </div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden bg-navy lg:block">
        <Image src={image} alt="" fill priority sizes="50vw" className="object-cover" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(31,45,61,0.96)_0%,rgba(31,45,61,0.78)_42%,rgba(31,45,61,0.35)_100%)]"
        />
        <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
          <p className="max-w-md font-display text-3xl font-bold leading-snug text-white xl:text-4xl">
            {asideTitle}
          </p>
          <dl className="mt-8 max-w-md space-y-5">
            {points.map((p) => (
              <div key={p.titre}>
                <dt className="text-sm font-semibold text-amber">{p.titre}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-white/80">{p.texte}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  )
}
