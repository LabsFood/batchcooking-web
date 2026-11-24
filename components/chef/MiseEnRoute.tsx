'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  LigneReduite,
  NoeudsRelies,
  Segments,
  type EtatEtape,
} from '@/components/shared/onboarding/Steppers'
import { useChefApplication, useChefDocuments } from '@/lib/api/chef-documents'
import { useChefOnboarding, type ChefOnboardingStep } from '@/lib/api/me-profile'
import { useReduit } from '@/lib/onboarding/reduit'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   « Votre arrivée sur Lab's Food » : le pendant chef de « Bien démarrer ».

   En haut, le parcours entier en cinq nœuds, linéaire et en lecture seule :
   candidature, dossier, vérification, mise en route, en ligne. En dessous, la
   mise en route elle-même (`GET /me/chef-onboarding`) : cinq cartes, dans
   l'ordre qu'on veut, un seul bouton ambre (la prochaine à faire).

   Avant, un batch cooker tout juste approuvé tombait sur « Votre agenda est
   libre » sans savoir qu'il lui fallait une vitrine, Stripe, une formule, des
   disponibilités et un menu pour être réservable.

   « Masquer » apparaît à 80 % et réduit la carte en une ligne, retenue d'une
   session à l'autre. Tout disparaît une fois le batch cooker en ligne.
   ───────────────────────────────────────────────────────────────────────────── */

const ETAPES: Record<
  ChefOnboardingStep['code'],
  { titre: string; texte: string; href: string; action: string }
> = {
  showcase: {
    titre: 'Ma vitrine',
    texte: 'Une photo de vous et quelques lignes de présentation.',
    href: '/espace-chef/vitrine',
    action: 'Compléter',
  },
  payouts: {
    titre: 'Virements Stripe',
    texte: 'Le compte qui reçoit vos paiements.',
    href: '/espace-chef/remuneration',
    action: 'Ouvrir',
  },
  service_offer: {
    titre: 'Ma première formule',
    texte: 'La durée et le prix d’une session.',
    href: '/espace-chef/tarifs',
    action: 'Créer',
  },
  availability: {
    titre: 'Mes disponibilités',
    texte: 'Les jours et heures où l’on peut vous réserver.',
    href: '/espace-chef/agenda',
    action: 'Ouvrir',
  },
  first_menu: {
    titre: 'Mon premier menu',
    texte: 'Au moins un menu publié, que les clients pourront choisir.',
    href: '/espace-chef/recettes',
    action: 'Créer',
  },
}

const SEUIL_MASQUER = 0.8

const jourMois = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' }) : undefined

export default function MiseEnRoute() {
  const onboarding = useChefOnboarding()
  const dossier = useChefDocuments()
  const candidature = useChefApplication()
  const [reduit, setReduit] = useReduit('chef')

  const data = onboarding.data
  // Pas encore approuvé : l'espace se limite au dossier. En ligne : plus rien à guider.
  if (!data || !data.verified || data.online) return null

  const prochaine = data.steps.find((s) => !s.done)
  const etats: EtatEtape[] = data.steps.map((s) =>
    s.done ? 'fait' : s.code === prochaine?.code ? 'en-cours' : 'a-venir',
  )
  const peutMasquer = data.completed / data.total >= SEUIL_MASQUER

  if (reduit && peutMasquer) {
    const suite = prochaine ? ETAPES[prochaine.code] : undefined
    return (
      <LigneReduite
        titre="Mise en route"
        etats={etats}
        fait={data.completed}
        total={data.total}
        prochaine={suite?.titre ?? 'relecture par l’équipe'}
        href={suite?.href}
        onReprendre={() => setReduit(false)}
      />
    )
  }

  const obligatoires = (dossier.data?.documents ?? []).filter((d) => d.family === 'blocking')
  const valides = obligatoires.filter((d) => d.status === 'valid').length

  return (
    <section className="panel p-5 lg:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-lg font-bold text-navy">Votre arrivée sur Lab’s Food</h2>
        <div className="flex items-center gap-4">
          <p className="text-sm tabular-nums text-ink-mid">
            {data.allDone ? (
              'Tout est prêt : l’équipe vous met en ligne'
            ) : (
              <>
                <strong className="font-semibold text-navy">{data.completed}</strong> sur{' '}
                {data.total} avant la mise en ligne
              </>
            )}
          </p>
          {peutMasquer && (
            <button
              type="button"
              onClick={() => setReduit(true)}
              className="hit text-sm font-semibold text-ink-mid hover:text-navy"
            >
              Masquer
            </button>
          )}
        </div>
      </div>

      <NoeudsRelies
        label="Votre parcours"
        className="mt-5"
        compact="mobile"
        noeuds={[
          {
            id: 'candidature',
            label: 'Candidature',
            detail: jourMois(candidature.data?.submittedAt)
              ? `Envoyée le ${jourMois(candidature.data?.submittedAt)}`
              : 'Envoyée',
            etat: 'fait',
          },
          {
            id: 'dossier',
            label: 'Dossier',
            detail: obligatoires.length ? `${valides} pièces sur ${obligatoires.length}` : 'Complet',
            etat: 'fait',
          },
          { id: 'verification', label: 'Vérification', detail: 'Validé', etat: 'fait' },
          {
            id: 'mise-en-route',
            label: 'Mise en route',
            detail: `${data.completed} sur ${data.total}`,
            etat: data.allDone ? 'fait' : 'en-cours',
          },
          {
            id: 'en-ligne',
            label: 'En ligne',
            detail: data.allDone ? 'Relecture par l’équipe' : 'Visible des clients',
            etat: data.allDone ? 'en-cours' : 'a-venir',
          },
        ]}
      />

      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <Segments etats={etats} />
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.steps.map((step, i) => {
            const e = ETAPES[step.code]
            const suivante = etats[i] === 'en-cours'
            return (
              <li
                key={step.code}
                className={cn(
                  'flex flex-col gap-2 rounded-2xl border bg-paper p-4',
                  suivante ? 'border-[1.5px] border-amber' : 'border-[var(--line)]',
                )}
              >
                <span
                  className={cn(
                    'self-start rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    step.done
                      ? 'bg-mint text-mint-ink'
                      : suivante
                        ? 'bg-amber-soft text-amber-ink'
                        : 'bg-cream-soft text-ink-soft',
                  )}
                >
                  {step.done ? 'Fait' : 'À faire'}
                </span>
                <h3 className="text-sm font-semibold text-navy">{e.titre}</h3>
                <p className="text-[13px] leading-relaxed text-ink-mid">{e.texte}</p>
                <div className="mt-auto pt-1">
                  {suivante ? (
                    <Link href={e.href} className="btn btn-amber">
                      {e.action}
                      <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
                    </Link>
                  ) : (
                    <Link
                      href={e.href}
                      className="hit inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-4 hover:underline"
                    >
                      {step.done ? 'Voir' : e.action}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
