'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Cookie, X } from 'lucide-react'

import { readConsent, saveConsent, type ConsentChoice } from '@/lib/analytics'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!readConsent()) {
      // Slight delay so it doesn't fight the page transition
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const choose = (c: ConsentChoice) => {
    saveConsent(c)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-3 right-3 bottom-3 z-[80] sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm"
        >
          <div className="relative bg-navy text-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(31,42,55,0.55)] p-5 lg:p-6">
            <button
              onClick={() => choose('declined')}
              aria-label="Décliner"
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl bg-amber/20 text-amber flex items-center justify-center flex-shrink-0">
                <Cookie className="w-4 h-4" />
              </span>
              <div>
                <p className="font-display font-bold text-base leading-tight">
                  Quelques cookies, juste pour bien fonctionner.
                </p>
                <p className="text-xs text-white/65 leading-relaxed mt-1.5">
                  Pas de pub, pas de revente. On utilise le strict nécessaire pour gérer
                  ton compte et la session, plus une mesure d&apos;audience (hébergée
                  dans l&apos;UE) pour améliorer le site, si tu acceptes.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => choose('accepted')}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-amber hover:bg-amber-deep text-navy text-xs font-semibold transition-colors"
              >
                Tout accepter
              </button>
              <button
                onClick={() => choose('declined')}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
              >
                Décliner
              </button>
            </div>

            <Link
              href="/confidentialite#cookies"
              className="block mt-3 text-[11px] text-white/55 hover:text-white text-center underline underline-offset-4"
            >
              Personnaliser & en savoir plus
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
