import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   Briques des steppers horizontaux (onboarding client et chef, 24/11).

   Trois états, toujours dits par la couleur ET par un signe (coche ou numéro)
   ET en toutes lettres pour les lecteurs d'écran :
   - fait      : marine plein + coche ;
   - en cours  : ambre + halo ambre clair ;
   - à venir   : contour gris + numéro.

   Mêmes valeurs que le fil vertical de la candidature, qu'ils remplacent.
   ───────────────────────────────────────────────────────────────────────────── */

export type EtatEtape = 'fait' | 'en-cours' | 'a-venir'

export const ETAT_LU: Record<EtatEtape, string> = {
  fait: 'fait',
  'en-cours': 'en cours',
  'a-venir': 'à venir',
}

/** La pastille : coche si faite, numéro sinon. */
export function Pastille({
  etat,
  numero,
  petite,
}: {
  etat: EtatEtape
  numero: number
  petite?: boolean
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative z-[1] flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums transition-colors duration-200',
        petite ? 'h-5 w-5 text-[11px]' : 'h-7 w-7 text-xs',
        etat === 'fait' && 'bg-navy text-white',
        etat === 'en-cours' &&
          (petite ? 'bg-amber text-navy' : 'bg-amber text-navy shadow-[0_0_0_4px_var(--amber-soft)]'),
        etat === 'a-venir' && 'border-[1.5px] border-[var(--line-strong)] bg-paper text-ink-soft',
      )}
    >
      {etat === 'fait' ? (
        <Check className={petite ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={3} />
      ) : (
        numero
      )}
    </span>
  )
}

/** Barre en segments égaux : un segment par étape. Décorative (le texte porte le compte). */
export function Segments({ etats, className }: { etats: EtatEtape[]; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('grid gap-1', className)}
      style={{ gridTemplateColumns: `repeat(${etats.length}, minmax(0, 1fr))` }}
    >
      {etats.map((e, i) => (
        <span
          key={i}
          // slow-out : le segment change de couleur en 200 ms
          className={cn(
            'h-1.5 rounded-full transition-colors duration-200',
            e === 'fait' ? 'bg-navy' : e === 'en-cours' ? 'bg-amber' : 'bg-cream-deep',
          )}
        />
      ))}
    </div>
  )
}

export interface Noeud {
  id: string
  label: string
  detail?: string
  etat: EtatEtape
  /** Rend le nœud cliquable (étape atteinte). */
  onSelect?: () => void
}

/**
 * Nœuds reliés à l'horizontale. `compact` : sans libellés (mobile), le titre de
 * l'étape en cours s'affiche ailleurs ; `'mobile'` ne les retire que sous 640 px. Le trait entre deux nœuds est marine
 * quand le premier est fait.
 */
export function NoeudsRelies({
  noeuds,
  label,
  compact,
  className,
}: {
  noeuds: Noeud[]
  /** Nom de la liste pour les lecteurs d'écran. */
  label: string
  /** `true` : jamais de libellés ; `'mobile'` : libellés cachés sous 640 px. */
  compact?: boolean | 'mobile'
  className?: string
}) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex">
        {noeuds.map((n, i) => {
          const dernier = i === noeuds.length - 1
          const contenu = (
            <>
              <Pastille etat={n.etat} numero={i + 1} />
              <span
                className={cn(
                  'mt-2 block',
                  compact === true && 'sr-only',
                  compact === 'mobile' && 'max-sm:sr-only',
                )}
              >
                <span
                  className={cn(
                    'block text-[13px] font-semibold leading-tight',
                    n.etat === 'a-venir' ? 'text-ink-soft' : 'text-navy',
                  )}
                >
                  {n.label}
                </span>
                {n.detail && (
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
                    {n.detail}
                  </span>
                )}
              </span>
              <span className="sr-only"> : {ETAT_LU[n.etat]}</span>
            </>
          )
          return (
            <li key={n.id} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
              {!dernier && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-[13px] h-0.5 rounded-full transition-colors duration-200',
                    'left-[calc(50%+20px)] right-[calc(-50%+20px)]',
                    n.etat === 'fait' ? 'bg-navy' : 'bg-[var(--line-strong)]',
                  )}
                />
              )}
              {n.onSelect && n.etat !== 'en-cours' ? (
                <button
                  type="button"
                  onClick={n.onSelect}
                  className="flex flex-col items-center rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-4"
                >
                  {contenu}
                </button>
              ) : (
                <span
                  className="flex flex-col items-center px-1"
                  aria-current={n.etat === 'en-cours' ? 'step' : undefined}
                >
                  {contenu}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * La liste « masquée » : une ligne, toujours visible jusqu'à 100 %.
 * « Reprendre » rouvre la carte entière.
 */
export function LigneReduite({
  titre,
  etats,
  fait,
  total,
  prochaine,
  onReprendre,
  href,
}: {
  titre: string
  etats: EtatEtape[]
  fait: number
  total: number
  prochaine?: string
  onReprendre: () => void
  /** Lien de la prochaine étape, s'il y en a une. */
  href?: string
}) {
  return (
    <section className="panel flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
      <h2 className="font-display text-[15px] font-bold text-navy">{titre}</h2>
      <Segments etats={etats} className="w-28 sm:w-36" />
      <p className="min-w-0 flex-1 basis-48 text-sm text-ink-mid">
        <strong className="font-semibold tabular-nums text-navy">{fait}</strong> sur {total}
        {prochaine && (
          <>
            {' · '}Prochaine :{' '}
            {href ? (
              <Link href={href} className="font-semibold text-navy underline-offset-4 hover:underline">
                {prochaine}
              </Link>
            ) : (
              <span className="font-semibold text-navy">{prochaine}</span>
            )}
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onReprendre}
        className="hit inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-ink hover:underline underline-offset-4"
      >
        Reprendre
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </section>
  )
}
