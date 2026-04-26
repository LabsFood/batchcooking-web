'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  X,
  Sparkles,
  Heart,
  Gift,
  Trophy,
  Bell,
  ChefHat,
  PhoneCall,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { useReservationGate } from '@/lib/reservation-gate-context'

const PERKS = [
  {
    Icon: Sparkles,
    title: 'Ivy te reconnaît',
    text: 'Ton chef garde tes goûts, allergies et envies — fini de tout réexpliquer chaque semaine.',
  },
  {
    Icon: Heart,
    title: 'Ton garde-manger malin',
    text: 'Préférences, restrictions, plats préférés : ton profil cuisine plus vite que toi.',
  },
  {
    Icon: Gift,
    title: 'Le badge "Première Toque"',
    text: '10% sur ta toute première session, et un dessert offert si tu invites un·e ami·e.',
  },
  {
    Icon: Trophy,
    title: 'Le club des Marmitons',
    text: '1 session = 1 point. 5 points = un brunch chez toi avec Ivy.',
  },
  {
    Icon: Bell,
    title: 'Tu suis ta commande',
    text: 'Du paiement à la dernière touche du chef : statut, liste de courses, photos.',
  },
] as const

export default function LoginRequiredModal() {
  const { isOpen, intendedHref, close } = useReservationGate()
  const router = useRouter()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, close])

  const goLogin = () => {
    const next = intendedHref || '/reservation'
    close()
    router.push(`/auth/login?next=${encodeURIComponent(next)}`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-paper rounded-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(31,42,55,0.45)] grid lg:grid-cols-[1.1fr_1fr]"
          >
            <button
              onClick={close}
              aria-label="Fermer"
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-navy flex items-center justify-center transition-colors shadow-md"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ── Left : perks panel ───────────────────────────────────── */}
            <div className="relative bg-navy text-white p-8 lg:p-10 overflow-hidden">
              <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-amber/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-12 w-72 h-72 rounded-full bg-mint/15 blur-3xl pointer-events-none" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/20 text-amber text-[10px] font-mono uppercase tracking-[0.2em]">
                  <ChefHat className="w-3 h-3" /> Réservé aux gourmand·es
                </span>
                <h2
                  className="font-display font-bold mt-5 mb-2 leading-[0.95]"
                  style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)', letterSpacing: '-0.02em' }}
                >
                  Connecte-toi pour<br />
                  <span className="text-amber italic font-medium">débloquer ta cuisine.</span>
                </h2>
                <p className="text-white/70 text-sm leading-relaxed mb-7">
                  La réservation est réservée aux comptes Lab&apos;s Food — pour qu&apos;Ivy
                  cuisine vraiment <em>pour toi</em>, pas pour un inconnu.
                </p>

                <ul className="space-y-3.5">
                  {PERKS.map(({ Icon, title, text }, i) => (
                    <motion.li
                      key={title}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-amber/15 text-amber flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-white text-sm leading-tight">{title}</p>
                        <p className="text-white/60 text-xs leading-relaxed mt-0.5">{text}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Right : CTAs ─────────────────────────────────────────── */}
            <div className="p-8 lg:p-10 flex flex-col justify-center bg-paper">
              <p className="eyebrow mb-3 justify-start">Accès</p>
              <h3 className="font-display text-2xl font-bold text-navy mb-2 leading-tight">
                C&apos;est ta toque, ouvre ta porte.
              </h3>
              <p className="text-ink-mid text-sm mb-6 leading-relaxed">
                Connecte-toi pour reprendre ton parcours de réservation, ou crée ton
                compte en 30 secondes.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={goLogin}
                  className="btn btn-primary w-full justify-center"
                >
                  Se connecter
                  <ArrowRight className="w-4 h-4 icon-arrow" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    router.push('/auth/register')
                  }}
                  className="btn btn-outline w-full justify-center"
                >
                  Créer mon compte
                </button>
              </div>

              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
                <span className="flex-1 h-px bg-[rgba(31,42,55,0.1)]" />
                Tu hésites ?
                <span className="flex-1 h-px bg-[rgba(31,42,55,0.1)]" />
              </div>

              <div className="rounded-2xl border border-mint-deep/40 bg-mint/40 p-4">
                <p className="text-sm font-semibold text-navy mb-1 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-mint-ink" /> On t&apos;explique de vive voix
                </p>
                <p className="text-xs text-ink-mid leading-relaxed mb-3">
                  Pas envie de créer un compte tout de suite ? Notre équipe répond à
                  toutes tes questions avant que tu te lances.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="tel:+33000000000"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-paper rounded-full px-3 py-1.5 border border-[rgba(31,42,55,0.1)] hover:border-amber transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-amber" /> Lun–Ven · 9h–17h
                  </a>
                  <a
                    href="mailto:contact@labsfood.fr"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-paper rounded-full px-3 py-1.5 border border-[rgba(31,42,55,0.1)] hover:border-amber transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber" /> contact@labsfood.fr
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={close}
                className="mt-5 text-xs text-ink-soft hover:text-navy transition-colors self-start"
              >
                Pas maintenant — je continue à explorer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
