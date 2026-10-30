import type { Metadata } from 'next'
import MenuClient from './MenuClient'

export const metadata: Metadata = {
  title: 'Les cartes de nos batch cookers',
  description:
    "Les cartes des batch cookers Lab's Food : filtrez par dates, région ou régime, choisissez votre batch cooker, puis vos plats.",
}

export default function MenuPage() {
  return <MenuClient />
}
