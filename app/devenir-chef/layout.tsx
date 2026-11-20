import type { ReactNode } from 'react'
import { pageMetadata } from '@/lib/seo'

// `page.tsx` est un composant client (formulaire de candidature) : les metadata
// ne peuvent pas y être exportées, elles vivent donc dans ce layout.
export const metadata = pageMetadata({
  title: 'Devenir batch cooker',
  description:
    "Rejoignez le réseau de batch cookers Lab's Food : des missions près de chez vous, vos tarifs et vos disponibilités. Dix minutes pour candidater, réponse sous 48 h ouvrées.",
  path: '/devenir-chef',
  image: {
    url: '/og-devenir-chef.png',
    width: 1200,
    height: 630,
    alt: "Devenir batch cooker chez Lab's Food",
  },
})

export default function DevenirChefLayout({ children }: { children: ReactNode }) {
  return children
}
