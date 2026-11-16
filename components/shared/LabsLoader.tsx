'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { fade } from '@/lib/motion'
import { cn } from '@/lib/utils'

type LoaderProps = {
  fullscreen?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = { sm: 56, md: 92, lg: 132 }

export default function LabsLoader({
  fullscreen = false,
  label,
  size = 'md',
  className,
}: LoaderProps) {
  const px = SIZE[size]

  const Inner = (
    <div className={cn('flex flex-col items-center justify-center gap-5', className)}>
      <div className="relative" style={{ width: px * 1.6, height: px * 1.6 }}>
        {/* indicateur de chargement : anneau qui tourne (linéaire, boucle volontaire) */}
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          aria-hidden
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2
            const x = 50 + Math.cos(angle) * 46
            const y = 50 + Math.sin(angle) * 46
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i % 3 === 0 ? 2.4 : 1.2}
                fill={i % 3 === 0 ? '#F39C12' : '#2C3E50'}
                opacity={0.5 + (i % 4) * 0.15}
              />
            )
          })}
        </motion.svg>

        {/* indicateur de chargement : trois bulles qui montent en boucle (1,8 s) */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 4 }}>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute block rounded-full bg-amber/60"
              style={{
                width: 6,
                height: 6,
                left: i === 1 ? -10 : i === 2 ? 8 : -2,
              }}
              animate={{
                y: [0, -18, -32],
                opacity: [0, 0.9, 0],
                scale: [0.7, 1, 0.6],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>

        {/* indicateur de chargement : le logo respire en boucle (2,6 s) */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="relative rounded-full bg-paper shadow-[0_18px_36px_-12px_rgba(31,42,55,0.25)] flex items-center justify-center"
            style={{ width: px, height: px }}
          >
            <Image
              src="/logo.png"
              alt="Lab's Food"
              width={px - 10}
              height={px - 10}
              priority
              className="object-contain"
            />
          </div>
        </motion.div>
      </div>

      {label && (
        <motion.p
          // fondu : le libellé arrive en 180 ms
          {...fade}
          className="text-xs uppercase tracking-[0.12em] text-ink-soft"
        >
          {label}
        </motion.p>
      )}
    </div>
  )

  if (!fullscreen) return Inner

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-cream/95 backdrop-blur-sm">
      {Inner}
    </div>
  )
}
