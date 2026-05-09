'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Globe2 } from 'lucide-react'

type Dish = {
  name: string
  country: string
  flag: string
  img: string
}

// Two rows of dishes from different continents — Unsplash CDN.
// Row A scrolls left → right, Row B scrolls right → left.
const ROW_A: Dish[] = [
  {
    name: 'Tajine d’agneau',
    country: 'Maroc',
    flag: '🇲🇦',
    img: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Risotto crémeux',
    country: 'Italie',
    flag: '🇮🇹',
    img: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mafé sénégalais',
    country: 'Sénégal',
    flag: '🇸🇳',
    img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Phở bò',
    country: 'Vietnam',
    flag: '🇻🇳',
    img: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Bœuf bourguignon',
    country: 'France',
    flag: '🇫🇷',
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tacos al pastor',
    country: 'Mexique',
    flag: '🇲🇽',
    img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Curry de poulet',
    country: 'Inde',
    flag: '🇮🇳',
    img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=900&auto=format&fit=crop&q=80',
  },
  // {
  //   name: 'Sushi assortis',
  //   country: 'Japon',
  //   flag: '🇯🇵',
  //   img: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=900&auto=format&fit=crop&q=80',
  // },
]

const ROW_B: Dish[] = [
  {
    name: 'Paella valenciana',
    country: 'Espagne',
    flag: '🇪🇸',
    img: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Bibimbap',
    country: 'Corée du Sud',
    flag: '🇰🇷',
    img: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mezze libanais',
    country: 'Liban',
    flag: '🇱🇧',
    img: 'https://images.unsplash.com/photo-1544510808-91bcbee1df55?w=900&auto=format&fit=crop&q=80',
  },
  // {
  //   name: 'Ceviche péruvien',
  //   country: 'Pérou',
  //   flag: '🇵🇪',
  //   img: 'https://images.unsplash.com/photo-1535400255456-984b2d9a91d2?w=900&auto=format&fit=crop&q=80',
  // },
  {
    name: 'Pad thaï',
    country: 'Thaïlande',
    flag: '🇹🇭',
    img: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=900&auto=format&fit=crop&q=80',
  },
  // {
  //   name: 'Yassa poulet',
  //   country: 'Côte d’Ivoire',
  //   flag: '🇨🇮',
  //   img: 'https://images.unsplash.com/photo-1604908554027-790b2cb22a44?w=900&auto=format&fit=crop&q=80',
  // },
  {
    name: 'Pasta carbonara',
    country: 'Italie',
    flag: '🇮🇹',
    img: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&auto=format&fit=crop&q=80',
  },
  {
    name: 'Falafel & houmous',
    country: 'Israël',
    flag: '🇮🇱',
    img: 'https://images.unsplash.com/photo-1547928576-b822bc410bdf?w=900&auto=format&fit=crop&q=80',
  },
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
      <Row dishes={ROW_A} direction="left" />

      {/* Marquee — Row B (right → left) */}
      <Row dishes={ROW_B} direction="right" className="mt-5 lg:mt-7" />

      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 lg:w-24 bg-gradient-to-r from-cream-soft to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 lg:w-24 bg-gradient-to-l from-cream-soft to-transparent" />
    </section>
  )
}

function Row({
  dishes,
  direction,
  className = '',
}: {
  dishes: Dish[]
  direction: 'left' | 'right'
  className?: string
}) {
  // Duplicate so the translate -50% can loop seamlessly.
  const items = [...dishes, ...dishes]
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="flex gap-4 lg:gap-6 w-max"
        style={{
          animation: `${direction === 'left' ? 'food-marquee-left' : 'food-marquee-right'} 60s linear infinite`,
        }}
      >
        {items.map((d, i) => (
          <DishCard key={`${d.name}-${i}`} dish={d} />
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

function DishCard({ dish }: { dish: Dish }) {
  return (
    <figure className="relative flex-shrink-0 w-[260px] lg:w-[340px] aspect-[4/5] rounded-3xl overflow-hidden bg-paper shadow-[0_18px_36px_-18px_rgba(31,42,55,0.25)]">
      <img
        src={dish.img}
        alt={dish.name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
      />
      {/* Dark gradient bottom for legibility */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

      {/* Country chip */}
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-navy text-[11px] font-semibold shadow-sm">
        <span aria-hidden>{dish.flag}</span>
        {dish.country}
      </span>

      {/* Title */}
      <figcaption className="absolute left-4 right-4 bottom-4 text-white">
        <p className="font-display text-lg lg:text-xl font-bold leading-tight drop-shadow">
          {dish.name}
        </p>
      </figcaption>
    </figure>
  )
}
