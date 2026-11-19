'use client'

import { useState } from 'react'
import CityField from '@/components/chef/application/CityField'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import { Bell, Mail, Lock, Trash2, Download, Globe, Save, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useApiFetch } from '@/lib/api/client'
import { apiMessage } from '@/lib/api/messages'
import { useMeProfile, useUpdateMeProfile } from '@/lib/api/me-profile'
import type { ClientProfile, ClientProfilePatch, MeProfile } from '@/lib/api/types'
import DeleteMyAccount from '@/components/client/DeleteMyAccount'
import ChangePassword from '@/components/shared/ChangePassword'
import WithdrawalSettings from '@/components/client/WithdrawalSettings'

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
        <Section title="Mon compte" Icon={Mail}>
          {me.isError ? (
            <p className="text-sm text-red-700">{apiMessage(me.error, 'Votre compte n’a pas pu être chargé.')}</p>
          ) : (
            <SkeletonGroup>
              <Skeleton className="h-64 rounded-2xl" />
            </SkeletonGroup>
          )}
        </Section>
      )}

      <Securite />

      <Notifications prefs={me.data?.notificationPreferences} />

      <MesDonnees />

      <Retractation />

      {/* Danger zone */}
      <div className="lg:col-span-2 bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="font-display text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Zone sensible
        </h3>
        <p className="text-sm text-red-700/80 mb-4 leading-relaxed">
          Supprimer votre compte effacera l’historique de vos sessions et vos préférences.
          Cette action est irréversible.
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <button
            onClick={() => {
              signOut()
              router.push('/')
            }}
            className="px-4 py-2 rounded-xl bg-paper border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
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
    <Section title="Mon compte" Icon={Mail}>
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
        <p className="text-xs text-ink-soft mt-1.5">C’est votre identifiant de connexion : il ne se modifie pas ici.</p>
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

/** Le formulaire est partagé avec l'espace batch cooker. */
function Securite() {
  return (
    <Section title="Sécurité" Icon={Lock}>
      <ChangePassword />
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
      sub: 'Confirmations, rappels, listes de courses : ils accompagnent vos sessions.',
      on: prefs?.email ?? true,
    },
    { label: 'SMS de session', sub: 'Pour le jour J, par votre batch cooker.', on: prefs?.sms ?? false },
  ]
  return (
    <Section title="Notifications" Icon={Bell}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 border-b border-[rgba(31,42,55,0.06)] last:border-0">
          <div>
            <p className="text-sm font-semibold text-navy">{row.label}</p>
            <p className="text-xs text-ink-soft mt-0.5">{row.sub}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
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
function Retractation() {
  return (
    <Section title="Droit de rétractation" Icon={Mail}>
      <p className="text-sm text-ink-mid leading-relaxed">
        Vous avez 14 jours après la confirmation d’une réservation pour vous rétracter, sans motif.
      </p>
      <WithdrawalSettings />
    </Section>
  )
}

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
    <Section title="Préférences & données" Icon={Globe}>
      <Field label="Langue">
        <select className="input-base">
          <option>Français</option>
          <option>English</option>
        </select>
      </Field>
      <Field label="Devise">
        <select className="tabular-nums input-base">
          <option>EUR (€)</option>
          <option>USD ($)</option>
        </select>
      </Field>
      <p className="text-sm text-ink-mid leading-relaxed">
        Votre compte, votre profil, vos réservations, vos demandes sur-mesure et vos messages, dans un
        fichier que vous pouvez garder ou transmettre.
      </p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button
        onClick={download}
        disabled={pending}
        className="inline-flex items-center gap-2 text-sm text-navy font-semibold hover:text-amber-ink transition-colors disabled:opacity-60"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Télécharger mes données
      </button>
    </Section>
  )
}

function Section({
  title,
  Icon,
  children,
}: {
  title: string
  Icon: any
  children: React.ReactNode
}) {
  return (
    <section
      className="bg-paper rounded-2xl p-6 border border-[rgba(31,42,55,0.06)]"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
        <span className="w-9 h-9 rounded-xl bg-amber-soft text-amber-ink flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-ink-soft mb-2">{label}</p>
      {children}
    </div>
  )
}
