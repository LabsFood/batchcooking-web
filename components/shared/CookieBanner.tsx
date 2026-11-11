'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cookie, X } from 'lucide-react'

import {
  OPEN_COOKIES_EVENT,
  readConsent,
  saveConsent,
  type ConsentChoice,
} from '@/lib/analytics'

/* Le visiteur y lit la politique : la question ne s'y impose pas. */
const PRIVACY_PAGE = '/confidentialite'

// Un choix fait dans un autre onglet ferme aussi la question ici.
const subscribe = (changed: () => void) => {
  window.addEventListener('storage', changed)
  return () => window.removeEventListener('storage', changed)
}

/**
 * Politique de confidentialité V1 §15 : trois boutons de même taille, « Tout
 * accepter », « Tout refuser », « Personnaliser », aussi simples l'un que
 * l'autre. Refuser laisse tout utiliser ; la croix et Échap valent un refus.
 * Le lien « Gérer mes cookies » du pied de page rouvre le panneau
 * (`openCookieSettings`), et un choix de plus de 6 mois redemande.
 */
export default function CookieBanner() {
  const pathname = usePathname()
  // `'server'` : rien d'affiché tant que le navigateur n'a pas répondu.
  const stored = useSyncExternalStore(subscribe, readConsent, () => 'server' as const)
  // ponytail: sans localStorage (navigation privée stricte), `chosen` ne tient que
  // jusqu'au prochain chargement complet ; un cookie first-party si ça gêne.
  const [chosen, setChosen] = useState(false)
  const [reopened, setReopened] = useState(false)
  const [custom, setCustom] = useState(false)
  const [audience, setAudience] = useState(false)
  const firstVisit = stored === null && !chosen && !pathname.startsWith(PRIVACY_PAGE)
  const visible = firstVisit || reopened
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const open = () => {
      setAudience(readConsent() === 'accepted')
      setCustom(true)
      setReopened(true)
    }
    window.addEventListener(OPEN_COOKIES_EVENT, open)
    return () => window.removeEventListener(OPEN_COOKIES_EVENT, open)
  }, [])

  useEffect(() => {
    if (visible && !dialog.current?.open) dialog.current?.showModal()
  }, [visible])

  const choose = (c: ConsentChoice) => {
    saveConsent(c)
    setChosen(true)
    setReopened(false)
    setCustom(false)
    dialog.current?.close()
  }

  if (!visible) return null

  const button =
    'flex-1 basis-0 inline-flex items-center justify-center px-3 py-2.5 rounded-full text-xs font-semibold transition-colors'

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
        <div className="relative w-full max-w-md animate-fade-up motion-reduce:animate-none bg-navy text-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(31,42,55,0.55)] p-5 lg:p-6">
          <button
            type="button"
            onClick={() => choose('declined')}
            aria-label="Tout refuser et fermer"
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
                Pas de pub, pas de revente. Les cookies indispensables gèrent ton compte
                et ta session ; la mesure d&apos;audience (hébergée dans l&apos;UE) ne
                s&apos;active que si tu l&apos;acceptes. Refuser ne t&apos;empêche pas
                d&apos;utiliser le site.{' '}
                <Link href={`${PRIVACY_PAGE}#cookies`} className="underline underline-offset-4">
                  En savoir plus
                </Link>
              </p>
            </div>
          </div>

          {custom && (
            <div className="mb-4 space-y-2 rounded-xl bg-white/[0.06] p-3 text-xs">
              <label className="flex items-center justify-between gap-3 opacity-70">
                <span>Indispensables (connexion, sécurité, paiement)</span>
                <input type="checkbox" checked disabled className="accent-amber" />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span>Mesure d&apos;audience</span>
                <input
                  type="checkbox"
                  checked={audience}
                  onChange={(e) => setAudience(e.target.checked)}
                  className="accent-amber"
                />
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => choose('accepted')}
              className={`${button} bg-amber hover:bg-amber-deep text-navy`}
            >
              Tout accepter
            </button>
            <button
              type="button"
              onClick={() => choose('declined')}
              className={`${button} bg-amber hover:bg-amber-deep text-navy`}
            >
              Tout refuser
            </button>
            {custom ? (
              <button
                type="button"
                onClick={() => choose(audience ? 'accepted' : 'declined')}
                className={`${button} bg-white/10 hover:bg-white/15 text-white`}
              >
                Enregistrer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCustom(true)}
                className={`${button} bg-white/10 hover:bg-white/15 text-white`}
              >
                Personnaliser
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}
