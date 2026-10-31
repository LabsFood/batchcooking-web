'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────────────────────
   « Composez votre menu », sur la page d'accueil.

   Chaque batch cooker tient sa propre carte, et le client y compose le sien :
   il n'y a pas de menu à annoncer ici. La section ne montre donc aucun plat et
   n'appelle pas l'API — elle dit comment ça marche et envoie vers `/menu`, où
   se font le choix du batch cooker, les filtres et la sélection des plats.
   ───────────────────────────────────────────────────────────────────────────── */

const SORTIE = [0.16, 1, 0.3, 1] as const

export default function FeaturedMenu() {
  return (
    <section className="section-padding section-cream relative">
      <div className="container-xl">
        <motion.div
          initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: SORTIE }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="h-section">
            Composez votre menu, <span className="accent">avec votre batch cooker.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-ink-mid">
            Chaque batch cooker propose sa propre carte. Rendez-vous sur la page Menu : filtrez par
            dates, région ou régime alimentaire, choisissez celui qui vous plaît, puis les plats que
            vous voulez retrouver dans votre frigo.
          </p>
          <Link href="/menu" className="btn btn-navy mt-9">
            Découvrir les menus
            <ArrowRight className="icon-arrow h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
