'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cookie, X } from 'lucide-react'

import { readConsent, saveConsent, type ConsentChoice } from '@/lib/analytics'

/* Le visiteur y lit la politique et choisit (CookieSettings) : rien n'y bloque. */
const PRIVACY_PAGE = '/confidentialite'

// Un choix fait dans un autre onglet ferme aussi la question ici.
const subscribe = (changed: () => void) => {
  window.addEventListener('storage', changed)
  return () => window.removeEventListener('storage', changed)
}

/**
 * Choix obligatoire : tant qu'il n'a ni accepté ni refusé, une modale native
 * (`showModal`) rend le reste de la page inerte, clavier compris. Refuser reste
 * aussi simple qu'accepter : la croix et Échap valent « Décliner ».
 */
export default function CookieBanner() {
  const pathname = usePathname()
  // Relu à chaque rendu : un choix fait sur /confidentialite compte dès la page suivante.
  // `'server'` : rien d'affiché tant que le navigateur n'a pas répondu.
  const stored = useSyncExternalStore(subscribe, readConsent, () => 'server' as const)
  // ponytail: sans localStorage (navigation privée stricte), `chosen` ne tient que
  // jusqu'au prochain chargement complet ; un cookie first-party si ça gêne.
  const [chosen, setChosen] = useState(false)
  const visible = stored === null && !chosen && !pathname.startsWith(PRIVACY_PAGE)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (visible && !dialog.current?.open) dialog.current?.showModal()
  }, [visible])

  const choose = (c: ConsentChoice) => {
    saveConsent(c)
    setChosen(true)
  }

  if (!visible) return null

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cookie-title"
      aria-describedby="cookie-text"
      onCancel={(e) => {
        e.preventDefault()
        choose('declined')
      }}
      className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-3 sm:p-4 backdrop:bg-navy/55 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex h-full items-end justify-center sm:items-center">
        {/* Animation CSS, pas framer-motion : elle part à l'ouverture du dialog, et
            si elle ne part pas, le panneau reste visible au lieu d'une modale vide. */}
        <div className="relative w-full max-w-sm animate-fade-up motion-reduce:animate-none bg-navy text-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(31,42,55,0.55)] p-5 lg:p-6">
          <button
            type="button"
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
              <p id="cookie-title" className="font-display font-bold text-base leading-tight">
                Quelques cookies, juste pour bien fonctionner.
              </p>
              <p id="cookie-text" className="text-xs text-white/65 leading-relaxed mt-1.5">
                Pas de pub, pas de revente. On utilise le strict nécessaire pour gérer
                ton compte et la session, plus une mesure d&apos;audience (hébergée
                dans l&apos;UE) pour améliorer le site, si tu acceptes. Fais ton choix
                pour continuer.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => choose('accepted')}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-amber hover:bg-amber-deep text-navy text-xs font-semibold transition-colors"
            >
              Tout accepter
            </button>
            <button
              type="button"
              onClick={() => choose('declined')}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
            >
              Décliner
            </button>
          </div>

          <Link
            href={`${PRIVACY_PAGE}#cookies`}
            className="block mt-3 text-[11px] text-white/55 hover:text-white text-center underline underline-offset-4"
          >
            Personnaliser & en savoir plus
          </Link>
        </div>
      </div>
    </dialog>
  )
}
