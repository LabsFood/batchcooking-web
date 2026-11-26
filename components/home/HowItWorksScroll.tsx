'use client'

import { useRef } from 'react'
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

   Chaque photo illustre SON étape : les plats qu'on choisit, le chef qu'on
   réserve, les ingrédients de la liste de courses, le chef en cuisine.
   ───────────────────────────────────────────────────────────────────────────── */

const ETAPES = [
  {
    nombre: '01',
    titre: 'Choisissez vos plats',
    texte:
      'Chaque batch cooker tient sa propre carte. Parcourez les menus de la semaine et cochez ce qui vous fait envie.',
    src: '/images/gamelles/gamelle-a01.jpg',
    alt: 'Gamelles de falafels, pois chiches et riz — des plats à choisir',
    position: 'object-center',
  },
  {
    nombre: '02',
    titre: 'Réservez votre session',
    texte:
      'La date, le créneau, votre batch cooker : tout se confirme en ligne. Vous ne réglez que votre moitié — le crédit d’impôt de 50 % est déduit au paiement.',
    src: '/images/IvyChef.png',
    alt: 'Votre batch cooker, en tenue de chef',
    position: 'object-top',
  },
  {
    nombre: '03',
    titre: 'Recevez la liste de courses',
    texte:
      'Relue par votre batch cooker, classée par rayons. Cochez ce que vous avez déjà : il n’achète que le reste.',
    src: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=900&auto=format&fit=crop',
    alt: 'Panier d’ingrédients frais — fruits et légumes de la liste de courses',
    position: 'object-center',
  },
  {
    nombre: '04',
    titre: 'Le chef cuisine chez vous',
    texte:
      'Deux à trois heures de cuisine, une semaine de repas au frigo, la cuisine rendue propre. Il ne reste qu’à réchauffer.',
    src: '/images/ivyCuisine.png',
    alt: 'Batch cooker en train de cuisiner à domicile',
    position: 'object-center',
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

      {/* ── La version posée (mobile, et mouvement réduit) ───────────────── */}
      <div className={`container-xl mt-10 pb-20 ${calme ? 'lg:pb-28' : 'lg:hidden'}`}>
        <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {ETAPES.map((etape) => (
            <li
              key={etape.nombre}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-paper shadow-[var(--shadow-card)]"
            >
              <div className="relative aspect-[5/3]">
                <Image
                  src={etape.src}
                  alt={etape.alt}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
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
      </div>
      {/* L'épinglage s'arrête net : un palier d'air avant la suite. */}
      <div className={`hidden h-20 ${calme ? '' : 'lg:block'}`} aria-hidden />
    </section>
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
