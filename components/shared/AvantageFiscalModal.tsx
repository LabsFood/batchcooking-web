'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { X, Check, ArrowRight, ArrowUpRight } from 'lucide-react'

const STEPS = [
  {
    title: 'L\'inscription',
    text: 'Lors de notre premier contact, nous vous inscrivons sur la plateforme dédiée de l\'Urssaf.',
  },
  {
    title: 'L\'activation',
    text: 'L\'Urssaf vous envoie un e-mail pour activer votre compte et renseigner votre RIB sur leur plateforme sécurisée.',
  },
  {
    title: 'La facture',
    text: 'Après la session, nous émettons une demande de paiement. Vous recevez une notification de l\'Urssaf.',
  },
  {
    title: 'Le prélèvement',
    text: 'Vous validez la demande sous 48 h. L\'Urssaf prélève uniquement 50 % du montant, l\'autre moitié est versée directement à Lab\'s Food.',
  },
] as const

const CONDITIONS = [
  'Posséder un numéro fiscal français',
  'Avoir déjà effectué au moins une déclaration de revenus en France',
] as const

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function AvantageFiscalModal({ isOpen, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      previousFocus?.focus?.()
    }
  }, [isOpen, onClose])

  if (typeof document === 'undefined' || !isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avantage-fiscal-title"
        onClick={(e) => e.stopPropagation()}
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex max-h-[92dvh] w-full max-w-[34rem] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_40px_100px_-20px_rgba(31,42,55,0.45)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl"
      >
        {/* En-tête : toujours visible, jamais écrasé par le contenu */}
        <header className="relative shrink-0 border-b border-[rgba(31,42,55,0.08)] px-6 pb-5 pt-6 sm:px-8 sm:pt-7">
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-mid transition-colors hover:bg-cream-soft hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <p className="pr-10 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-deep">
            Service à la personne · Avance immédiate
          </p>
          <h2
            id="avantage-fiscal-title"
            className="mt-2.5 pr-8 font-display font-bold leading-[1.05] text-navy"
            style={{ fontSize: 'clamp(1.5rem, 5.5vw, 1.95rem)', letterSpacing: '-0.02em' }}
          >
            Vous ne payez que{' '}
            <span className="italic font-medium text-amber-deep">la moitié.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-mid">
            Le batch cooking à domicile est éligible au crédit d&apos;impôt Service à la
            Personne. Grâce à l&apos;avance immédiate, proposée par l&apos;Urssaf et la
            Direction générale des Finances publiques, la réduction s&apos;applique dès la
            facturation.
          </p>
        </header>

        {/* Contenu défilant */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
          {/* Exemple chiffré */}
          <div className="flex items-stretch gap-3 rounded-2xl bg-amber-soft/50 p-4">
            <div className="flex-1">
              <p className="text-xs text-ink-mid">Une session à</p>
              <p className="mt-0.5 font-display text-2xl font-bold leading-none text-ink-soft line-through decoration-ink-soft/50">
                150 €
              </p>
            </div>
            <ArrowRight className="mt-4 h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
            <div className="flex-1">
              <p className="text-xs text-ink-mid">Sur votre compte</p>
              <p className="mt-0.5 font-display text-2xl font-bold leading-none text-navy">75 €</p>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
            L&apos;Urssaf verse les 75 € restants directement à Lab&apos;s Food.
          </p>

          {/* Étapes */}
          <section className="mt-8" aria-labelledby="afm-steps">
            <h3 id="afm-steps" className="font-display text-base font-bold text-navy">
              Comment ça marche
            </h3>
            <ol className="mt-4 space-y-5">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex gap-4">
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[13px] top-8 h-[calc(100%-0.5rem)] w-px bg-[rgba(31,42,55,0.12)]"
                    />
                  )}
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-navy">{s.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-mid">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs italic text-ink-soft">
              Sans réponse de votre part sous 48 h, la demande est automatiquement validée.
            </p>
          </section>

          {/* Conditions */}
          <section className="mt-8" aria-labelledby="afm-who">
            <h3 id="afm-who" className="font-display text-base font-bold text-navy">
              Pour qui ?
            </h3>
            <ul className="mt-3 space-y-2">
              {CONDITIONS.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-mid">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mint text-mint-ink">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  </span>
                  {c}
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-2xl bg-cream-soft p-4 text-[13px] leading-relaxed text-ink-mid">
              <p>
                <strong className="font-semibold text-navy">Plafond annuel :</strong> 12 000 € de
                dépenses par foyer fiscal, soit jusqu&apos;à{' '}
                <strong className="font-semibold text-navy">6 000 € de réduction</strong>. Majoré
                de 1 500 € par enfant à charge ou personne de plus de 65 ans (plafond maximum
                15 000 €).
              </p>
              <a
                href="https://www.impots.gouv.fr/portail/particulier/emploi-domicile"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-2 hover:text-amber-deep"
              >
                Détails sur impots.gouv.fr
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </section>
        </div>

        {/* Pied : action toujours accessible */}
        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[rgba(31,42,55,0.08)] bg-white px-6 py-4 sm:px-8">
          <div className="min-w-0">
            <Image
              src="/logo-urssaf.png"
              alt="Urssaf"
              width={553}
              height={100}
              className="h-5 w-auto"
            />
            <p className="mt-1.5 hidden text-[11px] leading-snug text-ink-soft sm:block">
              On vous guide dans l&apos;activation lors de la première session.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-primary shrink-0 text-xs">
            J&apos;ai compris
            <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
          </button>
        </footer>
      </motion.div>
    </div>,
    document.body,
  )
}
