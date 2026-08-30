'use client'

import { BadgeCheck, Eye, Globe2, MapPin, Star } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import StatusBadge from '@/components/chef/StatusBadge'
import { CHEF_DOCS, CHEF_PROFILE, DOC_DEFINITIONS } from '@/lib/chef/mock'
import { PAYMENT_METHOD_LABEL, applicableDocuments } from '@/lib/chef/states'

export default function ChefShowcasePage() {
  const definitions = applicableDocuments(DOC_DEFINITIONS, CHEF_PROFILE)

  // Les badges proviennent des pièces recommandées validées.
  const badges = definitions
    .filter((d) => d.badge)
    .filter((d) => CHEF_DOCS.find((s) => s.definitionId === d.id)?.status === 'valid')
    .map((d) => d.badge as string)

  const completion = Math.round(
    ((badges.length > 0 ? 1 : 0) +
      (CHEF_PROFILE.languages.length > 0 ? 1 : 0) +
      (CHEF_PROFILE.acceptedPayments.length > 0 ? 1 : 0) +
      1) /
      5 *
      100,
  )

  return (
    <ChefPage title="Ma vitrine" subtitle="Ce que les clients voient de vous.">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-5">
          <Card title="Score de complétude">
            <div className="flex justify-between text-xs text-ink-mid mb-1.5">
              <span>Profil renseigné</span>
              <span className="font-semibold text-navy">{completion} %</span>
            </div>
            <div className="h-2.5 rounded-full bg-cream-deep overflow-hidden">
              <div className="h-full rounded-full bg-amber" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-xs text-ink-soft mt-3">
              Ajoutez une photo de couverture et une présentation pour atteindre 100 %.
            </p>
          </Card>

          <Card title="Badges">
            {badges.length === 0 ? (
              <p className="text-sm text-ink-soft py-2">
                Déposez vos pièces recommandées pour obtenir des badges.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <StatusBadge key={b} tone="success">
                    <BadgeCheck className="w-3 h-3" /> {b}
                  </StatusBadge>
                ))}
                <StatusBadge tone="info">Crédit d&apos;impôt 50 %</StatusBadge>
                {CHEF_PROFILE.shoppingIncluded && (
                  <StatusBadge tone="info">Courses incluses</StatusBadge>
                )}
              </div>
            )}
          </Card>

          <Card title="Langues parlées">
            <div className="flex flex-wrap gap-2">
              {CHEF_PROFILE.languages.map((l) => (
                <StatusBadge key={l} tone="neutral">
                  <Globe2 className="w-3 h-3" /> {l}
                </StatusBadge>
              ))}
            </div>
          </Card>

          <Card title="Moyens de paiement acceptés">
            <div className="flex flex-wrap gap-2">
              {CHEF_PROFILE.acceptedPayments.map((p) => (
                <StatusBadge key={p} tone="neutral">
                  {PAYMENT_METHOD_LABEL[p]}
                </StatusBadge>
              ))}
            </div>
            <p className="text-xs text-ink-soft mt-3 leading-relaxed">
              Le client ne verra que les moyens que vous acceptez, croisés avec son
              propre rattachement.
            </p>
          </Card>
        </div>

        {/* Aperçu client */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-3xl border border-[rgba(31,42,55,0.08)] bg-paper overflow-hidden">
            <div className="px-4 py-2.5 bg-cream-soft border-b border-[rgba(31,42,55,0.08)] flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-ink-soft" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                Aperçu client
              </p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-14 h-14 rounded-full bg-amber text-navy font-display font-bold text-lg flex items-center justify-center">
                  {CHEF_PROFILE.name.split(' ').map((n) => n[0]).join('')}
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-navy">{CHEF_PROFILE.name}</p>
                  <p className="text-xs text-ink-soft inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {CHEF_PROFILE.city}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-4">
                <Star className="w-4 h-4 text-amber fill-amber" />
                <span className="text-sm font-bold text-navy">{CHEF_PROFILE.rating}</span>
                <span className="text-xs text-ink-soft">
                  ({CHEF_PROFILE.reviewsCount} avis)
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span key={b} className="text-[10px] px-2 py-1 rounded-full bg-mint text-mint-ink font-medium">
                    {b}
                  </span>
                ))}
                {CHEF_PROFILE.acceptedPayments.map((p) => (
                  <span key={p} className="text-[10px] px-2 py-1 rounded-full bg-cream-soft text-navy font-medium">
                    {PAYMENT_METHOD_LABEL[p]}
                  </span>
                ))}
              </div>

              <button className="btn btn-primary w-full justify-center text-sm mt-5">
                Réserver une session
              </button>
            </div>
          </div>
        </aside>
      </div>
    </ChefPage>
  )
}
