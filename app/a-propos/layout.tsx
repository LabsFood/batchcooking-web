import type { ReactNode } from 'react'
import { pageMetadata } from '@/lib/seo'

// `page.tsx` est un composant client (Framer Motion) : les metadata ne peuvent
// pas y être exportées, elles vivent donc dans ce layout.
export const metadata = pageMetadata({
  title: 'À propos',
  description:
    "L'histoire de Lab's Food, d'une ingénieure devenue cheffe à domicile au réseau de batch cookers : notre façon de cuisiner, nos engagements et les zones où nous intervenons.",
  path: '/a-propos',
})

export default function AProposLayout({ children }: { children: ReactNode }) {
  return children
}
