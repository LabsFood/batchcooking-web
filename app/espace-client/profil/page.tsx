'use client'

import { useState } from 'react'
import { SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import { Plus, X, Utensils, Heart, NotebookPen, Flame, Save, Check, RotateCw, AlertTriangle } from 'lucide-react'
import { DEFAULT_PREFS, type ProfilePrefs } from '@/lib/dashboard-mock'
import { useAuth } from '@/lib/auth-context'
import { useMe } from '@/lib/api/me'
import { useMeProfile, useUpdateMeProfile } from '@/lib/api/me-profile'
import { AvatarButtons, AvatarPending } from '@/components/shared/Avatar'
import { ApiError } from '@/lib/api/client'
import type { ClientProfile, ClientProfilePatch } from '@/lib/api/types'
import { AllergyDeclaration } from '@/components/client/AllergyDeclaration'

const SUGGEST = {
  diets: ['Végétarien', 'Vegan', 'Sans-porc', 'Sans-bœuf', 'Halal', 'Casher', 'Sans-gluten', 'Sans-lactose'],
  favorites: ['Risotto', 'Curry', 'Lasagnes', 'Tajine', 'Wok', 'Saumon', 'Pad thaï'],
}

/** Profil vierge (aucun profil encore créé côté API). */
const EMPTY_PREFS: ProfilePrefs = {
  diets: [],
  allergies: [],
  dislikes: [],
  favorites: [],
  spiceLevel: 3,
  household: DEFAULT_PREFS.household,
  kitchenNotes: '',
}

function clampSpice(n: number): ProfilePrefs['spiceLevel'] {
  const v = Math.min(5, Math.max(1, Math.round(n || 3)))
  return v as ProfilePrefs['spiceLevel']
}

/** `client_profiles` (API) → état éditable de la page. */
function toPrefs(p: ClientProfile | null): ProfilePrefs {
  if (!p) return EMPTY_PREFS
  return {
    diets: p.dietaryPreferences ?? [],
    allergies: p.allergies ?? [],
    dislikes: p.dislikes ?? [],
    favorites: p.favorites ?? [],
    spiceLevel: clampSpice(p.spiceLevel),
    // Un profil neuf n'a pas encore de foyer : on propose le plus courant
    // plutôt qu'un zéro, mais rien n'est écrit tant que la page n'est pas
    // enregistrée.
    household: {
      adults: p.householdAdults ?? DEFAULT_PREFS.household.adults,
      kids: p.householdKids ?? DEFAULT_PREFS.household.kids,
    },
    kitchenNotes: p.kitchenNotes ?? '',
  }
}

export default function ProfilPage() {
  const { data, isPending, isError, error, refetch } = useMeProfile()

  if (isPending) {
    return (
      <SkeletonGroup className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <SkeletonCard className="h-64 rounded-2xl" />
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </SkeletonGroup>
    )
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h2 className="font-display text-xl font-bold text-navy mb-2">
          Votre profil n’a pas pu être chargé
        </h2>
        <p className="text-ink-mid text-sm mb-6">
          {error instanceof ApiError ? error.message : 'Réessaie dans un instant.'}
        </p>
        <button onClick={() => refetch()} className="btn btn-primary">
          <RotateCw className="w-4 h-4" /> Réessayer
        </button>
      </div>
    )
  }

  // `GET /me/profile` renvoie soit un profil client, soit un profil chef :
  // on ne garde que le profil de goûts (`profileType === 'client'`).
  const clientProfile = data.profileType === 'client' ? (data.profile as ClientProfile) : null

  // Monté une fois la donnée résolue → l'état local s'initialise proprement
  // depuis le serveur, sans synchronisation par effet.
  return (
    <ProfileForm
      initial={toPrefs(clientProfile)}
      profile={clientProfile}
      consent={data.healthConsent}
    />
  )
}

function ProfileForm({
  initial,
  profile,
  consent,
}: {
  initial: ProfilePrefs
  profile: ClientProfile | null
  consent?: { version: string; text: string }
}) {
  const { user } = useAuth()
  const me = useMe()
  const update = useUpdateMeProfile()
  const [prefs, setPrefs] = useState<ProfilePrefs>(initial)
  /* Politique de confidentialité V1 §5 : les régimes peuvent révéler la santé ou
     la religion. Ils ne s'enregistrent qu'avec le consentement à la version en
     cours, par une case séparée, jamais cochée d'avance. */
  const dejaConsenti = !!consent && profile?.healthConsentVersion === consent.version
  const [consentRegimes, setConsentRegimes] = useState(false)
  const consentManquant = prefs.diets.length > 0 && !dejaConsenti && !consentRegimes

  const addTo = (key: 'diets' | 'dislikes' | 'favorites', value: string) => {
    if (!value.trim()) return
    setPrefs((p) => ({ ...p, [key]: Array.from(new Set([...p[key], value.trim()])) }))
  }
  const removeFrom = (key: 'diets' | 'dislikes' | 'favorites', value: string) => {
    setPrefs((p) => ({ ...p, [key]: p[key].filter((x) => x !== value) }))
  }

  const save = () => {
    const patch: ClientProfilePatch = {
      dietaryPreferences: prefs.diets,
      dislikes: prefs.dislikes,
      favorites: prefs.favorites,
      spiceLevel: prefs.spiceLevel,
      kitchenNotes: prefs.kitchenNotes,
      // Le foyer dimensionne les portions, et il part avec le reste. L'API
      // borne les adultes à 1 au moins : le compteur fait de même.
      householdAdults: Math.min(20, Math.max(1, prefs.household.adults)),
      householdKids: Math.min(20, Math.max(0, prefs.household.kids)),
      ...(consentRegimes && consent ? { consent: true, consentVersion: consent.version } : {}),
    }
    update.mutate(patch)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Avatar + identity */}
      <aside className="space-y-4">
        <div className="bg-navy text-white rounded-3xl p-5 relative overflow-hidden">
          <div className="relative flex flex-col items-center text-center">
            <AvatarPending
              url={me.data?.avatarUrl ?? null}
              name={me.data?.fullName || user?.name}
              className="mb-3 h-20 w-20 bg-amber text-2xl font-display text-navy"
            />
            <p className="font-display text-lg font-bold">
              {me.data?.fullName || user?.name || 'Invité'}
            </p>
            <p className="text-white/55 text-xs">{me.data?.email || user?.email}</p>
            <div className="mt-4">
              <AvatarButtons tone="dark" />
            </div>
          </div>
        </div>

        <div className="card-shell rounded-2xl p-5">
          <p className="eyebrow mb-3">Foyer</p>
          <div className="grid grid-cols-2 gap-3">
            <Counter
              label="Adultes"
              min={1}
              value={prefs.household.adults}
              onChange={(n) => setPrefs({ ...prefs, household: { ...prefs.household, adults: n } })}
            />
            <Counter
              label="Enfants"
              value={prefs.household.kids}
              onChange={(n) => setPrefs({ ...prefs, household: { ...prefs.household, kids: n } })}
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={update.isPending || consentManquant}
          className="btn btn-primary w-full justify-center disabled:opacity-60"
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
              : 'Enregistrer'}
        </button>
        {update.isError && (
          <p className="text-xs text-red-700 text-center">
            Échec de l&apos;enregistrement. Réessaie.
          </p>
        )}
      </aside>

      {/* Cards */}
      <section className="space-y-5">
        <Card title="Régimes alimentaires" Icon={Utensils}>
          <Tags
            items={prefs.diets}
            onRemove={(v) => removeFrom('diets', v)}
            suggest={SUGGEST.diets}
            onAdd={(v) => addTo('diets', v)}
          />
          {prefs.diets.length > 0 && !dejaConsenti && consent && (
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-[rgba(31,42,55,0.1)] p-3 text-[13px] leading-relaxed text-ink-mid">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
                checked={consentRegimes}
                onChange={(e) => setConsentRegimes(e.target.checked)}
              />
              <span>{consent.text}</span>
            </label>
          )}
          {consentManquant && consent && (
            <p className="mt-2 text-xs text-ink-soft">
              Sans ce consentement, retirez vos régimes pour enregistrer le reste : vous
              pourrez les indiquer vous-même à votre batch cooker.
            </p>
          )}
        </Card>

        {/* Enregistrées à part, avec consentement : le bouton « Enregistrer » du
            profil ne les envoie pas. Ancre visée par une réservation bloquée. */}
        <div id="allergies" className="scroll-mt-24">
          <Card title="Allergies" Icon={Flame} accent="red">
            <AllergyDeclaration profile={profile} consent={consent} />
          </Card>
        </div>

        <Card title="Plats préférés" Icon={Heart}>
          <Tags
            items={prefs.favorites}
            onRemove={(v) => removeFrom('favorites', v)}
            suggest={SUGGEST.favorites}
            onAdd={(v) => addTo('favorites', v)}
            tone="mint"
          />
        </Card>

        <Card title="Aliments à éviter" Icon={X}>
          <Tags
            items={prefs.dislikes}
            onRemove={(v) => removeFrom('dislikes', v)}
            suggest={[]}
            onAdd={(v) => addTo('dislikes', v)}
          />
        </Card>

        <Card title="Niveau d’épice" Icon={Flame}>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setPrefs({ ...prefs, spiceLevel: n as ProfilePrefs['spiceLevel'] })}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                  n <= prefs.spiceLevel ? 'bg-amber text-navy' : 'bg-cream-soft text-ink-mid'
                }`}
              >
                {'🌶️'.repeat(n)}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Notes sur votre cuisine" Icon={NotebookPen}>
          <textarea
            rows={3}
            value={prefs.kitchenNotes}
            onChange={(e) => setPrefs({ ...prefs, kitchenNotes: e.target.value })}
            placeholder="Plaque, four, robot, espace de découpe…"
            className="input-base resize-none"
          />
        </Card>
      </section>
    </div>
  )
}

function Card({
  title,
  Icon,
  children,
  accent,
}: {
  title: string
  Icon: any
  children: React.ReactNode
  accent?: 'red'
}) {
  return (
    <div
      className="card-shell rounded-2xl p-5 lg:p-6"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            accent === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-soft text-amber-ink'
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
      </div>
      {children}
    </div>
  )
}

function Tags({
  items,
  onRemove,
  suggest,
  onAdd,
  tone = 'amber',
}: {
  items: string[]
  onRemove: (v: string) => void
  suggest: string[]
  onAdd: (v: string) => void
  tone?: 'amber' | 'red' | 'mint'
}) {
  const [draft, setDraft] = useState('')
  const toneClass =
    tone === 'red'
      ? 'bg-red-100 text-red-700'
      : tone === 'mint'
        ? 'bg-mint text-mint-ink'
        : 'bg-amber-soft text-amber-ink'

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.map((v) => (
          <span key={v} className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${toneClass}`}>
            {v}
            <button onClick={() => onRemove(v)} className="opacity-60 hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-ink-soft">Rien pour l&apos;instant.</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd(draft)
              setDraft('')
            }
          }}
          placeholder="Ajouter…"
          className="input-base text-sm flex-1"
        />
        <button
          type="button"
          onClick={() => {
            onAdd(draft)
            setDraft('')
          }}
          className="px-4 rounded-xl bg-navy text-amber text-xs font-semibold hover:bg-navy-deep transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {suggest.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggest
            .filter((s) => !items.includes(s))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAdd(s)}
                className="text-xs px-2.5 py-1 rounded-full bg-cream-soft text-ink-mid hover:bg-amber-soft hover:text-amber-ink transition-colors"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

function Counter({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  /** L'API refuse un foyer sans adulte, et plus de vingt : les deux boutons
      s'arrêtent avant le refus plutôt que de le provoquer. */
  min?: number
}) {
  const MAX = 20
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-ink-soft mb-2">{label}</p>
      <div className="flex items-center bg-cream-soft rounded-full p-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="hit w-8 h-8 rounded-full bg-paper flex items-center justify-center font-bold"
        >
          –
        </button>
        <span className="flex-1 text-center font-display text-lg font-bold text-navy">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(MAX, value + 1))}
          className="hit w-8 h-8 rounded-full bg-paper flex items-center justify-center font-bold"
        >
          +
        </button>
      </div>
    </div>
  )
}
