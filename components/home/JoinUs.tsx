'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck, ChefHat, ShoppingBasket, Store, Wallet } from 'lucide-react'
import {
  MONTRER_CONNEXION,
  MONTRER_RECRUTEMENT,
  RIEN_A_REJOINDRE,
} from '@/lib/flags'

/* ─────────────────────────────────────────────────────────────────────────────
   Deux publics, deux portes.

   Bas de page d'accueil : le visiteur repart soit en client qui crée son
   compte, soit en cuisinier qui candidate. Les deux colonnes sont traitées à
   égalité, sur deux fonds différents pour qu'on ne confonde pas les chemins.

   Chaque colonne est une invitation à s'inscrire : quand l'inscription est
   mise en sourdine, la colonne part avec elle. Les deux fermées, la section
   entière disparaît — une section « deux portes » sans aucune porte serait
   une promesse vide au bas de l'accueil.
   ───────────────────────────────────────────────────────────────────────────── */

const CLIENT_POINTS = [
  { Icon: CalendarCheck, text: 'Une session de 2 h, toute la semaine de repas' },
  { Icon: ShoppingBasket, text: 'Liste de courses prête, ou courses faites pour vous' },
  { Icon: Wallet, text: '50 % de crédit d’impôt, service à la personne' },
]

const CHEF_POINTS = [
  { Icon: Store, text: 'Votre vitrine, vos menus, vos tarifs' },
  { Icon: CalendarCheck, text: 'Vos horaires posés par vous, dans votre agenda' },
  { Icon: Wallet, text: 'Vous saisissez votre net : le reste est calculé' },
]

export default function JoinUs() {
  if (RIEN_A_REJOINDRE) return null

  return (
    <section className="bg-cream py-20 lg:py-24">
      <div className="container-xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2
            className="font-display font-bold leading-tight text-navy"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', letterSpacing: '-0.02em' }}
          >
            On commence <span className="font-medium italic text-terra">par où ?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-mid">
            Faire garnir votre frigo, ou cuisiner chez les autres : Lab&apos;s Food, c&apos;est les deux côtés de la
            même cuisine.
          </p>
        </div>

        <div
          className={
            MONTRER_CONNEXION && MONTRER_RECRUTEMENT
              ? 'grid grid-cols-1 gap-5 lg:grid-cols-2'
              : 'mx-auto grid max-w-2xl grid-cols-1 gap-5'
          }
        >
          {/* Client */}
          {MONTRER_CONNEXION && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col rounded-2xl border border-[rgba(31,42,55,0.08)] bg-paper p-7 lg:p-9"
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(243,156,18,0.12)] text-terra">
              <ShoppingBasket className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="font-display text-2xl font-bold leading-tight text-navy">Je veux être servi</h3>
            <p className="mt-2 leading-relaxed text-ink-mid">
              Créez votre compte, choisissez votre batch cooker et réservez votre première session.
            </p>

            <ul className="mt-6 space-y-3">
              {CLIENT_POINTS.map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-ink">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-terra" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3 pt-2">
              <Link href="/auth/register" className="btn btn-primary text-sm">
                Créer mon compte
                <ArrowRight className="icon-arrow h-4 w-4" />
              </Link>
              <Link href="/menu" className="btn btn-outline text-sm">
                Voir les menus
              </Link>
            </div>
          </motion.div>
          )}

          {/* Batch cooker */}
          {MONTRER_RECRUTEMENT && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col overflow-hidden rounded-2xl bg-navy p-7 text-white lg:p-9"
          >
            <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber/15 blur-3xl" />
            <div className="relative flex flex-1 flex-col">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-amber">
                <ChefHat className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-display text-2xl font-bold leading-tight">Je veux cuisiner</h3>
              <p className="mt-2 leading-relaxed text-white/70">
                Rejoignez les batch cookers : vous cuisinez, nous amenons les clients et la logistique.
              </p>

              <ul className="mt-6 space-y-3">
                {CHEF_POINTS.map(({ Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-white/85">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3 pt-2">
                <Link href="/devenir-chef" className="btn btn-amber text-sm">
                  Devenir batch cooker
                  <ArrowRight className="icon-arrow h-4 w-4" />
                </Link>
                <Link href="/auth/login" className="btn btn-outline-light text-sm">
                  J&apos;ai déjà un compte
                </Link>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-white/45">
                Candidature en une dizaine de minutes. Votre compte est créé une fois votre dossier validé.
              </p>
            </div>
          </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
