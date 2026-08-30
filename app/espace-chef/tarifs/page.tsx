'use client'

import { useState } from 'react'
import { Info, ShoppingBasket } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import { CHEF_PROFILE } from '@/lib/chef/mock'

const COMMISSION_RATE = 0.1 // indicatif — décision client en attente
const TAX_CREDIT = 0.5

const euros = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`

/**
 * Contrainte § 6.2 : le batch cooker saisit **son net perçu**, jamais le prix
 * de vente. Prix client et montant après crédit d'impôt sont calculés et
 * affichés en temps réel.
 */
export default function ChefPricingPage() {
  const [baseNet, setBaseNet] = useState(180)
  const [extraMeal, setExtraMeal] = useState(8)
  const [extraPerson, setExtraPerson] = useState(15)
  const [shoppingFee, setShoppingFee] = useState(CHEF_PROFILE.shoppingFee)
  const [shoppingIncluded, setShoppingIncluded] = useState(CHEF_PROFILE.shoppingIncluded)

  const toClient = (net: number) => net / (1 - COMMISSION_RATE)

  return (
    <ChefPage
      title="Mes tarifs"
      subtitle="Vous saisissez ce que vous touchez — le reste est calculé automatiquement."
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-mint-deep/40 bg-mint/40 px-4 py-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-mint-ink mt-0.5 shrink-0" />
          <p className="text-xs text-mint-ink leading-relaxed">
            Tous les montants ci-dessous sont votre <strong>net perçu</strong>. Le prix
            affiché au client inclut la commission ; le montant après crédit d&apos;impôt
            correspond à ce qu&apos;il paiera réellement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          <Card title="Ma grille tarifaire">
            <div className="space-y-5">
              <PriceRow
                label="Session de base"
                hint="4 plats · 3 personnes"
                value={baseNet}
                onChange={setBaseNet}
              />
              <PriceRow
                label="Plat supplémentaire"
                hint="par plat au-delà de la base"
                value={extraMeal}
                onChange={setExtraMeal}
              />
              <PriceRow
                label="Convive supplémentaire"
                hint="par personne au-delà de 3"
                value={extraPerson}
                onChange={setExtraPerson}
              />

              <div className="pt-4 border-t border-[rgba(31,42,55,0.08)]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shoppingIncluded}
                    onChange={(e) => setShoppingIncluded(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy inline-flex items-center gap-1.5">
                      <ShoppingBasket className="w-4 h-4 text-terra" />
                      Je propose de faire les courses
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Le tarif est affiché au client avant validation.
                    </p>
                  </div>
                </label>
                {shoppingIncluded && (
                  <div className="mt-3 pl-7">
                    <PriceRow
                      label="Forfait courses"
                      value={shoppingFee}
                      onChange={setShoppingFee}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Aperçu temps réel */}
          <aside className="bg-navy text-white rounded-3xl p-5 h-fit lg:sticky lg:top-24">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-4">
              Ce que voit le client
            </p>
            <p className="text-xs text-white/60 mb-1">Session de base</p>
            <p className="font-display text-3xl font-bold">
              {euros(toClient(baseNet) + (shoppingIncluded ? toClient(shoppingFee) : 0))}
            </p>
            <p className="text-sm text-amber font-semibold mt-1">
              soit{' '}
              {euros(
                (toClient(baseNet) + (shoppingIncluded ? toClient(shoppingFee) : 0)) *
                  (1 - TAX_CREDIT),
              )}{' '}
              après crédit d&apos;impôt
            </p>

            <div className="my-4 border-t border-white/10" />

            <Detail label="Votre net" value={euros(baseNet)} />
            <Detail
              label="Commission"
              value={euros(toClient(baseNet) - baseNet)}
              muted
            />
            {shoppingIncluded && (
              <Detail label="Forfait courses (net)" value={euros(shoppingFee)} muted />
            )}

            <div className="mt-4 rounded-xl bg-white/5 px-3 py-2.5">
              <p className="text-[10px] text-white/50 leading-relaxed">
                Taux de commission indicatif ({COMMISSION_RATE * 100} %) — en attente de la
                décision client.
              </p>
            </div>

            <button className="btn btn-amber w-full justify-center mt-4 text-sm">
              Enregistrer mes tarifs
            </button>
          </aside>
        </div>
      </div>
    </ChefPage>
  )
}

function PriceRow({
  label,
  hint,
  value,
  onChange,
  compact,
}: {
  label: string
  hint?: string
  value: number
  onChange: (n: number) => void
  compact?: boolean
}) {
  const clientPrice = value / (1 - COMMISSION_RATE)
  return (
    <div className={compact ? '' : 'grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center'}>
      <div>
        <label className="label-muted block mb-1">{label}</label>
        {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-32">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
            className="input-base pr-8 font-semibold"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm">€</span>
        </div>
        <div className="text-right min-w-[92px]">
          <p className="text-[10px] uppercase tracking-wide text-ink-soft">Prix client</p>
          <p className="text-sm font-semibold text-navy">{euros(clientPrice)}</p>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className={`text-xs ${muted ? 'text-white/45' : 'text-white/70'}`}>{label}</span>
      <span className={`text-sm font-semibold ${muted ? 'text-white/60' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}
