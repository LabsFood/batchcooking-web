'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SignIn } from '@clerk/nextjs'
import Logo from '@/components/shared/Logo'
import { clerkAuthAppearance } from '@/lib/clerk-appearance'
import ClerkWidgetGate from '@/components/shared/ClerkWidgetGate'

function LoginInner() {
  const params = useSearchParams()
  const next = params.get('next') || '/espace-client'

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-cream">
      <div className="flex items-center justify-center px-6 sm:px-10 py-16 lg:py-20">
        <div className="w-full max-w-md">
          <Logo size="md" className="mb-12" />

          <p className="eyebrow mb-4">Espace client</p>
          <h1 className="font-display font-bold text-navy leading-tight mb-3"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '-0.02em' }}>
            Bon retour <span className="text-terra italic font-medium">!</span>
          </h1>
          <p className="text-ink-mid mb-8">Connectez-vous à votre espace client.</p>

          <ClerkWidgetGate>
            <SignIn
              appearance={clerkAuthAppearance}
              signInUrl="/auth/login"
              signUpUrl="/auth/register"
              forceRedirectUrl={next}
            />
          </ClerkWidgetGate>

          <p className="text-center text-sm text-ink-mid mt-8">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-terra font-semibold hover:underline">
              Créer mon compte
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(44,62,80,0.85) 0%, rgba(243,156,18,0.55) 100%)' }} />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-display font-medium text-white text-3xl mb-3 leading-snug">
            &ldquo;Toute une semaine de repas, préparée en une matinée.&rdquo;
          </p>
          <p className="text-white/70 text-sm">— Sophie M., Paris 15e · Cliente Confort</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
