'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SignIn } from '@clerk/nextjs'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthSkeleton from '@/components/shared/AuthSkeleton'
import { clerkAuthAppearance } from '@/lib/clerk-appearance'
import ClerkWidgetGate from '@/components/shared/ClerkWidgetGate'

const IMAGE =
  'https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=80'

function LoginInner() {
  const params = useSearchParams()
  const next = params.get('next') || '/apres-connexion'

  return (
    <AuthLayout
      title="Bon retour"
      lead="Clients et batch cookers se connectent ici : votre espace s’ouvre selon votre profil."
      image={IMAGE}
      asideTitle="Deux profils, une seule connexion."
      points={[
        {
          titre: 'Clients',
          texte: 'Vos sessions, vos menus, votre liste de courses et vos factures.',
        },
        {
          titre: 'Batch cookers',
          texte: 'Vos demandes, votre agenda, vos documents et vos revenus.',
        },
      ]}
      footer={
        <>
          <p>
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="font-semibold text-amber-ink underline-offset-4 hover:underline">
              Créer mon compte client
            </Link>
          </p>
          <p>
            Vous cuisinez ?{' '}
            <Link href="/devenir-chef" className="font-semibold text-amber-ink underline-offset-4 hover:underline">
              Devenir batch cooker
            </Link>
            <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
              Votre compte est créé une fois votre dossier validé : vous recevez alors un lien de
              connexion.
            </span>
          </p>
        </>
      }
    >
      <ClerkWidgetGate>
        <SignIn
          appearance={clerkAuthAppearance}
          signInUrl="/auth/login"
          signUpUrl="/auth/register"
          forceRedirectUrl={next}
        />
      </ClerkWidgetGate>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginInner />
    </Suspense>
  )
}
