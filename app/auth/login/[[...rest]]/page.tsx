'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SignIn } from '@clerk/nextjs'
import Logo from '@/components/shared/Logo'
import AuthSkeleton from '@/components/shared/AuthSkeleton'
import { clerkAuthAppearance } from '@/lib/clerk-appearance'
import ClerkWidgetGate from '@/components/shared/ClerkWidgetGate'
import Image from 'next/image'

function LoginInner() {
  const params = useSearchParams()
  const next = params.get('next') || '/apres-connexion'

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-cream">
      <div className="flex items-center justify-center px-6 sm:px-10 py-16 lg:py-20">
        <div className="w-full max-w-md">
          <Logo size="md" className="mb-12" />

          <h1 className="font-display font-bold text-navy leading-tight mb-3"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '-0.02em' }}>
            Bon retour !
          </h1>
          <p className="text-ink-mid mb-8">
            Clients et batch cookers se connectent ici : votre espace s&apos;ouvre selon votre profil.
          </p>

          <ClerkWidgetGate>
            <SignIn
              appearance={clerkAuthAppearance}
              signInUrl="/auth/login"
              signUpUrl="/auth/register"
              forceRedirectUrl={next}
            />
          </ClerkWidgetGate>

          <div className="mt-8 space-y-3 border-t border-[rgba(31,42,55,0.08)] pt-6">
            <p className="text-center text-sm text-ink-mid">
              Pas encore de compte ?{' '}
              <Link href="/auth/register" className="font-semibold text-amber-ink hover:underline">
                Créer mon compte client
              </Link>
            </p>
            <p className="text-center text-sm text-ink-mid">
              Vous cuisinez ?{' '}
              <Link href="/devenir-chef" className="font-semibold text-amber-ink hover:underline">
                Devenir batch cooker
              </Link>
              <span className="mt-1 block text-xs text-ink-soft">
                Votre compte est créé une fois votre dossier validé : vous recevez alors un lien de connexion.
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative">
        <Image src="https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop&q=80" alt="" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(44,62,80,0.85) 0%, rgba(243,156,18,0.55) 100%)' }} />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-display font-medium text-white text-3xl mb-6 leading-snug">
            Deux profils, une seule connexion.
          </p>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-semibold text-amber">Clients</dt>
              <dd className="text-sm leading-relaxed text-white/75">
                Vos sessions, vos menus, votre liste de courses et vos factures.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-amber">Batch cookers</dt>
              <dd className="text-sm leading-relaxed text-white/75">
                Vos demandes, votre agenda, vos documents et vos revenus.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginInner />
    </Suspense>
  )
}
