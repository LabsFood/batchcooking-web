'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { fadeUpInView } from '@/lib/motion'

type Photo = {
  src: string
  alt: string
}

/* Des plats dans leurs gamelles, et rien d'autre : pas de nom, pas de pays.
   Ce sont des photos libres de droits en attendant celles de nos batch cookers
   (sources dans `public/images/gamelles/CREDITS.md`). Pour les remplacer,
   déposer les nouvelles dans ce dossier et changer `src`. */
const ROW_A: Photo[] = [
  { src: '/images/gamelles/gamelle-a01.jpg', alt: 'Falafels, pois chiches et riz dans des gamelles en verre' },
  { src: '/images/gamelles/gamelle-a02.jpg', alt: 'Gamelle de riz, haricots, poulet et brocoli' },
  { src: '/images/gamelles/gamelle-a03.jpg', alt: 'Plats de pâtes, brocoli et poulet effiloché en barquettes' },
  { src: '/images/gamelles/gamelle-a04.jpg', alt: 'Barquettes vertes de pommes de terre, riz, pâtes et légumes' },
  { src: '/images/gamelles/gamelle-a05.jpg', alt: 'Barquettes de plats mijotés, crêpes gratinées et viande' },
  { src: '/images/gamelles/gamelle-a06.jpg', alt: 'Gamelle de poulet au curcuma, riz et brocoli' },
  { src: '/images/gamelles/gamelle-a07.jpg', alt: 'Gamelle de poulet grillé, brocoli et carottes' },
]

const ROW_B: Photo[] = [
  { src: '/images/gamelles/gamelle-b01.jpg', alt: 'Bols de céréales, lentilles, olives et légumes frais' },
  { src: '/images/gamelles/gamelle-b02.jpg', alt: 'Pile de gamelles de riz, poulet et légumes' },
  { src: '/images/gamelles/gamelle-b03.jpg', alt: 'Barquettes de soupe, haricots et brocoli' },
  { src: '/images/gamelles/gamelle-b04.jpg', alt: 'Gamelles de riz et de viande aux herbes fraîches' },
  { src: '/images/gamelles/gamelle-b05.jpg', alt: 'Gamelle de poulet grillé, riz, haricots et purée' },
  { src: '/images/gamelles/gamelle-b06.jpg', alt: 'Gamelles hermétiques de soupes maison' },
]

/* ─────────────────────────────────────────────────────────────────────────────
   « Cuisines du monde » et « Composez votre menu » ne font plus qu'une scène
   (décision du 26/11) : les gamelles défilent en fond — une rangée vers la
   gauche, l'autre vers la droite (`.lf-defile`, globals.css) — sous un voile
   sombre à peine flouté, et l'invitation se lit par-dessus, au centre.

   Les rangées deviennent décoratives (aria-hidden, aucun pointeur) : le
   contenu, c'est le texte et son bouton vers /menu. En
   `prefers-reduced-motion`, le CSS fige le défilement, la scène reste posée.
   ───────────────────────────────────────────────────────────────────────────── */

export default function FoodCarousel() {
  return (
    <section className="relative overflow-hidden bg-navy-deep">
      {/* Le fond : les deux rangées, en sens inverses. */}
      <div aria-hidden className="pointer-events-none select-none py-10 lg:py-14">
        <Rangee photos={ROW_A} />
        <Rangee photos={ROW_B} inverse className="mt-5 lg:mt-7" />
      </div>

      {/* Le voile, léger : les plats restent devinables, le texte lisible. */}
      <div className="absolute inset-0 flex items-center justify-center bg-navy-deep/65 backdrop-blur-[2px]">
        {/* slow-out : l'invitation se pose en 240 ms */}
        <motion.div {...fadeUpInView()} className="max-w-2xl px-6 text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-amber">
            Cuisines du monde
          </p>
          <h2
            className="font-display font-bold leading-[1.08] text-white [text-wrap:balance]"
            style={{ fontSize: 'clamp(1.9rem, 4.2vw, 3.25rem)', letterSpacing: '-0.02em' }}
          >
            Composez votre menu, avec votre batch cooker.
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-white/80">
            Chaque batch cooker propose sa propre carte. Filtrez par dates, région ou régime
            alimentaire, choisissez celui qui vous plaît, puis les plats que vous voulez
            retrouver dans votre frigo.
          </p>
          <Link href="/menu" className="btn btn-primary mt-9">
            Découvrir les menus
            <ArrowRight className="icon-arrow h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

function Rangee({
  photos,
  inverse,
  className = '',
}: {
  photos: Photo[]
  inverse?: boolean
  className?: string
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className={`flex w-max ${inverse ? 'lf-defile-inverse' : 'lf-defile'}`}>
        <Serie photos={photos} />
        <Serie photos={photos} />
      </div>
    </div>
  )
}

/** Une passe complète de la rangée ; la seconde boucle sans couture. */
function Serie({ photos }: { photos: Photo[] }) {
  return (
    <div className="flex shrink-0 gap-4 px-2 lg:gap-6 lg:px-3">
      {photos.map((p) => (
        <figure
          key={p.src}
          className="relative aspect-square w-[220px] flex-shrink-0 overflow-hidden rounded-3xl bg-navy lg:w-[300px]"
        >
          {/* Décor (la section est aria-hidden) : pas de texte de remplacement. */}
          <Image
            src={p.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 300px, 220px"
            className="object-cover"
          />
        </figure>
      ))}
    </div>
  )
}
