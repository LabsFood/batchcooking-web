'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { readConsent } from '@/lib/analytics'

/* ─────────────────────────────────────────────────────────────────────────────
   Le clin d'œil du Black Friday.

   Tout le monde affiche « −50 % » cette semaine-là. Nous aussi, sauf que chez
   nous c'est vrai toute l'année : avec l'avance immédiate de l'URSSAF, le
   crédit d'impôt de 50 % des services à la personne est déduit au moment de
   payer. La fenêtre montre le visuel de la campagne (public/images/
   blackFriday.jpeg, fourni par Lab's Food le 27/11), qui dit tout cela.

   Ce n'est pas une promotion et le texte ne prétend pas en être une : pas de
   compte à rebours, pas d'« offre limitée ». C'est le prix habituel, dit au
   moment où tout le monde parle de prix.

   Quand il s'ouvre : une fois par visiteur, sur les pages publiques, jusqu'au
   lundi qui suit le Black Friday (Cyber Monday inclus), et seulement une fois
   le choix des cookies fait — deux fenêtres l'une sur l'autre, c'est la
   meilleure façon de faire fermer les deux sans les lire.
   `?promo=1` l'ouvre à la demande, pour le relire.
   ───────────────────────────────────────────────────────────────────────────── */

const VU = 'labsfood.promo.black-friday-2026'
/** Le 1er décembre à minuit, heure de Paris : après le Cyber Monday. */
const FIN = Date.parse('2026-12-01T00:00:00+01:00')
const PAGES_EXCLUES = ['/espace-client', '/espace-chef', '/devenir-chef', '/auth', '/confidentialite']

function dejaVu(): boolean {
  try {
    return window.localStorage.getItem(VU) !== null
  } catch {
    // Sans stockage (navigation privée stricte), on ne l'ouvre pas : il
    // reviendrait à chaque page.
    return true
  }
}

function marquerVu() {
  try {
    window.localStorage.setItem(VU, new Date().toISOString())
  } catch {}
}

export default function PromoBlackFriday() {
  const pathname = usePathname()
  const force = useSearchParams().get('promo') === '1'
  // Ouvert par le minuteur, ou demandé dans l'adresse (tant qu'on ne l'a pas fermé).
  const [auto, setAuto] = useState(false)
  const [fermeALaMain, setFermeALaMain] = useState(false)
  const ouvert = auto || (force && !fermeALaMain)

  const pageOk = !PAGES_EXCLUES.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (force || !pageOk || Date.now() >= FIN || dejaVu()) return

    /* On attend que le visiteur ait répondu pour les cookies (le choix est
       écrit dans le même onglet : pas d'événement `storage`, d'où le
       relevé), puis on lui laisse le temps de voir la page. */
    let delai: ReturnType<typeof setTimeout> | undefined
    const releve = setInterval(() => {
      if (readConsent() === null) return
      clearInterval(releve)
      delai = setTimeout(() => setAuto(true), 2500)
    }, 800)
    return () => {
      clearInterval(releve)
      if (delai) clearTimeout(delai)
    }
  }, [force, pageOk])

  const fermer = (v: boolean) => {
    if (v) return
    setAuto(false)
    setFermeALaMain(true)
    if (!force) marquerVu()
  }

  return (
    <Dialog.Root open={ouvert} onOpenChange={fermer}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-navy-deep/75 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        {/* Le visuel de la campagne, en entier : il porte tout le message. Sa
            largeur suit la hauteur de l'écran, pour qu'il tienne toujours sans
            défiler (format 4:5, plus la barre du lien dessous). */}
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] w-[min(28rem,calc(100vw-2rem),calc((92vh-3.5rem)*0.8))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-paper shadow-[0_40px_90px_-30px_rgba(10,16,24,0.6)] focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <Dialog.Title className="sr-only">Pas besoin d’attendre le Black Friday</Dialog.Title>
          <Dialog.Description className="sr-only">
            Chez Lab’s Food, c’est moins 50 % tous les jours grâce au crédit d’impôt.
          </Dialog.Description>

          <Dialog.Close
            aria-label="Fermer"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-navy-deep/25 text-white backdrop-blur-sm transition-colors hover:bg-navy-deep/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" />
          </Dialog.Close>

          <Image
            src="/images/blackFriday.jpeg"
            alt="Pas besoin d’attendre le Black Friday. Chez nous, c’est moins 50 % tous les jours grâce au crédit d’impôt. Lab’s Food, notre service de batch cooking disponible partout en France."
            width={1638}
            height={2048}
            sizes="(min-width: 480px) 28rem, 100vw"
            className="block h-auto w-full"
          />

          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <p className="text-xs text-ink-soft">Crédit d’impôt services à la personne, sous conditions.</p>
            <Dialog.Close asChild>
              <Link
                href="/avantage-fiscal"
                className="hit shrink-0 text-sm font-semibold text-navy underline decoration-navy/30 underline-offset-4 transition-colors hover:text-amber-deep hover:decoration-amber-deep"
              >
                Comment ça marche ?
              </Link>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
