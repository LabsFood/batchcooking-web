'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChefHat, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false)
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-cream">
      {/* Left — form */}
      <div className="flex items-center justify-center px-6 sm:px-10 py-16 lg:py-20">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-full bg-terra flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-navy text-xl">
              Lab&apos;s Food
            </span>
          </Link>

          <p className="eyebrow mb-4">Espace client</p>
          <h1 className="font-display font-bold text-navy leading-tight mb-3"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '-0.02em' }}>
            Bon retour <span className="text-terra italic font-medium">!</span>
          </h1>
          <p className="text-ink-mid mb-10">Connectez-vous à votre espace client.</p>

          <form className="space-y-5">
            <Field label="Email">
              <input type="email" placeholder="votre@email.fr" className="input-base" />
            </Field>
            <Field label="Mot de passe">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
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
            <div className="flex justify-end">
              <a href="#" className="text-sm text-terra hover:underline font-medium">Mot de passe oublié ?</a>
            </div>
            <button type="submit" className="btn-primary w-full mt-2">
              Se connecter
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </button>
          </form>

          <p className="text-center text-sm text-ink-mid mt-8">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-terra font-semibold hover:underline">
              Créer mon compte
            </Link>
          </p>
        </div>
      </div>

      {/* Right — brand image */}
      <div className="hidden lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(0,35,75,0.85) 0%, rgba(217,105,65,0.55) 100%)' }} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-muted block mb-2">{label}</label>
      {children}
    </div>
  )
}
