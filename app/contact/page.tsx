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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1600&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, rgba(31,45,61,0.96) 0%, rgba(44,62,80,0.9) 45%, rgba(44,62,80,0.6) 100%)',
          }}
        />
        <div className="container-xl relative">
          <h1
            className="mb-5 font-display font-bold leading-none text-white"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Parlons <span className="text-amber">cuisine.</span>
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
