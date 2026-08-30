'use client'

import { useMemo, useState } from 'react'
import { Check, ClipboardCopy, Download, ExternalLink, ShoppingBasket, Store } from 'lucide-react'
import { SHOPPING_AISLES, SHOPPING_LIST, STORES } from '@/lib/client/mock'

/**
 * Ma liste de courses (CL-05).
 *
 * Générée par rayons depuis les recettes de la session, dédoublonnée et
 * adaptée au foyer. Case « J'ai déjà », export, et bouton « Faire mes courses »
 * (copie presse-papier + ouverture de l'enseigne) — périmètre MVP.
 */
export default function ShoppingListPage() {
  const [owned, setOwned] = useState<string[]>([])
  const [storeId, setStoreId] = useState(STORES[0].id)
  const [copied, setCopied] = useState(false)

  const store = STORES.find((s) => s.id === storeId)!
  const remaining = SHOPPING_LIST.filter((i) => !owned.includes(i.id))

  const byAisle = useMemo(
    () =>
      SHOPPING_AISLES.map((aisle) => ({
        aisle,
        items: SHOPPING_LIST.filter((i) => i.aisle === aisle),
      })).filter((g) => g.items.length > 0),
    [],
  )

  const toggle = (id: string) =>
    setOwned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const asText = () =>
    byAisle
      .map(({ aisle, items }) => {
        const list = items.filter((i) => !owned.includes(i.id))
        if (list.length === 0) return ''
        return `${aisle}\n${list.map((i) => `- ${i.name} : ${i.qty}`).join('\n')}`
      })
      .filter(Boolean)
      .join('\n\n')

  const copyAndGo = async () => {
    try {
      await navigator.clipboard.writeText(asText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Presse-papier indisponible : on ouvre quand même l'enseigne.
    }
    window.open(store.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-5">
      {/* Résumé + actions */}
      <div className="bg-paper rounded-3xl p-5 lg:p-6 border border-[rgba(31,42,55,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Session du 3 mai</p>
            <p className="font-display text-2xl font-bold text-navy">
              {remaining.length} article{remaining.length > 1 ? 's' : ''} à acheter
            </p>
            <p className="text-xs text-ink-soft mt-1">
              {owned.length} déjà dans vos placards · {SHOPPING_LIST.length} au total
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="input-base pl-9 pr-8 text-sm w-48"
              >
                {STORES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={copyAndGo} className="btn btn-primary text-sm">
              {copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
              {copied ? 'Liste copiée' : 'Faire mes courses'}
            </button>
            <button onClick={() => window.print()} className="btn btn-outline text-sm">
              <Download className="w-4 h-4" /> Exporter
            </button>
          </div>
        </div>

        <p className="text-[11px] text-ink-soft mt-3 leading-relaxed">
          « Faire mes courses » copie la liste restante dans le presse-papier puis ouvre{' '}
          {store.name} — il ne reste qu&apos;à la coller dans la recherche.
        </p>
      </div>

      {/* Liste par rayons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {byAisle.map(({ aisle, items }) => (
          <section
            key={aisle}
            className="bg-paper rounded-3xl p-5 border border-[rgba(31,42,55,0.06)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-xl bg-amber-soft flex items-center justify-center">
                <ShoppingBasket className="w-4 h-4 text-amber-deep" />
              </span>
              <h3 className="font-display text-base font-bold text-navy">{aisle}</h3>
              <span className="text-[11px] text-ink-soft">({items.length})</span>
            </div>

            <ul className="space-y-1.5">
              {items.map((item) => {
                const have = owned.includes(item.id)
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        have ? 'bg-mint/40' : 'hover:bg-cream-soft'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          have ? 'bg-mint-deep border-mint-deep' : 'border-[rgba(31,42,55,0.2)]'
                        }`}
                      >
                        {have && <Check className="w-3 h-3 text-mint-ink" />}
                      </span>
                      <span
                        className={`flex-1 text-sm ${
                          have ? 'text-ink-soft line-through' : 'text-navy font-medium'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs text-ink-soft font-mono">{item.qty}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-xs text-ink-soft text-center">
        Cochez « j&apos;ai déjà » pour retirer un article de l&apos;export.
      </p>
    </div>
  )
}
