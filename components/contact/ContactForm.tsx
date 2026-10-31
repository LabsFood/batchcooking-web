'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
} from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api/client'
import { MONTRER_CONNEXION, MONTRER_RECRUTEMENT } from '@/lib/flags'

/* ─────────────────────────────────────────────────────────────────────────────
   Formulaire de contact.

   Le sujet oriente la demande vers la bonne équipe et évite les allers-retours.
   Le message part vers l'API (`POST /contact-messages`, route publique) et arrive
   dans la boîte de réception de la console admin.
   ───────────────────────────────────────────────────────────────────────────── */

const SUBJECTS = [
  { id: 'booking', label: 'Réserver une session' },
  { id: 'session', label: 'Une prestation en cours' },
  { id: 'chef', label: 'Devenir batch cooker' },
  { id: 'billing', label: 'Facturation et crédit d’impôt' },
  { id: 'press', label: 'Presse et partenariats' },
  { id: 'other', label: 'Autre sujet' },
] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface Errors {
  name?: string
  email?: string
  message?: string
  consent?: string
}

interface ContactPayload {
  name: string
  email: string
  /** Le libellé du sujet, tel que l'équipe le lira. */
  subject: string
  message: string
  /** Champ piège : invisible, donc laissé vide par une personne. */
  website: string
}

/** Sans jeton : le visiteur n'a pas forcément de compte. */
function send(payload: ContactPayload): Promise<{ received: true }> {
  return apiFetch('/contact-messages', {
    token: null,
    method: 'POST',
    body: {
      source: 'batchcooking',
      name: payload.name,
      email: payload.email,
      subject: payload.subject,
      message: payload.message,
      ...(payload.website ? { website: payload.website } : {}),
    },
  })
}

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState<string>(SUBJECTS[0].id)
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  // `false`, ou la raison de l'échec quand on la connaît.
  const [failed, setFailed] = useState<false | 'error' | 'too-many'>(false)

  const validate = (): Errors => {
    const e: Errors = {}
    if (name.trim().length < 2) e.name = 'Indiquez votre prénom ou votre nom.'
    if (!EMAIL_RE.test(email.trim())) e.email = 'Cet email ne semble pas valide.'
    if (message.trim().length < 20) e.message = 'Décrivez votre demande en quelques phrases (20 caractères minimum).'
    if (!consent) e.consent = 'Cochez cette case pour que nous puissions vous répondre.'
    return e
  }

  const submit = async () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        el?.focus()
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 0)
      return
    }
    setSending(true)
    setFailed(false)
    try {
      await send({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: SUBJECTS.find((s) => s.id === subject)?.label ?? subject,
        message: message.trim(),
        website,
      })
      setSent(true)
    } catch (cause) {
      setFailed(cause instanceof ApiError && cause.status === 429 ? 'too-many' : 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="container-xl grid grid-cols-1 gap-8 py-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 lg:py-20">
      {/* Formulaire */}
      <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-6 sm:p-8 lg:p-10">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="py-6 text-center"
          >
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-mint-ink">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="font-display text-2xl font-bold text-navy">Message envoyé</h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-mid">
              Merci {name.split(' ')[0]} ! Nous répondons à <strong className="text-navy">{email}</strong> sous un jour
              ouvré. Pensez à vérifier vos courriers indésirables.
            </p>
            <button
              onClick={() => {
                setSent(false)
                setMessage('')
                setConsent(false)
              }}
              className="btn btn-outline mt-6 text-sm"
            >
              Écrire un autre message
            </button>
          </motion.div>
        ) : (
          <>
            <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-navy">
              Écrivez-nous
            </h2>
            <p className="mt-2 max-w-[55ch] text-[15px] leading-relaxed text-ink-mid">
              Dites-nous en quelques lignes ce dont vous avez besoin. Plus c&apos;est précis, plus notre réponse le
              sera.
            </p>

            {/* Champ piège anti-robot : hors écran, hors tabulation, ignoré des lecteurs d'écran. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Site web
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            <div className="mt-8 space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Votre nom" error={errors.name} htmlFor="contact-name">
                  <input
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Marie Dupont"
                    aria-invalid={errors.name ? true : undefined}
                    className={`input-base ${errors.name ? '!border-red-600' : ''}`}
                  />
                </Field>
                <Field label="Votre email" error={errors.email} htmlFor="contact-email">
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="marie@exemple.fr"
                    aria-invalid={errors.email ? true : undefined}
                    className={`input-base ${errors.email ? '!border-red-600' : ''}`}
                  />
                </Field>
              </div>

              <fieldset>
                <legend className="mb-2 block text-sm font-semibold text-navy">Votre sujet</legend>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <label
                      key={s.id}
                      className={`cursor-pointer rounded-full px-3.5 py-2 text-xs font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
                        subject === s.id ? 'bg-navy text-white' : 'bg-cream-soft text-ink-mid hover:text-navy'
                      }`}
                    >
                      <input
                        type="radio"
                        name="subject"
                        value={s.id}
                        checked={subject === s.id}
                        onChange={() => setSubject(s.id)}
                        className="sr-only"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <Field label="Votre message" error={errors.message} htmlFor="contact-message">
                <textarea
                  id="contact-message"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1500}
                  placeholder="Nombre de personnes, dates envisagées, contraintes alimentaires…"
                  aria-invalid={errors.message ? true : undefined}
                  className={`input-base resize-y leading-relaxed ${errors.message ? '!border-red-600' : ''}`}
                />
              </Field>

              <div>
                <label
                  className={`flex cursor-pointer gap-3 rounded-xl border-[1.5px] p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-amber has-[:focus-visible]:ring-offset-2 ${
                    errors.consent ? 'border-red-600' : consent ? 'border-navy bg-cream-soft' : 'border-[rgba(31,42,55,0.1)]'
                  }`}
                  aria-invalid={errors.consent ? true : undefined}
                  tabIndex={errors.consent ? -1 : undefined}
                >
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-[13px] leading-relaxed text-ink-mid">
                    J&apos;accepte que Lab&apos;s Food utilise ces informations pour me répondre, conformément à la{' '}
                    <Link
                      href="/confidentialite"
                      className="font-semibold text-navy underline underline-offset-2 hover:text-terra"
                    >
                      politique de confidentialité
                    </Link>
                    .
                  </span>
                </label>
                {errors.consent && (
                  <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] text-red-700">
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    {errors.consent}
                  </p>
                )}
              </div>

              {failed && (
                <p role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-800">
                  <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden />
                  {failed === 'too-many'
                    ? 'Vous avez envoyé plusieurs messages en peu de temps. Réessayez dans une heure, ou écrivez directement à contact@labsfood.fr.'
                    : 'L’envoi n’a pas abouti. Réessayez dans un instant, ou écrivez directement à contact@labsfood.fr.'}
                </p>
              )}

              <button
                onClick={submit}
                disabled={sending}
                aria-busy={sending || undefined}
                className="btn btn-primary text-sm disabled:cursor-wait disabled:opacity-80"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Envoi en cours
                  </>
                ) : (
                  <>
                    Envoyer mon message <ArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Coordonnées et raccourcis */}
      <aside className="space-y-5">
        <div className="rounded-2xl bg-navy p-6 text-white">
          <h2 className="font-display text-lg font-bold">Nous contacter</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li>
              <a href="mailto:contact@labsfood.fr" className="group flex items-center gap-3 text-white/85 hover:text-white">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 transition-colors group-hover:border-terra group-hover:bg-terra">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                contact@labsfood.fr
              </a>
            </li>
            <li className="flex items-center gap-3 text-white/85">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15">
                <Clock className="h-4 w-4" aria-hidden />
              </span>
              Du lundi au vendredi, 9h – 17h
            </li>
            <li className="flex items-center gap-3 text-white/85">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              France métropolitaine
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-6">
          <h2 className="font-display text-lg font-bold text-navy">Réponse immédiate</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-mid">
            Beaucoup de questions trouvent leur réponse sans nous écrire.
          </p>
          <ul className="mt-4 space-y-2">
            <Shortcut href="/faq" label="Questions fréquentes" detail="Tarifs, déroulé, matériel" />
            <Shortcut href="/avantage-fiscal" label="Crédit d’impôt" detail="Ce qu’il reste à votre charge" />
            {MONTRER_RECRUTEMENT && (
              <Shortcut href="/devenir-chef" label="Devenir batch cooker" detail="Candidater en quelques minutes" />
            )}
            {MONTRER_CONNEXION && (
              <Shortcut href="/espace-client" label="Mon espace client" detail="Sessions, messages, factures" />
            )}
          </ul>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-cream-soft px-4 py-3.5">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-terra" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink-mid">
            Une prestation est en cours ? Écrivez directement à votre chef depuis la messagerie de votre espace : il
            vous répond bien plus vite.
          </p>
        </div>
      </aside>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] text-red-700">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

function Shortcut({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-cream-soft"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-navy">{label}</span>
          <span className="block text-xs text-ink-soft">{detail}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-terra" aria-hidden />
      </Link>
    </li>
  )
}
