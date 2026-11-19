'use client'

import { useState } from 'react'
import { Check, Loader2, Lock, Save, Trash2 } from 'lucide-react'
import { ApiError, fieldErrors } from '@/lib/api/client'
import { apiMessage } from '@/lib/api/messages'
import { useMeProfile } from '@/lib/api/me-profile'
import type { ClientProfile, MeProfile } from '@/lib/api/types'
import {
  useBirthCommunes,
  useDeleteUrssafDossier,
  useMyUrssafDossier,
  useSaveUrssafDossier,
  type MyUrssafDossier,
  type UrssafDossierInput,
} from '@/lib/api/urssaf-dossier'
import { FRANCE_INSEE, PAYS_NAISSANCE } from '@/lib/client/insee-countries'
import { InfoPopover } from '@/components/shared/InfoPopover'
import CityField from '@/components/chef/application/CityField'
import { Skeleton, SkeletonGroup } from '@/components/shared/Skeleton'

/* ─────────────────────────────────────────────────────────────────────────────
   Le dossier URSSAF : ce que l'avance immédiate demande, une fois.

   Les champs suivent ce que l'URSSAF attend d'un particulier. L'API vérifie
   tout (noms, mobile, lieu de naissance, IBAN) et répond champ par champ :
   chaque refus s'affiche sous son champ. L'IBAN enregistré ne revient pas ; on
   le redonne pour enregistrer une modification.
   ───────────────────────────────────────────────────────────────────────────── */

/** Ce que l'API répond, dit au client. */
const CODES: Record<string, string> = {
  REQUIRED: 'À renseigner.',
  INVALID_NAME: 'Lettres, espaces, tirets et apostrophes seulement.',
  INVALID_DATE: 'Une date passée, au format JJ/MM/AAAA.',
  INVALID_COUNTRY: 'Choisissez un pays dans la liste.',
  INVALID_DEPARTMENT: 'Choisissez votre commune de naissance dans la liste.',
  INVALID_COMMUNE: 'Choisissez votre commune de naissance dans la liste.',
  COMMUNE_NOT_IN_DEPARTMENT: 'Choisissez votre commune de naissance dans la liste.',
  NOT_FOR_BIRTH_ABROAD: 'À laisser vide pour une naissance à l’étranger.',
  INVALID_MOBILE: 'Un mobile français : 06, 07 ou +33.',
  INVALID_EMAIL: 'Une adresse email valide.',
  INVALID_POSTAL_CODE: 'Cinq chiffres.',
  INVALID_IBAN: 'Cet IBAN n’est pas valide : vérifiez-le sur votre RIB.',
  INVALID_BIC: 'Un BIC de 8 ou 11 caractères, sur votre RIB.',
}

type Form = Omit<UrssafDossierInput, 'address'> & UrssafDossierInput['address']

const VIDE: Form = {
  civility: 'F',
  birthName: '',
  usageName: '',
  firstNames: '',
  birthDate: '',
  birthCountryCode: FRANCE_INSEE,
  birthDepartmentCode: null,
  birthCommuneCode: null,
  birthCommuneName: null,
  mobilePhone: '',
  email: '',
  line1: '',
  line2: '',
  postalCode: '',
  city: '',
  countryCode: FRANCE_INSEE,
  iban: '',
  bic: '',
  accountHolder: '',
}

/** Pré-rempli : le dossier enregistré, sinon ce que le compte sait déjà. */
function valeursInitiales(
  mine: MyUrssafDossier,
  me: MeProfile | undefined,
): Form {
  const d = mine.dossier
  if (d) {
    const { address, ...rest } = d
    return { ...VIDE, ...rest, ...address, usageName: rest.usageName ?? '', line2: address.line2 ?? '', iban: '' }
  }
  if (!me) return VIDE
  const p = me.profileType === 'client' ? (me.profile as ClientProfile) : null
  const [prenom, ...nom] = (me.user.fullName ?? '').trim().split(/\s+/)
  return {
    ...VIDE,
    firstNames: prenom ?? '',
    birthName: nom.join(' '),
    mobilePhone: me.user.phone ?? '',
    email: me.user.email,
    line1: p?.addressStreet ?? '',
    postalCode: p?.addressPostalCode ?? '',
    city: p?.addressCity ?? '',
    accountHolder: (me.user.fullName ?? '').trim(),
  }
}

export default function DossierUrssaf() {
  const mine = useMyUrssafDossier()
  const me = useMeProfile()

  if (mine.isPending || me.isPending) {
    return (
      <SkeletonGroup className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </SkeletonGroup>
    )
  }
  if (mine.isError) {
    return (
      <p className="rounded-2xl bg-cream-soft px-4 py-6 text-center text-sm text-ink-mid">
        {apiMessage(mine.error)}
        <button onClick={() => mine.refetch()} className="ml-2 font-semibold text-navy underline">
          Réessayer
        </button>
      </p>
    )
  }
  // Une nouvelle version du dossier (ou sa suppression) repart de ce que l'API garde.
  return (
    <Formulaire
      key={mine.data.updatedAt ?? 'nouveau'}
      mine={mine.data}
      initial={valeursInitiales(mine.data, me.data)}
    />
  )
}

function Formulaire({ mine, initial }: { mine: MyUrssafDossier; initial: Form }) {
  const save = useSaveUrssafDossier()
  const remove = useDeleteUrssafDossier()
  const [form, setForm] = useState<Form>(initial)
  const [enregistre, setEnregistre] = useState(false)
  const [aSupprimer, setASupprimer] = useState(false)

  const erreurs = fieldErrors(save.error)
  const erreur = (field: string) => {
    const e = erreurs.find((x) => x.field === field)
    return e ? (CODES[e.code] ?? 'Valeur refusée.') : undefined
  }
  const set =
    (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const neEnFrance = form.birthCountryCode === FRANCE_INSEE
  const ibanEnregistre = mine.ibanLast4

  function enregistrer() {
    setEnregistre(false)
    const { line1, line2, postalCode, city, countryCode, ...rest } = form
    save.mutate(
      {
        ...rest,
        usageName: rest.usageName?.trim() || null,
        birthDepartmentCode: neEnFrance ? rest.birthDepartmentCode : null,
        birthCommuneCode: neEnFrance ? rest.birthCommuneCode : null,
        birthCommuneName: neEnFrance ? rest.birthCommuneName : null,
        address: { line1, line2: line2?.trim() || null, postalCode, city, countryCode },
      },
      {
        onSuccess: () => {
          setEnregistre(true)
          setForm((f) => ({ ...f, iban: '' }))
        },
      },
    )
  }

  // La ville hors du code postal (`ADDRESS_CITY_MISMATCH`) se dit sous la ville.
  const villeRefusee =
    save.error instanceof ApiError &&
    (save.error.body as { code?: string } | null)?.code === 'ADDRESS_CITY_MISMATCH'
  const erreurVille =
    erreur('address.city') ?? (villeRefusee ? apiMessage(save.error) : undefined)

  const erreurGenerale =
    save.error && erreurs.length === 0 && !villeRefusee
      ? save.error instanceof ApiError && save.error.status === 503
        ? 'Votre dossier ne peut pas être enregistré pour le moment. Réessayez dans quelques minutes.'
        : apiMessage(save.error)
      : null

  return (
    <section className="card-shell space-y-6 rounded-2xl p-5 lg:p-6">
      <div>
        <h2 className="flex items-center gap-1 font-display text-lg font-bold text-navy">
          Mon dossier pour l’avance immédiate
          <InfoPopover label="À quoi sert ce dossier ?">
            Avec l’avance immédiate, le crédit d’impôt de 50 % est déduit tout de suite :
            l’URSSAF ne prélève que le reste, sur le compte indiqué ici, et règle votre
            batch cooker directement. Pour vous inscrire auprès d’elle, Lab’s Food saisit
            cette demande pour vous.
          </InfoPopover>
        </h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-mid">
          À remplir une fois, comme sur votre pièce d’identité et votre RIB. Ces informations
          sont chiffrées et ne servent qu’à votre inscription auprès de l’URSSAF.
        </p>
        {mine.filled && mine.updatedAt && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cream-soft px-3 py-1 text-xs font-semibold text-mint-ink">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Dossier enregistré le {new Date(mine.updatedAt).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      <Groupe titre="État civil">
        <Champ label="Civilité" required>
          <select value={form.civility} onChange={set('civility')} className="input-base">
            <option value="F">Madame</option>
            <option value="M">Monsieur</option>
          </select>
        </Champ>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ
            label="Nom de naissance"
            required
            erreur={erreur('birthName')}
            info={<>Le nom figurant sur votre acte de naissance. Lettres, espaces, tirets et apostrophes seulement, sans commencer ni finir par un tiret ou une apostrophe.</>}
          >
            <input value={form.birthName} onChange={set('birthName')} autoComplete="family-name" placeholder="Durand" className="input-base" />
          </Champ>
          <Champ
            label="Nom d’usage (facultatif)"
            erreur={erreur('usageName')}
            info={<>Si vous êtes mariez, indiquez le nom que vous utilisez au quotidien, par exemple votre nom d’époux. À laisser vide s’il est identique à votre nom de naissance.</>}
          >
            <input value={form.usageName ?? ''} onChange={set('usageName')} placeholder="Martin" className="input-base" />
          </Champ>
        </div>
        <Champ
          label="Prénoms, dans l’ordre de l’état civil"
          required
          erreur={erreur('firstNames')}
          info={<>Vos prénoms séparés par un espace. Pour un prénom composé, indiquez-le tel que vous l’utilisez (Jean-Pierre) ; sinon, le premier prénom suffit.</>}
        >
          <input value={form.firstNames} onChange={set('firstNames')} autoComplete="given-name" placeholder="Jeanne Marie" className="input-base" />
        </Champ>
        <Champ label="Date de naissance" required erreur={erreur('birthDate')}>
          <input type="date" value={form.birthDate} onChange={set('birthDate')} autoComplete="bday" className="input-base tabular-nums" />
        </Champ>
      </Groupe>

      <Groupe titre="Lieu de naissance">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pays de naissance">
          {[
            { id: true, label: 'En France' },
            { id: false, label: 'À l’étranger' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={neEnFrance === o.id}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  birthCountryCode: o.id ? FRANCE_INSEE : '',
                  birthDepartmentCode: null,
                  birthCommuneCode: null,
                  birthCommuneName: null,
                }))
              }
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                neEnFrance === o.id ? 'bg-navy text-white' : 'border border-[rgba(31,42,55,0.1)] bg-paper text-ink-mid'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {neEnFrance ? (
          <CommuneNaissance
            nom={form.birthCommuneName}
            code={form.birthCommuneCode}
            erreur={erreur('birthCommuneCode') ?? erreur('birthDepartmentCode') ?? erreur('birthCommuneName')}
            onChoix={(c) =>
              setForm((f) => ({
                ...f,
                birthCommuneName: c?.nom ?? null,
                birthCommuneCode: c?.code ?? null,
                birthDepartmentCode: c?.departement ?? null,
              }))
            }
          />
        ) : (
          <Champ
            label="Pays de naissance"
            required
            erreur={erreur('birthCountryCode')}
            info={<>Le pays où vous êtes né(e), tel qu’il figure sur votre acte de naissance. Pas besoin de commune ni de département pour une naissance à l’étranger.</>}
          >
            <select value={form.birthCountryCode} onChange={set('birthCountryCode')} className="input-base">
              <option value="">Choisissez le pays</option>
              {PAYS_NAISSANCE.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.nom}
                </option>
              ))}
            </select>
          </Champ>
        )}
      </Groupe>

      <Groupe titre="Coordonnées">
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ
            label="Mobile"
            required
            erreur={erreur('mobilePhone')}
            info={<>Un numéro de portable français : 10 chiffres commençant par 06 ou 07, ou +33. L’URSSAF s’en sert pour vous joindre.</>}
          >
            <input type="tel" value={form.mobilePhone} onChange={set('mobilePhone')} autoComplete="tel" placeholder="06 12 34 56 78" className="input-base tabular-nums" />
          </Champ>
          <Champ
            label="Email"
            required
            erreur={erreur('email')}
            info={<>Une adresse email valide : l’URSSAF y envoie l’invitation à activer votre compte et à valider chaque paiement.</>}
          >
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="jeanne.durand@exemple.fr" className="input-base" />
          </Champ>
        </div>
        <Champ label="Adresse" required erreur={erreur('address.line1')}>
          <input value={form.line1} onChange={set('line1')} autoComplete="address-line1" placeholder="12 rue des Lilas" className="input-base" />
        </Champ>
        <Champ
          label="Complément (facultatif)"
          erreur={erreur('address.line2')}
          info={<>Bâtiment, étage, escalier, lieu-dit… tout ce qui aide à trouver votre logement.</>}
        >
          <input value={form.line2 ?? ''} onChange={set('line2')} autoComplete="address-line2" placeholder="Bâtiment A, 3e étage" className="input-base" />
        </Champ>
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <Champ label="Code postal" required erreur={erreur('address.postalCode')}>
            <input
              value={form.postalCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) }))
              }
              autoComplete="postal-code"
              inputMode="numeric"
              placeholder="69001"
              className="input-base tabular-nums"
            />
          </Champ>
          {/* La ville vient du code postal : une commune qu'il dessert, jamais
              une saisie libre (77127 ne propose que Lieusaint). */}
          <Champ label="Ville" required erreur={erreurVille}>
            <CityField
              bare
              id="dossier-city"
              postcode={form.postalCode}
              value={form.city}
              onChange={(city) => setForm((f) => ({ ...f, city }))}
            />
          </Champ>
        </div>
      </Groupe>

      <Groupe titre="Compte prélevé par l’URSSAF">
        <Champ
          label="IBAN"
          required
          erreur={erreur('iban')}
          info={<>Le numéro de votre compte, sur votre RIB : « FR » suivi de 25 chiffres ou lettres, avec ou sans espaces. C’est ce compte que l’URSSAF prélève.</>}
          aide={
            ibanEnregistre
              ? `IBAN enregistré se terminant par ${ibanEnregistre}. Saisissez-le à nouveau pour enregistrer une modification.`
              : 'Sur votre RIB. L’URSSAF y prélèvera ce qui reste à votre charge, après le crédit d’impôt.'
          }
        >
          <input
            value={form.iban}
            onChange={set('iban')}
            autoComplete="off"
            spellCheck={false}
            placeholder="FR76 …"
            className="input-base font-mono tabular-nums"
          />
        </Champ>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ
            label="BIC"
            required
            erreur={erreur('bic')}
            info={<>Le code de votre banque, sur votre RIB : 8 caractères, ou 11 s’il se termine par trois lettres (souvent XXX).</>}
          >
            <input value={form.bic} onChange={set('bic')} autoComplete="off" spellCheck={false} placeholder="BNAPFRPPXXX" className="input-base font-mono" />
          </Champ>
          <Champ
            label="Titulaire du compte"
            required
            erreur={erreur('accountHolder')}
            info={<>La personne au nom de qui le compte est ouvert, comme indiqué sur le RIB : civilité, nom et prénom.</>}
          >
            <input value={form.accountHolder} onChange={set('accountHolder')} autoComplete="name" placeholder="Jeanne Martin" className="input-base" />
          </Champ>
        </div>
      </Groupe>

      {erreurGenerale && <p className="text-sm text-red-700">{erreurGenerale}</p>}
      {erreurs.length > 0 && (
        <p className="text-sm text-red-700">
          {erreurs.length === 1 ? 'Une réponse est à corriger' : `${erreurs.length} réponses sont à corriger`}, indiquée
          {erreurs.length > 1 ? 's' : ''} sous les champs.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={enregistrer}
          disabled={save.isPending || !form.iban.trim()}
          className="btn btn-amber text-sm disabled:opacity-60"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : enregistre ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {enregistre ? 'Dossier enregistré' : 'Enregistrer mon dossier'}
        </button>
        <p className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Chiffré avant d’être conservé.
        </p>
      </div>

      {mine.filled && (
        <div className="border-t border-[rgba(31,42,55,0.08)] pt-4 text-sm">
          {aSupprimer ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-ink-mid">
                Supprimer votre dossier ? L’avance immédiate ne pourra plus être utilisée sans un nouveau dossier.
              </p>
              <button
                onClick={() =>
                  remove.mutate(undefined, {
                    onSuccess: () => setASupprimer(false),
                  })
                }
                disabled={remove.isPending}
                className="font-semibold text-red-700 underline disabled:opacity-60"
              >
                {remove.isPending ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button onClick={() => setASupprimer(false)} className="font-semibold text-navy">
                Annuler
              </button>
            </div>
          ) : (
            <button onClick={() => setASupprimer(true)} className="inline-flex items-center gap-1.5 font-semibold text-ink-mid hover:text-red-700">
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer mon dossier
            </button>
          )}
          {remove.error && <p className="mt-2 text-red-700">{apiMessage(remove.error)}</p>}
        </div>
      )}
    </section>
  )
}

const INFO_COMMUNE = (
  <>Le lieu de naissance de votre acte de naissance. Choisissez-la dans la liste : son code officiel (INSEE) est transmis à l’URSSAF avec son département.</>
)

/** Commune de naissance : une commune de la base officielle, avec son code INSEE. */
function CommuneNaissance({
  nom,
  code,
  erreur,
  onChoix,
}: {
  nom: string | null | undefined
  code: string | null | undefined
  erreur?: string
  onChoix: (c: { nom: string; code: string; departement: string } | null) => void
}) {
  const [recherche, setRecherche] = useState('')
  const communes = useBirthCommunes(recherche)

  if (nom && code) {
    return (
      <Champ label="Commune de naissance" required erreur={erreur} info={INFO_COMMUNE}>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(31,42,55,0.1)] bg-paper px-4 py-3">
          <p className="text-sm text-navy">
            {nom} <span className="font-mono text-xs text-ink-soft">{code}</span>
          </p>
          <button type="button" onClick={() => onChoix(null)} className="text-sm font-semibold text-navy underline">
            Changer
          </button>
        </div>
      </Champ>
    )
  }

  return (
    <Champ
      label="Commune de naissance"
      required
      info={INFO_COMMUNE}
      erreur={erreur}
      aide="Tapez son nom ou son code postal, puis choisissez-la dans la liste."
    >
      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Ex. Lyon ou 69001"
        autoComplete="off"
        className="input-base"
      />
      {communes.data && communes.data.length > 0 && (
        <ul className="mt-2 divide-y divide-[rgba(31,42,55,0.06)] rounded-xl border border-[rgba(31,42,55,0.1)] bg-paper">
          {communes.data.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => onChoix(c)}
                className="flex min-h-10 w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-cream-soft"
              >
                <span className="text-navy">
                  {c.nom}
                  {c.codePostal && (
                    <span className="ml-2 text-xs text-ink-soft tabular-nums">{c.codePostal}</span>
                  )}
                </span>
                {/* Deux Lieusaint : le département, en toutes lettres, les départage. */}
                <span className="text-xs text-ink-soft">
                  <span className="tabular-nums">{c.departement.replace(/^0/, '')}</span>
                  {c.departementNom && ` · ${c.departementNom}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {communes.data?.length === 0 && (
        <p className="mt-1.5 text-xs text-ink-soft">
          {/^\d+$/.test(recherche.trim())
            ? 'Aucune commune pour ce code postal.'
            : 'Aucune commune de ce nom.'}
        </p>
      )}
      {communes.isError && (
        <p className="mt-1.5 text-xs text-ink-soft">La liste des communes ne répond pas. Réessayez dans un instant.</p>
      )}
    </Champ>
  )
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 font-display text-base font-bold text-navy">{titre}</legend>
      {children}
    </fieldset>
  )
}

function Champ({
  label,
  erreur,
  aide,
  required,
  info,
  children,
}: {
  label: string
  erreur?: string
  aide?: string
  /** Champ obligatoire : astérisque après le libellé. */
  required?: boolean
  /** Explication du champ, d'après le contrat d'API de l'URSSAF (popover au clic). */
  info?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-ink-soft">
        {label}
        {required && (
          <>
            <span aria-hidden className="text-red-700">*</span>
            <span className="sr-only">(obligatoire)</span>
          </>
        )}
        {info && <InfoPopover label={`À propos de : ${label}`}>{info}</InfoPopover>}
      </span>
      {children}
      {erreur ? (
        <span className="mt-1.5 block text-xs text-red-700">{erreur}</span>
      ) : aide ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-ink-soft">{aide}</span>
      ) : null}
    </label>
  )
}
