'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { InfoPopover } from '@/components/shared/InfoPopover'
import {
  ETAT_LU,
  LigneReduite,
  Pastille,
  Segments,
  type EtatEtape,
} from '@/components/shared/onboarding/Steppers'
import { useMyOnboarding, type OnboardingStep } from '@/lib/api/me-profile'
import { useReduit } from '@/lib/onboarding/reduit'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────────────────────────
   « Bien démarrer » (LF-0221) : ce que le client est invité à faire après la
   création de son compte, sur le modèle d'une liste de premiers pas. Chaque
   étape est faite dès que l'information existe (l'API le calcule, `GET
   /me/onboarding`) ; aucune ne bloque le reste de l'espace. Seule la
   déclaration d'allergies conditionne la validation d'un menu, et l'étape le dit.
   Le dossier URSSAF n'apparaît que si l'avance immédiate est proposée : sans
   lui, elle ne peut pas être ouverte.

   Stepper horizontal (24/11) : une barre en segments (un par étape) et une
   rangée de puces. Chaque puce ouvre son étape dans la carte du dessous, une à
   la fois et dans l'ordre qu'on veut ; à l'arrivée, c'est la prochaine à faire.

   « Masquer » apparaît à 60 %, et seulement une fois les allergies déclarées
   (sans elles, aucun menu n'est validé). Masquer ne cache pas : la carte se
   réduit en une ligne, retenue d'une session à l'autre, jusqu'à 100 %.
   La liste disparaît une fois tout fait.
   ───────────────────────────────────────────────────────────────────────────── */

/** Libellé court de la puce (2 à 4 mots) ; `titre` reste celui de la carte. */
const ETAPES: Record<
  OnboardingStep['code'],
  { puce: string; titre: string; texte: string; href: string; action: string }
> = {
  contact_details: {
    puce: 'Coordonnées',
    titre: 'Vos coordonnées',
    texte: 'Votre nom et votre téléphone, pour que votre batch cooker puisse vous joindre le jour J.',
    href: '/espace-client/parametres',
    action: 'Compléter',
  },
  address: {
    puce: 'Adresse',
    titre: 'Votre adresse',
    texte: 'Là où le batch cooker vient cuisiner : rue, code postal et ville.',
    href: '/espace-client/compte',
    action: 'Renseigner',
  },
  allergies: {
    puce: 'Allergies',
    titre: 'Vos allergies',
    texte: 'Indiquez vos allergies, ou dites que vous n’en avez aucune.',
    href: '/espace-client/profil#allergies',
    action: 'Déclarer',
  },
  tastes: {
    puce: 'Vos goûts',
    titre: 'Vos goûts',
    texte: 'Ce que vous aimez, ce que vous évitez, votre goût pour le piquant : vos menus vous ressembleront.',
    href: '/espace-client/profil',
    action: 'Personnaliser',
  },
  urssaf_dossier: {
    puce: 'Dossier URSSAF',
    titre: 'Votre dossier URSSAF',
    texte:
      'Pour régler en avance immédiate : votre état civil et le compte que l’URSSAF prélèvera. À remplir une fois.',
    href: '/espace-client/compte/avance-immediate',
    action: 'Remplir',
  },
  first_booking: {
    puce: 'Première session',
    titre: 'Votre première session',
    texte: 'Choisissez un batch cooker et une date.',
    href: '/espace-client/menus?reserve=1',
    action: 'Réserver',
  },
}

/** Seuil d'apparition de « Masquer ». */
const SEUIL_MASQUER = 0.6

export default function BienDemarrer() {
  const { data } = useMyOnboarding()
  const [reduit, setReduit] = useReduit('client')
  // `null` : rien de choisi, la carte montre la prochaine étape à faire.
  const [choisie, setChoisie] = useState<OnboardingStep['code'] | null>(null)
  const rangee = useRef<HTMLOListElement>(null)

  // Mobile : la rangée de puces s'ouvre centrée sur l'étape ouverte.
  useEffect(() => {
    const ol = rangee.current
    const puce = ol?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!ol || !puce || ol.scrollWidth <= ol.clientWidth) return
    ol.scrollLeft = puce.offsetLeft - (ol.clientWidth - puce.offsetWidth) / 2
  }, [data, choisie])

  if (!data || data.allDone) return null

  const prochaine = data.steps.find((s) => !s.done)
  const ouverte = data.steps.find((s) => s.code === choisie) ?? prochaine ?? data.steps[0]
  const etat = (s: OnboardingStep): EtatEtape =>
    s.done ? 'fait' : s.code === prochaine?.code ? 'en-cours' : 'a-venir'
  const etats = data.steps.map(etat)
  const pourcent = Math.round((data.completed / data.total) * 100)
  const allergiesFaites = data.steps.find((s) => s.code === 'allergies')?.done !== false
  const peutMasquer = data.completed / data.total >= SEUIL_MASQUER && allergiesFaites

  if (reduit && peutMasquer) {
    const suite = prochaine ? ETAPES[prochaine.code] : undefined
    return (
      <LigneReduite
        titre="Bien démarrer"
        etats={etats}
        fait={data.completed}
        total={data.total}
        prochaine={suite?.puce}
        href={suite?.href}
        onReprendre={() => setReduit(false)}
      />
    )
  }

  const e = ETAPES[ouverte.code]

  return (
    <section className="panel overflow-hidden">
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
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
          <div className="flex shrink-0 items-center gap-4">
            <p className="text-sm tabular-nums text-ink-mid">
              <strong className="font-semibold text-navy">{data.completed}</strong> sur{' '}
              {data.total}
              <span className="hidden sm:inline"> · {pourcent} %</span>
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
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={data.total}
          aria-valuenow={data.completed}
          aria-label="Étapes faites"
          className="mt-3"
        >
          <Segments etats={etats} />
        </div>

        {/* Les puces : défilent à l'horizontale sur mobile. */}
        <ol
          ref={rangee}
          className="relative -mx-4 mt-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:flex-wrap lg:overflow-visible">
          {data.steps.map((step, i) => {
            const st = etats[i]
            const active = step.code === ouverte.code
            return (
              <li key={step.code} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => setChoisie(step.code)}
                  aria-pressed={active}
                  aria-controls="bien-demarrer-etape"
                  className={cn(
                    'inline-flex items-center gap-2 whitespace-nowrap rounded-full border py-1 pl-1 pr-3 text-[13px] font-semibold transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2',
                    st === 'fait' && 'border-[var(--line)] bg-cream-soft text-ink-soft hover:text-navy',
                    st !== 'fait' && 'border-[var(--line-strong)] bg-paper text-navy hover:border-navy/40',
                    active && 'border-amber bg-[#FFF8EC] text-navy hover:border-amber',
                  )}
                >
                  <Pastille etat={st} numero={i + 1} petite />
                  {ETAPES[step.code].puce}
                  <span className="sr-only"> : {ETAT_LU[st]}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {/* L'étape ouverte : un seul bouton d'action. */}
      <div
        id="bien-demarrer-etape"
        aria-live="polite"
        className="mt-4 flex flex-col gap-3 border-t border-[var(--line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-semibold text-navy">
            {e.titre}
            {ouverte.done && <span className="font-normal text-mint-ink">· fait</span>}
            {!ouverte.done && ouverte.requiredFor === 'immediate_advance' && (
              <InfoPopover label="Pourquoi ce dossier ?">
                Avec l’avance immédiate, le crédit d’impôt de 50 % est déduit tout de
                suite et l’URSSAF prélève le reste sur votre compte. Pour vous inscrire
                auprès d’elle, Lab’s Food a besoin de votre état civil et de ce compte.
                Vous pouvez réserver et payer autrement sans ce dossier.
              </InfoPopover>
            )}
            {!ouverte.done && ouverte.requiredFor === 'menu_validation' && (
              <InfoPopover label="Pourquoi cette étape compte-t-elle ?">
                Vos allergies sont vérifiées contre chaque plat. Tant que vous
                n’avez pas répondu (une liste, ou « aucune »), votre batch cooker
                ne peut pas valider de menu pour vous.
              </InfoPopover>
            )}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-mid">{e.texte}</p>
        </div>
        <Link
          href={e.href}
          className={cn('btn shrink-0 justify-center', ouverte.done ? 'btn-outline' : 'btn-amber')}
        >
          {ouverte.done ? 'Modifier' : e.action}
          <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
