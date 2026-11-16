import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Un prix, dit dans le bon ordre.

   Le crédit d'impôt de 50 % n'est pas une remise hypothétique : c'est ce que
   la prestation coûte réellement au client. L'afficher en second, en petit,
   après un total TTC deux fois plus gros, revient à annoncer un prix que
   personne ne paie — et à faire fuir avant la ligne qui rassure.

   Donc : **le reste à charge d'abord**, en grand. Le total avant déduction
   reste visible, dessous, parce qu'il faut pouvoir vérifier le calcul et que
   c'est lui qui figurera sur la facture.

   Un seul composant pour toutes les surfaces client : le jour où la règle
   change, elle change ici.
   ───────────────────────────────────────────────────────────────────────────── */

type Tone = 'light' | 'dark'
type Taille = 'sm' | 'md' | 'lg'

const CHIFFRE: Record<Taille, string> = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
}

export function Prix({
  apresCredit,
  total,
  lead,
  tone = 'light',
  taille = 'md',
  align = 'left',
  className,
}: {
  /** Le reste à charge après crédit d'impôt, déjà formaté. */
  apresCredit: string | null
  /** Le total avant déduction, déjà formaté. */
  total: string | null
  /** « À partir de », « Total », … Omis, le prix parle seul. */
  lead?: string
  tone?: Tone
  taille?: Taille
  align?: 'left' | 'right'
  className?: string
}) {
  const sombre = tone === 'dark'

  // Sans reste à charge connu, le total fait office de prix : mieux vaut un
  // chiffre juste qu'un trou. Sans l'un ni l'autre, on le dit.
  const principal = apresCredit ?? total
  if (!principal) {
    return (
      <p className={cn('text-xs', sombre ? 'text-white/55' : 'text-ink-soft', className)}>
        Tarif sur demande
      </p>
    )
  }

  return (
    <div className={cn(align === 'right' && 'text-right', className)}>
      {lead && (
        <p className={cn('mb-1.5 text-xs leading-none', sombre ? 'text-white/55' : 'text-ink-soft')}>
          {lead}
        </p>
      )}
      <p
        className={cn(
          'flex flex-wrap items-baseline gap-x-2 gap-y-1',
          align === 'right' && 'justify-end',
        )}
      >
        <span
          className={cn(
            'font-display font-bold leading-none tabular-nums',
            CHIFFRE[taille],
            sombre ? 'text-amber' : 'text-navy',
          )}
        >
          {principal}
        </span>
        <span className={cn('text-xs leading-none', sombre ? 'text-white/65' : 'text-ink-mid')}>
          {apresCredit ? 'après crédit d’impôt' : 'avant crédit d’impôt'}
        </span>
      </p>
      {apresCredit && total && (
        <p
          className={cn(
            'mt-1.5 text-xs leading-none tabular-nums',
            sombre ? 'text-white/45' : 'text-ink-soft',
          )}
        >
          {total} avant déduction
        </p>
      )}
    </div>
  )
}

/**
 * La même règle sur une seule ligne, pour les listes denses où un bloc de
 * trois lignes casserait le rythme.
 */
export function PrixLigne({
  apresCredit,
  total,
  tone = 'light',
  className,
}: {
  apresCredit: string | null
  total: string | null
  tone?: Tone
  className?: string
}) {
  const sombre = tone === 'dark'
  const principal = apresCredit ?? total
  if (!principal) return null

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className={cn('font-semibold tabular-nums', sombre ? 'text-white' : 'text-navy')}>
        {principal}
      </span>
      <span className={cn('text-xs', sombre ? 'text-white/55' : 'text-ink-soft')}>
        {apresCredit ? 'après crédit d’impôt' : 'avant crédit d’impôt'}
      </span>
    </span>
  )
}
