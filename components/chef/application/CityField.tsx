'use client'

import { useEffect } from 'react'
import { useCommunes } from '@/lib/api/referentials'
import { FieldError } from './fields'

/**
 * Ville d'une adresse : une commune du code postal saisi, dans la base
 * officielle (geo.api.gouv.fr). 93100 ne propose que Montreuil. Si la liste
 * est injoignable, saisie libre : l'API vérifiera à l'envoi.
 *
 * `bare` : le champ seul, pour un formulaire qui pose ses propres libellés.
 */
export default function CityField({
  postcode,
  value,
  onChange,
  error,
  id = 'city',
  bare = false,
}: {
  postcode: string
  value: string
  onChange: (city: string) => void
  error?: string
  id?: string
  bare?: boolean
}) {
  const communes = useCommunes(postcode.trim())
  const list = communes.data

  // Une seule commune : elle se remplit seule. Une ville d'un autre code postal s'efface.
  useEffect(() => {
    if (!list) return
    const city = list.length === 1 ? list[0] : list.includes(value) ? value : ''
    if (city !== value) onChange(city)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- à l'arrivée de la liste seulement
  }, [list])

  const message =
    error ?? (list?.length === 0 ? 'Ce code postal ne correspond à aucune commune.' : undefined)
  const field = {
    id,
    autoComplete: 'address-level2',
    'aria-invalid': message ? true : undefined,
    'aria-describedby': message ? `${id}-error` : undefined,
    className: `input-base ${message ? '!border-red-600' : ''}`,
  } as const

  return (
    <div>
      {!bare && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy">
          Ville
        </label>
      )}
      {list && list.length > 0 ? (
        <select {...field} value={value} onChange={(e) => onChange(e.target.value)}>
          {list.length > 1 && <option value="">Choisissez la commune</option>}
          {list.map((nom) => (
            <option key={nom} value={nom}>
              {nom}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...field}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!communes.isError}
          placeholder={communes.isFetching ? 'Recherche des communes…' : 'D’abord le code postal'}
        />
      )}
      {communes.isError && !message && (
        <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">
          Liste des communes indisponible : saisissez la ville, elle sera vérifiée à l’envoi.
        </p>
      )}
      <FieldError id={`${id}-error`} message={message} />
    </div>
  )
}
