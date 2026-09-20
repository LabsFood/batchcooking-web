import { z } from 'zod'
import { regionLabel, type City } from './regions'

/* ─────────────────────────────────────────────────────────────────────────────
   Candidature batch cooker — schéma, référentiels et payload.

   Le formulaire valide étape par étape (un schéma zod par étape). L'envoi est
   simulé : `submitApplication` construit le multipart exact que recevra
   `POST /chefs/applications` et répond après un délai. Brancher l'API revient
   à remplacer le corps de cette fonction par un `fetch`.
   ───────────────────────────────────────────────────────────────────────────── */

// ── Référentiels ────────────────────────────────────────────────────────────

export const WORK_STATUSES = [
  { id: 'eu-citizen', label: 'Ressortissant français ou de l’Union européenne' },
  { id: 'residence-permit', label: 'Titre de séjour autorisant à travailler' },
  { id: 'renewal-pending', label: 'Titre de séjour en cours de renouvellement' },
  { id: 'other', label: 'Autre situation' },
] as const

export type WorkStatus = (typeof WORK_STATUSES)[number]['id']

/*
 * Trois statuts seulement : le candidat n'a pas à qualifier sa forme juridique
 * au détail près, l'extrait Kbis le dira. « not-registered » reste l'identifiant
 * technique du cas sans entreprise : c'est lui qui rend le SIRET facultatif.
 */
export const LEGAL_FORMS = [
  { id: 'micro', label: 'Micro ou auto-entrepreneur', hint: 'Le statut le plus courant chez les batch cookers' },
  { id: 'other-company', label: 'Autre forme d’entreprise', hint: 'EI, EURL, SASU, SAS…' },
  { id: 'not-registered', label: 'Je n’ai pas d’entreprise', hint: 'Vous pouvez candidater dès maintenant' },
] as const

export type LegalForm = (typeof LEGAL_FORMS)[number]['id']

export const labelOf = <T extends { id: string; label: string }>(list: readonly T[], id: string) =>
  list.find((o) => o.id === id)?.label ?? id

// ── Pièces justificatives ───────────────────────────────────────────────────

export interface DocRequirement {
  id: string
  label: string
  hint: string
  /** Pièce attendue pour instruire le dossier (sinon : facultative). */
  required: boolean
}

export const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
export const ACCEPTED_EXT = '.pdf,.jpg,.jpeg,.png,.webp'
export const MAX_FILE_MB = 10

/** Vérifie un fichier avant de l'accepter. Renvoie un message d'erreur, ou null. */
export function checkFile(file: File): string | null {
  if (!(ACCEPTED_MIME as readonly string[]).includes(file.type)) {
    return 'Format non accepté. Déposez un PDF, un JPG, un PNG ou un WebP.'
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `Fichier trop lourd (${formatSize(file.size)}). La limite est de ${MAX_FILE_MB} Mo.`
  }
  if (file.size === 0) return 'Ce fichier est vide.'
  return null
}

export const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`

/**
 * Pièces demandées d'après les réponses. Celles qui découlent de la situation
 * déclarée apparaissent dès le choix de l'option, mais restent facultatives à
 * l'envoi : la candidature ne doit pas se bloquer sur un papier manquant.
 */
export function requiredDocuments(v: {
  workStatus?: WorkStatus
  legalForm?: LegalForm
  sapTypeA?: boolean
}): DocRequirement[] {
  const docs: DocRequirement[] = [
    {
      id: 'identity',
      label: 'Pièce d’identité',
      hint: 'Carte d’identité ou passeport en cours de validité, recto et verso.',
      required: true,
    },
  ]

  if (v.workStatus === 'residence-permit') {
    docs.push({
      id: 'residence-permit',
      label: 'Titre de séjour',
      hint: 'Recto et verso, mention de l’autorisation de travail visible. Vous pourrez l’ajouter plus tard.',
      required: false,
    })
  }
  if (v.workStatus === 'renewal-pending') {
    docs.push({
      id: 'renewal-receipt',
      label: 'Récépissé de demande de renouvellement',
      hint: 'Délivré par la préfecture, avec l’autorisation de travail. Vous pourrez l’ajouter plus tard.',
      required: false,
    })
  }
  if (v.workStatus === 'other') {
    docs.push({
      id: 'status-proof',
      label: 'Justificatif de votre situation',
      hint: 'Tout document qui permet d’étudier votre dossier. Vous pourrez l’ajouter plus tard.',
      required: false,
    })
  }
  if (v.legalForm && v.legalForm !== 'not-registered') {
    docs.push({
      id: 'registration',
      label: 'Justificatif d’immatriculation',
      hint: 'Avis de situation SIRENE ou extrait Kbis de moins de 3 mois.',
      required: true,
    })
  }
  if (v.sapTypeA) {
    docs.push({
      id: 'sap-declaration',
      label: 'Récépissé de déclaration SAP',
      hint: 'Délivré par la DREETS via NOVA, à votre nom ou à celui de votre entreprise.',
      required: true,
    })
  }

  docs.push(
    { id: 'rc-pro', label: 'Assurance responsabilité civile professionnelle', hint: 'Attestation de l’année en cours.', required: false },
    { id: 'haccp', label: 'Formation hygiène alimentaire (HACCP)', hint: 'Attestation de formation.', required: false },
    { id: 'ddpp', label: 'Récépissé de déclaration DDPP', hint: 'Déclaration d’activité alimentaire.', required: false },
  )

  return docs
}

// ── Validation ──────────────────────────────────────────────────────────────

const PHONE_FR = /^(?:(?:\+|00)33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/
/** Code postal métropolitain : 01000 à 95999 (Corse incluse via 20xxx). */
const POSTCODE_METRO = /^(?:0[1-9]|[1-8]\d|9[0-5])\d{3}$/

/** SIRET : 14 chiffres + clé de Luhn. */
export function isValidSiret(raw: string): boolean {
  const s = raw.replace(/\s/g, '')
  if (!/^\d{14}$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let n = Number(s[13 - i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

const citySchema = z.object({
  name: z.string(),
  dept: z.string(),
  insee: z.string().optional(),
})

export const zoneSchema = z.object({
  regionCode: z.string(),
  /** true : toute la région. false : seulement les villes listées. */
  wholeRegion: z.boolean(),
  cities: z.array(citySchema),
})

export type Zone = z.infer<typeof zoneSchema>

/*
 * Un schéma par étape : un `superRefine` sur un objet zod ne s'exécute que si
 * tous ses champs passent. Avec un schéma unique, les règles conditionnelles
 * (« Autre » → précision, SIRET, n° SAP) resteraient muettes tant que les
 * étapes suivantes sont vides.
 */

const identitySchema = z.object({
  firstName: z.string().trim().min(2, 'Indiquez votre prénom.'),
  lastName: z.string().trim().min(2, 'Indiquez votre nom.'),
  email: z.string().trim().min(1, 'Indiquez votre email.').email('Cet email ne semble pas valide.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Indiquez votre téléphone.')
    .regex(PHONE_FR, 'Numéro français attendu, par exemple 06 12 34 56 78.'),
  street: z.string().trim().min(4, 'Indiquez votre adresse.'),
  addressLine2: z.string().trim().optional(),
  postcode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Le code postal compte 5 chiffres.')
    .regex(POSTCODE_METRO, 'Nous intervenons en France métropolitaine uniquement.'),
  city: z.string().trim().min(2, 'Indiquez votre ville.'),
})

const zonesSchema = z
  .object({ zones: z.array(zoneSchema).min(1, 'Choisissez au moins une région ou une ville.') })
  .superRefine((v, ctx) => {
    for (const zone of v.zones) {
      if (!zone.wholeRegion && zone.cities.length === 0) {
        ctx.addIssue({
          path: ['zones'],
          code: z.ZodIssueCode.custom,
          message: `Choisissez au moins une ville en ${regionLabel(zone.regionCode)}, ou toute la région.`,
        })
      }
    }
  })

const statusSchema = z
  .object({
    workStatus: z.enum(['eu-citizen', 'residence-permit', 'renewal-pending', 'other'], {
      errorMap: () => ({ message: 'Choisissez votre situation.' }),
    }),
    workStatusOther: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.workStatus === 'other' && (v.workStatusOther ?? '').trim().length < 10) {
      ctx.addIssue({
        path: ['workStatusOther'],
        code: z.ZodIssueCode.custom,
        message: 'Précisez votre situation en quelques mots (10 caractères minimum).',
      })
    }
  })

const companySchema = z
  .object({
    legalForm: z.enum(['micro', 'other-company', 'not-registered'], {
      errorMap: () => ({ message: 'Choisissez votre statut.' }),
    }),
    siret: z.string().optional(),
    sapTypeA: z.boolean(),
    sapNumber: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.legalForm !== 'not-registered') {
      const siret = (v.siret ?? '').replace(/\s/g, '')
      if (!siret) {
        ctx.addIssue({ path: ['siret'], code: z.ZodIssueCode.custom, message: 'Indiquez votre numéro SIRET.' })
      } else if (!isValidSiret(siret)) {
        ctx.addIssue({
          path: ['siret'],
          code: z.ZodIssueCode.custom,
          message: 'Ce SIRET n’est pas valide. Il compte 14 chiffres : vérifiez la saisie.',
        })
      }
    }
    if (v.sapTypeA && !/^SAP\d{9}$/i.test((v.sapNumber ?? '').replace(/\s/g, ''))) {
      ctx.addIssue({
        path: ['sapNumber'],
        code: z.ZodIssueCode.custom,
        message: 'Format attendu : SAP suivi des 9 chiffres du SIREN, par exemple SAP123456789.',
      })
    }
  })

const reviewSchema = z.object({
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Cochez cette case pour envoyer votre candidature.' }),
  }),
})

export type ApplicationValues = z.infer<typeof identitySchema> &
  z.infer<typeof zonesSchema> &
  z.infer<typeof statusSchema> &
  z.infer<typeof companySchema> & { consent: boolean }

export type StepId = 'identity' | 'zones' | 'status' | 'company' | 'documents' | 'review'

/** Schéma de chaque étape. L'étape « Pièces » se valide au dépôt de chaque fichier. */
export const STEP_SCHEMAS: Record<StepId, z.ZodTypeAny | null> = {
  identity: identitySchema,
  zones: zonesSchema,
  status: statusSchema,
  company: companySchema,
  documents: null,
  review: reviewSchema,
}

export type FieldErrors = Partial<Record<keyof ApplicationValues, string>>

/** Valide une étape. Renvoie les erreurs par champ (vide si l'étape est valide). */
export function validateStep(step: StepId, values: ApplicationValues): FieldErrors {
  const schema = STEP_SCHEMAS[step]
  if (!schema) return {}
  const res = schema.safeParse(values)
  if (res.success) return {}
  const errors: FieldErrors = {}
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof ApplicationValues
    if (key && !errors[key]) errors[key] = issue.message
  }
  return errors
}

export const DEFAULT_VALUES: ApplicationValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  addressLine2: '',
  postcode: '',
  city: '',
  zones: [],
  workStatus: undefined as unknown as WorkStatus,
  workStatusOther: '',
  legalForm: undefined as unknown as LegalForm,
  siret: '',
  sapTypeA: false,
  sapNumber: '',
  consent: false,
}

// ── Payload ─────────────────────────────────────────────────────────────────

export interface UploadedDoc {
  file: File
  /** URL locale pour l'aperçu, révoquée au retrait du fichier. */
  url: string
}

/** Corps JSON de `POST /chefs/applications` (partie `application` du multipart). */
export interface ApplicationPayload {
  identity: { firstName: string; lastName: string; email: string; phone: string }
  address: { street: string; line2: string | null; postcode: string; city: string; country: 'FR' }
  interventionZones: {
    regionCode: string
    regionLabel: string
    scope: 'region' | 'cities'
    cities: City[]
  }[]
  workAuthorization: { status: WorkStatus; details: string | null }
  company: {
    legalForm: LegalForm
    siret: string | null
    sap: { path: 'type-a' | 'type-b'; declarationNumber: string | null }
  }
  documents: { type: string; fileName: string; mimeType: string; size: number }[]
  consent: { privacyPolicy: true; terms: true; acceptedAt: string }
}

const e164 = (phone: string) => {
  const digits = phone.replace(/[^\d+]/g, '').replace(/^00/, '+')
  return digits.startsWith('+') ? digits : `+33${digits.slice(1)}`
}

export function buildPayload(
  v: ApplicationValues,
  docs: Record<string, UploadedDoc>,
  acceptedAt: string,
): ApplicationPayload {
  const registered = v.legalForm !== 'not-registered'
  return {
    identity: {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      email: v.email.trim().toLowerCase(),
      phone: e164(v.phone),
    },
    address: {
      street: v.street.trim(),
      line2: v.addressLine2?.trim() || null,
      postcode: v.postcode.trim(),
      city: v.city.trim(),
      country: 'FR',
    },
    interventionZones: v.zones.map((z0) => ({
      regionCode: z0.regionCode,
      regionLabel: regionLabel(z0.regionCode),
      scope: z0.wholeRegion ? 'region' : 'cities',
      cities: z0.wholeRegion ? [] : z0.cities,
    })),
    workAuthorization: {
      status: v.workStatus,
      details: v.workStatus === 'other' ? (v.workStatusOther ?? '').trim() : null,
    },
    company: {
      legalForm: v.legalForm,
      siret: registered ? (v.siret ?? '').replace(/\s/g, '') : null,
      sap: {
        path: v.sapTypeA ? 'type-a' : 'type-b',
        declarationNumber: v.sapTypeA ? (v.sapNumber ?? '').replace(/\s/g, '').toUpperCase() : null,
      },
    },
    documents: Object.entries(docs).map(([type, d]) => ({
      type,
      fileName: d.file.name,
      mimeType: d.file.type,
      size: d.file.size,
    })),
    consent: { privacyPolicy: true, terms: true, acceptedAt },
  }
}

/** Multipart envoyé à l'API : le JSON + un fichier par pièce (`documents[<type>]`). */
export function toFormData(payload: ApplicationPayload, docs: Record<string, UploadedDoc>): FormData {
  const fd = new FormData()
  fd.append('application', JSON.stringify(payload))
  for (const [type, d] of Object.entries(docs)) fd.append(`documents[${type}]`, d.file, d.file.name)
  return fd
}

/**
 * Envoi simulé. À brancher :
 *   const res = await fetch(`${API_URL}/chefs/applications`, { method: 'POST', body: formData })
 */
export async function submitApplication(formData: FormData): Promise<{ applicationId: string }> {
  await new Promise((r) => setTimeout(r, 1200))
  if (process.env.NODE_ENV !== 'production') {
    console.info('[candidature] POST /chefs/applications (simulé)', Object.fromEntries(formData.entries()))
  }
  return { applicationId: `APP-${Date.now().toString(36).toUpperCase()}` }
}
