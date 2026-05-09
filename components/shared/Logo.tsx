'use client'

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type LogoProps = {
  variant?: 'default' | 'white' | 'mark-only'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  href?: string | null
}

const SIZES = {
  sm: { mark: 32, text: 'text-base' },
  md: { mark: 44, text: 'text-xl' },
  lg: { mark: 64, text: 'text-2xl' },
}

export default function Logo({
  variant = 'default',
  size = 'md',
  className,
  href = '/',
}: LogoProps) {
  const { mark, text } = SIZES[size]
  const isWhite = variant === 'white'

  const inner = (
    <span className={cn('group inline-flex items-center gap-2.5 leading-none', className)}>
      <span
        className="relative flex-shrink-0 transition-transform duration-500 group-hover:rotate-[-6deg]"
        style={{ width: mark, height: mark }}
      >
        <Image
          src="/logoOfficiel.png"
          alt="Lab's Food"
          fill
          priority
          sizes={`${mark}px`}
          className={cn(
            'object-contain',
            isWhite && 'brightness-0 invert',
          )}
        />
      </span>
      {variant !== 'mark-only' && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display font-bold tracking-tight',
              text,
              isWhite ? 'text-white' : 'text-navy',
            )}
          >
            Lab&apos;s Food
          </span>
          <span
            className={cn(
              'font-mono mt-1 tracking-[0.22em] uppercase',
              size === 'sm' ? 'text-[8px]' : 'text-[9px]',
              isWhite ? 'text-white/55' : 'text-ink-soft',
            )}
          >
            Batch Cooking
          </span>
        </span>
      )}
    </span>
  )

  if (!href) return inner
  return <Link href={href}>{inner}</Link>
}
