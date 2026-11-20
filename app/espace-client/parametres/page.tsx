'use client'

import { useState } from 'react'
import CityField from '@/components/chef/application/CityField'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'
import { Bell, Mail, Lock, Trash2, Download, Globe, Save, Loader2, Pencil, type LucideIcon } from 'lucide-react'
import { useToast } from '@/components/shared/Toaster'
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
 *
 * La section se lit d'abord : des libellés, pas des champs. « Modifier » la
 * passe en formulaire, « Enregistrer » ou « Annuler » la referme, et chaque
 * sauvegarde s'annonce par un toast.
 */
function Compte({ me, firstName, lastName }: { me: MeProfile; firstName: string; lastName: string }) {
  const { user: clerkUser } = useUser()
  const update = useUpdateMeProfile()
  const toast = useToast()
  const profile = me.profileType === 'client' ? (me.profile as ClientProfile) : null
  // Ce qui est enregistré : la lecture l'affiche, le formulaire en part.
  const [base, setBase] = useState<CompteFields>(() => ({
    firstName,
    lastName,
    phone: me.user.phone ?? '',
    addressStreet: profile?.addressStreet ?? '',
    addressPostalCode: profile?.addressPostalCode ?? '',
    addressCity: profile?.addressCity ?? '',
  }))
  const [form, setForm] = useState(base)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof CompteFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function edit() {
    setForm(base)
    setError(null)
    setEditing(true)
  }

  function cancel() {
    setForm(base)
    setError(null)
    setEditing(false)
  }

  function save() {
    setError(null)
    const patch = Object.fromEntries(
      (Object.keys(form) as (keyof CompteFields)[])
        .map((k) => [k, form[k].trim()] as const)
        .filter(([k, v]) => v !== '' && v !== base[k]),
    ) as Partial<CompteFields>
    if (Object.keys(patch).length === 0) {
      setEditing(false)
      return
    }
    update.mutate(patch, {
      onSuccess: () => {
        // L'API a renommé le compte chez Clerk : l'en-tête relit le nom.
        if (patch.firstName || patch.lastName) clerkUser?.reload()
        setBase((b) => ({ ...b, ...patch }))
        setEditing(false)
        toast.success('Vos coordonnées sont enregistrées')
      },
      onError: (e) => {
        const message = apiMessage(e)
        setError(message)
        toast.error('Vos coordonnées n’ont pas été enregistrées', message)
      },
    })
  }

  const ville = [base.addressPostalCode, base.addressCity].filter(Boolean).join(' ')

  return (
    <Section
      title="Mon compte"
      Icon={Mail}
      action={!editing && <EditButton onClick={edit} label="Modifier mon compte" />}
    >
      {!editing ? (
        <dl className="divide-y divide-[var(--line)]">
          <Lecture label="Nom">{[base.firstName, base.lastName].filter(Boolean).join(' ')}</Lecture>
          <Lecture label="Email" note="Votre identifiant de connexion : il ne se modifie pas ici.">
            {me.user.email}
          </Lecture>
          <Lecture label="Téléphone">{base.phone}</Lecture>
          <Lecture label="Adresse de la session">
            {base.addressStreet && (
              <>
                {base.addressStreet}
                {ville && <span className="block">{ville}</span>}
              </>
            )}
          </Lecture>
        </dl>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" className="input-base" autoFocus />
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
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={update.isPending} className="btn btn-primary text-xs">
              {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
            <button type="button" onClick={cancel} disabled={update.isPending} className="btn btn-outline text-xs">
              Annuler
            </button>
          </div>
        </>
      )}
    </Section>
  )
}

/* ── Sécurité ──────────────────────────────────────────────────────────────── */

/** Le formulaire est partagé avec l'espace batch cooker. */
function Securite() {
  const { user } = useUser()
  const [editing, setEditing] = useState(false)
  const hasPassword = user?.passwordEnabled ?? true

  return (
    <Section
      title="Sécurité"
      Icon={Lock}
      action={
        !editing && (
          <EditButton
            onClick={() => setEditing(true)}
            label={hasPassword ? 'Changer mon mot de passe' : 'Créer un mot de passe'}
          />
        )
      }
    >
      {!editing ? (
        <dl className="divide-y divide-[var(--line)]">
          <Lecture
            label="Mot de passe"
            note={hasPassword ? 'Le changer déconnecte vos autres appareils.' : 'Vous vous connectez avec Google.'}
          >
            {hasPassword ? (
              <>
                <span aria-hidden className="tracking-[0.2em]">••••••••</span>
                <span className="sr-only">Défini</span>
              </>
            ) : (
              'Aucun pour l’instant'
            )}
          </Lecture>
        </dl>
      ) : (
        <ChangePassword onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      )}
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
  const toast = useToast()
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
      toast.success('Vos données sont téléchargées')
    } catch (e) {
      const message = apiMessage(e, 'Le téléchargement a échoué.')
      setError(message)
      toast.error('Le téléchargement a échoué', message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Section title="Préférences & données" Icon={Globe}>
      {/* Les deux listes ne changeaient rien : le site n'existe qu'en français
          et en euros. On le dit, plutôt que d'offrir un choix sans effet. */}
      <dl className="divide-y divide-[var(--line)]">
        <Lecture label="Langue">Français</Lecture>
        <Lecture label="Devise">Euro (€)</Lecture>
      </dl>
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
  action,
  children,
}: {
  title: string
  Icon: LucideIcon
  /** Le bouton « Modifier » de la section, à droite du titre. */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="bg-paper rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="flex items-center gap-2.5 font-display text-lg font-bold text-navy">
          <span className="w-9 h-9 rounded-xl bg-amber-soft text-amber-ink flex items-center justify-center">
            <Icon className="w-4 h-4" aria-hidden />
          </span>
          {title}
        </h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-xs font-semibold text-navy transition-colors hover:border-amber hover:bg-amber-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
    >
      <Pencil className="h-3.5 w-3.5" aria-hidden />
      Modifier
    </button>
  )
}

/** Une ligne en lecture : le libellé, la valeur, ou « Non renseigné ». */
function Lecture({ label, note, children }: { label: string; note?: string; children?: React.ReactNode }) {
  const vide = children == null || children === '' || children === false
  return (
    <div className="grid grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-navy">
        {vide ? <span className="font-normal text-ink-soft">Non renseigné</span> : children}
        {note && <span className="mt-0.5 block text-xs font-normal text-ink-soft">{note}</span>}
      </dd>
    </div>
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
