'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { TESTIMONIALS } from '@/lib/mock-data'
import { DURATION, EASE_IN, EASE_MOVE, EASE_OUT, SPRING, fadeUpInView } from '@/lib/motion'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Les témoignages, en roue (refonte du 26/11, sur maquette du client).

   Section blanche, sans conteneur. À gauche, les clients sont posés sur un
   arc : choisir quelqu'un — ou le stepper en bas — fait tourner la roue,
   l'avis choisi vient au sommet de l'arc, son nom à côté. À droite, son avis
   entre les guillemets de la maison, qui glisse en fondu à chaque tour.

   L'arc et les pastilles partagent le même repère de 320 × 420 px, en taille
   fixe : c'est ce qui garde les avatars exactement sur le fil du cercle.

   La roue avance seule toutes les 8 s — elle s'arrête au survol ou au premier
   choix, et ne tourne pas du tout en mouvement réduit. Sous `lg`, l'arc
   devient une rangée d'avatars au-dessus de l'avis.
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
const PAS = 52

export default function Testimonials() {
  const [actif, setActif] = useState(0)
  const [tenue, setTenue] = useState(false)
  const calme = useReducedMotion()
  const n = TESTIMONIALS.length
  const t = TESTIMONIALS[actif]

  const choisir = (i: number) => {
    setActif(((i % n) + n) % n)
    setTenue(true)
  }

  // La roue avance seule, tant qu'on ne la tient pas (survol, choix, mouvement réduit).
  useEffect(() => {
    if (calme || tenue) return
    const minuterie = setInterval(() => setActif((a) => (a + 1) % n), 8000)
    return () => clearInterval(minuterie)
  }, [calme, tenue, n])

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
            Nos premiers clients racontent leur semaine cuisinée à la maison.
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
              // L'écart le plus court entre ce convive et l'actif : -1, 0 ou 1.
              let d = (((i - actif) % n) + n) % n
              if (d > n / 2) d -= n
              const angle = (d * PAS * Math.PI) / 180
              const x = CENTRE.x + RAYON * Math.cos(angle)
              const y = CENTRE.y + RAYON * Math.sin(angle)
              const choisi = d === 0
              return (
                <motion.button
                  key={avis.id}
                  type="button"
                  onClick={() => choisir(i)}
                  aria-label={`Lire l’avis de ${avis.clientName}`}
                  aria-pressed={choisi}
                  // déplacement : la roue tourne en 240 ms (slow-in + slow-out),
                  // la pastille choisie se pose d'un ressort.
                  initial={false}
                  animate={{ x: x - 32, y: y - 32, scale: choisi ? 1.22 : 0.82, opacity: choisi ? 1 : 0.55 }}
                  transition={{
                    x: { duration: DURATION.base, ease: EASE_MOVE },
                    y: { duration: DURATION.base, ease: EASE_MOVE },
                    scale: SPRING,
                    opacity: { duration: DURATION.base, ease: EASE_MOVE },
                  }}
                  whileHover={{ scale: choisi ? 1.22 : 0.95 }}
                  className="absolute left-0 top-0 z-10 h-16 w-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-full"
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
                  <span className="block text-xs text-ink-soft">{t.clientCity}</span>
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* ── La rangée (sous lg) ──────────────────────────────────── */}
          <div className="flex items-center justify-center gap-3 lg:hidden">
            {TESTIMONIALS.map((avis, i) => (
              <button
                key={avis.id}
                type="button"
                onClick={() => choisir(i)}
                aria-label={`Lire l’avis de ${avis.clientName}`}
                aria-pressed={i === actif}
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full font-display text-base font-bold ring-2 transition-all',
                  TONS[i % TONS.length],
                  i === actif ? 'scale-110 ring-amber' : 'ring-transparent opacity-60',
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
                  <span className="flex gap-0.5" aria-label={`Note : ${t.rating} sur 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        aria-hidden
                        className={cn('h-4 w-4', i < t.rating ? 'fill-amber text-amber' : 'text-ink-soft/30')}
                      />
                    ))}
                  </span>
                  {/* Le nom vit sur la roue en desktop : ici, pour la rangée mobile. */}
                  <span className="text-sm font-semibold text-navy lg:hidden">
                    {t.clientName} · <span className="font-normal text-ink-soft">{t.clientCity}</span>
                  </span>
                  {t.verified && <span className="text-xs text-ink-soft">Avis vérifié</span>}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Le stepper, en bas : précédent, où l'on est, suivant. ───── */}
        <div className="mt-10 flex items-center justify-center gap-5 lg:mt-6">
          <button
            type="button"
            onClick={() => choisir(actif - 1)}
            aria-label="Avis précédent"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--line-strong)] text-ink-mid transition-colors hover:border-amber hover:text-amber-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber active:scale-[0.97]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="flex items-center gap-2" role="tablist" aria-label="Choisir un avis">
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
                    i === actif ? 'w-7 bg-amber' : 'w-2 bg-cream-deep hover:bg-amber-soft',
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
      </div>
    </section>
  )
}
