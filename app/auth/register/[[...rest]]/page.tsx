'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthSkeleton from '@/components/shared/AuthSkeleton'
import { clerkAuthAppearance } from '@/lib/clerk-appearance'
import ClerkWidgetGate from '@/components/shared/ClerkWidgetGate'
import { Hint } from '@/components/shared/Hint'

const IMAGE =
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&auto=format&fit=crop&q=80'

function RegisterInner() {
  const params = useSearchParams()
  const next = params.get('next') || '/espace-client'

  return (
    <AuthLayout
      title="Créez votre compte"
      lead="Une adresse e-mail et un mot de passe suffisent. Vous réservez ensuite votre première session."
      image={IMAGE}
      asideTitle="Une semaine de repas, cuisinée chez vous."
      points={[
        {
          titre: 'Vous choisissez',
          texte: 'Un batch cooker, sa carte de la semaine et une date.',
        },
        {
          titre: 'Il cuisine dans votre cuisine',
          texte: 'En une session, puis il range et vous laisse un frigo rempli.',
        },
        {
          titre: 'Le crédit d’impôt est déjà compté',
          texte: 'Chaque prix s’affiche après les 50 % de crédit d’impôt auxquels la prestation ouvre droit.',
        },
      ]}
      footer={
        <>
          <p className="text-xs leading-relaxed text-ink-soft">
            En créant un compte, vous acceptez nos{' '}
            <Link href="/cgu" className="font-semibold text-amber-ink underline-offset-4 hover:underline">
              CGU
            </Link>{' '}
            et notre{' '}
            <Link
              href="/confidentialite"
              className="font-semibold text-amber-ink underline-offset-4 hover:underline"
            >
              politique de confidentialité
            </Link>
            .
          </p>
          <p>
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="font-semibold text-amber-ink underline-offset-4 hover:underline">
              Se connecter
            </Link>
          </p>
          {/* Un batch cooker ne se crée pas de compte ici : il candidate. */}
          <p>
            Vous cuisinez ?{' '}
            <Link href="/devenir-chef" className="font-semibold text-amber-ink underline-offset-4 hover:underline">
              Devenir batch cooker
            </Link>
          </p>
        </>
      }
    >
      <div className="mb-5">
        <Hint id="inscription-un-seul-role">
          Ce compte sert à réserver comme client. Un compte ne sert qu’à un rôle : pour cuisiner
          aussi pour Lab’s Food, il vous faudra une autre adresse e-mail.
        </Hint>
      </div>

      <ClerkWidgetGate>
        <SignUp appearance={clerkAuthAppearance} signInUrl="/auth/login" forceRedirectUrl={next} />
      </ClerkWidgetGate>
    </AuthLayout>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <RegisterInner />
    </Suspense>
  )
}
