'use client'

import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────────────
   « Comment ça marche », raconté au scroll (décision du 26/11 — la section
   retenue de l'essai d'accueil immersif).

   À partir de `lg`, la scène se fige à l'écran pendant 340 vh : chaque étape
   occupe un quart du trajet, sa photo et son texte se fondent l'un dans
   l'autre au rythme du doigt. Rien n'est à l'horloge : avancer, reculer,
   s'arrêter entre deux étapes — c'est le visiteur qui tient la caméra.

   Sous `lg` (et en `prefers-reduced-motion`, où l'épinglage n'apporte que de
   la gêne), les mêmes étapes s'empilent simplement.

   Chaque photo illustre SON étape : les plats qu'on choisit, le calendrier
   qu'on réserve, l'étal des courses, le chef en tenue qui cuisine.
   ───────────────────────────────────────────────────────────────────────────── */

const ETAPES = [
  {
    nombre: '01',
    titre: 'Choisissez vos plats',
    texte:
      'Parcourez les cartes des batch cookers et choisissez les plats qui vous font envie. Rien ne vous correspond ? Faites une demande sur mesure : ils vous proposent un menu rien que pour vous.',
    src: '/images/gamelles/gamelle-a06.jpg',
    alt: 'Gamelle de poulet au curcuma, riz et brocoli — un plat de la carte',
    position: 'object-center',
  },
  {
    nombre: '02',
    titre: 'Réservez votre session',
    texte:
      'La date, le créneau, votre batch cooker : tout se confirme en ligne.',
    src: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&auto=format&fit=crop',
    alt: 'Calendrier et planning du mois — choisir sa date',
    position: 'object-center',
  },
  {
    nombre: '03',
    titre: 'Recevez la liste de courses',
    texte:
      'Relue par votre batch cooker, classée par rayons. Les courses, c’est vous qui choisissez : vous les faites vous-même, ou votre batch cooker s’en charge.',
    src: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&auto=format&fit=crop',
    alt: 'Étal de fruits et légumes frais — les courses de la semaine',
    position: 'object-center',
  },
  {
    nombre: '04',
    titre: 'Le chef cuisine chez vous',
    texte:
      'Deux à trois heures de cuisine, une semaine de repas au frigo, la cuisine rendue propre. Il ne reste qu’à réchauffer.',
    src: '/images/cuisine.jpeg',
    alt: 'Batch cooker Lab’s Food dans la cuisine d’un client, devant les plats de la semaine',
    position: 'object-[50%_70%]',
  },
]

export default function HowItWorksScroll() {
  const piste = useRef<HTMLDivElement>(null)
  const calme = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: piste,
    offset: ['start start', 'end end'],
  })

  return (
    <section id="how-it-works" className="section-cream-soft">
      <div className="container-xl pt-20 lg:pt-28">
        <h2 className="h-section max-w-3xl">Comment ça marche&nbsp;?</h2>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-mid">
          Quatre étapes, une seule session chez vous.
        </p>
      </div>

      {/* ── La scène épinglée (lg et +, mouvement accepté) ───────────────── */}
      <div
        ref={piste}
        className={`relative mt-10 hidden ${calme ? '' : 'lg:block'}`}
        style={{ height: `${ETAPES.length * 85}vh` }}
      >
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="container-xl grid w-full grid-cols-12 items-center gap-12">
            {/* Les photos, empilées : chacune ne vit que sur son quart de trajet. */}
            <div className="relative col-span-6 aspect-[4/5] max-h-[72vh] w-full overflow-hidden rounded-3xl bg-cream-deep shadow-[0_40px_80px_-40px_rgba(31,42,55,0.45)]">
              {ETAPES.map((etape, i) => (
                <Photo key={etape.src} etape={etape} index={i} progres={scrollYProgress} />
              ))}
              {/* Le compteur sur la photo : on sait toujours où on en est. */}
              <div className="absolute bottom-5 left-5 z-10 rounded-full bg-navy-deep/80 px-4 py-2 text-sm font-semibold tabular-nums text-white backdrop-blur-sm">
                <Compteur progres={scrollYProgress} />
              </div>
            </div>

            {/* Les textes : le rail à gauche marque la progression. */}
            <div className="col-span-6">
              <ol className="space-y-9">
                {ETAPES.map((etape, i) => (
                  <Etape key={etape.nombre} etape={etape} index={i} progres={scrollYProgress} />
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* ── La version mobile : un coverflow au pouce ────────────────────── */}
      <div className={`mt-10 pb-20 ${calme ? 'lg:pb-28' : 'lg:hidden'}`}>
        <Coverflow calme={!!calme} />
      </div>
      {/* L'épinglage s'arrête net : un palier d'air avant la suite. */}
      <div className={`hidden h-20 ${calme ? '' : 'lg:block'}`} aria-hidden />
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Le coverflow mobile : un rail à balayer, aimanté carte par carte. La carte
   au centre est de face ; ses voisines s'inclinent et reculent d'autant
   qu'elles s'éloignent. Tout est recalculé au fil du défilement (une passe
   par image, via rAF), sans bibliothèque. Au doigt et à la molette, le rail
   défile nativement ; à la souris, on l'attrape : pendant la prise l'aimant
   est coupé (il se battrait avec le geste), et à la relâche le rail revient
   s'aimanter sur la carte la plus proche. En mouvement réduit, il reste un
   carrousel aimanté, posé à plat.
   ───────────────────────────────────────────────────────────────────────────── */

function Coverflow({ calme }: { calme: boolean }) {
  const rail = useRef<HTMLOListElement>(null)
  const cartes = useRef<(HTMLLIElement | null)[]>([])
  const demande = useRef(0)
  /** La prise à la souris : où l'on a saisi, et où en était le rail. */
  const prise = useRef<{ x: number; depart: number } | null>(null)

  const poser = useCallback(() => {
    const r = rail.current
    if (!r || calme) return
    const centre = r.scrollLeft + r.clientWidth / 2
    for (const carte of cartes.current) {
      if (!carte) continue
      // -1 (à gauche) … 0 (au centre) … 1 (à droite), borné.
      const d = Math.max(-1, Math.min(1, (carte.offsetLeft + carte.offsetWidth / 2 - centre) / carte.offsetWidth))
      carte.style.transform = `rotateY(${(-d * 16).toFixed(2)}deg) scale(${(1 - Math.abs(d) * 0.12).toFixed(3)})`
      carte.style.opacity = String(1 - Math.abs(d) * 0.35)
      carte.style.zIndex = String(10 - Math.round(Math.abs(d) * 5))
    }
  }, [calme])

  useEffect(() => {
    poser()
    const r = rail.current
    if (!r || calme) return
    const auFil = () => {
      cancelAnimationFrame(demande.current)
      demande.current = requestAnimationFrame(poser)
    }
    r.addEventListener('scroll', auFil, { passive: true })
    window.addEventListener('resize', auFil)
    return () => {
      r.removeEventListener('scroll', auFil)
      window.removeEventListener('resize', auFil)
      cancelAnimationFrame(demande.current)
    }
  }, [poser, calme])

  /* La prise à la souris. Le toucher n'entre pas ici : il défile nativement. */
  const saisir = (e: React.PointerEvent<HTMLOListElement>) => {
    const r = rail.current
    if (!r || e.pointerType !== 'mouse') return
    prise.current = { x: e.clientX, depart: r.scrollLeft }
    r.setPointerCapture(e.pointerId)
    r.classList.remove('snap-x')
    r.style.cursor = 'grabbing'
  }
  const suivre = (e: React.PointerEvent<HTMLOListElement>) => {
    const r = rail.current
    if (!r || !prise.current) return
    r.scrollLeft = prise.current.depart - (e.clientX - prise.current.x)
  }
  const lacher = (e: React.PointerEvent<HTMLOListElement>) => {
    const r = rail.current
    if (!r || !prise.current) return
    prise.current = null
    r.releasePointerCapture(e.pointerId)
    r.style.cursor = ''
    // Revenir s'aimanter sur la carte la plus proche, puis rendre l'aimant.
    const centre = r.scrollLeft + r.clientWidth / 2
    let cible: HTMLLIElement | null = null
    let ecart = Infinity
    for (const carte of cartes.current) {
      if (!carte) continue
      const d = Math.abs(carte.offsetLeft + carte.offsetWidth / 2 - centre)
      if (d < ecart) {
        ecart = d
        cible = carte
      }
    }
    if (cible) r.scrollTo({ left: cible.offsetLeft + cible.offsetWidth / 2 - r.clientWidth / 2, behavior: 'smooth' })
    setTimeout(() => r.classList.add('snap-x'), 350)
  }

  return (
    <ol
      ref={rail}
      onPointerDown={saisir}
      onPointerMove={suivre}
      onPointerUp={lacher}
      onPointerCancel={lacher}
      className="flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto px-[11vw] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-[24vw] select-none"
      style={{ perspective: '1000px' }}
      aria-label="Les quatre étapes"
    >
      {ETAPES.map((etape, i) => (
        <li
          key={etape.nombre}
          ref={(el) => {
            cartes.current[i] = el
          }}
          className="w-[78vw] max-w-sm shrink-0 snap-center overflow-hidden rounded-2xl border border-[var(--line)] bg-paper shadow-[var(--shadow-card)] will-change-transform sm:w-[52vw]"
        >
          <div className="relative aspect-[5/3]">
            <Image
              src={etape.src}
              alt={etape.alt}
              fill
              sizes="(min-width: 640px) 52vw, 78vw"
              draggable={false}
              className={`object-cover ${etape.position}`}
            />
          </div>
          <div className="p-5">
            <p className="text-sm font-semibold tabular-nums text-amber-deep">{etape.nombre}</p>
            <h3 className="mt-1 font-display text-lg font-bold text-navy">{etape.titre}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">{etape.texte}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** La fenêtre de l'étape `i` sur le trajet 0→1, avec un fondu d'un dixième. */
function fenetre(i: number, n: number): [number, number, number, number] {
  const taille = 1 / n
  const debut = i * taille
  const fin = debut + taille
  return [Math.max(0, debut - 0.04), debut + 0.05, fin - 0.05, Math.min(1, fin + 0.04)]
}

function Photo({
  etape,
  index,
  progres,
}: {
  etape: (typeof ETAPES)[number]
  index: number
  progres: MotionValue<number>
}) {
  const [a, b, c, d] = fenetre(index, ETAPES.length)
  // fondu-enchaîné : l'image ne vit que sur son quart de trajet
  const opacity = useTransform(
    progres,
    [a, b, c, d],
    [index === 0 ? 1 : 0, 1, 1, index === ETAPES.length - 1 ? 1 : 0],
  )
  // léger zoom arrière en traversant l'étape : la photo respire sans bouger du cadre
  const scale = useTransform(progres, [a, d], [1.08, 1])

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <motion.div style={{ scale }} className="absolute inset-0">
        <Image
          src={etape.src}
          alt={etape.alt}
          fill
          sizes="(min-width: 1024px) 46vw, 0px"
          className={`object-cover ${etape.position}`}
        />
      </motion.div>
    </motion.div>
  )
}

function Etape({
  etape,
  index,
  progres,
}: {
  etape: (typeof ETAPES)[number]
  index: number
  progres: MotionValue<number>
}) {
  const [a, b, c, d] = fenetre(index, ETAPES.length)
  const active = useTransform(
    progres,
    [a, b, c, d],
    [index === 0 ? 1 : 0.32, 1, 1, index === ETAPES.length - 1 ? 1 : 0.32],
  )
  const rail = useTransform(progres, [a, c], [0, 1])

  return (
    <motion.li style={{ opacity: active }} className="relative grid grid-cols-[2.5rem_1fr] gap-5">
      {/* Le rail : il se remplit d'ambre en traversant l'étape. */}
      <div className="relative mt-1 h-full w-[3px] overflow-hidden rounded-full bg-cream-deep">
        <motion.div style={{ scaleY: rail }} className="absolute inset-0 origin-top bg-amber" />
      </div>
      <div>
        <p className="font-display text-xl font-bold tabular-nums text-amber-deep">{etape.nombre}</p>
        <h3 className="mt-1 font-display text-2xl font-bold leading-tight text-navy">{etape.titre}</h3>
        <p className="mt-2 max-w-md leading-relaxed text-ink-mid">{etape.texte}</p>
      </div>
    </motion.li>
  )
}

/** « 02 / 04 » : le chiffre suit le quart de trajet en cours. */
function Compteur({ progres }: { progres: MotionValue<number> }) {
  const n = ETAPES.length
  const numero = useTransform(progres, (v) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(v * n)))
    return `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`
  })
  return <motion.span>{numero}</motion.span>
}
