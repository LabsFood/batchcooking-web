'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { useAuth } from '@/lib/auth-context'

function RegisterInner() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
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
    <div className="min-h-screen flex items-center justify-center bg-cream py-20 px-6">
      <div className="w-full max-w-lg bg-paper rounded-2xl p-8 lg:p-10 shadow-[0_30px_60px_-30px_rgba(31,42,55,0.18)] border border-[rgba(31,42,55,0.06)]">
        <Logo size="md" className="mb-10" />

        <p className="eyebrow mb-4">Nouveau client</p>
        <h1 className="font-display font-bold text-navy mb-3 leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 3.6vw, 2.4rem)', letterSpacing: '-0.02em' }}>
          Créer mon <span className="text-terra italic font-medium">compte.</span>
        </h1>
        <p className="text-ink-mid text-sm mb-6">
          <span className="font-semibold text-navy">Mode démo</span> — clique sur Créer mon compte,
          on te redirige direct dans ton espace.
        </p>

        <form onSubmit={handle} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Marie" className="input-base" />
            </Field>
            <Field label="Nom">
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" className="input-base" />
            </Field>
          </div>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr" className="input-base" />
          </Field>
          <Field label="Téléphone"><input type="tel" placeholder="+33 6 XX XX XX XX" className="input-base" /></Field>
          <Field label="Adresse"><input placeholder="15 rue de la Paix, Paris 75001" className="input-base" /></Field>
          <Field label="Mot de passe"><input type="password" placeholder="Minimum 8 caractères" className="input-base" /></Field>

          <button type="submit" disabled={submitting} className="btn btn-primary w-full mt-2 disabled:opacity-60">
            {submitting ? 'Création…' : 'Créer mon compte'}
            {!submitting && <ArrowRight className="w-4 h-4 icon-arrow" />}
          </button>
        </form>

        <p className="text-center text-xs text-ink-soft mt-6 leading-relaxed">
          En créant un compte, vous acceptez nos{' '}
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
