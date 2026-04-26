import type { Metadata } from 'next'
import { WEEKLY_MEALS } from '@/lib/mock-data'
import MenuClient from './MenuClient'
export const metadata: Metadata = { title: 'Menu de la semaine' }
export default function MenuPage() {
  return <MenuClient meals={WEEKLY_MEALS} />
}
