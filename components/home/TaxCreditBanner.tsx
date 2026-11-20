'use client'
import Image from 'next/image'
import { ArrowRight, Percent } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import AvantageFiscalModal from '@/components/shared/AvantageFiscalModal'
import { fadeUpInView } from '@/lib/motion'

export default function TaxCreditBanner() {
  const [open, setOpen] = useState(false)

  return (
    <section id="tax-credit" className="py-20 lg:py-24 relative overflow-hidden">
      <div className="container-xl">
        <div className="relative bg-navy rounded-3xl overflow-hidden p-10 lg:p-16">
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <motion.div
              // slow-out : se pose en 240 ms
              {...fadeUpInView()}
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
                Le batch cooking,{' '}
                <span className="text-amber">
                  un Service à la Personne.
                </span>
              </h2>
              <p className="text-white/70 text-base lg:text-lg leading-relaxed max-w-2xl">
                Grâce à l&apos;Avance immédiate de l&apos;Urssaf, vous ne réglez que la moitié
                de la facture.
              </p>
              <div className="mt-7 inline-flex items-center gap-5 rounded-xl bg-white px-5 py-3">
                <Image
                  src="/sap-transparent-1024x754.webp"
                  alt="Services à la personne"
                  width={1024}
                  height={754}
                  className="h-12 w-auto"
                />
                <span aria-hidden="true" className="h-9 w-px bg-[rgba(31,42,55,0.12)]" />
                <Image
                  src="/logo-urssaf.png"
                  alt="Urssaf"
                  width={550}
                  height={103}
                  className="h-7 w-auto"
                />
              </div>
            </motion.div>

            <motion.div
              // slow-out : se pose en 240 ms
              {...fadeUpInView(0.08)}
              className="lg:col-span-4 lg:flex lg:justify-end"
            >
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn btn-outline-light"
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
