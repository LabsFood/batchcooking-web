import { pageMetadata } from '@/lib/seo'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumb, faqGraph } from '@/lib/structured-data'
import FAQ from '@/components/home/FAQ'
import EquipmentSection from '@/components/shared/EquipmentSection'

export const metadata = pageMetadata({
  title: 'FAQ, questions fréquentes',
  description:
    "Le batch cooking à domicile, en clair : comment réserver, qui fait les courses, ce que coûte une prestation, le crédit d'impôt de 50 % et l'avance immédiate.",
  path: '/faq',
})

export default function FAQPage() {
  return (
    <div className="page-transition min-h-screen bg-cream pt-24">
      <JsonLd data={faqGraph()} />
      <JsonLd
        data={breadcrumb([
          { name: 'Accueil', path: '/' },
          { name: 'Questions fréquentes', path: '/faq' },
        ])}
      />
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
