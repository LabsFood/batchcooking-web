import CookieSettings from '@/components/shared/CookieSettings'
import LegalLayout from '@/components/shared/LegalLayout'
import LegalMarkdown from '@/components/shared/LegalMarkdown'

export const metadata = {
  title: 'Politique de confidentialité',
  description: "Protection des données personnelles et cookies sur la plateforme Lab's Food.",
}

/* Version 1.0, en vigueur au 21/11/2026 (Drive « 4. Politique de confidentialité_V1_FINALE »). */
export default function ConfidentialitePage() {
  return (
    <LegalLayout
      eyebrow="Vos données"
      title="Politique de confidentialité"
      subtitle="Protection des données personnelles et cookies sur la plateforme LAB’S FOOD."
      updatedAt="Version 1.0 — en vigueur au 21 novembre 2026"
    >
      <LegalMarkdown file="confidentialite-v1.md" />
      <h2 id="cookies">Vos choix de cookies</h2>
      <CookieSettings />
    </LegalLayout>
  )
}
