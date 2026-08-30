'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Globe2, Info, MapPin, Plus, RotateCw, Save, X } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import { useAuth } from '@/lib/auth-context'
import { useMeProfile } from '@/lib/api/me-profile'
import { useUpdateChefProfile } from '@/lib/api/chef-profile'
import { ApiError } from '@/lib/api/client'
import type { ChefProfile } from '@/lib/api/types'
import { CHEF_PROFILE } from '@/lib/chef/mock'
import { PAYMENT_METHOD_LABEL, SAP_PATH_LABEL, type PaymentMethod } from '@/lib/chef/states'

const LANGUAGES = ['Français', 'Anglais', 'Italien', 'Espagnol', 'Arabe', 'Portugais']
const SPECIALTIES = ['Méditerranéen', 'Africain', 'Italien', 'Asiatique', 'Végétarien', 'Pâtisserie', 'Bistrot']

export default function ChefProfilePage() {
  const { data, isPending, isError, error, refetch } = useMeProfile()

  if (isPending) {
    return (
      <ChefPage title="Mon profil">
        <div className="space-y-4 max-w-3xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-3xl bg-cream-soft animate-pulse" />
          ))}
        </div>
      </ChefPage>
    )
  }

  if (isError) {
    return (
      <ChefPage title="Mon profil">
        <div className="max-w-md mx-auto text-center py-16">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h2 className="font-display text-xl font-bold text-navy mb-2">
            Impossible de charger votre profil
          </h2>
          <p className="text-ink-mid text-sm mb-6">
            {error instanceof ApiError ? error.message : 'Réessayez dans un instant.'}
          </p>
          <button onClick={() => refetch()} className="btn btn-primary">
            <RotateCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </ChefPage>
    )
  }

  // Le profil chef n'existe qu'une fois l'onboarding validé côté serveur.
  const chef = data.profileType === 'chef' ? (data.profile as ChefProfile | null) : null

  return <ChefProfileForm initial={chef} fullName={data.user.fullName} phone={data.user.phone} />
}

function ChefProfileForm({
  initial,
  fullName,
  phone: initialPhone,
}: {
  initial: ChefProfile | null
  fullName: string | null
  phone: string | null
}) {
  const { user } = useAuth()
  const update = useUpdateChefProfile()

  const [first, last] = (fullName ?? user?.name ?? '').split(' ')

  const [displayName, setDisplayName] = useState(initial?.displayName ?? fullName ?? '')
  const [firstName, setFirstName] = useState(first ?? '')
  const [lastName, setLastName] = useState(last ?? '')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [radius, setRadius] = useState(initial?.serviceRadiusKm ?? 10)
  const [bio, setBio] = useState(initial?.bio ?? '')

  // Champs non encore supportés par l'API — conservés en local (cf. note plus bas).
  const [languages, setLanguages] = useState<string[]>(CHEF_PROFILE.languages)
  const [specialties, setSpecialties] = useState<string[]>(['Méditerranéen', 'Africain'])
  const [payments, setPayments] = useState<PaymentMethod[]>(CHEF_PROFILE.acceptedPayments)
  const [shopping, setShopping] = useState(CHEF_PROFILE.shoppingIncluded)

  const toggle = <T,>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

  const canSave = displayName.trim().length > 0 && !update.isPending

  const save = () => {
    if (!canSave) return
    update.mutate({
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      city: city.trim() || undefined,
      serviceRadiusKm: radius,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      phone: phone.trim() || undefined,
    })
  }

  return (
    <ChefPage title="Mon profil" subtitle="Vos informations et ce que les clients voient de vous.">
      <div className="space-y-5 max-w-3xl">
        {/* Statut de vérification — non modifiable par le chef */}
        {initial && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow mb-2">Statut de ma vitrine</p>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={initial.isVerified ? 'success' : 'warning'}>
                    {initial.isVerified ? 'Vérifié' : 'En attente de vérification'}
                  </StatusBadge>
                  <StatusBadge tone={initial.isActive ? 'success' : 'neutral'}>
                    {initial.isActive ? 'Réservable' : 'Non réservable'}
                  </StatusBadge>
                </div>
              </div>
              <p className="text-xs text-ink-soft max-w-xs leading-relaxed">
                Ces deux états sont fixés par l&apos;équipe Lab&apos;s Food après examen de
                votre dossier — ils ne se modifient pas ici.
              </p>
            </div>
          </Card>
        )}

        <Card title="Identité">
          <div className="space-y-4">
            <div>
              <label className="label-muted block mb-2">
                Nom public <span className="text-terra">*</span>
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Chef Marie D."
                className="input-base"
                maxLength={255}
              />
              <p className="text-[11px] text-ink-soft mt-1">
                C&apos;est le nom affiché aux clients sur votre vitrine.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Prénom" value={firstName} onChange={setFirstName} />
              <Field label="Nom" value={lastName} onChange={setLastName} />
              <Field label="Téléphone" value={phone} onChange={setPhone} placeholder="+33612345678" />
              <div>
                <label className="label-muted block mb-2">Email</label>
                <input value={user?.email ?? ''} disabled className="input-base opacity-60" />
                <p className="text-[11px] text-ink-soft mt-1">
                  Se modifie depuis Paramètres → Sécurité.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Zone d'intervention">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ville de départ" value={city} onChange={setCity} placeholder="Nice" />
            <div>
              <label className="label-muted block mb-2">Rayon — {radius} km</label>
              <input
                type="range"
                min={1}
                max={200}
                step={1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-amber"
              />
              <p className="text-[11px] text-ink-soft mt-1 inline-flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Autour de {city || 'votre ville'} · 1 à 200 km
              </p>
            </div>
          </div>
        </Card>

        <Card title="Présentation">
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input-base resize-none"
            placeholder="Parlez de votre parcours, de votre cuisine…"
          />
        </Card>

        {/* ── Champs pas encore portés par l'API ─────────────────────────── */}
        <div className="rounded-2xl border border-amber/30 bg-amber-soft/40 px-4 py-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-deep mt-0.5 shrink-0" />
          <p className="text-xs text-ink-mid leading-relaxed">
            Les réglages ci-dessous (langues, spécialités, moyens de paiement, courses)
            ne sont <strong>pas encore enregistrés</strong> : l&apos;API ne les expose pas
            sur <code className="font-mono text-[11px]">/me/chef-profile</code>. Ils sont
            affichés pour validation du parcours.
          </p>
        </div>

        <Card title="Langues parlées">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <Chip key={l} active={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)}>
                <Globe2 className="w-3 h-3" /> {l}
              </Chip>
            ))}
          </div>
        </Card>

        <Card title="Mes spécialités">
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <Chip key={s} active={specialties.includes(s)} onClick={() => toggle(specialties, setSpecialties, s)}>
                {s}
              </Chip>
            ))}
          </div>
        </Card>

        <Card title="Moyens de paiement acceptés">
          <div className="space-y-2.5">
            {(['card', 'urssaf', 'cesu'] as PaymentMethod[]).map((p) => (
              <label
                key={p}
                className="flex items-start gap-3 rounded-2xl border border-[rgba(31,42,55,0.08)] p-4 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={payments.includes(p)}
                  onChange={() => toggle(payments, setPayments, p)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">{PAYMENT_METHOD_LABEL[p]}</p>
                  {p !== 'card' && (
                    <p className="text-xs text-ink-soft mt-0.5">
                      {p === 'urssaf'
                        ? 'Nécessite une voie SAP validée dans votre dossier.'
                        : 'Nécessite une affiliation CRCESU validée.'}
                    </p>
                  )}
                </div>
                {p === 'card' && <StatusBadge tone="neutral">Toujours actif</StatusBadge>}
              </label>
            ))}
          </div>

          <label className="flex items-start gap-3 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shopping}
              onChange={(e) => setShopping(e.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-semibold text-navy">Je propose de faire les courses</p>
              <p className="text-xs text-ink-soft mt-0.5">
                Le forfait se règle dans <strong>Mes tarifs</strong>.
              </p>
            </div>
          </label>
        </Card>

        <div className="rounded-2xl bg-cream-soft px-4 py-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
          <p className="text-xs text-ink-mid leading-relaxed">
            Votre voie SAP ({SAP_PATH_LABEL[CHEF_PROFILE.sapPath]}) et vos pièces
            justificatives se gèrent depuis <strong>Mon dossier</strong>.
          </p>
        </div>

        {/* Retours d'enregistrement */}
        {update.isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 leading-relaxed">
              {update.error instanceof ApiError
                ? update.error.message
                : "L'enregistrement a échoué. Réessayez."}
            </p>
          </div>
        )}
        {update.isSuccess && (
          <div className="rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3 flex items-start gap-3">
            <Check className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
            <p className="text-xs text-mint-ink leading-relaxed">
              Profil enregistré. Votre vitrine reste en attente de vérification par
              l&apos;équipe avant d&apos;être réservable.
            </p>
          </div>
        )}

        <div className="sticky bottom-24 lg:bottom-6">
          <button
            onClick={save}
            disabled={!canSave}
            className="btn btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {update.isPending ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : update.isSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {update.isPending
              ? 'Enregistrement…'
              : update.isSuccess
                ? 'Profil enregistré'
                : 'Enregistrer mon profil'}
          </button>
          {!displayName.trim() && (
            <p className="text-[11px] text-ink-soft text-center mt-2">
              Le nom public est obligatoire.
            </p>
          )}
        </div>
      </div>
    </ChefPage>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="label-muted block mb-2">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base"
      />
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
        active ? 'bg-amber text-navy' : 'bg-cream-soft text-ink-mid hover:bg-cream-deep'
      }`}
    >
      {children}
      {active ? <X className="w-3 h-3 opacity-60" /> : <Plus className="w-3 h-3 opacity-60" />}
    </button>
  )
}
