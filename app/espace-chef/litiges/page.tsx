'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Info, MessageCircle, PhoneCall, Plus, X } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import { DISPUTE_SUBJECTS, type DisputeSubject } from '@/lib/chef/mock'
import { MAX_BODY_LENGTH, messagingErrorText, useWriteToSupport } from '@/lib/api/messaging'
import { useMeProfile } from '@/lib/api/me-profile'
import type { ChefProfile, MeProfile } from '@/lib/api/types'
import { useChefApproved } from '@/lib/chef/approval'

/* ─────────────────────────────────────────────────────────────────────────────
   Litiges et support.

   Un litige ne porte pas forcément sur une prestation : le sujet est choisi
   d'abord, et la prestation n'est demandée que lorsqu'elle a du sens. Pour une
   question rapide, le batch cooker demande à être rappelé plutôt que d'ouvrir
   un dossier.

   Les deux formulaires écrivent dans le fil support de la messagerie (`POST
   /me/conversations/support`) : l'équipe les lit et y répond là. Il n'existe
   pas d'endpoint de litiges, donc pas de liste de dossiers ici : le fil en
   tient lieu.

   Un candidat n'a pas encore de prestation : les sujets qui en demandent une
   ne lui sont pas proposés.
   ───────────────────────────────────────────────────────────────────────────── */

const CALLBACK_SLOTS = [
  { id: 'asap', label: 'Dès que possible' },
  { id: 'morning', label: 'Le matin (9h – 12h)' },
  { id: 'afternoon', label: "L'après-midi (14h – 18h)" },
]

/** La place de l'en-tête du message, sous la limite de l'API. */
const MAX_DESCRIPTION = MAX_BODY_LENGTH - 200
/** Un rappel porte en plus les coordonnées (environ 300 caractères au plus). */
const MAX_CALLBACK_QUESTION = MAX_DESCRIPTION - 400

/* Les coordonnées d'un rappel. Elles partent dans le message, ligne par
   ligne, pour que l'équipe puisse les reporter dans le CRM. */
type Coords = { prenom: string; nom: string; telephone: string; ville: string }

const COORD_FIELDS: {
  key: keyof Coords
  label: string
  autoComplete: string
  maxLength: number
  type?: string
}[] = [
  { key: 'prenom', label: 'Prénom', autoComplete: 'given-name', maxLength: 60 },
  { key: 'nom', label: 'Nom', autoComplete: 'family-name', maxLength: 60 },
  { key: 'telephone', label: 'Téléphone', autoComplete: 'tel', maxLength: 20, type: 'tel' },
  { key: 'ville', label: 'Ville', autoComplete: 'address-level2', maxLength: 80 },
]

/** Ce que le compte sait déjà, pour préremplir. */
function knownCoords(data: MeProfile | undefined): Coords {
  const [prenom = '', ...rest] = (data?.user.fullName ?? '').trim().split(/\s+/)
  const chef = data?.profileType === 'chef' ? (data.profile as ChefProfile | null) : null
  return {
    prenom,
    nom: rest.join(' '),
    telephone: data?.user.phone ?? '',
    ville: chef?.city ?? '',
  }
}

export default function ChefDisputesPage() {
  const { candidate } = useChefApproved()
  const subjects = DISPUTE_SUBJECTS.filter((s) => !candidate || !s.needsMission)

  const [form, setForm] = useState<'none' | 'dispute' | 'callback'>('none')
  const [subject, setSubject] = useState<DisputeSubject>('mission')
  const [missionRef, setMissionRef] = useState('')
  const [description, setDescription] = useState('')
  const [slot, setSlot] = useState(CALLBACK_SLOTS[0].id)
  // Politique de confidentialité V1 §4 et §14 : rappel = consentement préalable, case dédiée.
  const [rappelOk, setRappelOk] = useState(false)
  const write = useWriteToSupport()
  const profil = useMeProfile()
  const [coordEdits, setCoordEdits] = useState<Partial<Coords>>({})
  const coords: Coords = { ...knownCoords(profil.data), ...coordEdits }

  const current = subjects.find((s) => s.id === subject) ?? subjects[0]
  const hasQuestion = description.trim().length >= 10
  const canSend = hasQuestion && !write.isPending

  // Pas de rappel vide : une question, ou des coordonnées complètes.
  const coordsComplete =
    COORD_FIELDS.every((f) => coords[f.key].trim()) &&
    coords.telephone.replace(/\D/g, '').length >= 9
  const callbackReady = hasQuestion || coordsComplete

  const reset = () => {
    setForm('none')
    write.reset()
    setDescription('')
    setMissionRef('')
    setCoordEdits({})
    setRappelOk(false)
  }

  const toggle = (next: 'dispute' | 'callback') => {
    setForm(form === next ? 'none' : next)
    write.reset()
  }

  // Le formulaire s'ouvre sous la carte : sur un petit écran, hors de vue.
  const formRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (form !== 'none') formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [form])

  const sendCallback = () => {
    const quand = CALLBACK_SLOTS.find((s) => s.id === slot)?.label
    const lignes = COORD_FIELDS.filter((f) => coords[f.key].trim()).map(
      (f) => `${f.label} : ${coords[f.key].trim()}`,
    )
    const question = description.trim()
    // La preuve du consentement reste dans le fil de support (conservée 1 an au plus).
    const accord = `Consentement au rappel : oui, le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`
    write.mutate(
      [`Demande de rappel — ${quand}`, ...lignes, accord, ...(question ? ['', question] : [])].join(
        '\n',
      ),
    )
  }

  const sendDispute = () => {
    const ref =
      current.needsMission && missionRef.trim() ? ` — prestation n° ${missionRef.trim()}` : ''
    write.mutate(`Nouveau dossier — ${current.label}${ref}\n\n${description.trim()}`)
  }

  const error = write.isError && (
    <p role="alert" className="text-[13px] text-amber-ink">
      {messagingErrorText(write.error)}
    </p>
  )

  return (
    <ChefPage title="Litiges & support" subtitle="Ouvrez un dossier ou demandez à être rappelé.">
      <div className="space-y-5">
        <Card
          title="Écrire à l’équipe"
          action={
            <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto">
              <button
                onClick={() => toggle('callback')}
                className="btn btn-outline justify-center px-4 py-2.5 text-xs"
              >
                <PhoneCall className="h-3.5 w-3.5" aria-hidden /> Être rappelé
              </button>
              <button
                onClick={() => toggle('dispute')}
                className="btn btn-primary justify-center px-4 py-2.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />{' '}
                {candidate ? 'Écrire au support' : 'Ouvrir un litige'}
              </button>
            </div>
          }
        >
          <p className="max-w-prose text-[13px] leading-relaxed text-ink-mid">
            Vos demandes arrivent dans le fil du support, dans votre messagerie : l’équipe y
            répond, et vous y retrouvez tout l’historique.
          </p>
          <Link
            href="/espace-chef/messagerie"
            className="btn btn-outline mt-3 w-full justify-center text-xs sm:w-auto"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden /> Ouvrir la messagerie
          </Link>
        </Card>

        <div ref={formRef} className="scroll-mt-24">
        {/* Demande de rappel */}
        {form === 'callback' && (
          <Card
            title="Être rappelé"
            action={
              <button
                onClick={reset}
                aria-label="Fermer"
                className="hit flex h-8 w-8 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy"
              >
                <X className="h-4 w-4" />
              </button>
            }
          >
            {write.isSuccess ? (
              <Sent
                title="Demande de rappel envoyée"
                text="Nous vous appelons sur le créneau choisi."
                conversationId={write.data.id}
                onDone={reset}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-[13px] leading-relaxed text-ink-mid">
                  Pour une question rapide, laissez-nous vous appeler : pas de dossier à ouvrir.
                </p>
                <div>
                  <p className="mb-2 text-sm font-semibold text-navy">Quand vous rappeler ?</p>
                  <div className="flex flex-wrap gap-2">
                    {CALLBACK_SLOTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSlot(s.id)}
                        aria-pressed={slot === s.id}
                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                          slot === s.id ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-navy">Vos coordonnées</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {COORD_FIELDS.map((f) => (
                      <div key={f.key}>
                        <label htmlFor={`callback-${f.key}`} className="mb-1 block text-xs text-ink-mid">
                          {f.label}
                        </label>
                        <input
                          id={`callback-${f.key}`}
                          type={f.type ?? 'text'}
                          autoComplete={f.autoComplete}
                          maxLength={f.maxLength}
                          value={coords[f.key]}
                          onChange={(e) => setCoordEdits((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          className="input-base"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="callback-reason" className="mb-1.5 block text-sm font-semibold text-navy">
                    Votre question
                  </label>
                  <textarea
                    id="callback-reason"
                    rows={3}
                    maxLength={MAX_CALLBACK_QUESTION}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="En deux mots, pour préparer l’appel…"
                    className="input-base resize-none"
                  />
                </div>
                {!callbackReady && (
                  <p
                    id="callback-hint"
                    role="status"
                    className="flex items-start gap-2 rounded-xl bg-amber-soft/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-navy"
                  >
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-ink" aria-hidden />
                    Pour être rappelé, posez votre question en quelques mots, ou renseignez vos
                    coordonnées : prénom, nom, téléphone et ville.
                  </p>
                )}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-[rgba(31,42,55,0.1)] p-3 text-[13px] leading-relaxed text-ink-mid">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
                    checked={rappelOk}
                    onChange={(e) => setRappelOk(e.target.checked)}
                  />
                  <span>
                    J’accepte que Lab’s Food me rappelle au numéro indiqué, au sujet de cette
                    demande. Je peux retirer cet accord à tout moment, y compris pendant l’appel.
                  </span>
                </label>
                {error}
                <button
                  onClick={sendCallback}
                  disabled={!callbackReady || !rappelOk || write.isPending}
                  aria-describedby={callbackReady ? undefined : 'callback-hint'}
                  className="btn btn-primary w-full justify-center text-sm disabled:opacity-50"
                >
                  {write.isPending ? 'Envoi…' : 'Demander un rappel'}
                </button>
              </div>
            )}
          </Card>
        )}

        {/* Nouveau litige */}
        {form === 'dispute' && (
          <Card
            title="Nouveau dossier"
            action={
              <button
                onClick={reset}
                aria-label="Fermer"
                className="hit flex h-8 w-8 items-center justify-center rounded-full text-ink-mid hover:bg-cream-soft hover:text-navy"
              >
                <X className="h-4 w-4" />
              </button>
            }
          >
            {write.isSuccess ? (
              <Sent
                title="Dossier ouvert"
                text="Le support revient vers vous sous 48 h ouvrées, dans la messagerie."
                conversationId={write.data.id}
                onDone={reset}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-navy">Sur quoi porte votre demande ?</p>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSubject(s.id)}
                        aria-pressed={current.id === s.id}
                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                          current.id === s.id ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {current.needsMission && (
                  <div>
                    <label htmlFor="dispute-mission" className="mb-1.5 block text-sm font-semibold text-navy">
                      Prestation concernée
                    </label>
                    <input
                      id="dispute-mission"
                      value={missionRef}
                      onChange={(e) => setMissionRef(e.target.value)}
                      maxLength={40}
                      placeholder="Sa référence, par exemple LF-2026-0042"
                      className="input-base"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="dispute-description" className="mb-1.5 block text-sm font-semibold text-navy">
                    Description
                  </label>
                  <textarea
                    id="dispute-description"
                    rows={4}
                    maxLength={MAX_DESCRIPTION}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez la situation, les dates et ce que vous attendez de nous…"
                    className="input-base resize-none"
                  />
                  {description.trim().length > 0 && description.trim().length < 10 && (
                    <p className="mt-1.5 text-[13px] text-ink-soft">Encore quelques mots pour que nous puissions agir.</p>
                  )}
                </div>

                {error}
                <button
                  onClick={sendDispute}
                  disabled={!canSend}
                  className="btn btn-primary w-full justify-center text-sm disabled:opacity-50"
                >
                  {write.isPending ? 'Envoi…' : 'Ouvrir le dossier'}
                </button>
              </div>
            )}
          </Card>
        )}
        </div>
      </div>
    </ChefPage>
  )
}

function Sent({
  title,
  text,
  conversationId,
  onDone,
}: {
  title: string
  text: string
  conversationId: string
  onDone: () => void
}) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint text-mint-ink">
        <CheckCircle2 className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-display text-lg font-bold text-navy">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-mid">{text}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href={`/espace-chef/messagerie?c=${conversationId}`} className="btn btn-primary text-xs">
          Voir le fil
        </Link>
        <button onClick={onDone} className="btn btn-outline text-xs">
          Fermer
        </button>
      </div>
    </div>
  )
}
