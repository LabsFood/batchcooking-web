import FAQ from '@/components/home/FAQ'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — Questions fréquentes',
  description: "Toutes les réponses à vos questions sur le service Lab's Food : tarifs, réservation, recettes, avantage fiscal et plus.",
}

export default function FAQPage() {
  return (
    <div className="page-transition pt-24 bg-cream min-h-screen">
      <section className="bg-navy text-white py-20 lg:py-24 relative overflow-hidden">
        <div className="container-xl relative">
          <p className="eyebrow mb-5" style={{ color: '#F39C12' }}>Aide & Support</p>
          <h1
            className="font-display font-bold text-white leading-none mb-5"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Questions <span className="text-terra italic font-medium">fréquentes.</span>
          </h1>
          <p className="text-white/70 max-w-xl leading-relaxed">
            Retrouvez toutes les réponses à vos questions. Vous ne trouvez pas ce que vous cherchez ?
            Contactez-nous directement par email.
          </p>
        </div>
      </section>
      <FAQ />
    </div>
  )
}
