/* ─────────────────────────────────────────────────────────────────────────────
   Jetons de mouvement. Tout ce qui bouge à l'écran passe par ici : une durée,
   une courbe, un ressort, jamais une valeur écrite à la main dans un composant.

   Règle de budget (docs/ui-ux-guidelines.md, § 1) : le mouvement dépend de la
   fréquence d'usage. Public = expressif, espaces connectés = quasi nul.
   ───────────────────────────────────────────────────────────────────────────── */

/** Secondes, l'unité de Framer Motion. */
export const DURATION = {
  /** Retour d'appui, changement de couleur. */
  instant: 0.12,
  /** Interface courante : survol, ouverture d'un menu. */
  fast: 0.18,
  /** Entrée d'un bloc, d'un tiroir. */
  base: 0.24,
  /** Plafond d'une entrée de hero. Rien de plus long. */
  slow: 0.4,
} as const

/** slow-out : démarre vite, se pose doucement. Pour tout ce qui ENTRE. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const
/** slow-in : part doucement, finit vite. Pour tout ce qui SORT. */
export const EASE_IN = [0.7, 0, 0.84, 0] as const
/** slow-in + slow-out : un déplacement d'un point à un autre. */
export const EASE_MOVE = [0.65, 0, 0.35, 1] as const

/** Ressort pour un interrupteur ou une pastille : se pose sans rebondir deux fois. */
export const SPRING = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 } as const

/** Appui : le bouton cède de 3 % puis revient (squash, 120 ms). */
export const PRESS = {
  whileTap: { scale: 0.97 },
  transition: { duration: DURATION.instant, ease: EASE_OUT },
} as const

/**
 * Entrée standard d'un bloc : fondu et montée de 8 px, sans flou.
 * slow-out, 240 ms. `delay` reste à 0 devant un CTA (seuil de Doherty).
 */
export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.base, ease: EASE_OUT, delay },
})

/** Même entrée, déclenchée quand le bloc entre dans l'écran (pages publiques). */
export const fadeUpInView = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: DURATION.base, ease: EASE_OUT, delay },
})

/** Fondu seul, pour les espaces connectés (fréquence d'usage élevée). */
export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: DURATION.fast, ease: EASE_OUT },
} as const
