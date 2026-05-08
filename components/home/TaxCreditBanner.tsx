'use client'
import { ArrowRight, Percent } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import AvantageFiscalModal from '@/components/shared/AvantageFiscalModal'

export default function TaxCreditBanner() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [open, setOpen] = useState(false)

  return (
    <section
      id="tax-credit"
      ref={ref}
      className="py-20 lg:py-24 relative overflow-hidden"
    >
      <div className="container-xl">
        <div className="relative bg-navy rounded-3xl overflow-hidden p-10 lg:p-16">
          {/* Decorative oversized 50% */}
          <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-end pr-8 lg:pr-16">
            <span
              className="font-display font-bold leading-none text-terra opacity-15"
              style={{ fontSize: 'clamp(10rem, 22vw, 22rem)' }}
            >
              50%
            </span>
          </div>

          {/* Decorative dots — top left */}
          <div className="absolute top-8 left-8 grid grid-cols-4 gap-2 opacity-30">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-terra" />
            ))}
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7 }}
              className="lg:col-span-8"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-terra flex items-center justify-center">
                  <Percent className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <p className="eyebrow text-amber" style={{ color: '#F39C12' }}>
                  Avantage fiscal
                </p>
              </div>

              <h2
                className="font-display font-bold text-white leading-tight mb-5"
                style={{ fontSize: 'clamp(1.8rem, 3.6vw, 3rem)', letterSpacing: '-0.02em' }}
              >
                Le batch cooking,<br />
                <span className="text-terra italic font-medium">
                  un Service à la Personne.
                </span>
              </h2>
              <p className="text-white/70 text-base lg:text-lg leading-relaxed max-w-2xl">
                Préparation de repas à domicile = service éligible SAP. Grâce à
                l&apos;Avance immédiate de l&apos;Urssaf, vous ne réglez que la moitié de la
                facture — l&apos;autre moitié est versée directement à Lab&apos;s Food.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="lg:col-span-4 lg:flex lg:justify-end"
            >
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn btn-primary"
              >
                En savoir plus
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <AvantageFiscalModal isOpen={open} onClose={() => setOpen(false)} />
    </section>
  )
}
