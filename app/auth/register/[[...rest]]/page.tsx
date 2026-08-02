'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { useAuth } from '@/lib/auth-context'

function RegisterInner() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/espace-client'

  const handle = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const fullName = `${firstName} ${lastName}`.trim() || 'Sophie M.'
    signIn(email || 'sophie@labsfood.fr', fullName)
    setTimeout(() => router.push(next), 300)
  }

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
          <p className="text-ink-mid mb-8">Crée ton compte en 30 secondes — Ivy t&apos;attend.</p>

          <div className="rounded-xl border border-amber/30 bg-amber-soft/40 px-4 py-3 mb-6">
            <p className="text-xs text-ink-mid leading-relaxed">
              <span className="font-semibold text-navy">Mode démo</span> — clique simplement sur
              <span className="font-semibold"> Créer mon compte</span>, on charge un compte de démonstration.
            </p>
          </div>

          <form onSubmit={handle} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Marie"
                  className="input-base"
                />
              </Field>
              <Field label="Nom">
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  className="input-base"
                />
              </Field>
            </div>

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                className="input-base"
              />
            </Field>

            <Field label="Mot de passe">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Minimum 8 caractères"
                  className="input-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft hover:text-navy transition-colors"
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <button type="submit" disabled={submitting} className="btn btn-primary w-full mt-2 disabled:opacity-60">
              {submitting ? 'Création…' : 'Créer mon compte'}
              {!submitting && <ArrowRight className="w-4 h-4 icon-arrow" />}
            </button>
          </form>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-muted block mb-2">{label}</label>
      {children}
    </div>
  )
}
