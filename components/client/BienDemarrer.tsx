'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ChevronDown, Circle } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import { useMyOnboarding, type OnboardingStep } from '@/lib/api/me-profile'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   « Bien démarrer » (LF-0221) : ce que le client est invité à faire après la
   création de son compte, sur le modèle d'une liste de premiers pas. Chaque
   étape est faite dès que l'information existe (l'API le calcule, `GET
   /me/onboarding`) ; aucune ne bloque le reste de l'espace. Seule la
   déclaration d'allergies conditionne la validation d'un menu, et l'étape le dit.
   Le dossier URSSAF n'apparaît que si l'avance immédiate est proposée : sans
   lui, elle ne peut pas être ouverte.

   La liste disparaît une fois tout fait.

   Elle ne tient plus tout le haut de l'accueil. Repliée, elle montre où l'on
   en est et la prochaine étape, avec son bouton : c'est ce qu'il reste à faire
   qui compte, pas la liste de ce qui l'est déjà. Un nouveau compte la trouve
   dépliée ; dès que la moitié est faite, elle se replie d'elle-même.
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
  urssaf_dossier: {
    titre: 'Votre dossier URSSAF',
    texte:
      'Pour régler en avance immédiate : votre état civil et le compte que l’URSSAF prélèvera. À remplir une fois.',
    href: '/espace-client/compte/avance-immediate',
    action: 'Remplir',
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
  // `null` : l'utilisateur n'a pas encore choisi, l'avancement décide.
  const [choix, setChoix] = useState<boolean | null>(null)
  if (!data || data.allDone) return null

  const prochaine = data.steps.find((s) => !s.done)
  const ouvert = choix ?? data.completed * 2 < data.total
  const suite = prochaine ? ETAPES[prochaine.code] : null

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5 lg:px-6">
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-1 font-display text-lg font-bold text-navy">
              Bien démarrer
              <InfoPopover label="À quoi sert cette liste ?">
                Quelques étapes pour que votre première session se passe bien. Vous pouvez
                les faire dans l’ordre que vous voulez, et réserver sans les avoir toutes
                faites — sauf les allergies, sans lesquelles aucun menu ne peut être validé.
                La liste disparaît une fois tout fait.
              </InfoPopover>
            </h2>
            <p className="shrink-0 text-sm tabular-nums text-ink-mid">
              <strong className="font-semibold text-navy">{data.completed}</strong> sur {data.total}
            </p>
          </div>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-cream-deep"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={data.total}
            aria-valuenow={data.completed}
            aria-label="Étapes faites"
          >
            <div
              // slow-out : la barre avance en 200 ms
              className="h-full rounded-full bg-amber transition-[width] duration-200"
              style={{ width: `${(data.completed / data.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Repliée : la prochaine étape, et de quoi la faire. */}
        {!ouvert && suite && (
          <div className="flex min-w-0 flex-1 basis-80 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="min-w-0 text-sm text-ink-mid">
              Prochaine étape : <span className="font-semibold text-navy">{suite.titre}</span>
            </p>
            <Link href={suite.href} className="btn btn-outline">
              {suite.action}
              <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setChoix(!ouvert)}
          aria-expanded={ouvert}
          aria-controls="bien-demarrer-etapes"
          className="hit inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-ink-mid hover:text-navy"
        >
          {ouvert ? 'Replier' : 'Toutes les étapes'}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', ouvert && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      {ouvert && (
        <ol id="bien-demarrer-etapes" className="space-y-3 border-t border-[var(--line)] p-5 lg:px-6">
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
                      step.done ? 'text-ink-soft' : 'text-navy',
                    )}
                  >
                    {e.titre}
                    <span className="sr-only">{step.done ? ' : fait' : ' : à faire'}</span>
                    {!step.done && step.requiredFor === 'immediate_advance' && (
                      <InfoPopover label="Pourquoi ce dossier ?">
                        Avec l’avance immédiate, le crédit d’impôt de 50 % est déduit tout de
                        suite et l’URSSAF prélève le reste sur votre compte. Pour vous inscrire
                        auprès d’elle, Lab’s Food a besoin de votre état civil et de ce compte.
                        Vous pouvez réserver et payer autrement sans ce dossier.
                      </InfoPopover>
                    )}
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
                      'hit inline-flex shrink-0 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline',
                      step.code === prochaine?.code ? 'text-amber-ink' : 'text-navy',
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
      )}
    </section>
  )
}
