'use client'

import { useState } from 'react'
import CityField from '@/components/chef/application/CityField'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Bell, Mail, Lock, Eye, EyeOff, Trash2, Download, Globe, Save, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useApiFetch } from '@/lib/api/client'
import { apiMessage } from '@/lib/api/messages'
import { useMeProfile, useUpdateMeProfile } from '@/lib/api/me-profile'
import type { ClientProfile, ClientProfilePatch, MeProfile } from '@/lib/api/types'
import DeleteMyAccount from '@/components/client/DeleteMyAccount'

export default function ParametresPage() {
  const { signOut } = useAuth()
  const router = useRouter()
  const { user: clerkUser, isLoaded } = useUser()
  const me = useMeProfile()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Le formulaire part de ce qui est enregistré : il attend le compte et le profil. */}
      {me.data && isLoaded ? (
        <Compte me={me.data} firstName={clerkUser?.firstName ?? ''} lastName={clerkUser?.lastName ?? ''} />
      ) : (
        <Section title="Mon compte" eyebrow="Identité" Icon={Mail}>
          {me.isError ? (
            <p className="text-sm text-red-700">{apiMessage(me.error, 'Votre compte n’a pas pu être chargé.')}</p>
          ) : (
            <div className="h-64 rounded-2xl bg-cream-soft animate-pulse" />
          )}
        </Section>
      )}

      <Securite />

      <Notifications prefs={me.data?.notificationPreferences} />

      <MesDonnees />

      {/* Danger zone */}
      <div className="lg:col-span-2 bg-red-50 border border-red-200 rounded-3xl p-6">
        <h3 className="font-display text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Zone sensible
        </h3>
        <p className="text-sm text-red-700/80 mb-4 leading-relaxed">
          Supprimer ton compte effacera ton historique de commandes, tes préférences et tes badges.
          Cette action est irréversible.
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <button
            onClick={() => {
              signOut()
              router.push('/')
            }}
            className="px-4 py-2 rounded-full bg-paper border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            Me déconnecter
          </button>
          <DeleteMyAccount />
        </div>
      </div>
    </div>
  )
}

/* ── Mon compte ────────────────────────────────────────────────────────────── */

type CompteFields = Pick<
  Required<ClientProfilePatch>,
  'firstName' | 'lastName' | 'phone' | 'addressStreet' | 'addressPostalCode' | 'addressCity'
>

/**
 * `PATCH /me/profile` : le prénom, le nom et le téléphone vont sur le compte
 * (le nom aussi chez Clerk), l'adresse sur le profil. Seuls les champs changés
 * partent. L'API refuse un champ vide : effacer une valeur n'est pas possible
 * ici, et un champ vidé est simplement ignoré.
 */
function Compte({ me, firstName, lastName }: { me: MeProfile; firstName: string; lastName: string }) {
  const { user: clerkUser } = useUser()
  const update = useUpdateMeProfile()
  const profile = me.profileType === 'client' ? (me.profile as ClientProfile) : null
  const [initial] = useState<CompteFields>(() => ({
    firstName,
    lastName,
    phone: me.user.phone ?? '',
    addressStreet: profile?.addressStreet ?? '',
    addressPostalCode: profile?.addressPostalCode ?? '',
    addressCity: profile?.addressCity ?? '',
  }))
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof CompteFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function save() {
    setError(null)
    const patch = Object.fromEntries(
      (Object.keys(form) as (keyof CompteFields)[])
        .map((k) => [k, form[k].trim()] as const)
        .filter(([k, v]) => v !== '' && v !== initial[k]),
    ) as Partial<CompteFields>
    if (Object.keys(patch).length === 0) return
    update.mutate(patch, {
      onSuccess: () => {
        // L'API a renommé le compte chez Clerk : l'en-tête relit le nom.
        if (patch.firstName || patch.lastName) clerkUser?.reload()
        setSaved(true)
        setTimeout(() => setSaved(false), 1800)
      },
      onError: (e) => setError(apiMessage(e)),
    })
  }

  return (
    <Section title="Mon compte" eyebrow="Identité" Icon={Mail}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom">
          <input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" className="input-base" />
        </Field>
        <Field label="Nom">
          <input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" className="input-base" />
        </Field>
      </div>
      <Field label="Email">
        <input type="email" value={me.user.email} readOnly disabled className="input-base" />
        <p className="text-[11px] text-ink-soft mt-1.5">C’est ton identifiant de connexion : il ne se modifie pas ici.</p>
      </Field>
      <Field label="Téléphone">
        <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+33 6 XX XX XX XX" className="input-base" />
      </Field>
      <Field label="Adresse de la session">
        <input value={form.addressStreet} onChange={set('addressStreet')} autoComplete="street-address" placeholder="15 rue de la Paix" className="input-base" />
      </Field>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <Field label="Code postal">
          <input value={form.addressPostalCode} onChange={set('addressPostalCode')} autoComplete="postal-code" inputMode="numeric" placeholder="75001" className="input-base" />
        </Field>
        <Field label="Ville">
          <CityField
            bare
            id="profile-city"
            postcode={form.addressPostalCode}
            value={form.addressCity}
            onChange={(addressCity) => setForm((f) => ({ ...f, addressCity }))}
          />
        </Field>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button onClick={save} disabled={update.isPending} className="btn btn-primary text-xs">
        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Enregistré' : 'Mettre à jour'}
      </button>
    </Section>
  )
}

/* ── Sécurité ──────────────────────────────────────────────────────────────── */

/** Les refus de Clerk qu'on sait dire en français ; le reste garde son texte. */
const CLERK_ERRORS: Record<string, string> = {
  form_password_incorrect: 'Le mot de passe actuel est incorrect.',
  form_password_pwned: 'Ce mot de passe est apparu dans une fuite de données ailleurs : choisis-en un autre.',
  form_password_length_too_short: '8 caractères minimum.',
  form_password_not_strong_enough: 'Mot de passe trop faible : mélange lettres, chiffres et symboles.',
  session_reverification_required: 'Par sécurité, reconnecte-toi puis réessaie.',
}

function clerkMessage(e: unknown): string {
  const first = (e as { errors?: { code?: string; longMessage?: string }[] })?.errors?.[0]
  return (first?.code && CLERK_ERRORS[first.code]) || first?.longMessage || 'Le mot de passe n’a pas été changé.'
}

/**
 * Le mot de passe appartient à Clerk : l'API n'en voit jamais. Un compte créé
 * avec Google n'en a pas encore, il en crée un sans donner l'ancien.
 */
function Securite() {
  const { user } = useUser()
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
    } catch (e) {
      setError(clerkMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <Section title="Sécurité" eyebrow="Mot de passe" Icon={Lock}>
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
      <p className="text-[11px] text-ink-soft">Tes autres appareils seront déconnectés.</p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button onClick={change} disabled={pending || !next || (hasPassword && !current)} className="btn btn-primary text-xs">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Mot de passe changé' : 'Mettre à jour'}
      </button>
    </Section>
  )
}

/* ── Notifications ─────────────────────────────────────────────────────────── */

/**
 * Ce que l'API envoie, sans interrupteur : elle les fixe pour tout le monde.
 * Les emails accompagnent les prestations (on ne s'en désabonne pas), et le
 * SMS n'existe pas encore. Il n'y a ni newsletter ni offre promotionnelle.
 */
function Notifications({ prefs }: { prefs?: { email: boolean; sms: boolean } }) {
  const rows = [
    {
      label: 'Emails de service',
      sub: 'Confirmations, rappels, listes de courses : ils accompagnent tes prestations.',
      on: prefs?.email ?? true,
    },
    { label: 'SMS de session', sub: 'Pour le jour J, par ton batch cooker.', on: prefs?.sms ?? false },
  ]
  return (
    <Section title="Notifications" eyebrow="Préférences" Icon={Bell}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 border-b border-[rgba(31,42,55,0.06)] last:border-0">
          <div>
            <p className="text-sm font-semibold text-navy">{row.label}</p>
            <p className="text-xs text-ink-soft mt-0.5">{row.sub}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              row.on ? 'bg-mint text-mint-ink' : 'bg-cream-deep text-ink-mid'
            }`}
          >
            {row.on ? 'Activés' : 'Bientôt'}
          </span>
        </div>
      ))}
    </Section>
  )
}

/* ── Mes données ───────────────────────────────────────────────────────────── */

/** `GET /me/export` : le droit d'accès et de portabilité, en un fichier JSON. */
function MesDonnees() {
  const apiFetch = useApiFetch()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setError(null)
    setPending(true)
    try {
      const data = await apiFetch<unknown>('/me/export')
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `labsfood-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(apiMessage(e, 'Le téléchargement a échoué.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Section title="Préférences & données" eyebrow="Confort" Icon={Globe}>
      <Field label="Langue">
        <select className="input-base">
          <option>Français</option>
          <option>English</option>
        </select>
      </Field>
      <Field label="Devise">
        <select className="input-base">
          <option>EUR (€)</option>
          <option>USD ($)</option>
        </select>
      </Field>
      <p className="text-sm text-ink-mid leading-relaxed">
        Ton compte, ton profil, tes réservations, tes demandes de devis et tes messages, dans un fichier
        que tu peux garder ou transmettre.
      </p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button
        onClick={download}
        disabled={pending}
        className="inline-flex items-center gap-2 text-sm text-navy font-semibold hover:text-amber-deep transition-colors disabled:opacity-60"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Télécharger mes données
      </button>
    </Section>
  )
}

function Section({
  title,
  eyebrow,
  Icon,
  children,
}: {
  title: string
  eyebrow: string
  Icon: any
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="bg-paper rounded-3xl p-6 border border-[rgba(31,42,55,0.06)]"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-ink-soft">{eyebrow}</p>
          <h3 className="font-display text-lg font-bold text-navy mt-0.5">{title}</h3>
        </div>
        <span className="w-9 h-9 rounded-xl bg-amber-soft text-amber-deep flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">{label}</p>
      {children}
    </div>
  )
}
