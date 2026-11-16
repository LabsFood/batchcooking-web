'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
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

export default function FoodCarousel() {
  return (
    <section className="relative overflow-hidden section-cream-soft py-20 lg:py-28">
      {/* Header */}
      <div className="container-xl relative">
        {/* slow-out : l'en-tête se pose en 240 ms */}
        <motion.div {...fadeUpInView()} className="max-w-2xl mx-auto text-center mb-12 lg:mb-14">
          <h2 className="h-section">
            Cuisines du monde
          </h2>
        </motion.div>
      </div>

      {/* Deux rangées que l'on fait défiler au doigt ou à la molette : rien ne bouge seul. */}
      <Row photos={ROW_A} />
      <Row photos={ROW_B} className="mt-5 lg:mt-7" />
    </section>
  )
}

function Row({ photos, className = '' }: { photos: Photo[]; className?: string }) {
  return (
    <div className={`overflow-x-auto snap-x snap-mandatory ${className}`}>
      <div className="flex gap-4 lg:gap-6 w-max px-6 lg:px-10">
        {photos.map((p) => (
          <PhotoCard key={p.src} photo={p} />
        ))}
      </div>
    </div>
  )
}

function PhotoCard({ photo }: { photo: Photo }) {
  return (
    <figure className="relative flex-shrink-0 snap-start w-[260px] lg:w-[340px] aspect-square rounded-3xl overflow-hidden bg-paper shadow-[0_18px_36px_-18px_rgba(31,42,55,0.25)]">
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="(min-width: 1024px) 340px, 260px"
        className="object-cover"
      />
    </figure>
  )
}
