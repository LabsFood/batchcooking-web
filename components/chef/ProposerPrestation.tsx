'use client'

import { useMemo, useState } from 'react'
import { CalendarPlus, Loader2, X } from 'lucide-react'
import DatePicker from '@/components/shared/DatePicker'
import { SlotPicker } from '@/components/shared/TimeField'
import { useToast } from '@/components/shared/Toaster'
import { apiMessage } from '@/lib/api/messages'
import { dayKey } from '@/lib/time'
import { useOwnSlots } from '@/lib/api/agenda'
import { useServiceOffers, offerDuration, offerEuros } from '@/lib/api/service-offers'
import {
  useChefBookings,
  useCreateChefBooking,
  type Booking,
} from '@/lib/api/bookings'

/* ─────────────────────────────────────────────────────────────────────────────
   Proposer une prestation à un client qu'on connaît déjà.

   L'API le permettait depuis le début, aucun écran ne le faisait. C'est
   pourtant le geste le plus courant d'un batch cooker qui tourne : « je repasse
   chez vous jeudi prochain ? » — et jusqu'ici il fallait demander au client
   d'aller le saisir lui-même.

   Ce n'est pas une réservation imposée : elle naît en attente de paiement, et
   **c'est le client qui l'accepte en la payant**, dans les 72 heures. Le
   créneau est tenu pendant ce temps. L'écran le dit, parce qu'un batch cooker
   qui croit avoir bloqué sa journée et voit la prestation disparaître
   trois jours plus tard ne recommencera pas.

   Les clients proposés sont ceux des prestations passées : l'API n'accepte que
   des gens avec qui une relation existe déjà.
   ───────────────────────────────────────────────────────────────────────────── */

export default function ProposerPrestation() {
  const [ouvert, setOuvert] = useState(false)

  return (
    <>
      <button onClick={() => setOuvert(true)} className="btn btn-primary text-sm">
        <CalendarPlus className="h-4 w-4" aria-hidden />
        Proposer une prestation
      </button>

      {ouvert && <Formulaire onClose={() => setOuvert(false)} />}
    </>
  )
}

function Formulaire({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const offres = useServiceOffers()
  const passees = useChefBookings({ limit: 100 })
  const creer = useCreateChefBooking()

  const [clientId, setClientId] = useState('')
  const [offerId, setOfferId] = useState('')
  const [jour, setJour] = useState<Date | undefined>()
  const [debut, setDebut] = useState<string | null>(null)
  const [personnes, setPersonnes] = useState(2)
  const [adresse, setAdresse] = useState('')
  const [ville, setVille] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [notes, setNotes] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  /** Les clients avec qui une prestation existe déjà, sans doublon. */
  const clients = useMemo(() => {
    const vus = new Map<string, string>()
    for (const b of (passees.data?.data ?? []) as Booking[]) {
      if (b.client?.id) vus.set(b.client.id, b.client.name ?? 'Client')
    }
    return [...vus].map(([id, nom]) => ({ id, nom }))
  }, [passees.data])

  const offresActives = (offres.data ?? []).filter((o) => o.active)
  const offre = offresActives.find((o) => o.id === offerId)
  const duree = offre?.durationMinutes ?? 0

  const borne = jour ? dayKey(jour) : undefined
  const creneaux = useOwnSlots(borne, borne, duree)

  const pret = clientId && offerId && debut

  function envoyer() {
    if (!pret) return
    setErreur(null)
    creer.mutate(
      {
        clientId,
        serviceOfferId: offerId,
        startsAt: debut,
        persons: personnes,
        addressLine: adresse.trim() || undefined,
        addressCity: ville.trim() || undefined,
        addressPostalCode: codePostal.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            'Proposition envoyée',
            'Votre client la confirme en la payant. Le créneau est tenu 72 heures.',
          )
          onClose()
        },
        onError: (e) =>
          setErreur(apiMessage(e, 'La prestation n’a pas pu être créée.')),
      },
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Proposer une prestation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-paper p-6 sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-navy">
              Proposer une prestation
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">
              Votre client la confirme en la payant, dans les 72 heures. D’ici
              là, le créneau lui est réservé.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-cream-soft hover:text-navy"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-navy">
            Client
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input-base mt-1.5"
            >
              <option value="">Choisissez un client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            {clients.length === 0 && !passees.isPending && (
              <span className="mt-1.5 block text-[13px] font-normal text-ink-soft">
                Vous n’avez pas encore de client. L’API n’accepte que des
                personnes avec qui une prestation existe déjà.
              </span>
            )}
          </label>

          <label className="block text-sm font-semibold text-navy">
            Formule
            <select
              value={offerId}
              onChange={(e) => {
                setOfferId(e.target.value)
                setDebut(null)
              }}
              className="input-base mt-1.5"
            >
              <option value="">Choisissez une formule</option>
              {offresActives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} — {offerDuration(o.durationMinutes)}, {offerEuros(o.priceCents)}
                </option>
              ))}
            </select>
            {offresActives.length === 0 && !offres.isPending && (
              <span className="mt-1.5 block text-[13px] font-normal text-ink-soft">
                Créez d’abord une formule dans Mes tarifs : c’est elle qui donne
                la durée et le prix.
              </span>
            )}
          </label>

          {offre && (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-navy">Quand</p>
              <DatePicker
                mode="single"
                selected={jour}
                onSelect={(d: Date | undefined) => {
                  setJour(d)
                  setDebut(null)
                }}
              />
              {jour && (
                <div className="mt-3">
                  {creneaux.isPending ? (
                    <p className="text-[13px] text-ink-soft">Recherche des créneaux…</p>
                  ) : (creneaux.data?.slots ?? []).length === 0 ? (
                    <p className="text-[13px] text-ink-soft">
                      Aucun créneau libre ce jour-là pour cette durée.
                    </p>
                  ) : (
                    <SlotPicker
                      slots={creneaux.data?.slots ?? []}
                      value={debut}
                      onSelect={setDebut}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-navy">
              Personnes
              <input
                type="number"
                min={1}
                max={20}
                value={personnes}
                onChange={(e) => setPersonnes(Number(e.target.value))}
                className="input-base mt-1.5"
              />
            </label>
            <label className="block text-sm font-semibold text-navy sm:col-span-2">
              Ville
              <input
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                placeholder="Là où vous cuisinerez"
                className="input-base mt-1.5"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
            <label className="block text-sm font-semibold text-navy">
              Adresse
              <input
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className="input-base mt-1.5"
              />
            </label>
            <label className="block text-sm font-semibold text-navy">
              Code postal
              <input
                value={codePostal}
                onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
                inputMode="numeric"
                className="input-base mt-1.5"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-navy">
            Note pour votre client
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ce que vous proposez de cuisiner, ce qu’il faut prévoir…"
              className="input-base mt-1.5 resize-y"
            />
          </label>

          {erreur && (
            <p role="alert" className="text-[13px] leading-relaxed text-red-700">
              {erreur}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={envoyer}
              disabled={!pret || creer.isPending}
              className="btn btn-primary text-sm disabled:opacity-50"
            >
              {creer.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Envoyer la proposition
            </button>
            <button onClick={onClose} className="btn btn-ghost text-sm">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
