'use client'
import Link from 'next/link'
import { ChefHat, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream py-20 px-6">
      <div className="w-full max-w-lg bg-paper rounded-2xl p-8 lg:p-10 shadow-[0_30px_60px_-30px_rgba(31,26,20,0.18)] border border-[rgba(31,26,20,0.06)]">
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-full bg-terra flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-navy text-xl">Lab&apos;s Food</span>
        </Link>

        <p className="eyebrow mb-4">Nouveau client</p>
        <h1 className="font-display font-bold text-navy mb-8 leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 3.6vw, 2.4rem)', letterSpacing: '-0.02em' }}>
          Créer mon <span className="text-terra italic font-medium">compte.</span>
        </h1>

        <form className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom"><input placeholder="Marie" className="input-base" /></Field>
            <Field label="Nom"><input placeholder="Dupont" className="input-base" /></Field>
          </div>
          <Field label="Email"><input type="email" placeholder="votre@email.fr" className="input-base" /></Field>
          <Field label="Téléphone"><input type="tel" placeholder="+33 6 XX XX XX XX" className="input-base" /></Field>
          <Field label="Adresse"><input placeholder="15 rue de la Paix, Paris 75001" className="input-base" /></Field>
          <Field label="Mot de passe"><input type="password" placeholder="Minimum 8 caractères" className="input-base" /></Field>

          <button type="submit" className="btn-primary w-full mt-2">
            Créer mon compte
            <ArrowRight className="w-4 h-4 icon-arrow" />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-muted block mb-2">{label}</label>
      {children}
    </div>
  )
}
