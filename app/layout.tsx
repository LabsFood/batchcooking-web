import type { Metadata } from 'next'
import { Fraunces, Montserrat, DM_Mono } from 'next/font/google'
import './globals.css'
import Providers from '@/components/layout/Providers'
import PublicChrome from '@/components/layout/PublicChrome'

// ── Fraunces — display serif pour les titres ──────────────────────────────────
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

// ── Montserrat — sans-serif pour le corps ─────────────────────────────────────
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})

// ── DM Mono — pour les labels/références ─────────────────────────────────────
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: "Lab's Food — Batch Cooking à domicile",
    template: "%s | Lab's Food",
  },
  description:
    "Un chef professionnel vient cuisiner une semaine entière de repas chez vous en 2h minimum. Découvrez le batch cooking sur-mesure avec Lab's Food.",
  keywords: ['batch cooking', 'chef à domicile', 'service à la personne', 'crédit impôt', 'meal prep', 'Paris'],
  authors: [{ name: "Lab's Food" }],
  openGraph: {
    title: "Lab's Food — Batch Cooking à domicile",
    description: 'Un chef professionnel cuisine une semaine de repas chez vous.',
    type: 'website',
    locale: 'fr_FR',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${montserrat.variable} ${dmMono.variable}`}
    >
      <body className="bg-cream text-ink font-body antialiased">
        <Providers>
          <PublicChrome>{children}</PublicChrome>
        </Providers>
      </body>
    </html>
  )
}
