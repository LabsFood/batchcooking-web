'use client'

import { useEffect, useState } from 'react'
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
   payer. On barre donc « Black Friday » et on écrit « tous les jours ».

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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] grid max-h-[92vh] w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 grid-cols-1 overflow-y-auto overflow-x-hidden rounded-3xl bg-paper shadow-[0_40px_90px_-30px_rgba(10,16,24,0.6)] focus:outline-none md:grid-cols-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          {/* La croix, au coin de la fenêtre : sur mobile elle se pose sur le noir,
              sur grand écran sur le blanc. */}
          <Dialog.Close
            aria-label="Fermer"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber md:text-ink-mid md:hover:bg-cream-soft md:hover:text-navy"
          >
            <X className="h-5 w-5" />
          </Dialog.Close>

          {/* ── Le noir du Black Friday, et ce qu'on y écrit à la place ── */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-[#0E1620] px-6 pb-6 pt-7 text-white sm:px-9 sm:pb-9 sm:pt-10">
            {/* Des gamelles noires, vues de haut : le « black » du Black Friday,
                version batch cooking. Le voile garde le texte lisible. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/gamelles/gamelle-a03.jpg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(14,22,32,0.92) 0%, rgba(14,22,32,0.55) 45%, rgba(14,22,32,0.94) 100%)',
              }}
            />

            <div className="relative">
              {/* « Black Friday », barré à la main. */}
              {/* Écrit en toutes lettres, lisible sous un trait fin : on doit le
                  lire avant de comprendre qu'il est barré. */}
              <p className="relative inline-block font-display text-[2rem] font-bold leading-none tracking-[-0.01em] text-white sm:text-[2.4rem]">
                Black Friday
                <svg
                  aria-hidden
                  viewBox="0 0 200 20"
                  preserveAspectRatio="none"
                  className="absolute -left-1.5 top-[55%] h-4 w-[calc(100%+0.75rem)] -translate-y-1/2 overflow-visible"
                >
                  <path
                    d="M2 12 C 50 7, 110 14, 198 8"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="3"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </p>
              <p className="mt-2 font-display text-2xl font-bold italic text-amber sm:text-[1.7rem]">
                tous les jours.
              </p>
            </div>

            <div className="relative mt-6 md:mt-14">
              <p
                className="font-display font-bold leading-[0.85] tracking-[-0.04em] text-white"
                style={{ fontSize: 'clamp(4.5rem, 14vw, 8.5rem)' }}
              >
                <span className="-mr-[0.09em] inline-block">−</span>50<span className="text-amber">%</span>
              </p>
            </div>
          </div>

          {/* ── Ce que ça veut dire ── */}
          <div className="relative flex flex-col justify-center px-6 pb-6 pt-6 sm:px-9 sm:pb-8 sm:pt-12">
            <Dialog.Title className="font-display text-[1.6rem] md:pr-10 font-bold leading-[1.1] tracking-[-0.01em] text-navy [text-wrap:balance] sm:text-3xl">
              Pas de promo chez nous. Juste la moitié du prix, toute l’année.
            </Dialog.Title>

            <Dialog.Description className="mt-3 text-[0.95rem] leading-relaxed text-ink-mid">
              Avec l’avance immédiate, vos 50 % de crédit d’impôt sont déduits dès le paiement.
            </Dialog.Description>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-8">
              <Dialog.Close asChild>
                <Link
                  href="/avantage-fiscal"
                  className="hit text-sm font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy"
                >
                  Comment ça marche ?
                </Link>
              </Dialog.Close>
            </div>

            <p className="mt-auto pt-6 text-[11px] leading-relaxed text-ink-soft">
              Crédit d’impôt services à la personne, sous conditions.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
