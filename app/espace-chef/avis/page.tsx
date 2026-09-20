'use client'

import { Star } from 'lucide-react'
import ChefPage, { Card, Empty } from '@/components/chef/ChefPage'
import { CHEF_PROFILE, CHEF_REVIEWS } from '@/lib/chef/mock'

const avg = (key: 'punctuality' | 'hygiene' | 'taste') =>
  CHEF_REVIEWS.reduce((n, r) => n + r[key], 0) / (CHEF_REVIEWS.length || 1)

export default function ChefReviewsPage() {
  return (
    <ChefPage title="Avis" subtitle="Ce que vos clients retiennent de vos prestations.">
      <div className="space-y-5">
        <Card>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="eyebrow mb-2">Note globale</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-navy">
                  {CHEF_PROFILE.rating}
                </span>
                <Star className="w-5 h-5 text-amber fill-amber" />
              </div>
              <p className="text-xs text-ink-soft mt-1">{CHEF_PROFILE.reviewsCount} avis</p>
            </div>
            <Criterion label="Ponctualité" value={avg('punctuality')} />
            <Criterion label="Hygiène" value={avg('hygiene')} />
            <Criterion label="Goût" value={avg('taste')} />
          </div>
        </Card>

        <Card title={`Derniers avis (${CHEF_REVIEWS.length})`}>
          {CHEF_REVIEWS.length === 0 ? (
            <Empty text="Aucun avis pour le moment." />
          ) : (
            <ul className="space-y-4">
              {CHEF_REVIEWS.map((r) => (
                <li key={r.id} className="rounded-2xl border border-[rgba(31,42,55,0.08)] p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-navy">{r.client}</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < r.overall ? 'text-amber fill-amber' : 'text-cream-deep'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-ink-mid leading-relaxed">{r.comment}</p>
                  <p className="text-[11px] text-ink-soft mt-1.5">
                    {new Date(r.date).toLocaleDateString('fr-FR')}
                  </p>

                  {r.reply ? (
                    <div className="mt-3 rounded-xl bg-cream-soft px-3.5 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-ink-soft mb-1">
                        Votre réponse
                      </p>
                      <p className="text-xs text-ink-mid leading-relaxed">{r.reply}</p>
                    </div>
                  ) : (
                    <button className="btn btn-outline text-xs px-3.5 py-2 mt-3">
                      Répondre
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </ChefPage>
  )
}

function Criterion({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <p className="font-display text-2xl font-bold text-navy">{value.toFixed(1)}</p>
      <div className="h-1.5 rounded-full bg-cream-deep overflow-hidden mt-2">
        <div className="h-full rounded-full bg-amber" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  )
}
