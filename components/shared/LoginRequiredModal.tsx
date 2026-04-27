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
    text: '10 % sur ta toute première session, et un dessert offert si tu invites un·e ami·e.',
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

  const goRegister = () => {
    const next = intendedHref || '/reservation'
    close()
    router.push(`/auth/register?next=${encodeURIComponent(next)}`)
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
            className="relative w-full max-w-lg bg-navy text-white rounded-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(31,42,55,0.55)]"
          >
            {/* Glow */}
            {/* <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-amber/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-mint/15 blur-3xl pointer-events-none" /> */}

            <button
              onClick={close}
              aria-label="Fermer"
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-7 lg:p-9">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber/20 text-amber text-[10px] font-mono uppercase tracking-[0.2em]">
                <ChefHat className="w-3 h-3" /> Réservé aux gourmand·es
              </span>
              <h2
                className="font-display font-bold mt-5 mb-2 leading-[0.95]"
                style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.3rem)', letterSpacing: '-0.02em' }}
              >
                Connecte-toi pour<br />
                <span className="text-amber italic font-medium">débloquer ta cuisine.</span>
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                La réservation est réservée aux comptes Lab&apos;s Food — pour qu&apos;Ivy
                cuisine vraiment <em>pour toi</em>.
              </p>

              <ul className="space-y-3 mb-7">
                {PERKS.map(({ Icon, title, text }, i) => (
                  <motion.li
                    key={title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={goRegister}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-amber hover:bg-amber-deep text-navy font-semibold rounded-full px-5 py-3 text-sm transition-colors"
                >
                  Créer mon compte
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goLogin}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-full px-5 py-3 text-sm transition-colors"
                >
                  J&apos;ai déjà un compte
                </button>
              </div>

              <button
                type="button"
                onClick={close}
                className="mt-4 w-full text-center text-xs text-white/55 hover:text-white transition-colors"
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
