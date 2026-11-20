import type { ReactNode } from 'react'
import { pageMetadata } from '@/lib/seo'

// Connexion et inscription : utiles aux visiteurs, sans intérêt dans l'index.
export const metadata = pageMetadata({
  title: 'Connexion',
  description: "Connectez-vous à votre espace Lab's Food.",
  path: '/auth/login',
  noIndex: true,
})

export default function AuthSectionLayout({ children }: { children: ReactNode }) {
  return children
}
