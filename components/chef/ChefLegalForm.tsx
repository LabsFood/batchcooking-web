'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Card } from '@/components/chef/ChefPage'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'
import { useApiFetch } from '@/lib/api/client'
import { apiMessage } from '@/lib/api/messages'

/* ─────────────────────────────────────────────────────────────────────────────
   L'identité légale du batch cooker (CGV art. 3.2), affichée aux clients avant
   la commande : `GET` / `PATCH /me/chef-profile/legal`. Un champ vide ne bloque
   aucune réservation ; l'équipe voit ce qui manque.
   ───────────────────────────────────────────────────────────────────────────── */

interface ChefLegal {
  legalName: string | null
  legalStatus: string | null
  siren: string | null
  businessAddress: string | null
  vatRegime: string | null
  vatNumber: string | null
  insurerName: string | null
  insuranceCoverage: string | null
  mediatorName: string | null
  mediatorUrl: string | null
  missing: string[]
}

type Field = Exclude<keyof ChefLegal, 'missing'>

const STATUSES = [
  ['micro_entreprise', 'Entrepreneur individuel (micro-entreprise)'],
  ['ei', 'Entrepreneur individuel'],
  ['eurl', 'EURL'],
  ['sarl', 'SARL'],
  ['sasu', 'SASU'],
  ['sas', 'SAS'],
] as const

const TEXT_FIELDS: { key: Field; label: string; placeholder?: string }[] = [
  { key: 'legalName', label: 'Dénomination', placeholder: 'Marie Dupont EI' },
  { key: 'siren', label: 'SIREN (9 chiffres)', placeholder: '443061841' },
  { key: 'businessAddress', label: 'Adresse professionnelle', placeholder: '5 rue du Marché, 93100 Montreuil' },
  { key: 'insurerName', label: 'Assureur RC Pro' },
  { key: 'insuranceCoverage', label: 'Couverture', placeholder: 'RC Pro, 2 000 000 € par sinistre' },
  { key: 'mediatorName', label: 'Médiateur de la consommation', placeholder: 'CM2C' },
  { key: 'mediatorUrl', label: 'Site du médiateur', placeholder: 'https://…' },
]

const KEY = ['me', 'chef-legal']

export default function ChefLegalForm() {
  const apiFetch = useApiFetch()
  const qc = useQueryClient()
  const toast = useToast()
  const legal = useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<ChefLegal>('/me/chef-profile/legal'),
  })
  const [edits, setEdits] = useState<Partial<Record<Field, string>>>({})
  const save = useMutation({
    mutationFn: (body: Partial<Record<Field, string | null>>) =>
      apiFetch<ChefLegal>('/me/chef-profile/legal', { method: 'PATCH', body }),
    onSuccess: (data) => {
      qc.setQueryData(KEY, data)
      setEdits({})
      toast.success('Identité enregistrée', 'Vos clients la voient avant de commander.')
    },
    onError: (e) => toast.error('L’identité n’a pas été enregistrée', apiMessage(e)),
  })

  if (!legal.data) return null
  const value = (k: Field) => edits[k] ?? legal.data[k] ?? ''
  const set = (k: Field, v: string) => setEdits((e) => ({ ...e, [k]: v }))
  const body = Object.fromEntries(
    Object.entries(edits).map(([k, v]) => [k, v?.trim() ? v.trim() : null]),
  )

  return (
    <Card title="Mon identité légale">
      <p className="mb-3 text-[13px] leading-relaxed text-ink-mid">
        Affichée à vos clients avant qu’ils commandent (CGV, art. 3.2).
        {legal.data.missing.length > 0 &&
          ` Il manque encore ${legal.data.missing.length} information${legal.data.missing.length > 1 ? 's' : ''}.`}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <label key={f.key} className="block text-[13px]">
            <span className="mb-1 flex items-center gap-1 font-semibold text-navy">
              {f.label}
              {f.key === 'businessAddress' && (
                <InfoPopover label="Quelle adresse ?">
                  Elle est publiée telle quelle sur votre vitrine. Si vous ne voulez pas
                  publier votre domicile, indiquez une adresse de domiciliation.
                </InfoPopover>
              )}
            </span>
            <input
              className="input-base"
              value={value(f.key)}
              placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </label>
        ))}
        <label className="block text-[13px]">
          <span className="mb-1 block font-semibold text-navy">Statut juridique</span>
          <select
            className="input-base"
            value={value('legalStatus')}
            onChange={(e) => set('legalStatus', e.target.value)}
          >
            <option value="">—</option>
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[13px]">
          <span className="mb-1 block font-semibold text-navy">Régime de TVA</span>
          <select
            className="input-base"
            value={value('vatRegime')}
            onChange={(e) => set('vatRegime', e.target.value)}
          >
            <option value="">—</option>
            <option value="franchise">Franchise (TVA non applicable, art. 293 B du CGI)</option>
            <option value="subject">Assujetti à la TVA</option>
          </select>
        </label>
        {value('vatRegime') === 'subject' && (
          <label className="block text-[13px]">
            <span className="mb-1 block font-semibold text-navy">N° de TVA intracommunautaire</span>
            <input
              className="input-base"
              value={value('vatNumber')}
              onChange={(e) => set('vatNumber', e.target.value)}
            />
          </label>
        )}
      </div>
      <button
        onClick={() => save.mutate(body)}
        disabled={save.isPending || Object.keys(edits).length === 0}
        className="btn btn-primary mt-4 text-xs disabled:opacity-60"
      >
        {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </Card>
  )
}
