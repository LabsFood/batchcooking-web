import type { Metadata } from 'next'
import ContactForm from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Une question sur le batch cooking à domicile, une réservation, une candidature de batch cooker ? Écrivez à l'équipe Lab's Food.",
}

export default function ContactPage() {
  return (
    <div className="page-transition min-h-screen bg-cream pt-24">
      <section className="relative overflow-hidden bg-navy py-20 text-white lg:py-24">
        <div className="container-xl relative">
          <h1
            className="mb-5 font-display font-bold leading-none text-white"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Parlons <span className="font-medium italic text-terra">cuisine.</span>
          </h1>
          <p className="max-w-xl leading-relaxed text-white/70">
            Une question sur nos formules, une réservation à caler, l&apos;envie de cuisiner avec nous : écrivez-nous,
            nous répondons sous un jour ouvré.
          </p>
        </div>
      </section>

      <ContactForm />
    </div>
  )
}
