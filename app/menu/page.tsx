import type { Metadata } from 'next'
import MenuClient from './MenuClient'

export const metadata: Metadata = {
  title: 'Les menus de la semaine',
  description:
    "Les cartes de la semaine proposées par les batch cookers Lab's Food : choisissez votre chef, puis vos plats.",
}

export default function MenuPage() {
  return <MenuClient />
}
