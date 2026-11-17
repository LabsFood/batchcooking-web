'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Check,
  Eye,
  Loader2,
  Lock,
  MapPin,
  RotateCw,
  Star,
} from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import { useToast } from '@/components/shared/Toaster'
import { SkeletonCard, SkeletonGroup } from '@/components/shared/Skeleton'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { TextField } from '@/components/chef/application/fields'
import PhoneField from '@/components/shared/PhoneField'
import { isValidE164 } from '@/lib/phone'
import { PAYMENT_METHOD_LABEL } from '@/lib/chef/states'
import { useMeProfile } from '@/lib/api/me-profile'
import { chefProfileMessage, useUpdateChefProfile } from '@/lib/api/chef-profile'
import { applicationAnswers, useChefApplication } from '@/lib/api/chef-documents'
import { useLanguages } from '@/lib/api/referentials'
import MultiSelect from '@/components/shared/MultiSelect'
import VitrineDuMois from '@/components/chef/VitrineDuMois'
import type { ChefProfile } from '@/lib/api/types'

/* ─────────────────────────────────────────────────────────────────────────────
   Ma vitrine — `PATCH /me/chef-profile`.

   L'API tient sept champs, et sept seulement : le nom public, la présentation,
   la ville, le rayon d'intervention, et le nom et le téléphone du compte. Tout
   ce que cet écran montrait en plus — langues, badges, moyens de paiement
   acceptés — n'a pas de place pour être stocké. On les garde affichés, parce
   que le besoin ne disparaît pas quand on cache le champ, mais on ne fait plus
   semblant de les enregistrer.

   Tout ce qui est saisi ici est public. La présentation est donc contrôlée :
   liens, adresses et coordonnées y sont interdits, puisque la mise en relation
   passe par l'application.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_BIO = 600

/** Repère ce qui ne doit pas figurer dans un texte public. */
function textIssues(text: string): string[] {
  const issues: string[] = []
  if (/https?:\/\/|www\.|\.(fr|com|net|io|co)\b/i.test(text)) issues.push('un lien')
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) issues.push('une adresse email')
  if (/(?:\+?\d[\s.-]?){9,}/.test(text)) issues.push('un numéro de téléphone')
  if (/\b\d{1,3}\s+(rue|avenue|boulevard|chemin|impasse|place|allée)\b/i.test(text)) {
    issues.push('une adresse postale')
  }
  if (/@[A-Za-z0-9_]{3,}/.test(text)) issues.push('un compte de réseau social')
  return issues
}

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

export default function ChefShowcasePage() {
  const toast = useToast()
  const profil = useMeProfile()
  const application = useChefApplication()
  const update = useUpdateChefProfile()

  const chef =
    profil.data?.profileType === 'chef' ? (profil.data.profile as ChefProfile | null) : null
  const compte = profil.data?.user

  // L'API n'ouvre la page publique qu'à un compte approuvé.
  const approuve = application.data?.status === 'approved' || chef?.isVerified === true
  const enInstruction =
    application.data?.status === 'submitted' ||
    application.data?.status === 'changes-requested'

  const [nomPublic, setNomPublic] = useState(chef?.displayName ?? '')
  const [bio, setBio] = useState(chef?.bio ?? '')
  const [ville, setVille] = useState(chef?.city ?? '')
  const [rayon, setRayon] = useState(chef?.serviceRadiusKm ?? 20)
  const [langues, setLangues] = useState<string[]>(chef?.languages ?? [])
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [tel, setTel] = useState(compte?.phone ?? '')
  const [charge, setCharge] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Le profil arrive après le premier rendu : on garnit les champs une fois,
  // sans effet, en comparant ce que le serveur a renvoyé à ce qu'on affiche.
  if (!charge && profil.isSuccess) {
    setCharge(true)
    setNomPublic(chef?.displayName ?? '')
    setBio(chef?.bio ?? '')
    setVille(chef?.city ?? '')
    setRayon(chef?.serviceRadiusKm ?? 20)
    setLangues(chef?.languages ?? [])
    setTel(compte?.phone ?? '')
    const entier = (compte?.fullName ?? '').trim().split(/\s+/)
    setPrenom(entier[0] ?? '')
    setNom(entier.slice(1).join(' '))
  }

  const issues = textIssues(bio)
  const nomAffiche = nomPublic.trim() || compte?.fullName || 'Votre nom public'

  /** Ce qui manque pour que la page tienne debout devant un client. */
  const manques = [
    !nomPublic.trim() && 'un nom public',
    bio.trim().length < 80 && 'une présentation d’au moins quelques lignes',
    !ville.trim() && 'votre ville',
  ].filter(Boolean) as string[]

  function enregistrer() {
    setErreur(null)
    if (issues.length > 0) {
      setErreur(`Votre présentation contient ${issues.join(', ')}. Retirez-le avant d’enregistrer.`)
      return
    }
    if (tel.trim() && !isValidE164(tel.trim())) {
      setErreur('Ce numéro ne semble pas complet.')
      return
    }
    if (rayon < 1 || rayon > 200) {
      setErreur('Le rayon d’intervention se situe entre 1 et 200 km.')
      return
    }

    update.mutate(
      {
        displayName: nomPublic.trim() || undefined,
        bio: bio.trim() || undefined,
        city: ville.trim() || undefined,
        serviceRadiusKm: rayon,
        // L'API remplace la liste entière : on l'envoie telle qu'elle est à
        // l'écran, y compris vide, sinon on ne pourrait jamais retirer une langue.
        languages: langues,
        firstName: prenom.trim() || undefined,
        lastName: nom.trim() || undefined,
        phone: tel.trim() || undefined,
      },
      {
        onSuccess: () =>
          toast.success(
            'Votre vitrine est à jour',
            'Les clients voient ces informations dès maintenant.',
          ),
        onError: (e) => setErreur(chefProfileMessage(e)),
      },
    )
  }

  if (profil.isPending) {
    return (
      <ChefPage title="Ma vitrine">
        <SkeletonGroup className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <SkeletonCard className="h-64 rounded-2xl" />
            <SkeletonCard className="h-48 rounded-2xl" />
          </div>
          <SkeletonCard className="h-80 rounded-2xl" />
        </SkeletonGroup>
      </ChefPage>
    )
  }

  if (profil.isError) {
    return (
      <ChefPage title="Ma vitrine">
        <div className="mx-auto max-w-lg rounded-2xl bg-paper p-6 text-center">
          <p className="font-display text-lg font-bold text-navy">Vitrine indisponible</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-mid">
            {chefProfileMessage(profil.error)}
          </p>
          <button onClick={() => profil.refetch()} className="btn btn-primary mt-5 text-xs">
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
          </button>
        </div>
      </ChefPage>
    )
  }

  return (
    <ChefPage title="Ma vitrine" subtitle="Ce que les clients voient de vous.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* La page ne s'ouvre qu'à l'approbation : on le dit avant de saisir. */}
          {!approuve && (
            <div className="flex items-start gap-3 rounded-2xl bg-cream-soft p-4">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
              <div className="text-[13px] leading-relaxed text-ink-mid">
                <p className="font-semibold text-navy">
                  Votre vitrine s’ouvre à l’approbation de votre candidature.
                </p>
                <p className="mt-1">
                  {enInstruction
                    ? 'Votre dossier est en cours d’instruction : vous pouvez préparer ce texte, mais l’enregistrement sera refusé jusque-là.'
                    : 'Suivez votre dossier pour savoir ce qu’il reste à faire.'}{' '}
                  <Link
                    href="/espace-chef/dossier"
                    className="font-semibold text-amber-ink underline"
                  >
                    Mon dossier
                  </Link>
                </p>
              </div>
            </div>
          )}

          {manques.length > 0 && (
            <Card title="Ce qui manque à votre page">
              <p className="text-[13px] leading-relaxed text-ink-mid">
                Il manque {manques.join(', ')}. Une vitrine sans présentation ne donne
                aucune raison de vous choisir plutôt qu’un autre.
              </p>
            </Card>
          )}

          <Card title="Ma présentation">
            <div className="space-y-4">
              <TextField
                label="Nom public"
                value={nomPublic}
                hint="Celui que les clients lisent. Votre nom complet, ou le nom de votre cuisine."
                onChange={(e) => setNomPublic(e.target.value)}
              />

              <div>
                <label
                  htmlFor="bio"
                  className="mb-1.5 block text-sm font-semibold text-navy"
                >
                  Présentation
                </label>
                <p className="mb-3 text-[13px] leading-relaxed text-ink-mid">
                  Quelques lignes sur votre cuisine, votre parcours, votre façon de
                  travailler. C’est le premier texte que lisent vos clients.
                </p>

                <div className="mb-3 flex items-start gap-3 rounded-xl bg-amber-soft/50 px-4 py-3">
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#7A4A05]"
                    aria-hidden
                  />
                  <p className="text-[13px] leading-relaxed text-[#7A4A05]">
                    Pas de lien, pas d’adresse, pas de téléphone ni d’email : les échanges
                    et la réservation passent par l’application. Un texte qui en contient
                    sera refusé à la validation.
                  </p>
                </div>

                <textarea
                  id="bio"
                  rows={6}
                  value={bio}
                  maxLength={MAX_BIO}
                  onChange={(e) => setBio(e.target.value)}
                  aria-invalid={issues.length > 0 || undefined}
                  aria-describedby="bio-help"
                  className={`input-base resize-y leading-relaxed ${
                    issues.length > 0 ? '!border-red-600' : ''
                  }`}
                />

                <div className="mt-1.5 flex items-start justify-between gap-3">
                  <p id="bio-help" className="text-[13px] text-ink-soft">
                    {issues.length > 0 ? (
                      <span role="alert" className="flex items-start gap-1.5 text-red-700">
                        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                        Votre texte contient {issues.join(', ')}.
                      </span>
                    ) : (
                      'Visible par tous les clients de la plateforme.'
                    )}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-ink-soft">
                    {bio.length} / {MAX_BIO}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Où j’interviens">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Ville de départ"
                value={ville}
                hint="C’est d’ici que se calculent vos déplacements."
                onChange={(e) => setVille(e.target.value)}
              />
              <div>
                <label
                  htmlFor="rayon"
                  className="mb-1.5 block text-sm font-semibold text-navy"
                >
                  Rayon d’intervention
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="rayon"
                    type="range"
                    min={1}
                    max={200}
                    value={rayon}
                    onChange={(e) => setRayon(Number(e.target.value))}
                    className="flex-1 accent-amber"
                  />
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums text-navy">
                    {rayon} km
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                  Au-delà de ce rayon, les clients ne vous voient pas.
                </p>
              </div>
            </div>

            <Langues choisies={langues} onChange={setLangues} />

            <Zones
              zones={
                (approuve && chef?.interventionZones?.length
                  ? chef.interventionZones
                  : applicationAnswers(application.data).interventionZones) ?? []
              }
              modifiable={enInstruction || approuve}
            />
          </Card>

          <Card title="Ma vitrine du mois">
            {chef?.id ? (
              <VitrineDuMois
                chefProfileId={chef.id}
                enLigne={Boolean(chef.isActive && chef.isVerified)}
              />
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Votre page publique naîtra avec l’approbation de votre
                candidature.
              </p>
            )}
          </Card>

          <Card
            title="Mon compte"
            action={
              <span className="text-xs uppercase tracking-wide text-ink-soft">
                Non public
              </span>
            }
          >
            <p className="mb-4 text-[13px] leading-relaxed text-ink-mid">
              Ce nom et ce numéro servent à notre équipe et aux clients qui ont réservé
              chez vous. Ils ne figurent pas sur votre page publique.
            </p>
            {chef?.tierLabel && (
              <p className="mb-4 flex items-center gap-1.5 text-[13px] text-ink-mid">
                Palier :<span className="font-semibold text-navy">{chef.tierLabel}</span>
                <InfoPopover label="Qu’est-ce que le palier ?">
                  Attribué par l’équipe Lab’s Food. Il servira à définir vos droits de
                  publication.
                </InfoPopover>
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
              />
              <TextField label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="mt-4">
              <PhoneField label="Téléphone" value={tel} onChange={setTel} />
            </div>
          </Card>

          {erreur && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {erreur}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={enregistrer}
              disabled={update.isPending || issues.length > 0}
              className="btn btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {update.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Enregistrement…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" aria-hidden /> Enregistrer ma vitrine
                </>
              )}
            </button>
            {update.isSuccess && !update.isPending && (
              <span className="text-[13px] text-mint-ink">Enregistré.</span>
            )}
          </div>

          {/* Ce qui se règle ailleurs, et ce qui ne se règle pas du tout. */}
          <Card title="Ce qui ne se saisit pas ici">
            <p className="text-[13px] leading-relaxed text-ink-mid">
              <strong>Les moyens de paiement que vous acceptez</strong> se règlent
              dans Rémunération. Le CESU préfinancé est le seul qui dépende de
              vous&nbsp;: la carte est toujours proposée, et l’avance immédiate
              dépend du rattachement de chaque client à l’URSSAF.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.values(PAYMENT_METHOD_LABEL).map((l) => (
                <span
                  key={l}
                  className="rounded-full bg-cream-soft px-2.5 py-1 text-xs font-medium text-ink-soft"
                >
                  {l}
                </span>
              ))}
            </div>
            <Link href="/espace-chef/remuneration" className="btn btn-outline mt-3 text-xs">
              Régler mes moyens de paiement
            </Link>

            <p className="mt-4 text-[13px] leading-relaxed text-ink-mid">
              <strong>Vos badges</strong> ne se saisissent pas, et c’est voulu&nbsp;:
              Lab’s Food les pose à partir de vos pièces justificatives. Un badge
              qu’on s’attribue soi-même ne dirait rien à personne.
            </p>
          </Card>
        </div>

        {/* Aperçu client, nourri par ce qui est en train d'être saisi. */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper">
            <div className="flex items-center gap-2 border-b border-[rgba(31,42,55,0.08)] bg-cream-soft px-4 py-2.5">
              <Eye className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Aperçu client
              </p>
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber font-display text-lg font-bold text-navy">
                  {initiales(nomAffiche)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-navy">
                    {nomAffiche}
                  </p>
                  <p className="inline-flex items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    {ville.trim() || 'Ville à renseigner'}
                    {ville.trim() && ` · ${rayon} km`}
                  </p>
                </div>
              </div>

              {/* La note vient des avis : pas d'endpoint, donc pas de note. */}
              <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink-soft">
                <Star className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Pas encore d’avis
              </p>

              {bio.trim() ? (
                <p className="mb-4 text-[13px] leading-relaxed text-ink-mid">
                  {bio.length > 220 ? `${bio.slice(0, 220)}…` : bio}
                </p>
              ) : (
                <p className="mb-4 text-[13px] leading-relaxed text-ink-soft">
                  Votre présentation s’affichera ici.
                </p>
              )}

              <span className="inline-flex rounded-full bg-mint px-2 py-1 text-xs font-medium text-mint-ink">
                Crédit d’impôt 50 %
              </span>

              <button
                type="button"
                disabled
                className="btn btn-primary mt-5 w-full justify-center text-sm opacity-60"
              >
                Réserver une session
              </button>
              <p className="mt-2 text-center text-xs text-ink-soft">
                Aperçu — le bouton n’est pas actif ici.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </ChefPage>
  )
}

/* ── Les zones d'intervention ──────────────────────────────────────────────── */

interface ZoneLue {
  regionCode?: string
  regionLabel?: string
  scope?: 'region' | 'cities'
  cities?: { name?: string }[]
}

/**
 * Là où le batch cooker accepte de se déplacer.
 *
 * Avant la décision elles sont celles de la candidature ; une fois approuvé, le
 * batch cooker les règle seul (`PATCH /me/chef-profile/zones`). Dans les deux cas
 * l'édition se fait depuis le dossier, avec le même sélecteur.
 */
function Zones({ zones, modifiable }: { zones: ZoneLue[]; modifiable: boolean }) {
  return (
    <div className="mt-5 border-t border-[rgba(31,42,55,0.07)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-navy">Mes zones d’intervention</p>
        <Link
          href="/espace-chef/dossier?section=zones"
          className="hit text-xs font-semibold text-amber-ink underline-offset-2 hover:underline"
        >
          Modifier mes zones
        </Link>
      </div>

      {zones.length === 0 ? (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          N/A — aucune zone enregistrée. Sans zone, aucun client ne peut vous
          trouver{modifiable ? ' : renseignez-les depuis votre dossier.' : '.'}
        </p>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {[...zones]
            .sort((a, b) =>
              (a.regionLabel ?? a.regionCode ?? '').localeCompare(
                b.regionLabel ?? b.regionCode ?? '',
                'fr',
              ),
            )
            .map((z, i) => (
            <li key={z.regionCode ?? i} className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-navy">
                  {z.regionLabel ?? z.regionCode}
                </span>
                <span className="block text-[13px] leading-relaxed text-ink-mid">
                  {z.scope === 'cities' && z.cities?.length
                    ? z.cities
                        .map((c) => c.name)
                        .filter(Boolean)
                        .sort((a, b) => (a ?? '').localeCompare(b ?? '', 'fr'))
                        .join(', ')
                    : 'Toute la région'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
        {modifiable ? (
          <>Modifiables à tout moment : les clients de ces zones vous voient dès l’enregistrement.</>
        ) : (
          <>
            Elles se règlent une fois votre candidature approuvée.
          </>
        )}
      </p>
    </div>
  )
}

/* ── Les langues parlées ───────────────────────────────────────────────────── */

/**
 * Un critère de choix réel : on fait entrer quelqu'un dans sa cuisine pour
 * quatre heures. Le référentiel est fermé côté API — toutes les langues ISO
 * 639-1, une liste à recherche — et l'écran se contente de les cocher : un
 * champ libre aurait donné « Anglais », « anglais » et « EN » dans la même
 * liste.
 */
function Langues({
  choisies,
  onChange,
}: {
  choisies: string[]
  onChange: (l: string[]) => void
}) {
  const langues = useLanguages()

  if (langues.length === 0) return null

  return (
    <div className="mt-5 border-t border-[rgba(31,42,55,0.06)] pt-5">
      <label htmlFor="langues" className="mb-1.5 block text-sm font-semibold text-navy">
        Langues parlées
      </label>
      <p className="mb-3 text-[13px] leading-relaxed text-ink-soft">
        Elles s’affichent sur votre vitrine. Un client qui cherche quelqu’un
        avec qui parler dans sa cuisine les regarde avant tout le reste.
      </p>
      <MultiSelect
        id="langues"
        options={langues}
        values={choisies}
        onChange={onChange}
        placeholder="Choisir vos langues…"
        className="max-w-md"
      />
    </div>
  )
}
