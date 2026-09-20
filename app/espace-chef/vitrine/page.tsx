'use client'

import { useState } from 'react'
import { AlertCircle, BadgeCheck, Eye, Globe2, MapPin, Plus, Star, X } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import { CHEF_DOCS, CHEF_PROFILE, DOC_DEFINITIONS, LANGUAGE_OPTIONS } from '@/lib/chef/mock'
import { PAYMENT_METHOD_LABEL, applicableDocuments } from '@/lib/chef/states'

/* ─────────────────────────────────────────────────────────────────────────────
   Ma vitrine.

   Tout ce qui est saisi ici est public. La présentation est donc contrôlée :
   liens, adresses et coordonnées y sont interdits, puisque la mise en relation
   et les échanges passent par l'application.
   ───────────────────────────────────────────────────────────────────────────── */

const MAX_TEXT = 600

/** Repère ce qui ne doit pas figurer dans un texte public. */
function textIssues(text: string): string[] {
  const issues: string[] = []
  if (/https?:\/\/|www\.|\.(fr|com|net|io|co)\b/i.test(text)) issues.push('un lien')
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) issues.push('une adresse email')
  if (/(?:\+?\d[\s.-]?){9,}/.test(text)) issues.push('un numéro de téléphone')
  if (/\b\d{1,3}\s+(rue|avenue|boulevard|chemin|impasse|place|allée)\b/i.test(text)) issues.push('une adresse postale')
  if (/@[A-Za-z0-9_]{3,}/.test(text)) issues.push('un compte de réseau social')
  return issues
}

export default function ChefShowcasePage() {
  const [languages, setLanguages] = useState<string[]>(CHEF_PROFILE.languages)
  const [text, setText] = useState(CHEF_PROFILE.showcaseText)
  const [picking, setPicking] = useState(false)

  const definitions = applicableDocuments(DOC_DEFINITIONS, CHEF_PROFILE)

  // Les badges proviennent des pièces facultatives validées.
  const badges = definitions
    .filter((d) => d.badge)
    .filter((d) => CHEF_DOCS.find((s) => s.definitionId === d.id)?.status === 'valid')
    .map((d) => d.badge as string)

  const issues = textIssues(text)
  const available = LANGUAGE_OPTIONS.filter((l) => !languages.includes(l))

  const completion = Math.round(
    ((badges.length > 0 ? 1 : 0) +
      (languages.length > 0 ? 1 : 0) +
      (CHEF_PROFILE.acceptedPayments.length > 0 ? 1 : 0) +
      (text.trim().length > 80 && issues.length === 0 ? 1 : 0) +
      1) /
      5 *
      100,
  )

  return (
    <ChefPage title="Ma vitrine" subtitle="Ce que les clients voient de vous.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card title="Score de complétude">
            <div className="mb-1.5 flex justify-between text-xs text-ink-mid">
              <span>Profil renseigné</span>
              <span className="font-semibold tabular-nums text-navy">{completion} %</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-cream-deep">
              <div className="h-full rounded-full bg-amber transition-[width] duration-500" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Ajoutez une photo de couverture pour atteindre 100 %.
            </p>
          </Card>

          {/* Présentation publique */}
          <Card title="Ma présentation">
            <p className="mb-3 text-[13px] leading-relaxed text-ink-mid">
              Quelques lignes sur votre cuisine, votre parcours, votre façon de travailler. C&apos;est le premier
              texte que lisent vos clients.
            </p>

            <div className="mb-3 flex items-start gap-3 rounded-xl bg-amber-soft/50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#7A4A05]" aria-hidden />
              <p className="text-[13px] leading-relaxed text-[#7A4A05]">
                Pas de lien, pas d&apos;adresse, pas de téléphone ni d&apos;email : les échanges et la réservation
                passent par l&apos;application. Un texte qui en contient sera refusé à la validation.
              </p>
            </div>

            <textarea
              rows={6}
              value={text}
              maxLength={MAX_TEXT}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={issues.length > 0 || undefined}
              aria-describedby="showcase-text-help"
              className={`input-base resize-y leading-relaxed ${issues.length > 0 ? '!border-red-600' : ''}`}
            />

            <div className="mt-1.5 flex items-start justify-between gap-3">
              <p id="showcase-text-help" className="text-[13px] text-ink-soft">
                {issues.length > 0 ? (
                  <span role="alert" className="flex items-start gap-1.5 text-red-700">
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    Votre texte contient {issues.join(', ')}. Retirez-le avant d&apos;enregistrer.
                  </span>
                ) : (
                  'Visible par tous les clients de la plateforme.'
                )}
              </p>
              <p className="shrink-0 text-xs tabular-nums text-ink-soft">
                {text.length} / {MAX_TEXT}
              </p>
            </div>

            <button
              disabled={issues.length > 0}
              className="btn btn-primary mt-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enregistrer ma présentation
            </button>
          </Card>

          <Card title="Badges">
            {badges.length === 0 ? (
              <p className="py-2 text-sm text-ink-soft">Déposez vos pièces facultatives pour obtenir des badges.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <StatusBadge key={b} tone="success">
                    <BadgeCheck className="h-3 w-3" aria-hidden /> {b}
                  </StatusBadge>
                ))}
                <StatusBadge tone="info">Crédit d&apos;impôt 50 %</StatusBadge>
                {CHEF_PROFILE.shoppingIncluded && <StatusBadge tone="info">Courses incluses</StatusBadge>}
              </div>
            )}
          </Card>

          {/* Langues : choisies dans une liste, pas saisies librement */}
          <Card title="Langues parlées">
            <ul className="mb-3 flex flex-wrap gap-2">
              {languages.map((l) => (
                <li key={l}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-navy py-1 pl-3 pr-1 text-xs font-semibold text-white">
                    <Globe2 className="h-3 w-3 text-amber" aria-hidden /> {l}
                    <button
                      onClick={() => setLanguages((prev) => prev.filter((x) => x !== l))}
                      aria-label={`Retirer ${l}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </li>
              ))}
              {languages.length === 0 && <li className="text-sm text-ink-soft">Aucune langue renseignée.</li>}
            </ul>

            {picking ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  autoFocus
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) setLanguages((prev) => [...prev, e.target.value])
                    setPicking(false)
                  }}
                  aria-label="Choisir une langue"
                  className="input-base w-auto py-2 text-sm"
                >
                  <option value="" disabled>
                    Choisir une langue…
                  </option>
                  {available.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setPicking(false)}
                  className="rounded-full px-3 py-2 text-xs font-semibold text-ink-mid hover:text-navy"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPicking(true)}
                disabled={available.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[rgba(31,42,55,0.25)] px-3 py-1.5 text-xs font-medium text-ink-mid transition-colors hover:border-navy hover:text-navy disabled:opacity-50"
              >
                <Plus className="h-3 w-3" aria-hidden /> Ajouter une langue
              </button>
            )}
          </Card>

          <Card title="Moyens de paiement acceptés">
            <div className="flex flex-wrap gap-2">
              {CHEF_PROFILE.acceptedPayments.map((p) => (
                <StatusBadge key={p} tone="neutral">
                  {PAYMENT_METHOD_LABEL[p]}
                </StatusBadge>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              Le client ne verra que les moyens que vous acceptez, croisés avec son propre rattachement.
            </p>
          </Card>
        </div>

        {/* Aperçu client */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-3xl border border-[rgba(31,42,55,0.08)] bg-paper">
            <div className="flex items-center gap-2 border-b border-[rgba(31,42,55,0.08)] bg-cream-soft px-4 py-2.5">
              <Eye className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Aperçu client</p>
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber font-display text-lg font-bold text-navy">
                  {CHEF_PROFILE.name.split(' ').map((n) => n[0]).join('')}
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-navy">{CHEF_PROFILE.name}</p>
                  <p className="inline-flex items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="h-3 w-3" aria-hidden /> {CHEF_PROFILE.city}
                  </p>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber text-amber" aria-hidden />
                <span className="text-sm font-bold text-navy">{CHEF_PROFILE.rating}</span>
                <span className="text-xs text-ink-soft">({CHEF_PROFILE.reviewsCount} avis)</span>
              </div>

              {text.trim() && (
                <p className="mb-4 text-[13px] leading-relaxed text-ink-mid">
                  {text.length > 220 ? `${text.slice(0, 220)}…` : text}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span key={b} className="rounded-full bg-mint px-2 py-1 text-[10px] font-medium text-mint-ink">
                    {b}
                  </span>
                ))}
                {languages.map((l) => (
                  <span key={l} className="rounded-full bg-cream-soft px-2 py-1 text-[10px] font-medium text-navy">
                    {l}
                  </span>
                ))}
                {CHEF_PROFILE.acceptedPayments.map((p) => (
                  <span key={p} className="rounded-full bg-cream-soft px-2 py-1 text-[10px] font-medium text-navy">
                    {PAYMENT_METHOD_LABEL[p]}
                  </span>
                ))}
              </div>

              <button className="btn btn-primary mt-5 w-full justify-center text-sm">Réserver une session</button>
            </div>
          </div>
        </aside>
      </div>
    </ChefPage>
  )
}
