'use client'

import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

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
  const ref = useRef<HTMLElement | null>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      className="relative overflow-hidden section-cream-soft py-20 lg:py-28"
    >
      {/* Header */}
      <div className="container-xl relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto text-center mb-12 lg:mb-14"
        >
          <p className="eyebrow mb-5 justify-center">Gastronomie</p>
          <h2 className="h-section">
            Cuisines du monde
          </h2>
        </motion.div>
      </div>

      {/* Marquee — Row A (left → right) */}
      <Row photos={ROW_A} direction="left" />

      {/* Marquee — Row B (right → left) */}
      <Row photos={ROW_B} direction="right" className="mt-5 lg:mt-7" />

      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 lg:w-24 bg-gradient-to-r from-cream-soft to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 lg:w-24 bg-gradient-to-l from-cream-soft to-transparent" />
    </section>
  )
}

function Row({
  photos,
  direction,
  className = '',
}: {
  photos: Photo[]
  direction: 'left' | 'right'
  className?: string
}) {
  // Duplicate so the translate -50% can loop seamlessly.
  const items = [...photos, ...photos]
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="flex gap-4 lg:gap-6 w-max"
        style={{
          animation: `${direction === 'left' ? 'food-marquee-left' : 'food-marquee-right'} 60s linear infinite`,
        }}
      >
        {items.map((p, i) => (
          // La seconde moitié n'est qu'une copie pour la boucle : lecteurs d'écran
          // et ordre de tabulation ne la voient pas.
          <PhotoCard key={`${p.src}-${i}`} photo={p} decorative={i >= photos.length} />
        ))}
      </div>
      <style jsx>{`
        @keyframes food-marquee-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes food-marquee-right {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          div > div { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

function PhotoCard({ photo, decorative }: { photo: Photo; decorative: boolean }) {
  return (
    <figure
      aria-hidden={decorative || undefined}
      className="relative flex-shrink-0 w-[260px] lg:w-[340px] aspect-square rounded-3xl overflow-hidden bg-paper shadow-[0_18px_36px_-18px_rgba(31,42,55,0.25)]"
    >
      <Image
        src={photo.src}
        alt={decorative ? '' : photo.alt}
        fill
        sizes="(min-width: 1024px) 340px, 260px"
        className="object-cover transition-transform duration-700 hover:scale-105"
      />
    </figure>
  )
}
