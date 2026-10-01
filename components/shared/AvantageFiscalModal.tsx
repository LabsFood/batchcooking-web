'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  X,
  Banknote,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

const STEPS = [
  {
    title: 'L\'inscription',
    text:
      'Lors de notre premier contact, nous vous inscrivons sur la plateforme dédiée de l\'Urssaf.',
  },
  {
    title: 'L\'activation',
    text:
      'L\'Urssaf vous envoie un e-mail pour activer votre compte et renseigner votre RIB sur leur plateforme sécurisée.',
  },
  {
    title: 'La facture',
    text:
      'Après la session, nous émettons une demande de paiement. Vous recevez une notification de l\'Urssaf.',
  },
  {
    title: 'Le prélèvement',
    text:
      'Vous validez la demande sous 48 h. L\'Urssaf prélève uniquement 50 % du montant — l\'autre moitié est versée directement à Lab\'s Food.',
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
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (typeof document === 'undefined' || !isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm overflow-y-auto"
      style={{ opacity: 1 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ opacity: 1 }}
        className="relative w-full max-w-5xl my-8 bg-paper rounded-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(31,42,55,0.5)]"
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-navy flex items-center justify-center transition-colors shadow-md"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="relative bg-navy text-white px-6 lg:px-9 pt-8 pb-7 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-12 w-72 h-72 rounded-full bg-mint/15 blur-3xl pointer-events-none" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/20 text-amber text-[10px] font-mono uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3" /> Service à la Personne
            </span>
            <h2
              className="font-display font-bold mt-4 leading-[1]"
              style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)', letterSpacing: '-0.02em' }}
            >
              L&apos;avantage fiscal,<br />
              <span className="text-amber italic font-medium">en avance immédiate.</span>
            </h2>
            <p className="mt-3 text-white/70 text-sm leading-relaxed max-w-xl">
              Le batch cooking à domicile est éligible au crédit d&apos;impôt Service à la
              Personne. Grâce à l&apos;<strong>Avance immédiate</strong>, vous ne
              payez plus que la moitié — et ce, dès la facturation. Le service Avance
              immédiate est proposé par l&apos;Urssaf et la Direction générale des Finances
              publiques.
            </p>
          </div>

          {/* Logo Urssaf — sous le bouton fermer (sous le texte en mobile) */}
          <Image
            src="/images/urssaf-white.png"
            alt="Urssaf"
            width={1281}
            height={242}
            className="relative mt-6 w-32 h-auto md:absolute md:mt-0 md:top-[80px] md:right-4 md:w-40"
          />
        </div>

        {/* Body */}
        <div className="px-6 lg:px-9 py-8 space-y-8">
          {/* Highlight number */}
          <div className="rounded-3xl bg-amber-soft/50 border border-amber/30 p-5 lg:p-6 flex items-start gap-4">
            <span className="w-12 h-12 rounded-2xl bg-amber text-navy flex items-center justify-center flex-shrink-0">
              <Banknote className="w-5 h-5" />
            </span>
            <div>
              <p className="font-display text-2xl lg:text-3xl font-bold text-navy leading-none">
                Vous ne payez que la moitié.
              </p>
              <p className="text-sm text-ink-mid mt-2 leading-relaxed">
                Une session à <strong>150 €</strong> ne vous coûte que <strong>75 €</strong>{' '}
                sur votre compte. L&apos;Urssaf verse les 75 € restants directement à Lab&apos;s
                Food.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div>
            <h3 className="font-display text-lg font-bold text-navy mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber" /> Comment ça marche
            </h3>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="rounded-2xl bg-cream-soft border border-[rgba(31,42,55,0.06)] p-4"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-full bg-navy text-amber text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm font-semibold text-navy">{s.title}</p>
                  </div>
                  <p className="text-xs text-ink-mid leading-relaxed">{s.text}</p>
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-ink-soft mt-3 italic">
              Si vous ne faites rien sous 48 h, la demande est automatiquement validée.
            </p>
          </div>

          {/* Conditions */}
          <div>
            <h3 className="font-display text-lg font-bold text-navy mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-mint-ink" /> Pour qui ?
            </h3>
            <ul className="space-y-2">
              {CONDITIONS.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-sm text-ink-mid">
                  <CheckCircle2 className="w-4 h-4 text-mint-ink flex-shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl bg-mint/40 border border-mint-deep/40 p-4">
              <p className="text-xs text-mint-ink leading-relaxed">
                <strong className="font-semibold">Plafond annuel :</strong> 12 000 € de
                dépenses par foyer fiscal pour les services à la personne — soit jusqu&apos;à{' '}
                <strong>6 000 € de réduction</strong>. Majoré de 1 500 € par enfant à charge
                ou personne de plus de 65 ans (plafond max 15 000 €). Vous pouvez retrouver
                ces informations sur cette page,{' '}
                <a
                  href="https://www.impots.gouv.fr/portail/particulier/emploi-domicile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 break-all hover:text-navy"
                >
                  https://www.impots.gouv.fr/portail/particulier/emploi-domicile
                </a>
                .
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-[rgba(31,42,55,0.06)]">
            <p className="text-xs text-ink-soft flex-1">
              Lab&apos;s Food vous accompagne pas à pas dans l&apos;activation de votre compte
              Urssaf lors de votre première session.
            </p>
            <button onClick={onClose} className="btn btn-primary text-xs">
              J&apos;ai compris
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
