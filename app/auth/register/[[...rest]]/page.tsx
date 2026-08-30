'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'
import Logo from '@/components/shared/Logo'
import { clerkAuthAppearance } from '@/lib/clerk-appearance'

function RegisterInner() {
  const params = useSearchParams()
  const next = params.get('next') || '/espace-client'

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-cream">
      {/* Left — form */}
      <div className="flex items-center justify-center px-6 sm:px-10 py-16 lg:py-20">
        <div className="w-full max-w-md">
          <Logo size="md" className="mb-12" />

          <p className="eyebrow mb-4">Nouveau client</p>
          <h1 className="font-display font-bold text-navy leading-tight mb-3"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '-0.02em' }}>
            Bienvenue chez <span className="text-terra italic font-medium">Lab&apos;s Food.</span>
          </h1>
          <p className="text-ink-mid mb-8">Crée ton compte en 30 secondes</p>

          <SignUp
            appearance={clerkAuthAppearance}
            signInUrl="/auth/login"
            forceRedirectUrl={next}
          />

          <p className="text-center text-xs text-ink-soft mt-6 leading-relaxed">
            En créant un compte, tu acceptes nos{' '}
            <Link href="/cgv" className="text-terra hover:underline">CGV</Link> et notre{' '}
            <Link href="/confidentialite" className="text-terra hover:underline">politique de confidentialité</Link>.
          </p>

          <p className="text-center text-sm text-ink-mid mt-6">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-terra font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>

      {/* Right — brand image */}
      <div className="hidden lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&auto=format&fit=crop&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(44,62,80,0.85) 0%, rgba(243,156,18,0.55) 100%)' }}
        />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-display font-medium text-white text-3xl mb-3 leading-snug">
            &ldquo;En 2h, j&apos;avais 7 plats pour la semaine. Game changer.&rdquo;
          </p>
          <p className="text-white/70 text-sm">— Sophie M., Paris 15e · Cliente Confort</p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  )
}
