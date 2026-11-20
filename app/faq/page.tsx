import FAQ from '@/components/home/FAQ'
import EquipmentSection from '@/components/shared/EquipmentSection'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — Questions fréquentes',
  description:
    "Le batch cooking à domicile, en clair : comment réserver, qui fait les courses, ce que coûte une prestation, le crédit d'impôt de 50 % et l'avance immédiate.",
}

export default function FAQPage() {
  return (
    <div className="page-transition min-h-screen bg-cream pt-24">
      <section className="relative overflow-hidden bg-navy py-20 text-white lg:py-24">
        <div className="container-xl relative">
          <h1
            className="mb-5 font-display font-bold leading-none text-white"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            Questions <span className="font-medium">fréquentes.</span>
          </h1>
          <p className="max-w-2xl leading-relaxed text-white/70">
            Vous avez envie de repas faits maison toute la semaine, sans passer vos soirées
            en cuisine ? Un batch cooker vient chez vous, cuisine vos repas en une seule
            session, puis vous laisse une cuisine propre et un frigo rempli. Voici les
            réponses aux questions qu’on nous pose le plus souvent.
          </p>
        </div>
      </section>
      <FAQ variant="complete" />
      <EquipmentSection variant="paper" />
    </div>
  )
}
