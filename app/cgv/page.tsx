import { pageMetadata } from '@/lib/seo'
import LegalLayout from '@/components/shared/LegalLayout'
import LegalPdfLink from '@/components/shared/LegalPdfLink'
import LegalMarkdown from '@/components/shared/LegalMarkdown'

export const metadata = pageMetadata({
  title: 'Conditions Générales de Vente',
  description: "Prestations de batch cooking à domicile réservées sur la plateforme Lab’s Food.",
  path: '/cgv',
})

/* Version 1.0, en vigueur au 21/11/2026 (Drive « 2. CGV_V1_FINALE »). */
export default function Page() {
  return (
    <LegalLayout
      eyebrow="Cadre contractuel"
      title="Conditions Générales de Vente"
      subtitle="Prestations de batch cooking à domicile réservées sur la plateforme Lab’s Food."
      updatedAt="Version 1.0 — en vigueur au 21 novembre 2026"
    >
      <LegalPdfLink file="cgv-1.0.pdf" />
      <LegalMarkdown file="cgv-v1.md" />
    </LegalLayout>
  )
}
