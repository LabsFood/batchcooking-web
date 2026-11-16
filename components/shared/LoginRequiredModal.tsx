'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DURATION, EASE_IN, EASE_OUT } from '@/lib/motion'
import { useRouter } from 'next/navigation'
import {
  X,
  Heart,
  Bell,
  ChefHat,
  ShoppingBasket,
  ArrowRight,
} from 'lucide-react'
import { useReservationGate } from '@/lib/reservation-gate-context'

const PERKS = [
  {
    Icon: ChefHat,
    title: 'Ton chef te reconnaît',
    text: 'Ton batch cooker garde tes goûts, allergies et envies — fini de tout réexpliquer chaque semaine.',
  },
  {
    Icon: Heart,
    title: 'Ton garde-manger malin',
    text: 'Préférences, restrictions, plats préférés : ton profil cuisine plus vite que toi.',
  },
  {
    Icon: ShoppingBasket,
    title: 'Ta liste de courses, prête',
    text: 'Listes par rayons envoyées.',
  },
  {
    Icon: Bell,
    title: 'Tu suis ta commande',
    text: 'De la confirmation à la dernière touche du chef : statut, liste de courses, notes de cuisine.',
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
    /*
     * L'interactivité est portée par ce conteneur, pas par le voile animé :
     * pendant la sortie, AnimatePresence garde l'ancien nœud avec ses anciennes
     * props. Si l'animation ne s'achève pas (onglet en arrière-plan), un voile
     * invisible resterait sinon à avaler les clics de la page.
     *
     * `pointer-events-auto` sert aussi à rester cliquable lorsqu'un dialog
     * Radix, qui pose `pointer-events: none` sur le body, est ouvert derrière.
     */
    <div
      className={`fixed inset-0 z-[110] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            // fondu : le voile arrive en 180 ms, repart en 120 ms
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: DURATION.fast, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: DURATION.instant, ease: EASE_IN } }}
            className="absolute inset-0 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              // slow-out : le dialogue monte de 8 px en 240 ms, repart en 120 ms
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: 8, transition: { duration: DURATION.instant, ease: EASE_IN } }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-navy text-white rounded-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(31,42,55,0.55)]"
            >

              <button
                onClick={close}
                aria-label="Fermer"
                className="absolute top-2 right-2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative p-7 lg:p-9">
                <h2
                  className="font-display font-bold mt-5 mb-2 leading-[0.95]"
                  style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.3rem)', letterSpacing: '-0.02em' }}
                >
                  Connecte-toi pour{' '}
                  <span className="text-amber">débloquer ta cuisine.</span>
                </h2>
                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  La réservation demande un compte Lab&apos;s Food — c&apos;est ce qui permet à ton
                  batch cooker de cuisiner vraiment <span className="font-semibold text-white">pour toi</span>.
                </p>

                <ul className="space-y-3 mb-7">
                  {PERKS.map(({ Icon, title, text }) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-amber/15 text-amber flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-white text-sm leading-tight">{title}</p>
                        <p className="text-white/60 text-xs leading-relaxed mt-0.5">{text}</p>
                      </div>
                    </li>
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
                  className="hit mt-4 w-full text-center text-xs text-white/55 hover:text-white transition-colors"
                >
                  Pas maintenant — je continue à explorer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
