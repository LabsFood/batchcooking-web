'use client'

import { motion } from 'framer-motion'

/* ─────────────────────────────────────────────────────────────────────────────
 * Cooking-themed SVG animations powered by Framer Motion.
 * Lightweight, dependency-free (besides framer-motion already in the bundle),
 * and visually coherent with the Delish-inspired Lab's Food theme.
 * Works as a drop-in for Lottie animations.
 * ──────────────────────────────────────────────────────────────────────────── */

type AnimProps = {
  size?: number
  className?: string
  /** terra by default */
  color?: string
}

/* ── Steaming pot ──────────────────────────────────────────────────────────── */
export function SteamingPot({ size = 96, className = '', color = '#D96941' }: AnimProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Steam wisps */}
      <g opacity="0.55" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        {[0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d="M 0 30 Q 6 16, 0 4 Q -6 -8, 0 -20"
            transform={`translate(${50 + i * 12} 50)`}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.7, 0], y: [-2, -28, -38] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.7,
              ease: 'easeOut',
            }}
          />
        ))}
      </g>

      {/* Pot body */}
      <g>
        {/* Lid */}
        <motion.g
          initial={{ y: 0, rotate: 0 }}
          animate={{ y: [0, -3, 0], rotate: [0, 1.5, -1.5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '60px 64px' }}
        >
          <ellipse cx="60" cy="62" rx="34" ry="6" fill="#1F1A14" opacity="0.15" />
          <rect x="26" y="58" width="68" height="8" rx="3" fill={color} />
          <rect x="56" y="50" width="8" height="10" rx="2" fill="#1F1A14" />
        </motion.g>

        {/* Pot */}
        <rect x="28" y="66" width="64" height="38" rx="6" fill="#00234B" />
        <rect x="28" y="66" width="64" height="6" fill="#001A38" />
        {/* Side handles */}
        <rect x="20" y="76" width="10" height="14" rx="3" fill="#00234B" />
        <rect x="90" y="76" width="10" height="14" rx="3" fill="#00234B" />

        {/* Subtle bubble pulse */}
        <motion.circle
          cx="50" cy="80" r="2.5" fill="#F39C12"
          animate={{ opacity: [0, 1, 0], cy: [80, 74, 70] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: 0.2, ease: 'easeOut' }}
        />
        <motion.circle
          cx="68" cy="82" r="2" fill="#F39C12"
          animate={{ opacity: [0, 1, 0], cy: [82, 76, 72] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 1, ease: 'easeOut' }}
        />
      </g>
    </svg>
  )
}

/* ── Chopping knife ───────────────────────────────────────────────────────── */
export function ChoppingKnife({ size = 96, className = '', color = '#D96941' }: AnimProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Cutting board */}
      <rect x="14" y="86" width="92" height="14" rx="4" fill="#A87B4D" />
      <rect x="14" y="86" width="92" height="3" fill="#8A623A" />

      {/* Veggie slices */}
      <g>
        <circle cx="38" cy="80" r="6" fill="#3D8B5C" />
        <circle cx="38" cy="80" r="2.5" fill="#E6F4EA" />
        <circle cx="56" cy="82" r="5" fill={color} />
        <circle cx="72" cy="80" r="6" fill="#F39C12" />
        <circle cx="72" cy="80" r="2.5" fill="#FFF8E5" />
        <circle cx="90" cy="82" r="5" fill="#3D8B5C" opacity="0.85" />
      </g>

      {/* Knife — chops up & down */}
      <motion.g
        animate={{ rotate: [0, -28, 0, -22, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '88px 30px' }}
      >
        {/* Handle */}
        <rect x="68" y="22" width="22" height="8" rx="2" fill="#1F1A14" />
        {/* Blade */}
        <path d="M 24 26 L 70 22 L 70 36 L 24 32 Z" fill="#D8DEE5" />
        <path d="M 24 26 L 70 22 L 70 24 L 24 28 Z" fill="#FFFFFF" opacity="0.4" />
      </motion.g>
    </svg>
  )
}

/* ── Whisking bowl ────────────────────────────────────────────────────────── */
export function WhiskingBowl({ size = 96, className = '', color = '#D96941' }: AnimProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Bowl */}
      <path d="M 22 70 L 98 70 A 38 30 0 0 1 22 70 Z" fill="#00234B" />
      <ellipse cx="60" cy="70" rx="38" ry="6" fill="#001A38" />
      <ellipse cx="60" cy="68" rx="32" ry="3.5" fill="#F39C12" opacity="0.85" />

      {/* Whisk — moves in a circular motion */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '60px 60px' }}
      >
        <g transform="translate(54 22)">
          <rect x="0" y="0" width="6" height="22" rx="2" fill={color} />
          <g stroke="#A8B1BD" strokeWidth="1.6" fill="none" strokeLinecap="round">
            <path d="M 3 22 Q -4 32, 3 46" />
            <path d="M 3 22 Q 10 32, 3 46" />
            <path d="M 3 22 Q -2 32, 3 46" />
            <path d="M 3 22 Q 8 32, 3 46" />
          </g>
        </g>
      </motion.g>
    </svg>
  )
}

/* ── Chef hat with sparkles ───────────────────────────────────────────────── */
export function ChefHatSparkle({ size = 96, className = '', color = '#D96941' }: AnimProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Sparkles */}
      {[
        { x: 22, y: 26, d: 0 },
        { x: 96, y: 30, d: 0.6 },
        { x: 100, y: 70, d: 1.2 },
        { x: 18, y: 70, d: 1.8 },
      ].map((s, i) => (
        <motion.g
          key={i}
          transform={`translate(${s.x} ${s.y})`}
          animate={{ scale: [0.4, 1.1, 0.4], opacity: [0.2, 1, 0.2], rotate: [0, 90, 180] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: s.d, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center' }}
        >
          <path d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill={color} />
        </motion.g>
      ))}

      {/* Chef hat — gentle bob */}
      <motion.g
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ellipse cx="60" cy="40" rx="20" ry="22" fill="#FFFFFF" />
        <ellipse cx="40" cy="48" rx="14" ry="16" fill="#FFFFFF" />
        <ellipse cx="80" cy="48" rx="14" ry="16" fill="#FFFFFF" />
        <rect x="34" y="64" width="52" height="20" rx="3" fill="#FFFFFF" />
        <rect x="34" y="64" width="52" height="4" fill="#EFEAE0" />
        <rect x="34" y="80" width="52" height="4" fill="#EFEAE0" />

        {/* Logo dot */}
        <circle cx="60" cy="74" r="3.5" fill={color} />
      </motion.g>
    </svg>
  )
}

/* ── Floating ingredients (cherry tomato + leaf) ──────────────────────────── */
export function FloatingIngredients({ size = 120, className = '' }: AnimProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Tomato */}
      <motion.g
        animate={{ y: [0, -6, 0], rotate: [0, 6, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle cx="34" cy="46" r="14" fill="#D9442B" />
        <path d="M 28 36 Q 34 30, 40 36 L 38 40 L 30 40 Z" fill="#3D8B5C" />
      </motion.g>

      {/* Leaf */}
      <motion.g
        animate={{ y: [0, 5, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      >
        <path d="M 84 60 Q 92 44, 104 50 Q 100 70, 84 64 Z" fill="#3D8B5C" />
        <path d="M 86 62 Q 95 56, 100 54" stroke="#1F4D2C" strokeWidth="1" fill="none" strokeLinecap="round" />
      </motion.g>

      {/* Lemon */}
      <motion.g
        animate={{ y: [0, -4, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      >
        <ellipse cx="64" cy="92" rx="14" ry="10" fill="#F4C430" />
        <ellipse cx="60" cy="89" rx="3" ry="2" fill="#FFE791" />
      </motion.g>
    </svg>
  )
}

/* ── Calendar with check mark ─────────────────────────────────────────────── */
export function CalendarCheck({ size = 96, className = '', color = '#D96941' }: AnimProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <motion.g
        initial={{ scale: 0.95 }}
        animate={{ scale: [0.95, 1.02, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <rect x="22" y="32" width="76" height="62" rx="6" fill="#FFFFFF" stroke="#1F1A14" strokeOpacity="0.1" strokeWidth="2" />
        <rect x="22" y="32" width="76" height="14" rx="6" fill={color} />
        <rect x="22" y="42" width="76" height="4" fill="#B84F2A" />
        <circle cx="38" cy="28" r="3" fill="#1F1A14" />
        <circle cx="82" cy="28" r="3" fill="#1F1A14" />
        <rect x="36" y="22" width="4" height="14" rx="1.5" fill="#1F1A14" />
        <rect x="80" y="22" width="4" height="14" rx="1.5" fill="#1F1A14" />
      </motion.g>

      {/* Check mark — draws in */}
      <motion.path
        d="M 44 70 L 56 82 L 80 58"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.85, 1], ease: 'easeInOut' }}
      />
    </svg>
  )
}

/* ── Shopping bag with floating items ─────────────────────────────────────── */
export function ShoppingBag({ size = 96, className = '', color = '#D96941' }: AnimProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Floating items */}
      <motion.circle
        cx="42" cy="34" r="5" fill="#3D8B5C"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="60" cy="28" r="6" fill="#D9442B"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
      <motion.circle
        cx="80" cy="34" r="5" fill="#F4C430"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      />

      {/* Bag */}
      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M 32 50 L 88 50 L 92 100 L 28 100 Z" fill={color} />
        <path d="M 32 50 L 88 50 L 88 56 L 32 56 Z" fill="#B84F2A" />
        {/* Handles */}
        <path d="M 44 50 Q 44 34, 60 34 Q 76 34, 76 50" stroke="#1F1A14" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      </motion.g>
    </svg>
  )
}
