'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, Star, X } from 'lucide-react'
import { TESTIMONIALS } from '@/lib/mock-data'
import type { Testimonial } from '@/types'
import { DURATION, EASE_IN, EASE_MOVE, EASE_OUT, SPRING, fadeUpInView } from '@/lib/motion'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Les témoignages, en roue (refonte du 26/11, sur maquette du client).

   Section blanche, sans conteneur. À gauche, les clients sont posés sur un
   arc : choisir quelqu'un — ou le stepper en bas — fait tourner la roue,
   l'avis choisi vient au sommet de l'arc, son nom à côté. À droite, son avis
   entre les guillemets de la maison. Seuls les deux voisins de chaque côté
   restent sur l'arc : avec une douzaine d'avis, la roue entière ne tiendrait
   pas dans le cadre.

   « Voir tous les avis » ouvre un tiroir à droite, avec la liste complète.

   Un avis sans note n'a pas d'étoiles, un avis sans ville n'en affiche pas :
   on ne complète pas ce que le client n'a pas dit.

   La roue avance seule toutes les 8 s — elle s'arrête au survol ou au premier
   choix, et ne tourne pas du tout en mouvement réduit.
   ───────────────────────────────────────────────────────────────────────────── */

/** La pastille d'initiales : pas de photo client, on ne l'invente pas. */
const TONS = [
  'bg-amber-soft text-amber-deep',
  'bg-mint text-mint-ink',
  'bg-cream-deep text-navy',
  'bg-peach text-amber-deep',
]

const initiales = (nom: string) =>
  nom
    .split(/[\s&]+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

/* Le repère de la roue : tout est dessiné dans ce cadre, en pixels. */
const CADRE = { largeur: 320, hauteur: 420 }
const CENTRE = { x: 24, y: 210 }
const RAYON = 170
/** L'écart angulaire entre deux convives, en degrés. */
const PAS = 40
/** Combien de voisins de chaque côté restent visibles sur l'arc. */
const VOISINS = 2

/** L'écart le plus court entre l'avis `i` et l'avis actif, sur une roue de `n`. */
function ecart(i: number, actif: number, n: number) {
  let d = (((i - actif) % n) + n) % n
  if (d > n / 2) d -= n
  return d
}

function Etoiles({ note, taille = 'h-4 w-4' }: { note?: number; taille?: string }) {
  if (note == null) return null
  return (
    <span className="flex gap-0.5" aria-label={`Note : ${note} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(taille, i < note ? 'fill-amber text-amber' : 'text-ink-soft/30')}
        />
      ))}
    </span>
  )
}

export default function Testimonials() {
  const [actif, setActif] = useState(0)
  const [tenue, setTenue] = useState(false)
  const [tiroir, setTiroir] = useState(false)
  const calme = useReducedMotion()
  const n = TESTIMONIALS.length
  const t = TESTIMONIALS[actif]

  const choisir = (i: number) => {
    setActif(((i % n) + n) % n)
    setTenue(true)
  }

  // La roue avance seule, tant qu'on ne la tient pas (survol, choix, tiroir, mouvement réduit).
  useEffect(() => {
    if (calme || tenue || tiroir) return
    const minuterie = setInterval(() => setActif((a) => (a + 1) % n), 8000)
    return () => clearInterval(minuterie)
  }, [calme, tenue, tiroir, n])

  // Sous lg : la rangée montre l'actif et ses voisins, dans l'ordre de la roue.
  const rangee = TESTIMONIALS.map((avis, i) => ({ avis, i, d: ecart(i, actif, n) }))
    .filter(({ d }) => Math.abs(d) <= VOISINS)
    .sort((a, b) => a.d - b.d)

  return (
    <section
      id="testimonials"
      className="section-padding section-paper relative overflow-hidden"
      onMouseEnter={() => setTenue(true)}
    >
      <div className="container-xl relative">
        {/* slow-out : l'en-tête se pose en 240 ms */}
        <motion.div {...fadeUpInView()} className="mx-auto mb-12 max-w-2xl text-center lg:mb-6">
          <h2 className="h-section">Ils nous ont fait confiance.</h2>
          <p className="mt-4 leading-relaxed text-ink-mid">
            Nos clients racontent leurs plats et leur semaine cuisinée à la maison.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
          {/* ── La roue (lg et +) : un cadre FIXE, l'arc et les pastilles
                 dans le même repère. ─────────────────────────────────── */}
          <div
            className="relative hidden shrink-0 lg:block"
            style={{ width: CADRE.largeur, height: CADRE.hauteur }}
          >
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0"
              width={CADRE.largeur}
              height={CADRE.hauteur}
              viewBox={`0 0 ${CADRE.largeur} ${CADRE.hauteur}`}
              fill="none"
            >
              <circle cx={CENTRE.x} cy={CENTRE.y} r={RAYON} stroke="var(--line-strong)" strokeWidth="1.5" />
            </svg>

            {TESTIMONIALS.map((avis, i) => {
              const d = ecart(i, actif, n)
              const visible = Math.abs(d) <= VOISINS
              // Hors de vue, la pastille glisse vers le bord de l'arc et s'efface.
              const borne = Math.max(-VOISINS - 1, Math.min(VOISINS + 1, d))
              const angle = (borne * PAS * Math.PI) / 180
              const x = CENTRE.x + RAYON * Math.cos(angle)
              const y = CENTRE.y + RAYON * Math.sin(angle)
              const choisi = d === 0
              return (
                <motion.button
                  key={avis.id}
                  type="button"
                  onClick={() => choisir(i)}
                  tabIndex={visible ? 0 : -1}
                  aria-hidden={!visible || undefined}
                  aria-label={`Lire l’avis de ${avis.clientName}`}
                  aria-pressed={choisi}
                  // déplacement : la roue tourne en 240 ms (slow-in + slow-out),
                  // la pastille choisie se pose d'un ressort.
                  initial={false}
                  animate={{
                    x: x - 32,
                    y: y - 32,
                    scale: choisi ? 1.22 : Math.abs(d) === 1 ? 0.86 : 0.7,
                    opacity: !visible ? 0 : choisi ? 1 : Math.abs(d) === 1 ? 0.6 : 0.35,
                  }}
                  transition={{
                    x: { duration: DURATION.base, ease: EASE_MOVE },
                    y: { duration: DURATION.base, ease: EASE_MOVE },
                    scale: SPRING,
                    opacity: { duration: DURATION.base, ease: EASE_MOVE },
                  }}
                  className={cn(
                    'absolute left-0 top-0 z-10 h-16 w-16 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber',
                    !visible && 'pointer-events-none',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-full font-display text-lg font-bold shadow-[var(--shadow-card)] ring-2 transition-shadow',
                      TONS[i % TONS.length],
                      choisi ? 'ring-amber' : 'ring-transparent',
                    )}
                  >
                    {initiales(avis.clientName)}
                  </span>
                </motion.button>
              )
            })}

            {/* Le nom, à côté du convive au sommet de l'arc. */}
            <div className="absolute -translate-y-1/2" style={{ left: CENTRE.x + RAYON + 52, top: CENTRE.y }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={t.id}
                  // slow-out : le nom suit la roue en 240 ms
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: DURATION.base, ease: EASE_OUT } }}
                  exit={{ opacity: 0, transition: { duration: DURATION.fast, ease: EASE_IN } }}
                  className="whitespace-nowrap"
                >
                  <span className="block text-sm font-bold text-navy">{t.clientName}</span>
                  {t.clientCity && <span className="block text-xs text-ink-soft">{t.clientCity}</span>}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* ── La rangée (sous lg) : l'actif et ses voisins ─────────── */}
          <div className="flex items-center justify-center gap-3 lg:hidden">
            {rangee.map(({ avis, i, d }) => (
              <button
                key={avis.id}
                type="button"
                onClick={() => choisir(i)}
                aria-label={`Lire l’avis de ${avis.clientName}`}
                aria-pressed={d === 0}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full font-display text-sm font-bold ring-2 transition-all sm:h-14 sm:w-14 sm:text-base',
                  TONS[i % TONS.length],
                  d === 0 ? 'scale-110 ring-amber' : 'ring-transparent opacity-60',
                )}
              >
                {initiales(avis.clientName)}
              </button>
            ))}
          </div>

          {/* ── L'avis ───────────────────────────────────────────────── */}
          {/* Une seule cellule de grille : l'avis qui part et celui qui
              arrive se croisent au même endroit. */}
          <div className="grid">
            <AnimatePresence>
              <motion.figure
                key={t.id}
                // slow-out : l'avis monte en fondu en 240 ms, l'ancien s'efface en 180 ms
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE_IN } }}
                className="col-start-1 row-start-1"
              >
                <span aria-hidden className="block font-display text-6xl font-bold leading-none text-amber">
                  “
                </span>
                <blockquote className="mt-2 max-w-[56ch] text-base leading-relaxed text-ink-mid lg:text-lg">
                  {t.text}
                  <span aria-hidden className="ml-2 inline-block translate-y-2 font-display text-3xl font-bold leading-none text-amber">
                    ”
                  </span>
                </blockquote>
                <figcaption className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Etoiles note={t.rating} />
                  {/* Le nom vit sur la roue en desktop : ici, pour la rangée mobile. */}
                  <span className="text-sm font-semibold text-navy lg:hidden">
                    {t.clientName}
                    {t.clientCity && <span className="font-normal text-ink-soft"> · {t.clientCity}</span>}
                  </span>
                  {t.verified && <span className="text-xs text-ink-soft">Avis vérifié</span>}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
        </div>

        {/* ── En bas : le stepper, et l'accès à tous les avis ──────────── */}
        <div className="mt-10 flex flex-col items-center gap-6 lg:mt-6">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => choisir(actif - 1)}
              aria-label="Avis précédent"
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--line-strong)] text-ink-mid transition-colors hover:border-amber hover:text-amber-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber active:scale-[0.97]"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Choisir un avis">
              {TESTIMONIALS.map((avis, i) => (
                <button
                  key={avis.id}
                  type="button"
                  role="tab"
                  aria-selected={i === actif}
                  aria-label={`Avis de ${avis.clientName}`}
                  onClick={() => choisir(i)}
                  className="flex h-6 items-center px-0.5 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      'block h-2 rounded-full transition-all duration-200',
                      i === actif ? 'w-6 bg-amber' : 'w-2 bg-cream-deep hover:bg-amber-soft',
                    )}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => choisir(actif + 1)}
              aria-label="Avis suivant"
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--line-strong)] text-ink-mid transition-colors hover:border-amber hover:text-amber-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber active:scale-[0.97]"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <button type="button" onClick={() => setTiroir(true)} className="btn btn-outline">
            Voir tous les avis ({n})
            <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <TousLesAvis ouvert={tiroir} onOuvertChange={setTiroir} />
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Le tiroir « Tous les avis » : il glisse depuis la droite, la page s'assombrit
   derrière. En-tête fixe, liste qui défile, une carte par avis.
   ───────────────────────────────────────────────────────────────────────────── */

function TousLesAvis({
  ouvert,
  onOuvertChange,
}: {
  ouvert: boolean
  onOuvertChange: (v: boolean) => void
}) {
  return (
    <Dialog.Root open={ouvert} onOpenChange={onOuvertChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(30rem,100vw)] flex-col bg-cream shadow-[var(--shadow-pop)] focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:[animation-duration:180ms]">
          <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-paper px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl font-bold text-navy">Tous les avis</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-soft">
                {TESTIMONIALS.length} clients racontent Lab&apos;s Food.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fermer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-mid transition-colors hover:bg-cream-soft hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </header>

          <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
            {TESTIMONIALS.map((avis, i) => (
              <CarteAvis key={avis.id} avis={avis} ton={TONS[i % TONS.length]} />
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CarteAvis({ avis, ton }: { avis: Testimonial; ton: string }) {
  return (
    <li className="rounded-2xl border border-[var(--line)] bg-paper p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold', ton)}
        >
          {initiales(avis.clientName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-navy">{avis.clientName}</p>
          {avis.clientCity && <p className="text-xs text-ink-soft">{avis.clientCity}</p>}
        </div>
        <Etoiles note={avis.rating} taille="h-3.5 w-3.5" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-mid">
        <span aria-hidden className="mr-1 font-display text-lg font-bold leading-none text-amber">“</span>
        {avis.text}
        <span aria-hidden className="ml-1 font-display text-lg font-bold leading-none text-amber">”</span>
      </p>
    </li>
  )
}
