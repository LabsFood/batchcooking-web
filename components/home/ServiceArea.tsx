'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Home, ShieldCheck } from 'lucide-react'
import { fadeUpInView } from '@/lib/motion'

/* ─────────────────────────────────────────────────────────────────────────────
   « Partout en France » — refonte du 26/11.

   La vraie carte (Google Maps, chargée paresseusement) dans un cadre de la
   charte, et à côté ce qu'elle veut dire : à domicile, certifiés, agréés.
   La carte est un décor cliquable ; tout ce qu'elle dit est dans le texte.
   ───────────────────────────────────────────────────────────────────────────── */

const FAITS = [
  {
    Icon: Home,
    titre: 'Chez vous, à domicile',
    texte: 'Le batch cooker se déplace avec son matériel et cuisine dans votre cuisine.',
  },
  {
    Icon: BadgeCheck,
    titre: 'Certifiés et assurés',
    texte: 'Chaque batch cooker est vérifié, formé à l’hygiène et couvert par une assurance.',
  },
  {
    Icon: ShieldCheck,
    titre: 'Agréé Services à la Personne',
    texte: 'N° SAP100715036 — 50 % de crédit d’impôt sur chaque session.',
  },
]

export default function ServiceArea() {
  return (
    <section className="section-padding section-cream relative overflow-hidden">
      <div className="container-xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* ── La carte, la vraie ─────────────────────────────────── */}
          {/* slow-out : la carte se pose en 240 ms */}
          <motion.div
            {...fadeUpInView()}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[var(--line)] shadow-[0_30px_70px_-30px_rgba(31,42,55,0.35)] lg:aspect-auto lg:min-h-[440px]"
          >
            <iframe
              src="https://www.google.com/maps?q=France&z=5&output=embed&hl=fr"
              className="h-full w-full"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Zone d'intervention Lab's Food — France entière"
            />
          </motion.div>

          {/* ── Ce que la carte veut dire ──────────────────────────── */}
          <motion.div {...fadeUpInView(0.08)}>
            <h2 className="h-section mb-5">Partout en France, chez vous.</h2>
            <p className="mb-9 max-w-xl leading-relaxed text-ink-mid">
              Les premiers batch cookers cuisinent sur la Côte d&apos;Azur, et le réseau
              grandit dans toute la France. Indiquez vos dates et votre région : vous verrez
              qui peut venir chez vous.
            </p>

            <ul className="space-y-6">
              {FAITS.map(({ Icon, titre, texte }) => (
                <li key={titre} className="flex gap-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-soft">
                    <Icon className="h-5 w-5 text-amber-deep" aria-hidden />
                  </span>
                  <div>
                    <p className="mb-1 font-semibold text-navy">{titre}</p>
                    <p className="text-sm leading-relaxed text-ink-mid">{texte}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link href="/menu" className="btn btn-navy mt-10">
              Trouver un batch cooker
              <ArrowRight className="icon-arrow h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
