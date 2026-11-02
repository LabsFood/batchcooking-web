'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Sparkles, Flame, Save, Check, RotateCw, AlertTriangle } from 'lucide-react'
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
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="h-64 rounded-3xl bg-cream-soft animate-pulse" />
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-cream-soft animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h2 className="font-display text-xl font-bold text-navy mb-2">
          Impossible de charger ton profil
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
    }
    update.mutate(patch)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Avatar + identity */}
      <aside className="space-y-4">
        <div className="bg-navy text-white rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber/25 blur-3xl pointer-events-none" />
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

        <div className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]">
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
          disabled={update.isPending}
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
        <Card title="Régimes alimentaires" eyebrow="Tu manges comment ?" Icon={Sparkles}>
          <Tags
            items={prefs.diets}
            onRemove={(v) => removeFrom('diets', v)}
            suggest={SUGGEST.diets}
            onAdd={(v) => addTo('diets', v)}
          />
        </Card>

        {/* Enregistrées à part, avec consentement : le bouton « Enregistrer » du
            profil ne les envoie pas. Ancre visée par une réservation bloquée. */}
        <div id="allergies" className="scroll-mt-24">
          <Card title="Allergies" eyebrow="Pas touche !" Icon={Flame} accent="red">
            <AllergyDeclaration profile={profile} consent={consent} />
          </Card>
        </div>

        <Card title="Plats préférés" eyebrow="Hall of fame" Icon={Sparkles}>
          <Tags
            items={prefs.favorites}
            onRemove={(v) => removeFrom('favorites', v)}
            suggest={SUGGEST.favorites}
            onAdd={(v) => addTo('favorites', v)}
            tone="mint"
          />
        </Card>

        <Card title="Aliments à éviter" eyebrow="Pas mes goûts" Icon={X}>
          <Tags
            items={prefs.dislikes}
            onRemove={(v) => removeFrom('dislikes', v)}
            suggest={[]}
            onAdd={(v) => addTo('dislikes', v)}
          />
        </Card>

        <Card title="Niveau d’épice" eyebrow="Le piment" Icon={Flame}>
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

        <Card title="Notes sur ta cuisine" eyebrow="Hardware" Icon={Sparkles}>
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
  eyebrow,
  Icon,
  children,
  accent,
}: {
  title: string
  eyebrow: string
  Icon: any
  children: React.ReactNode
  accent?: 'red'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="bg-paper rounded-3xl p-5 lg:p-6 border border-[rgba(31,42,55,0.06)]"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-ink-soft">{eyebrow}</p>
          <h3 className="font-display text-lg font-bold text-navy mt-0.5">{title}</h3>
        </div>
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            accent === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-soft text-amber-deep'
          }`}
        >
          <Icon className="w-4 h-4" />
        </span>
      </div>
      {children}
    </motion.div>
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
        : 'bg-amber-soft text-amber-deep'

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
                className="text-[11px] px-2.5 py-1 rounded-full bg-cream-soft text-ink-mid hover:bg-amber-soft hover:text-amber-deep transition-colors"
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
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-soft mb-2">{label}</p>
      <div className="flex items-center bg-cream-soft rounded-full p-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-paper flex items-center justify-center font-bold"
        >
          –
        </button>
        <span className="flex-1 text-center font-display text-lg font-bold text-navy">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(MAX, value + 1))}
          className="w-8 h-8 rounded-full bg-paper flex items-center justify-center font-bold"
        >
          +
        </button>
      </div>
    </div>
  )
}
