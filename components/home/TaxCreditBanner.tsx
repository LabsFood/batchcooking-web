'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import AvantageFiscalModal from '@/components/shared/AvantageFiscalModal'
import ReserveButton from '@/components/shared/ReserveButton'
import { fadeUpInView } from '@/lib/motion'

/* ─────────────────────────────────────────────────────────────────────────────
   L'avantage fiscal, joué plutôt que dit (refonte du 26/11).

   Sur la bande marine : à gauche le statut — un Service à la Personne, les
   logos officiels, le numéro d'agrément — et à droite le geste : « 100 € » se
   barre d'un trait ambre qui se dessine pendant que la section traverse
   l'écran, « 50 € » est ce qui reste. La règle de la maison (le prix après
   crédit d'impôt d'abord), rendue visible.

   Le trait est accroché au scroll, jamais à l'horloge ; en
   `prefers-reduced-motion`, il est simplement là. L'ancre `#tax-credit` et la
   modale de détail ne changent pas.
   ───────────────────────────────────────────────────────────────────────────── */

export default function TaxCreditBanner() {
  const scene = useRef<HTMLElement>(null)
  const calme = useReducedMotion()
  const [ouvert, setOuvert] = useState(false)
  const { scrollYProgress } = useScroll({
    target: scene,
    offset: ['start 0.85', 'start 0.3'],
  })

  // Le trait se dessine au scroll ; le total s'estompe à mesure.
  const trait = useTransform(scrollYProgress, [0.15, 0.8], [0, 1])
  const estompe = useTransform(scrollYProgress, [0.15, 0.8], [1, 0.45])

  return (
    <section id="tax-credit" ref={scene} className="relative overflow-hidden bg-navy-deep py-20 lg:py-28">
      {/* La lueur ambre, en haut à droite : la chaleur de la marque sur le marine. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(243,156,18,0.16)_0%,transparent_70%)]"
      />

      <div className="container-xl relative">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
          {/* ── Le statut ──────────────────────────────────────────── */}
          {/* slow-out : se pose en 240 ms */}
          <motion.div {...fadeUpInView()} className="lg:col-span-6">
            <h2
              className="font-display font-bold leading-tight text-white [text-wrap:balance]"
              style={{ fontSize: 'clamp(1.8rem, 3.6vw, 3rem)', letterSpacing: '-0.02em' }}
            >
              Le batch cooking, <span className="text-amber">un Service à la Personne.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 lg:text-lg">
              Grâce à l&apos;avance immédiate de l&apos;Urssaf, le crédit d&apos;impôt de 50&nbsp;%
              est déduit au moment de payer : vous ne réglez que votre moitié.
            </p>

            <div className="mt-8 inline-flex items-center gap-5 rounded-xl bg-white px-5 py-3">
              <Image
                src="/sap-transparent-1024x754.webp"
                alt="Services à la personne"
                width={1024}
                height={754}
                className="h-12 w-auto"
              />
              <span aria-hidden className="h-9 w-px bg-[rgba(31,42,55,0.12)]" />
              <Image src="/logo-urssaf.png" alt="Urssaf" width={550} height={103} className="h-7 w-auto" />
            </div>
            <p className="mt-3 text-sm text-white/60">
              Organisme agréé Services à la Personne — n°&nbsp;d&apos;agrément&nbsp;SAP100715036
            </p>
          </motion.div>

          {/* ── Le geste : 100 € barré, 50 € restant ───────────────── */}
          <motion.div {...fadeUpInView(0.08)} className="lg:col-span-6">
            <div className="flex flex-wrap items-baseline justify-start gap-x-10 gap-y-4 lg:justify-center">
              <motion.span
                style={calme ? undefined : { opacity: estompe }}
                className="relative font-display text-5xl font-bold tabular-nums text-white/60 lg:text-6xl"
              >
                100&nbsp;€
                {/* le trait : dessiné par le scroll, de gauche à droite */}
                <motion.span
                  aria-hidden
                  style={calme ? undefined : { scaleX: trait }}
                  className="absolute left-[-4%] top-[54%] h-[4px] w-[108%] origin-left -rotate-[4deg] rounded-full bg-amber"
                />
                <span className="sr-only">au lieu de</span>
              </motion.span>
              <span
                className="font-display font-bold tabular-nums text-white"
                style={{ fontSize: 'clamp(4.5rem, 8vw, 6.5rem)', letterSpacing: '-0.03em' }}
              >
                50&nbsp;€
              </span>
            </div>
            <p className="mt-1 text-sm text-white/55 lg:text-center">
              une session facturée 100&nbsp;€, après crédit d&apos;impôt — sous conditions d&apos;éligibilité
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-center">
              <ReserveButton>
                Réserver ma session
                <ArrowRight className="icon-arrow h-4 w-4" />
              </ReserveButton>
              <button
                type="button"
                onClick={() => setOuvert(true)}
                className="hit text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white"
              >
                Comment ça marche&nbsp;?
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <AvantageFiscalModal isOpen={ouvert} onClose={() => setOuvert(false)} />
    </section>
  )
}
