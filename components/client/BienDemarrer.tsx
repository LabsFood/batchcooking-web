'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useMyOnboarding, type OnboardingStep } from '@/lib/api/me-profile'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   « Bien démarrer » (LF-0221) : ce que le client est invité à faire après la
   création de son compte, sur le modèle d'une liste de premiers pas. Chaque
   étape est faite dès que l'information existe (l'API le calcule, `GET
   /me/onboarding`) ; aucune ne bloque le reste de l'espace. Seule la
   déclaration d'allergies conditionne la validation d'un menu, et l'étape le dit.

   La liste disparaît une fois tout fait.
   ───────────────────────────────────────────────────────────────────────────── */

const ETAPES: Record<
  OnboardingStep['code'],
  { titre: string; texte: string; href: string; action: string }
> = {
  contact_details: {
    titre: 'Vos coordonnées',
    texte: 'Votre nom et votre téléphone, pour que votre batch cooker puisse vous joindre le jour J.',
    href: '/espace-client/parametres',
    action: 'Compléter',
  },
  address: {
    titre: 'Votre adresse',
    texte: 'Là où le batch cooker vient cuisiner : rue, code postal et ville.',
    href: '/espace-client/compte',
    action: 'Renseigner',
  },
  allergies: {
    titre: 'Vos allergies',
    texte: 'Indiquez vos allergies, ou dites que vous n’en avez aucune.',
    href: '/espace-client/profil#allergies',
    action: 'Déclarer',
  },
  tastes: {
    titre: 'Vos goûts',
    texte: 'Ce que vous aimez, ce que vous évitez, votre goût pour le piquant : vos menus vous ressembleront.',
    href: '/espace-client/profil',
    action: 'Personnaliser',
  },
  first_booking: {
    titre: 'Votre première session',
    texte: 'Choisissez un batch cooker et une date.',
    href: '/espace-client/menus?reserve=1',
    action: 'Réserver',
  },
}

export default function BienDemarrer() {
  const { data } = useMyOnboarding()
  if (!data || data.allDone) return null
  const prochaine = data.steps.find((s) => !s.done)?.code

  return (
    <section className="rounded-3xl border border-border bg-white p-6 lg:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-1 font-display text-xl font-bold text-navy">
          Bien démarrer
          <InfoPopover label="À quoi sert cette liste ?">
            Quelques étapes pour que votre première session se passe bien. Vous pouvez
            les faire dans l’ordre que vous voulez, et réserver sans les avoir toutes
            faites — sauf les allergies, sans lesquelles aucun menu ne peut être validé.
            La liste disparaît une fois tout fait.
          </InfoPopover>
        </h2>
        <p className="text-sm text-ink-mid">
          <strong className="text-navy">{data.completed}</strong> étape
          {data.completed > 1 ? 's' : ''} sur {data.total}
        </p>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={data.total}
        aria-valuenow={data.completed}
        aria-label="Étapes faites"
      >
        <div
          className="h-full rounded-full bg-mint-ink transition-all"
          style={{ width: `${(data.completed / data.total) * 100}%` }}
        />
      </div>

      <ol className="mt-5 space-y-3">
        {data.steps.map((step) => {
          const e = ETAPES[step.code]
          return (
            <li key={step.code} className="flex items-start gap-3">
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint-ink" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'flex items-center gap-1 text-sm font-semibold',
                    step.done ? 'text-ink-soft line-through' : 'text-navy',
                  )}
                >
                  {e.titre}
                  <span className="sr-only">{step.done ? ' : fait' : ' : à faire'}</span>
                  {!step.done && step.requiredFor === 'menu_validation' && (
                    <InfoPopover label="Pourquoi cette étape compte-t-elle ?">
                      Vos allergies sont vérifiées contre chaque plat. Tant que vous
                      n’avez pas répondu (une liste, ou « aucune »), votre batch cooker
                      ne peut pas valider de menu pour vous.
                    </InfoPopover>
                  )}
                </p>
                {!step.done && <p className="mt-0.5 text-sm text-ink-mid">{e.texte}</p>}
              </div>
              {!step.done && (
                <Link
                  href={e.href}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline',
                    step.code === prochaine ? 'text-terra' : 'text-navy',
                  )}
                >
                  {e.action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
