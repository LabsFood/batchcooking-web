'use client'

import { useState } from 'react'
import { AlertCircle, Gift, Info, Minus, Plus, ShoppingBasket } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import {
  COMMISSION_RATE,
  DEFAULT_PRICING,
  SHOPPING_FEE_MIN,
  afterTaxCredit,
  effectiveShoppingFee,
  euros,
  portions,
  pricingError,
  toClientPrice,
  type ChefPricing,
} from '@/lib/chef/pricing'

/* ─────────────────────────────────────────────────────────────────────────────
   Mes tarifs.

   Le batch cooker saisit son **net perçu** ; le prix client et le reste à
   charge après crédit d'impôt sont calculés. La base — nombre de repas et de
   personnes — se règle ici : c'est elle qui donne le nombre de portions annoncé
   au client, la façon la plus parlante de dire ce qu'il reçoit.
   ───────────────────────────────────────────────────────────────────────────── */

export default function ChefPricingPage() {
  const [p, setP] = useState<ChefPricing>(DEFAULT_PRICING)
  const set = <K extends keyof ChefPricing>(k: K, v: ChefPricing[K]) => setP((prev) => ({ ...prev, [k]: v }))

  const error = pricingError(p)
  const shopping = effectiveShoppingFee(p)
  const sessionClient = toClientPrice(p.baseNet) + toClientPrice(shopping)

  return (
    <ChefPage title="Mes tarifs" subtitle="Vous saisissez ce que vous touchez — le reste est calculé.">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-mint/40 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" aria-hidden />
          <p className="text-xs leading-relaxed text-mint-ink">
            Tous les montants ci-dessous sont votre <strong>net perçu</strong>. Le prix affiché au client inclut la
            commission ; le montant après crédit d&apos;impôt correspond à ce qu&apos;il paiera réellement.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            {/* Formule de base */}
            <Card title="Ma formule de base">
              <p className="mb-4 text-[13px] leading-relaxed text-ink-mid">
                Réglez la base de votre session. Le client, lui, lit le nombre de portions : c&apos;est ce qui lui
                parle le plus.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Counter
                  label="Repas préparés"
                  value={p.baseMeals}
                  min={1}
                  onChange={(v) => set('baseMeals', v)}
                />
                <Counter
                  label="Personnes"
                  value={p.basePersons}
                  min={1}
                  onChange={(v) => set('basePersons', v)}
                />
              </div>

              <p className="mt-4 rounded-xl bg-cream-soft px-4 py-3 text-sm text-navy">
                Le client verra :{' '}
                <strong className="font-semibold">
                  {p.baseMeals} repas pour {p.basePersons} personne{p.basePersons > 1 ? 's' : ''}, soit{' '}
                  {portions(p)} portions
                </strong>
                .
              </p>

              <div className="mt-5 border-t border-[rgba(31,42,55,0.08)] pt-5">
                <PriceRow label="Prix de la session de base" value={p.baseNet} onChange={(v) => set('baseNet', v)} />
              </div>
            </Card>

            {/* Suppléments */}
            <Card title="Au-delà de la base">
              <div className="space-y-5">
                <PriceRow label="Repas supplémentaire" value={p.extraMealNet} onChange={(v) => set('extraMealNet', v)} />
                <PriceRow
                  label="Personne supplémentaire"
                  value={p.extraPersonNet}
                  onChange={(v) => set('extraPersonNet', v)}
                />
              </div>
            </Card>

            {/* Courses */}
            <Card title="Courses">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={p.shoppingOffered}
                  onChange={(e) => set('shoppingOffered', e.target.checked)}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
                    <ShoppingBasket className="h-4 w-4 text-terra" aria-hidden />
                    Je propose de faire les courses
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    Le client signe alors un mandat de débours et vous rembourse les achats à l&apos;euro près.
                  </span>
                </span>
              </label>

              {p.shoppingOffered && (
                <div className="mt-4 space-y-4 border-t border-[rgba(31,42,55,0.08)] pt-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={p.shoppingFree}
                      onChange={(e) => set('shoppingFree', e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
                        <Gift className="h-4 w-4 text-terra" aria-hidden />
                        J&apos;offre les courses
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        Aucun forfait n&apos;est facturé : seules les denrées vous sont remboursées.
                      </span>
                    </span>
                  </label>

                  {!p.shoppingFree && (
                    <PriceRow
                      label="Forfait courses"
                      hint={`Minimum ${SHOPPING_FEE_MIN} €`}
                      value={p.shoppingFeeNet}
                      min={SHOPPING_FEE_MIN}
                      onChange={(v) => set('shoppingFeeNet', v)}
                    />
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Aperçu client */}
          <aside className="h-fit rounded-3xl bg-navy p-5 text-white lg:sticky lg:top-24">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-amber">Ce que voit le client</p>

            <p className="text-xs text-white/60">
              {p.baseMeals} repas pour {p.basePersons} personne{p.basePersons > 1 ? 's' : ''} · {portions(p)} portions
            </p>
            <p className="font-display text-3xl font-bold">{euros(sessionClient)}</p>
            <p className="mt-1 text-sm font-semibold text-amber">
              soit {euros(afterTaxCredit(sessionClient))} après crédit d&apos;impôt
            </p>

            <div className="my-4 border-t border-white/10" />

            <Detail label="Votre net" value={euros(p.baseNet + shopping)} />
            <Detail label="Commission" value={euros(sessionClient - p.baseNet - shopping)} muted />
            {p.shoppingOffered && (
              <Detail
                label="Courses"
                value={p.shoppingFree ? 'Offertes' : `${euros(p.shoppingFeeNet)} net`}
                muted
              />
            )}
            <Detail label="Repas en plus" value={`${euros(p.extraMealNet)} net`} muted />
            <Detail label="Personne en plus" value={`${euros(p.extraPersonNet)} net`} muted />

            <div className="mt-4 rounded-xl bg-white/5 px-3 py-2.5">
              <p className="text-[10px] leading-relaxed text-white/50">
                Taux de commission indicatif ({COMMISSION_RATE * 100} %) — en attente de la décision Lab&apos;s Food.
              </p>
            </div>

            {error && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2.5 text-[13px] text-red-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <button disabled={Boolean(error)} className="btn btn-amber mt-4 w-full justify-center text-sm disabled:opacity-50">
              Enregistrer mes tarifs
            </button>
          </aside>
        </div>
      </div>
    </ChefPage>
  )
}

function Counter({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string
  value: number
  min?: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy">{label}</label>
      <div className="inline-flex items-center gap-1 rounded-xl border-[1.5px] border-[rgba(31,42,55,0.12)] bg-paper p-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Diminuer : ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-mid hover:bg-cream-soft hover:text-navy"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value.replace(/\D/g, '')) || min))}
          inputMode="numeric"
          aria-label={label}
          className="w-12 border-0 bg-transparent text-center text-lg font-bold tabular-nums text-navy outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Augmenter : ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-mid hover:bg-cream-soft hover:text-navy"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function PriceRow({
  label,
  hint,
  value,
  min = 0,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min?: number
  onChange: (n: number) => void
}) {
  const invalid = value < min
  return (
    <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto]">
      <div>
        <label className="block text-sm font-semibold text-navy">{label}</label>
        {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-32">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
            aria-invalid={invalid || undefined}
            className={`input-base pr-8 font-semibold ${invalid ? '!border-red-600' : ''}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">€</span>
        </div>
        <div className="min-w-[92px] text-right">
          <p className="text-[10px] uppercase tracking-wide text-ink-soft">Prix client</p>
          <p className="text-sm font-semibold text-navy">{euros(toClientPrice(value))}</p>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className={`text-xs ${muted ? 'text-white/45' : 'text-white/70'}`}>{label}</span>
      <span className={`text-sm font-semibold ${muted ? 'text-white/60' : 'text-white'}`}>{value}</span>
    </div>
  )
}
