import { pageMetadata } from '@/lib/seo'
import MenuClient from './MenuClient'

export const metadata = pageMetadata({
  title: 'Les cartes de nos batch cookers',
  description:
    "Les cartes des batch cookers Lab's Food : filtrez par dates, région ou régime, choisissez votre batch cooker, puis vos plats.",
  path: '/menu',
})

export default function MenuPage() {
  return <MenuClient />
}
