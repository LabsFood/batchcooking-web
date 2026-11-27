'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Plus, X } from 'lucide-react'
import ChefPage, { Card } from '@/components/chef/ChefPage'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useToast } from '@/components/shared/Toaster'
import { usePantryStaples, useSavePantryStaples } from '@/lib/api/bookings'
import { ApiError } from '@/lib/api/client'

const MAX = 100
const MAX_LEN = 120

/** Les produits de base que le batch cooker apporte toujours (sel, huile…). */
export default function PantryStaplesPage() {
  const query = usePantryStaples()
  return (
    <ChefPage
      title="Mes produits de base"
      subtitle="Ce que vous apportez toujours : le client n’a pas à l’acheter."
    >
      <div className="max-w-3xl space-y-5">
        <Link href="/espace-chef/parametres" className="text-xs font-semibold text-ink-soft hover:text-navy">
          ← Paramètres
        </Link>
        <Card title="Produits de base">
          {query.isPending ? (
            <p className="text-sm text-ink-soft">Chargement…</p>
          ) : query.isError ? (
            <p className="text-sm text-ink-mid">Vos produits de base n’ont pas pu être lus.</p>
          ) : (
            <Editor initial={query.data.staples} />
          )}
        </Card>
      </div>
    </ChefPage>
  )
}

function Editor({ initial }: { initial: string[] }) {
  const toast = useToast()
  const save = useSavePantryStaples()
  const [staples, setStaples] = useState(initial)
  const [saisie, setSaisie] = useState('')
  const modifie = JSON.stringify(staples) !== JSON.stringify(initial)

  const ajouter = () => {
    const v = saisie.trim()
    if (!v || staples.length >= MAX) return
    // L'API dédoublonne aussi (casse, accents) ; ici on évite juste le doublon exact.
    if (!staples.some((s) => s.toLowerCase() === v.toLowerCase())) setStaples([...staples, v])
    setSaisie('')
  }

  return (
    <div>
      <p className="mb-3 flex flex-wrap items-center gap-1 text-[13px] leading-relaxed text-ink-mid">
        Ces produits sont retirés de la liste de courses du client.
        <InfoPopover label="Quand ma liste de produits de base s’applique-t-elle ?">
          Elle s’applique au prochain calcul d’une liste de courses. Les listes déjà
          calculées ou envoyées ne changent pas.
        </InfoPopover>
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ajouter()
        }}
        className="flex gap-2"
      >
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          maxLength={MAX_LEN}
          placeholder="Sel, huile d’olive, poivre…"
          aria-label="Ajouter un produit de base"
          className="input-base min-w-0 flex-1"
        />
        <button type="submit" disabled={!saisie.trim() || staples.length >= MAX} className="btn btn-outline text-xs disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter
        </button>
      </form>
      {staples.length >= MAX && (
        <p className="mt-2 text-xs text-ink-soft">{MAX} produits maximum.</p>
      )}

      {staples.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Aucun produit de base déclaré.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {staples.map((s) => (
            <li key={s} className="flex items-center gap-1 rounded-full bg-cream-soft py-1 pl-3 pr-1 text-sm text-navy">
              {s}
              <button
                type="button"
                onClick={() => setStaples(staples.filter((x) => x !== s))}
                aria-label={`Retirer ${s}`}
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-700"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={!modifie || save.isPending}
        onClick={() =>
          save.mutate(staples, {
            onSuccess: (r) => {
              setStaples(r.staples)
              toast.success('Produits de base enregistrés', 'Pris en compte au prochain calcul de liste.')
            },
            onError: (e) =>
              toast.error('Les produits de base n’ont pas été enregistrés', e instanceof ApiError ? e.message : undefined),
          })
        }
        className="btn btn-primary mt-5 text-xs disabled:opacity-55"
      >
        {save.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Check className="h-3.5 w-3.5" aria-hidden />
        )}
        Enregistrer
      </button>
    </div>
  )
}
