import type { ReactNode } from 'react'
import { pageMetadata } from '@/lib/seo'

// Écran de transit après authentification Clerk : jamais une porte d'entrée.
export const metadata = pageMetadata({
  title: 'Connexion en cours',
  description: "Redirection vers votre espace Lab's Food.",
  path: '/apres-connexion',
  noIndex: true,
})

export default function ApresConnexionLayout({ children }: { children: ReactNode }) {
  return children
}
