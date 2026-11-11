import LegalLayout from '@/components/shared/LegalLayout'
import LegalPdfLink from '@/components/shared/LegalPdfLink'
import LegalMarkdown from '@/components/shared/LegalMarkdown'

export const metadata = {
  title: 'Conditions Générales d’Utilisation',
  description: "Accès et utilisation de la plateforme Lab’s Food par les clients et les batch cookers.",
}

/* Version 1.0, en vigueur au 21/11/2026 (Drive « 1. CGU_V1_FINALE »). */
export default function Page() {
  return (
    <LegalLayout
      eyebrow="Cadre contractuel"
      title="Conditions Générales d’Utilisation"
      subtitle="Accès et utilisation de la plateforme Lab’s Food par les clients et les batch cookers."
      updatedAt="Version 1.0 — en vigueur au 21 novembre 2026"
    >
      <LegalPdfLink file="cgu-1.0.pdf" />
      <LegalMarkdown file="cgu-v1.md" />
    </LegalLayout>
  )
}
