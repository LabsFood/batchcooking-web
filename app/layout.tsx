import type { Metadata, Viewport } from 'next'
import { Montserrat, DM_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { ClerkProvider } from '@clerk/nextjs'
import { frFR } from '@clerk/localizations'
import './globals.css'
import Providers from '@/components/layout/Providers'
import PublicChrome from '@/components/layout/PublicChrome'
import PWARegister from '@/components/shared/PWARegister'

// ── Fraunces — display serif (fichiers locaux variable font) ──────────────────
const fraunces = localFont({
  src: [
    {
      path: '../public/fraunces-font-family/Fraunces-VariableFont_SOFTWONKopszwght.ttf',
      style: 'normal',
      weight: '100 900',
    },
    {
      path: '../public/fraunces-font-family/Fraunces-Italic-VariableFont_SOFTWONKopszwght.ttf',
      style: 'italic',
      weight: '100 900',
    },
  ],
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

// Le pack frFR de Clerk laisse cette clé à undefined : sans override, le champ
// mot de passe de l'inscription retombe sur l'anglais « Create a password ».
const clerkLocalization = {
  ...frFR,
  formFieldInputPlaceholder__signUpPassword: 'Choisissez un mot de passe',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://labsfood.fr'),
  title: {
    default: "Lab's Food — Batch Cooking à domicile",
    template: "%s | Lab's Food",
  },
  description:
    "Un cuisinier vient préparer une semaine entière de repas chez vous, en une seule session. Découvrez le batch cooking sur-mesure avec Lab's Food.",
  applicationName: "Lab's Food",
  keywords: ['batch cooking', 'chef à domicile', 'service à la personne', 'meal prep'],
  authors: [{ name: "Lab's Food" }],
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      { rel: 'icon', url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { rel: 'icon', url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Lab's Food",
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: "LAB'S FOOD - Batch cooking à domicile",
    description: 'Un cuisinier prépare une semaine de repas chez vous.',
    type: 'website',
    locale: 'fr_FR',
    siteName: "Lab's Food",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBFCFD' },
    { media: '(prefers-color-scheme: dark)', color: '#2C3E50' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      // globals.css définit scroll-behavior: smooth — Next 16 ne neutralise plus
      // le smooth scroll pendant les navigations sans cet attribut.
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${montserrat.variable} ${dmMono.variable}`}
    >
      <body className="bg-cream text-ink font-body antialiased">
        <ClerkProvider localization={clerkLocalization}>
          <Providers>
            <PublicChrome>{children}</PublicChrome>
          </Providers>
        </ClerkProvider>
        <PWARegister />
      </body>
    </html>
  )
}
