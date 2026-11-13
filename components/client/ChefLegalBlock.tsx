import { legalIdentityLines, type ChefLegalIdentity } from '@/lib/api/contract'

/**
 * L'identité légale du batch cooker (CGV art. 3.2), telle qu'il l'a renseignée.
 * Un champ vide n'est pas affiché, et ne bloque jamais la commande.
 */
export function ChefLegalBlock({
  identity,
  displayName,
}: {
  identity: ChefLegalIdentity | null | undefined
  displayName?: string | null
}) {
  const lines = legalIdentityLines(identity)
  if (lines.length === 0) return null
  return (
    <div className="rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-4">
      <p className="font-display text-base font-bold text-navy">
        Votre batch cooker{displayName ? ` : ${displayName}` : ''}
      </p>
      <dl className="mt-2 space-y-1 text-[13px] leading-relaxed">
        {lines.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-40 shrink-0 text-ink-soft">{label}</dt>
            <dd className="text-ink-mid">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
