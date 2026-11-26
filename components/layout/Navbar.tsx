'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { DURATION, EASE_IN, EASE_OUT } from '@/lib/motion'
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from '@/components/shared/Logo'
import ReserveButton from '@/components/shared/ReserveButton'
import { useAuth } from '@/lib/auth-context'

const NAV_LINKS = [
  { label: 'Accueil', href: '/' },
  { label: 'Menu et Tarifs', href: '/menu' },
  { label: 'À propos', href: '/a-propos' },
  { label: 'FAQ', href: '/faq' },
  // Entrée de recrutement : elle ne s'adresse pas aux clients, d'où le
  // traitement visuel distinct (encadré discret) et sa place en fin de liste.
  { label: 'Nous rejoindre', href: '/devenir-chef', kind: 'recruit' as const },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { user, isAuthenticated, isReady, role, roleLabel } = useAuth()

  const firstName = user?.name.split(' ')[0] ?? ''
  const initial = user?.name?.[0]?.toUpperCase() ?? 'G'
  // Chaque rôle a son espace : on renvoie vers le bon.
  const spaceHref = role === 'chef' ? '/espace-chef' : '/espace-client'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Ferme le menu mobile au changement de route. Ajustement pendant le rendu
  // plutôt qu'en effet : évite le double rendu (react-hooks/set-state-in-effect).
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    if (!mobileOpen) return () => { document.body.style.overflow = '' }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileOpen])

  return (
    <>
      <header
        className={cn(
          'fixed top-[var(--lf-dev-banner)] left-0 right-0 z-50 h-[72px] transition-[background-color,box-shadow,padding] duration-200 xl:h-auto',
          scrolled
            ? 'bg-cream/95 backdrop-blur-md shadow-[0_2px_24px_rgba(31,26,20,0.06)] py-0 xl:py-3'
            : 'bg-cream py-0 xl:py-5'
        )}
      >
        <div className="container-xl flex h-full items-center justify-between xl:h-auto">

          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <Logo size="md" />

          {/* ── Desktop Nav ──────────────────────────────────────────────── */}
          <nav className="hidden xl:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || (link.href.startsWith('/#') && pathname === '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200',
                    link.kind === 'recruit'
                      ? cn(
                        'ml-1 border border-[rgba(31,42,55,0.16)] hover:border-terra hover:bg-[rgba(243,156,18,0.08)]',
                        pathname === link.href ? 'border-terra bg-[rgba(243,156,18,0.1)] text-amber-deep' : 'text-navy hover:text-amber-deep',
                      )
                      : pathname === link.href
                        ? 'text-amber-deep'
                        : 'text-ink-mid hover:text-amber-deep',
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* ── Desktop CTAs ─────────────────────────────────────────────── */}
          <div className="hidden xl:flex items-center gap-3">
            {/* « Connexion » est l'état par défaut, y compris tant que Clerk
                n'a pas résolu la session. On gatait tout le bloc sur `isReady`
                pour éviter un flash — au prix d'un trou : sur les pages
                prérendues servies par le CDN, clerk-js met un temps variable à
                répondre (et ne répond jamais si son handshake échoue, ce qui
                arrive avec une instance de dev sur un vrai domaine), et le
                bouton restait absent. Un bref « Connexion » chez un visiteur
                déjà connecté est très préférable à un bouton manquant. */}
            {isReady && isAuthenticated ? (
              <Link
                href={spaceHref}
                className="flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border border-[rgba(31,42,55,0.10)] hover:border-amber transition-colors"
              >
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-navy text-amber font-bold text-xs flex items-center justify-center">
                    {initial}
                  </span>
                )}
                <span className="flex flex-col leading-none">
                  <span className="text-sm font-semibold text-navy max-w-[110px] truncate">
                    {firstName}
                  </span>
                  {roleLabel && (
                    <span className="text-xs uppercase tracking-[0.12em] text-amber-deep font-semibold mt-0.5">
                      {roleLabel}
                    </span>
                  )}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="hit whitespace-nowrap px-3 text-sm font-semibold text-navy underline-offset-4 transition-colors hover:text-amber-deep hover:underline"
              >
                Connexion
              </Link>
            )}
            {/*
              Le bouton plein suit ce que le visiteur peut faire. Sans compte, on
              ne réserve pas : « Réserver » ouvrait une fenêtre qui demandait de
              se connecter. Le bouton dit donc la vraie première étape, créer son
              compte. Un client connecté retrouve « Réserver » ; un batch cooker
              n'a rien à réserver, il n'a que son espace.
            */}
            {isReady && isAuthenticated ? (
              role !== 'chef' && (
                <ReserveButton className="text-xs px-5 py-3">
                  Réserver
                  <ArrowRight className="w-3.5 h-3.5 icon-arrow" />
                </ReserveButton>
              )
            ) : (
              <Link href="/auth/register" className="btn btn-primary px-5 py-3 text-xs">
                Inscription
                <ArrowRight className="icon-arrow h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </div>

          {/* ── Mobile burger ────────────────────────────────────────────── */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-navy/15 text-navy transition-colors hover:border-terra hover:text-amber-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra xl:hidden"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ── Mobile Menu ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-navigation"
            // slow-out : le menu descend en 240 ms, remonte en 180 ms (slow-in)
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASE_IN } }}
            className="fixed inset-x-0 bottom-0 top-[calc(var(--lf-dev-banner)+72px)] z-40 flex flex-col bg-cream shadow-[0_18px_36px_rgba(31,42,55,0.14)] xl:hidden"
          >
            <nav aria-label="Navigation mobile" className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 sm:px-8">
              {NAV_LINKS.filter((link) => link.kind !== 'recruit').map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 items-center justify-between border-b border-navy/10 px-1 font-display text-[22px] font-semibold leading-tight text-navy transition-colors hover:bg-cream-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-terra',
                    pathname === link.href && 'bg-amber-soft/50 font-bold',
                  )}
                >
                  {link.label}
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-navy/60" />
                </Link>
              ))}
              <Link
                href="/devenir-chef"
                onClick={() => setMobileOpen(false)}
                aria-current={pathname === '/devenir-chef' ? 'page' : undefined}
                className="mt-5 mb-6 flex min-h-20 items-center justify-between gap-3 rounded-2xl bg-navy px-5 py-4 text-white transition-colors hover:bg-navy-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra"
              >
                <span>
                  <span className="block font-display text-xl font-semibold">Nous rejoindre</span>
                  <span className="mt-1 block text-sm text-white/75">Vous aimez cuisiner ?</span>
                </span>
                <ArrowRight aria-hidden className="h-5 w-5 shrink-0 text-amber-deep" />
              </Link>
            </nav>

            <div className="flex shrink-0 flex-col gap-3 border-t border-navy/10 bg-cream px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-8">
              {/* Même règle que sur desktop : jamais de trou à la place du CTA. */}
              {isReady && isAuthenticated ? (
                <Link href={spaceHref} onClick={() => setMobileOpen(false)} className="btn btn-outline justify-center w-full">
                  <LayoutDashboard className="w-4 h-4" />
                  {role === 'chef' ? 'Mon espace chef' : 'Mon espace client'}
                </Link>
              ) : (
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="btn btn-outline justify-center w-full">
                  Connexion
                </Link>
              )}
              {/* Même règle que sur grand écran : le bouton plein suit ce qu'on peut faire. */}
              {isReady && isAuthenticated ? (
                role !== 'chef' && (
                  <ReserveButton onClick={() => setMobileOpen(false)} className="justify-center w-full">
                    Réserver ma session
                    <ArrowRight className="w-4 h-4 icon-arrow" />
                  </ReserveButton>
                )
              ) : (
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn btn-primary w-full justify-center"
                >
                  Inscription
                  <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
