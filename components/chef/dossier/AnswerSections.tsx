'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  X,
} from 'lucide-react'
import { useToast } from '@/components/shared/Toaster'
import { Note, RadioCard, TextField } from '@/components/chef/application/fields'
import CityField from '@/components/chef/application/CityField'
import ZonePicker from '@/components/chef/application/ZonePicker'
import { NO_SAP_MESSAGE, isValidSiret, type Zone } from '@/lib/chef/application'
import PhoneField from '@/components/shared/PhoneField'
import { formatE164, isValidE164 } from '@/lib/phone'
import { regionLabel } from '@/lib/chef/regions'
import { useMeProfile } from '@/lib/api/me-profile'
import { useUpdateChefZones } from '@/lib/api/chef-profile'
import type { ChefProfile } from '@/lib/api/types'
import {
  applicationAnswers,
  applicationPatchMessage,
  useUpdateApplication,
  type ApplicationPatch,
  type ChefApplication,
} from '@/lib/api/chef-documents'

/* ─────────────────────────────────────────────────────────────────────────────
   Les réponses de la candidature, modifiables.

   `PATCH /me/chef-application` ouvre tant que la candidature est `submitted`
   ou `changes-requested`. Chaque section part **entière** : elle remplace celle
   qui est stockée et repasse les règles d'une soumission. On modifie donc
   section par section, et on n'envoie que celle qu'on vient de toucher.

   Deux refus sont normaux et doivent se lire tels quels : la candidature déjà
   tranchée (`APPLICATION_DECIDED`), et la réponse verrouillée parce qu'une
   pièce validée s'appuie dessus (`ANSWER_LOCKED`).
   ───────────────────────────────────────────────────────────────────────────── */

export const WORK_STATUS_LABEL: Record<string, string> = {
  'eu-citizen': 'Ressortissant français ou de l’Union européenne',
  'residence-permit': 'Titre de séjour autorisant à travailler',
  'renewal-pending': 'Titre de séjour en cours de renouvellement',
  other: 'Autre situation',
}

export const LEGAL_FORM_LABEL: Record<string, string> = {
  micro: 'Micro ou auto-entrepreneur',
  'other-company': 'Autre forme d’entreprise',
  'not-registered': 'Je n’ai pas encore d’entreprise',
}

/** Lab’s Food n'est pas une coopérative : la déclaration est la sienne, ou celle de sa coopérative. */
const SAP_LABEL: Record<string, string> = {
  'type-a': 'Déclaration SAP à mon nom',
  'type-b': 'Par ma coopérative SAP',
}

type ZoneLue = NonNullable<ChefApplication['interventionZones']>[number]

/** Régions par libellé, villes par nom : l'ordre alphabétique, toujours. */
const parOrdreAlpha = (zones: ZoneLue[]): ZoneLue[] =>
  zones
    .map((z) => ({
      ...z,
      cities: [...(z.cities ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'fr')),
    }))
    .sort((a, b) =>
      (a.regionLabel ?? a.regionCode ?? '').localeCompare(b.regionLabel ?? b.regionCode ?? '', 'fr'),
    )

/* ── La coquille d'une section ─────────────────────────────────────────────── */

function Section({
  title,
  note,
  ouverte,
  verrou,
  onOuvrir,
  onFermer,
  onEnregistrer,
  enCours,
  erreur,
  children,
  lecture,
}: {
  title: string
  note?: string
  ouverte: boolean
  /** Pourquoi la section ne s'ouvre pas, quand c'est le cas. */
  verrou?: string
  onOuvrir: () => void
  onFermer: () => void
  onEnregistrer: () => void
  enCours: boolean
  erreur: string | null
  children: React.ReactNode
  lecture: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-paper p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-navy">{title}</h3>
          {note && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{note}</p>}
        </div>
        {!ouverte &&
          (verrou ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Non modifiable
            </span>
          ) : (
            <button type="button" onClick={onOuvrir} className="btn btn-outline text-xs">
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
            </button>
          ))}
      </div>

      {verrou && !ouverte && (
        <p className="mt-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-mid">
          {verrou}
        </p>
      )}

      <div className="mt-4">
        {ouverte ? (
          <>
            <div className="space-y-4">{children}</div>

            {erreur && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-red-800"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {erreur}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onEnregistrer}
                disabled={enCours}
                className="btn btn-primary text-xs"
              >
                {enCours ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Enregistrement…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden /> Enregistrer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onFermer}
                disabled={enCours}
                className="btn btn-ghost text-xs"
              >
                <X className="h-3.5 w-3.5" aria-hidden /> Annuler
              </button>
            </div>
          </>
        ) : (
          lecture
        )}
      </div>
    </section>
  )
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={`text-right text-navy ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value || <span className="text-ink-soft">Non renseigné</span>}
      </span>
    </div>
  )
}

/* ── Le panneau ────────────────────────────────────────────────────────────── */

type Quelle = 'identity' | 'address' | 'work' | 'company' | 'zones' | null

export default function AnswerSections({
  app,
  section,
}: {
  app?: ChefApplication | null
  /** Section à ouvrir d'emblée : on arrive parfois ici pour une seule chose. */
  section?: Exclude<Quelle, null>
}) {
  const toast = useToast()
  const update = useUpdateApplication()
  const majZones = useUpdateChefZones()
  const profil = useMeProfile()
  const [erreur, setErreur] = useState<string | null>(null)

  const a = applicationAnswers(app)

  // L'API n'ouvre le PATCH que pendant l'instruction.
  const modifiable = app?.status === 'submitted' || app?.status === 'changes-requested'
  // Une fois approuvé, les zones se règlent sur le profil (`PATCH /me/chef-profile/zones`).
  const approuvee = app?.status === 'approved'
  const chef =
    profil.data?.profileType === 'chef' ? (profil.data.profile as ChefProfile | null) : null
  const zonesLues = parOrdreAlpha(
    (approuvee && chef?.interventionZones?.length ? chef.interventionZones : a.interventionZones) ?? [],
  )

  const [ouverte, setOuverte] = useState<Quelle>(modifiable ? (section ?? null) : null)

  /**
   * Pourquoi une section ne s'ouvre pas, section par section.
   *
   * Un seul message pour les cinq disait « vos informations se modifient
   * désormais depuis vos paramètres ». C'est vrai du nom et du téléphone, et
   * faux de tout le reste : `PATCH /me/chef-profile` tient sept champs et
   * écrit noir sur blanc que les zones, la route SAP et la visibilité sont
   * fixées à l'approbation. Envoyer quelqu'un les chercher dans un écran où
   * elles ne sont pas, c'est lui faire perdre son temps puis sa confiance.
   */
  function verrouDe(quelle: Exclude<Quelle, null>): string | undefined {
    if (modifiable) return undefined
    if (!app) return 'Votre candidature n’est pas encore enregistrée.'
    if (app.status === 'rejected') {
      return 'Votre candidature a été tranchée : ces réponses ne se modifient plus. Vous pourrez candidater à nouveau.'
    }
    if (app.status !== 'approved') {
      return 'Cette réponse ne se modifie pas dans l’état actuel de votre candidature.'
    }
    if (quelle === 'identity') {
      return 'Votre candidature est approuvée : votre nom et votre téléphone se modifient désormais depuis votre vitrine.'
    }
    if (quelle === 'zones') return undefined
    return 'Votre candidature est approuvée : cette réponse ne se modifie plus ici. Écrivez-nous pour la corriger.'
  }

  // ── Identité ──────────────────────────────────────────────────────────────
  const [prenom, setPrenom] = useState(a.identity?.firstName ?? '')
  const [nom, setNom] = useState(a.identity?.lastName ?? '')
  const [tel, setTel] = useState(a.identity?.phone ?? '')

  // ── Adresse ───────────────────────────────────────────────────────────────
  const [rue, setRue] = useState(a.address?.street ?? '')
  const [comp, setComp] = useState(a.address?.line2 ?? '')
  const [cp, setCp] = useState(a.address?.postcode ?? '')
  const [ville, setVille] = useState(a.address?.city ?? '')

  // ── Autorisation de travail ───────────────────────────────────────────────
  const [statut, setStatut] = useState(a.workAuthorization?.status ?? 'eu-citizen')
  const [precision, setPrecision] = useState(a.workAuthorization?.details ?? '')

  // ── Activité ──────────────────────────────────────────────────────────────
  const [forme, setForme] = useState(a.company?.legalForm ?? 'micro')
  const [siret, setSiret] = useState(a.company?.siret ?? '')
  const [sap, setSap] = useState(a.company?.sap?.path ?? 'type-b')
  const [numSap, setNumSap] = useState(a.company?.sap?.declarationNumber ?? '')
  // Type B enregistré = adhérent d'une coopérative SAP. « Non » bloque l'enregistrement.
  const [coop, setCoop] = useState('yes')

  // ── Zones ─────────────────────────────────────────────────────────────────
  const [zones, setZones] = useState<Zone[]>(() =>
    zonesLues.map((z) => ({
      regionCode: z.regionCode ?? '',
      wholeRegion: z.scope !== 'cities',
      cities: (z.cities ?? []).map((c) => ({
        name: c.name ?? '',
        dept: c.dept ?? '',
        insee: c.insee ?? '',
      })),
    })),
  )

  /** Rouvre une section sur les valeurs stockées, pas sur une saisie oubliée. */
  function ouvrir(quelle: Exclude<Quelle, null>) {
    setErreur(null)
    const r = applicationAnswers(app)
    if (quelle === 'identity') {
      setPrenom(r.identity?.firstName ?? '')
      setNom(r.identity?.lastName ?? '')
      setTel(r.identity?.phone ?? '')
    } else if (quelle === 'address') {
      setRue(r.address?.street ?? '')
      setComp(r.address?.line2 ?? '')
      setCp(r.address?.postcode ?? '')
      setVille(r.address?.city ?? '')
    } else if (quelle === 'work') {
      setStatut(r.workAuthorization?.status ?? 'eu-citizen')
      setPrecision(r.workAuthorization?.details ?? '')
    } else if (quelle === 'company') {
      setForme(r.company?.legalForm ?? 'micro')
      setSiret(r.company?.siret ?? '')
      setSap(r.company?.sap?.path ?? 'type-b')
      setNumSap(r.company?.sap?.declarationNumber ?? '')
      setCoop('yes')
    } else {
      setZones(
        zonesLues.map((z) => ({
          regionCode: z.regionCode ?? '',
          wholeRegion: z.scope !== 'cities',
          cities: (z.cities ?? []).map((c) => ({
            name: c.name ?? '',
            dept: c.dept ?? '',
            insee: c.insee ?? '',
          })),
        })),
      )
    }
    setOuverte(quelle)
  }

  function envoyer(patch: ApplicationPatch, quoi: string) {
    setErreur(null)
    update.mutate(patch, {
      onSuccess: () => {
        setOuverte(null)
        toast.success(
          `${quoi} enregistré${quoi.endsWith('e') ? 'e' : ''}`,
          'La liste des pièces demandées suit vos réponses : vérifiez-la.',
        )
      },
      onError: (e) => setErreur(applicationPatchMessage(e)),
    })
  }

  const immatricule = forme !== 'not-registered'

  return (
    <div className="space-y-4">
      {/* L'email ne se change pas : c'est la clé du compte. */}
      <Section
        title="Identité"
        note="Votre email est la clé de votre compte : il ne se change pas ici."
        ouverte={ouverte === 'identity'}
        verrou={verrouDe('identity')}
        onOuvrir={() => ouvrir('identity')}
        onFermer={() => setOuverte(null)}
        enCours={update.isPending}
        erreur={erreur}
        onEnregistrer={() => {
          if (prenom.trim().length < 2 || nom.trim().length < 2) {
            setErreur('Indiquez votre prénom et votre nom.')
            return
          }
          if (!isValidE164(tel.trim())) {
            setErreur('Ce numéro ne semble pas complet.')
            return
          }
          envoyer(
            {
              identity: {
                firstName: prenom.trim(),
                lastName: nom.trim(),
                phone: tel.trim(),
              },
            },
            'Votre identité',
          )
        }}
        lecture={
          <dl>
            <Row label="Prénom" value={a.identity?.firstName} />
            <Row label="Nom" value={a.identity?.lastName} />
            <Row label="Email" value={a.identity?.email} mono />
            <Row label="Téléphone" value={formatE164(a.identity?.phone)} mono />
          </dl>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          <TextField label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
        <PhoneField
          label="Téléphone"
          value={tel}
          onChange={setTel}
          hint="Celui sur lequel un client peut vous joindre. Un numéro étranger convient."
        />
      </Section>

      <Section
        title="Adresse"
        note="Votre point de départ : c’est de là que se calculent vos déplacements."
        ouverte={ouverte === 'address'}
        verrou={verrouDe('address')}
        onOuvrir={() => ouvrir('address')}
        onFermer={() => setOuverte(null)}
        enCours={update.isPending}
        erreur={erreur}
        onEnregistrer={() => {
          if (rue.trim().length < 4 || !ville.trim()) {
            setErreur('Indiquez votre rue et votre ville.')
            return
          }
          if (!/^\d{5}$/.test(cp.trim())) {
            setErreur('Le code postal doit faire cinq chiffres.')
            return
          }
          envoyer(
            {
              address: {
                street: rue.trim(),
                line2: comp.trim() || null,
                postcode: cp.trim(),
                city: ville.trim(),
                country: 'FR',
              },
            },
            'Votre adresse',
          )
        }}
        lecture={
          <dl>
            <Row label="Rue" value={a.address?.street} />
            <Row label="Complément" value={a.address?.line2} />
            <Row
              label="Ville"
              value={[a.address?.postcode, a.address?.city].filter(Boolean).join(' ')}
            />
          </dl>
        }
      >
        <TextField label="Rue" value={rue} onChange={(e) => setRue(e.target.value)} />
        <TextField
          label="Complément"
          optional
          value={comp ?? ''}
          hint="Bâtiment, étage, appartement."
          onChange={(e) => setComp(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
          <TextField
            label="Code postal"
            value={cp}
            inputMode="numeric"
            maxLength={5}
            onChange={(e) => setCp(e.target.value.replace(/\D/g, ''))}
          />
          <CityField postcode={cp} value={ville} onChange={setVille} />
        </div>
      </Section>

      <Section
        title="Autorisation de travail"
        note="C’est ce choix qui décide des pièces de séjour demandées."
        ouverte={ouverte === 'work'}
        verrou={verrouDe('work')}
        onOuvrir={() => ouvrir('work')}
        onFermer={() => setOuverte(null)}
        enCours={update.isPending}
        erreur={erreur}
        onEnregistrer={() => {
          if (statut === 'other' && precision.trim().length < 10) {
            setErreur('Décrivez votre situation en quelques mots (dix caractères au moins).')
            return
          }
          envoyer(
            {
              workAuthorization: {
                status: statut,
                details: statut === 'other' ? precision.trim() : null,
              },
            },
            'Votre situation',
          )
        }}
        lecture={
          <dl>
            <Row
              label="Situation"
              value={
                a.workAuthorization?.status
                  ? (WORK_STATUS_LABEL[a.workAuthorization.status] ??
                    a.workAuthorization.status)
                  : undefined
              }
            />
            {a.workAuthorization?.details && (
              <Row label="Précision" value={a.workAuthorization.details} />
            )}
          </dl>
        }
      >
        <div className="space-y-2.5">
          {Object.entries(WORK_STATUS_LABEL).map(([v, l]) => (
            <RadioCard
              key={v}
              name="dossier-work"
              value={v}
              checked={statut === v}
              onChange={setStatut}
              title={l}
            />
          ))}
        </div>
        {statut === 'other' && (
          <TextField
            label="Précisez votre situation"
            value={precision ?? ''}
            onChange={(e) => setPrecision(e.target.value)}
          />
        )}
      </Section>

      {/* La section qui débloque le dossier quand l'immatriculation arrive. */}
      <Section
        title="Mon activité"
        note="C’est ce choix qui décide du justificatif d’immatriculation. Dès que vous avez votre numéro, renseignez-le ici."
        ouverte={ouverte === 'company'}
        verrou={verrouDe('company')}
        onOuvrir={() => ouvrir('company')}
        onFermer={() => setOuverte(null)}
        enCours={update.isPending}
        erreur={erreur}
        onEnregistrer={() => {
          if (immatricule && !isValidSiret(siret)) {
            setErreur('Le SIRET doit faire quatorze chiffres, et sa clé doit être juste.')
            return
          }
          if (sap === 'type-a' && !/^SAP\d{9}$/.test(numSap.trim().toUpperCase())) {
            setErreur('Le numéro de déclaration s’écrit SAP suivi de neuf chiffres.')
            return
          }
          if (sap === 'type-b' && coop !== 'yes') {
            setErreur(NO_SAP_MESSAGE)
            return
          }
          envoyer(
            {
              company: {
                legalForm: forme,
                siret: immatricule ? siret.replace(/\s/g, '') : null,
                sap: {
                  path: sap,
                  declarationNumber:
                    sap === 'type-a' ? numSap.trim().toUpperCase() : null,
                },
              },
            },
            'Votre activité',
          )
        }}
        lecture={
          <dl>
            <Row
              label="Statut"
              value={
                a.company?.legalForm
                  ? (LEGAL_FORM_LABEL[a.company.legalForm] ?? a.company.legalForm)
                  : undefined
              }
            />
            <Row label="SIRET" value={a.company?.siret} mono />
            <Row
              label="Services à la personne"
              value={
                a.company?.sap?.path
                  ? (SAP_LABEL[a.company.sap.path] ?? a.company.sap.path)
                  : undefined
              }
            />
            {a.company?.sap?.declarationNumber && (
              <Row label="N° de déclaration" value={a.company.sap.declarationNumber} mono />
            )}
          </dl>
        }
      >
        <div className="space-y-2.5">
          {Object.entries(LEGAL_FORM_LABEL).map(([v, l]) => (
            <RadioCard
              key={v}
              name="dossier-legal"
              value={v}
              checked={forme === v}
              onChange={setForme}
              title={l}
              description={
                v === 'not-registered'
                  ? 'Votre dossier restera en attente de l’immatriculation, mais tout le reste peut avancer.'
                  : undefined
              }
            />
          ))}
        </div>

        {immatricule && (
          <TextField
            label="SIRET"
            value={siret ?? ''}
            inputMode="numeric"
            hint="Quatorze chiffres, tel qu’il figure sur votre avis de situation."
            onChange={(e) => setSiret(e.target.value.replace(/[^\d\s]/g, ''))}
          />
        )}

        <fieldset className="space-y-2.5">
          <legend className="mb-2.5 text-sm font-semibold text-navy">
            Avez-vous une déclaration de services à la personne (SAP) ?
          </legend>
          <RadioCard
            name="dossier-sap"
            value="type-a"
            checked={sap === 'type-a'}
            onChange={setSap}
            title="Oui"
            description="Déclaration NOVA à votre nom ou à celui de votre entreprise."
          />
          <RadioCard name="dossier-sap" value="type-b" checked={sap === 'type-b'} onChange={setSap} title="Non" />
          {sap === 'type-a' && (
            <TextField
              label="N° de déclaration"
              value={numSap ?? ''}
              hint="SAP suivi de neuf chiffres."
              onChange={(e) => setNumSap(e.target.value.toUpperCase())}
            />
          )}
        </fieldset>

        {sap === 'type-b' && (
          <fieldset className="space-y-2.5">
            <legend className="mb-2.5 text-sm font-semibold text-navy">
              Avez-vous adhéré à une coopérative SAP ?
            </legend>
            <RadioCard
              name="dossier-coop"
              value="yes"
              checked={coop === 'yes'}
              onChange={setCoop}
              title="Oui"
              description="Votre coopérative porte la déclaration ; son attestation d’adhésion vous est demandée."
            />
            <RadioCard name="dossier-coop" value="no" checked={coop === 'no'} onChange={setCoop} title="Non" />
            {coop === 'no' && (
              <Note tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>
                {NO_SAP_MESSAGE}
              </Note>
            )}
          </fieldset>
        )}
      </Section>

      <Section
        title="Zones d’intervention"
        note="Là où vous acceptez de vous déplacer. Les clients hors de ces zones ne vous voient pas."
        ouverte={ouverte === 'zones'}
        verrou={verrouDe('zones')}
        onOuvrir={() => ouvrir('zones')}
        onFermer={() => setOuverte(null)}
        enCours={update.isPending || majZones.isPending}
        erreur={erreur}
        onEnregistrer={() => {
          if (zones.length === 0) {
            setErreur('Choisissez au moins une région ou une ville.')
            return
          }
          const incomplete = zones.find(
            (z) => !z.wholeRegion && z.cities.some((c) => !c.insee),
          )
          if (incomplete) {
            setErreur(
              'Une ville retenue n’a pas de code INSEE : retirez-la et choisissez-la dans la liste.',
            )
            return
          }
          const interventionZones = zones.map((z) => ({
            regionCode: z.regionCode,
            regionLabel: regionLabel(z.regionCode),
            scope: z.wholeRegion ? ('region' as const) : ('cities' as const),
            cities: z.wholeRegion ? [] : z.cities,
          }))
          if (approuvee) {
            setErreur(null)
            majZones.mutate(interventionZones, {
              onSuccess: () => {
                setOuverte(null)
                toast.success('Zones enregistrées', 'Les clients de ces zones vous voient dès maintenant.')
              },
              onError: (e) => setErreur(applicationPatchMessage(e)),
            })
            return
          }
          envoyer({ interventionZones }, 'Vos zones')
        }}
        lecture={
          zonesLues.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune zone renseignée.</p>
          ) : (
            <ul className="space-y-2.5">
              {zonesLues.map((z, i) => (
                <li key={z.regionCode ?? i} className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy">
                      {z.regionLabel ?? z.regionCode}
                    </span>
                    <span className="block text-[13px] leading-relaxed text-ink-mid">
                      {z.scope === 'cities' && z.cities?.length
                        ? z.cities.map((c) => c.name).join(', ')
                        : 'Toute la région'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      >
        <ZonePicker value={zones} onChange={setZones} />
      </Section>

      {!modifiable && app?.status === 'approved' && (
        <p className="px-1 text-[13px] leading-relaxed text-ink-soft">
          Besoin de corriger une de ces réponses ? Écrivez-nous depuis la{' '}
          <Link href="/espace-chef/messagerie" className="font-semibold text-terra underline">
            messagerie
          </Link>
          .
        </p>
      )}
    </div>
  )
}
