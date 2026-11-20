'use client'

import { useState, type ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { Check, Eye, EyeOff, Loader2, Save } from 'lucide-react'
import { useToast } from '@/components/shared/Toaster'

/** Les refus de Clerk qu'on sait dire en français ; le reste garde son texte. */
const CLERK_ERRORS: Record<string, string> = {
  form_password_incorrect: 'Le mot de passe actuel est incorrect.',
  form_password_pwned: 'Ce mot de passe est apparu dans une fuite de données ailleurs : choisis-en un autre.',
  form_password_length_too_short: '8 caractères minimum.',
  form_password_not_strong_enough: 'Mot de passe trop faible : mélange lettres, chiffres et symboles.',
  session_reverification_required: 'Par sécurité, reconnectez-vous puis réessayez.',
}

function clerkMessage(e: unknown): string {
  const first = (e as { errors?: { code?: string; longMessage?: string }[] })?.errors?.[0]
  return (first?.code && CLERK_ERRORS[first.code]) || first?.longMessage || 'Le mot de passe n’a pas été changé.'
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-ink-soft mb-2">{label}</p>
      {children}
    </div>
  )
}

/**
 * Changer son mot de passe, pour tous les espaces. Le mot de passe appartient à
 * Clerk : l'API n'en voit jamais. Un compte créé avec Google n'en a pas encore,
 * il en crée un sans donner l'ancien.
 *
 * Rend des blocs à la suite, sans enveloppe : c'est au parent de les espacer.
 *
 * Ouvert depuis un bouton « Modifier », il reçoit `onCancel` (un bouton
 * Annuler apparaît) et `onDone` (appelé une fois le mot de passe changé).
 * Le succès s'annonce par un toast, comme toute sauvegarde.
 */
export default function ChangePassword({
  onDone,
  onCancel,
}: {
  onDone?: () => void
  onCancel?: () => void
} = {}) {
  const { user } = useUser()
  const toast = useToast()
  const [showPwd, setShowPwd] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasPassword = user?.passwordEnabled ?? true

  async function change() {
    if (!user) return
    setError(null)
    if (next.length < 8) return setError(CLERK_ERRORS.form_password_length_too_short)
    setPending(true)
    try {
      await user.updatePassword({
        newPassword: next,
        ...(hasPassword ? { currentPassword: current } : {}),
        signOutOfOtherSessions: true,
      })
      setCurrent('')
      setNext('')
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
      toast.success('Mot de passe changé', 'Vos autres appareils ont été déconnectés.')
      onDone?.()
    } catch (e) {
      setError(clerkMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      {hasPassword && (
        <Field label="Mot de passe actuel">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="input-base pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft hover:text-navy"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
      )}
      <Field label={hasPassword ? 'Nouveau mot de passe' : 'Créer un mot de passe'}>
        <input
          type={showPwd ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          className="input-base"
          placeholder="Minimum 8 caractères"
        />
      </Field>
      <p className="text-xs text-ink-soft">Vos autres appareils seront déconnectés.</p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={change} disabled={pending || !next || (hasPassword && !current)} className="btn btn-primary text-xs">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Mot de passe changé' : 'Enregistrer'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={pending} className="btn btn-outline text-xs">
            Annuler
          </button>
        )}
      </div>
    </>
  )
}
