'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ExternalLink, Mail, Minus, Phone, Plus } from 'lucide-react'
import { fadeUpInView } from '@/lib/motion'
import { FAQ_SECTIONS, questionsAccueil, type FaqQuestion } from '@/lib/faq'

/* ─────────────────────────────────────────────────────────────────────────────
   Les questions fréquentes.

   Deux usages pour un seul composant, parce que c'est un seul contenu :

   - `accueil` : six questions, celles qu'un visiteur se pose avant même de
     regarder les prix. Le reste tient derrière un lien.
   - `complete` : la page `/faq`, section par section, avec un sommaire qui
     reste à l'écran. Quarante-cinq questions à plat derrière des filtres,
     c'était un mur : on ne filtre pas ce qu'on ne sait pas encore chercher.
   ───────────────────────────────────────────────────────────────────────────── */

export default function FAQ({ variant = 'accueil' }: { variant?: 'accueil' | 'complete' }) {
  const complete = variant === 'complete'
  const [ouverte, setOuverte] = useState<string | null>(null)
  const bascule = (id: string) => setOuverte(ouverte === id ? null : id)

  return (
    <section id="faq" className="section-padding section-paper">
      <div className="container-xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <motion.div
            {...fadeUpInView()} // slow-out : se pose en 240 ms
            className="lg:sticky lg:top-32 lg:self-start"
          >
            {complete ? (
              <>
                <h2 className="font-display text-xl font-bold text-navy">Sommaire</h2>
                <nav className="mt-4">
                  <ol className="space-y-1">
                    {FAQ_SECTIONS.map((s, i) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="flex gap-3 rounded-xl px-3 py-2 text-sm text-ink-mid transition-colors hover:bg-cream-soft hover:text-navy"
                        >
                          <span className="tabular-nums text-ink-soft">{i + 1}.</span>
                          {s.titre}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </>
            ) : (
              <>
                <h2 className="h-section mb-6">
                  Questions <span className="accent">fréquentes</span>
                </h2>
                <p className="mb-8 leading-relaxed text-ink-mid">
                  Les six questions qu’on nous pose le plus souvent. Les quarante autres
                  vous attendent sur la page dédiée.
                </p>
                <Link href="/faq" className="btn btn-outline">
                  Toutes les questions
                  <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
                </Link>
              </>
            )}

            <div className="mt-10 border-t border-[rgba(31,42,55,0.1)] pt-6">
              <p className="text-sm font-semibold text-navy">Vous ne trouvez pas votre question ?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Écrivez-nous, nous répondons vite.
              </p>
              <div className="mt-3 space-y-2">
                <a
                  href="mailto:contact@labsfood.fr"
                  className="flex items-center gap-2.5 text-sm text-ink-mid transition-colors hover:text-navy"
                >
                  <Mail className="h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
                  contact@labsfood.fr
                </a>
                <a
                  href="tel:+33749755684"
                  className="flex items-center gap-2.5 text-sm tabular-nums text-ink-mid transition-colors hover:text-navy"
                >
                  <Phone className="h-4 w-4 shrink-0 text-amber-deep" aria-hidden />
                  07 49 75 56 84
                </a>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-2">
            {complete ? (
              <div className="space-y-12">
                {FAQ_SECTIONS.map((s, i) => (
                  <section key={s.id} id={s.id} className="scroll-mt-28">
                    <h2 className="mb-5 flex items-baseline gap-3 font-display text-2xl font-bold text-navy">
                      <span className="text-base tabular-nums text-amber-deep">{i + 1}</span>
                      {s.titre}
                    </h2>
                    <div className="space-y-3">
                      {s.questions.map((q) => (
                        <Item
                          key={q.id}
                          question={q}
                          ouverte={ouverte === q.id}
                          onToggle={() => bascule(q.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <motion.div
                {...fadeUpInView()} // slow-out : se pose en 240 ms
                className="space-y-3"
              >
                {questionsAccueil().map((q) => (
                  <Item
                    key={q.id}
                    question={q}
                    ouverte={ouverte === q.id}
                    onToggle={() => bascule(q.id)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Une question ──────────────────────────────────────────────────────────── */

function Item({
  question,
  ouverte,
  onToggle,
}: {
  question: FaqQuestion
  ouverte: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
        ouverte
          ? 'border-terra bg-cream'
          : 'border-[rgba(31,42,55,0.08)] bg-paper hover:border-[rgba(243,156,18,0.45)]'
      }`}
    >
      <h3>
        <button
          onClick={onToggle}
          aria-expanded={ouverte}
          aria-controls={`faq-${question.id}`}
          className="flex w-full items-center justify-between gap-5 px-5 py-4 text-left sm:px-6 sm:py-5"
        >
          <span
            className={`text-[15px] font-semibold leading-snug transition-colors duration-200 sm:text-base ${
              ouverte ? 'text-amber-deep' : 'text-navy'
            }`}
          >
            {question.question}
          </span>
          <span
            aria-hidden
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
              ouverte ? 'bg-terra text-white' : 'bg-cream-soft text-ink-mid'
            }`}
          >
            {ouverte ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {ouverte && (
          <motion.div
            id={`faq-${question.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <Reponse question={question} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Reponse({ question }: { question: FaqQuestion }) {
  const reponse = question.reponse
  return (
    <div className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6 sm:pr-12">
      {reponse.texte && <p className="leading-relaxed text-ink-mid">{reponse.texte}</p>}

      {reponse.liste && (
        <ul className="space-y-1.5">
          {reponse.liste.map((ligne) => (
            <li key={ligne} className="flex gap-2.5 leading-relaxed text-ink-mid">
              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-terra" />
              {ligne}
            </li>
          ))}
        </ul>
      )}

      {reponse.apres && <p className="leading-relaxed text-ink-mid">{reponse.apres}</p>}

      {reponse.tableau && (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[22rem] border-collapse text-sm">
            <thead>
              <tr>
                {reponse.tableau.entetes.map((e, i) => (
                  <th
                    key={e}
                    scope="col"
                    className={`border-b border-[rgba(31,42,55,0.12)] pb-2 pr-4 text-left font-semibold text-navy ${
                      i > 0 ? 'tabular-nums' : ''
                    }`}
                  >
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reponse.tableau.lignes.map((ligne) => (
                <tr key={ligne[0]} className="border-b border-[rgba(31,42,55,0.07)] last:border-0">
                  {ligne.map((cellule, i) => (
                    <td
                      key={cellule}
                      className={`py-2.5 pr-4 align-top leading-relaxed ${
                        i === 0 ? 'font-medium text-navy' : 'tabular-nums text-ink-mid'
                      }`}
                    >
                      {cellule}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reponse.note && (
        <p className="rounded-xl bg-mint/45 px-4 py-3 text-[13px] leading-relaxed text-mint-ink">
          <strong className="font-semibold">Bon à savoir :</strong> {reponse.note}
        </p>
      )}

      {/* Sur l'avantage fiscal, une affirmation sans sa source ne vaut rien :
          le lecteur doit pouvoir aller lire le texte lui-même. */}
      {question.sources && question.sources.length > 0 && (
        <div className="border-t border-[rgba(31,42,55,0.08)] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Sources
          </p>
          <ul className="mt-1.5 space-y-1">
            {question.sources.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-mid underline-offset-2 hover:text-navy hover:underline"
                >
                  {s.label}
                  <ExternalLink className="mt-1 h-3 w-3 shrink-0 opacity-60" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
