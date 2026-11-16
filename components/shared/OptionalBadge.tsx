/* ─────────────────────────────────────────────────────────────────────────────
   Une ligne de courses que toutes les recettes disent « facultative » (décision
   du 16/11) : elle reste dans la liste, avec ce badge. Une ligne obligatoire
   dans un seul des plats ne l'est pas.
   ───────────────────────────────────────────────────────────────────────────── */

export default function OptionalBadge() {
  return (
    <span
      title="Facultatif dans les recettes : à acheter si vous le souhaitez"
      className="ml-1.5 inline-flex rounded-full bg-cream-deep px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-ink-mid"
    >
      facultatif
    </span>
  )
}
