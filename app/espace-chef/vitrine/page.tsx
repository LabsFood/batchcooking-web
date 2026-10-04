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
import { TextField } from '@/components/chef/application/fields'
import { PHONE_FR, e164 } from '@/lib/chef/application'
import { PAYMENT_METHOD_LABEL } from '@/lib/chef/states'
import { useMeProfile } from '@/lib/api/me-profile'
import { chefProfileMessage, useUpdateChefProfile } from '@/lib/api/chef-profile'
import { useChefApplication } from '@/lib/api/chef-documents'
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
    if (tel.trim() && !PHONE_FR.test(tel.trim())) {
      setErreur('Numéro français attendu, par exemple 06 12 34 56 78.')
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
        firstName: prenom.trim() || undefined,
        lastName: nom.trim() || undefined,
        phone: tel.trim() ? e164(tel.trim()) : undefined,
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="h-64 animate-pulse rounded-3xl bg-paper" />
            <div className="h-48 animate-pulse rounded-3xl bg-paper" />
          </div>
          <div className="h-80 animate-pulse rounded-3xl bg-paper" />
        </div>
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
                    className="font-semibold text-terra underline"
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
                  <span className="w-16 shrink-0 text-right font-mono text-sm tabular-nums text-navy">
                    {rayon} km
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                  Au-delà, les clients ne vous voient pas. Vos zones précises se règlent
                  dans{' '}
                  <Link href="/espace-chef/dossier" className="font-semibold text-terra underline">
                    Mon dossier
                  </Link>
                  .
                </p>
              </div>
            </div>
          </Card>

          <Card
            title="Mon compte"
            action={
              <span className="text-[11px] uppercase tracking-wide text-ink-soft">
                Non public
              </span>
            }
          >
            <p className="mb-4 text-[13px] leading-relaxed text-ink-mid">
              Ce nom et ce numéro servent à notre équipe et aux clients qui ont réservé
              chez vous. Ils ne figurent pas sur votre page publique.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
              />
              <TextField label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <TextField
              label="Téléphone"
              className="mt-4"
              value={tel}
              inputMode="tel"
              onChange={(e) => setTel(e.target.value)}
            />
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

          {/* Ce que l'API ne sait pas encore stocker. Nommé, pas simulé. */}
          <Card title="Prévu, pas encore enregistrable">
            <p className="text-[13px] leading-relaxed text-ink-mid">
              Trois choses manquent au contrat de l’API et ne peuvent donc pas être
              saisies ici&nbsp;: les <strong>langues parlées</strong>, les{' '}
              <strong>badges</strong> tirés de vos pièces facultatives, et les{' '}
              <strong>moyens de paiement que vous acceptez</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.values(PAYMENT_METHOD_LABEL).map((l) => (
                <span
                  key={l}
                  className="rounded-full bg-cream-soft px-2.5 py-1 text-[11px] font-medium text-ink-soft"
                >
                  {l}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
              Le dernier point compte&nbsp;: c’est lui qui décide des moyens proposés au
              client au moment de régler. En attendant le champ, cet écran de paiement
              s’appuie sur une liste tenue côté application.
            </p>
          </Card>
        </div>

        {/* Aperçu client, nourri par ce qui est en train d'être saisi. */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-3xl border border-[rgba(31,42,55,0.08)] bg-paper">
            <div className="flex items-center gap-2 border-b border-[rgba(31,42,55,0.08)] bg-cream-soft px-4 py-2.5">
              <Eye className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
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

              <span className="inline-flex rounded-full bg-mint px-2 py-1 text-[10px] font-medium text-mint-ink">
                Crédit d’impôt 50 %
              </span>

              <button
                type="button"
                disabled
                className="btn btn-primary mt-5 w-full justify-center text-sm opacity-60"
              >
                Réserver une session
              </button>
              <p className="mt-2 text-center text-[11px] text-ink-soft">
                Aperçu — le bouton n’est pas actif ici.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </ChefPage>
  )
}
