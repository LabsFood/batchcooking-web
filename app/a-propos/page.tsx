'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Globe2,
  Sparkles,
  HeartHandshake,
  Clock,
  ChefHat,
  Quote,
  Sprout,
  Salad,
} from 'lucide-react'
import ReserveButton from '@/components/shared/ReserveButton'
import Image from 'next/image'

const VALUES = [
  {
    Icon: HeartHandshake,
    title: 'Soulager la charge mentale',
    text:
      'Le fameux "qu\'est-ce qu\'on mange ce soir ?" disparaît. Vous gagnez du temps, de la sérénité et le plaisir de bien manger.',
  },
  {
    Icon: Sprout,
    title: 'Du fait maison, vraiment',
    text:
      'Pas de plats sous vide ni de livraison-robot. Une cuisinière, votre cuisine, vos goûts — la semaine entière préparée sous vos yeux.',
  },
  {
    Icon: Globe2,
    title: 'Des saveurs du monde entier',
    text:
      'Inspirée par plusieurs pays explorés, nous vous proposons des menus authentiques.',
  },
  {
    Icon: Salad,
    title: 'Des recettes qui prennent soin de vous',
    text:
      'Allergies, intolérances, équilibre nutritionnel : les menus s\'adaptent à votre foyer, sans rien sacrifier au goût.',
  },
]

const NUMBERS = [
  { value: '22', label: 'Pays explorés' },
  { value: '30+', label: 'Sessions à domicile' },
  { value: '2 h', label: 'Pour la semaine entière' },
  { value: '100 %', label: 'Fait maison, chez vous' },
]

export default function AProposPage() {
  return (
    <div className="page-transition pt-24 bg-cream min-h-screen">
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy text-white py-20 lg:py-28">
        {/* <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber/25 blur-3xl pointer-events-none" /> */}
        {/* <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-mint/15 blur-3xl pointer-events-none" /> */}

        <div className="container-xl relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-5" style={{ color: '#F39C12' }}>
              À propos · Lab&apos;s Food
            </p>
            <h1
              className="font-display font-bold leading-[0.95]"
              style={{ fontSize: 'clamp(2.4rem, 6vw, 4.6rem)', letterSpacing: '-0.02em' }}
            >
              Vous redonner du temps,
              <span className="text-amber italic font-medium pl-3">
                et le goût des bonnes choses.
              </span>
            </h1>
            <p className="mt-6 text-white/70 text-lg max-w-xl leading-relaxed">
              Lab&apos;s Food, c&apos;est l&apos;histoire d&apos;un déclic devenu service. Une cheffe à
              domicile, votre cuisine, et toute une semaine de repas préparés en une seule
              session.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <ReserveButton variant="amber">
                Réserver une session
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </ReserveButton>
              <Link href="/menu" className="btn btn-outline-light">
                Voir les menus
              </Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="relative overflow-hidden aspect-[4/5] rounded-lg">
              <Image
                src="/images/ivyNewPic.jpeg"
                alt="Ivy Siyaptze, cheffe et fondatrice de Lab's Food"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                preload
                className="object-cover object-top"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-paper text-navy rounded-2xl p-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)] flex items-center gap-3 max-w-[260px]">
              <div className="w-10 h-10 rounded-full bg-amber flex items-center justify-center flex-shrink-0">
                <ChefHat className="w-5 h-5 text-navy" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Ivy Siyaptze</p>
                <p className="text-xs text-ink-soft mt-0.5">Fondatrice</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── NUMBERS ──────────────────────────────────────────────────── */}
      {/* <section className="bg-paper border-y border-[rgba(31,42,55,0.06)]">
        <div className="container-xl grid grid-cols-2 lg:grid-cols-4 divide-x divide-[rgba(31,42,55,0.06)]">
          {NUMBERS.map((n, i) => (
            <div key={n.label} className="px-4 py-8 lg:py-10 text-center">
              <p className="font-display text-3xl lg:text-5xl font-bold text-navy leading-none">
                {n.value}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] font-mono text-ink-soft mt-3">
                {n.label}
              </p>
            </div>
          ))}
        </div>
      </section> */}

      {/* ─── STORY ────────────────────────────────────────────────────── */}
      <section className="section-padding">
        <div className="container-xl grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">Mon histoire</p>
            <h2 className="h-section">
              Tout a commencé par
              <span className="accent pl-2">un regard de soulagement.</span>
            </h2>
            <div className="mt-6 inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-mint/40 border border-mint-deep/40 text-mint-ink">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold tracking-wide">
                Ingénieure devenue cheffe à domicile
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5 text-ink-mid leading-relaxed">
            <p className='text-justify'>
              Tout a commencé par un simple regard de soulagement. Celui de ma tante, alors
              enceinte et épuisée par le rythme du quotidien. Pour l&apos;aider, j&apos;ai tout
              naturellement pris les commandes de sa cuisine pour lui préparer ses repas de la
              semaine. La voir retrouver le sourire, se détendre et savourer ce temps libre
              retrouvé a été un véritable déclic.
            </p>
            <p className='text-justify'>
              Je me suis sentie utile, comme un ange gardien tombé du ciel. Je me suis alors
              posé une question évidente : pourquoi ne pas apporter cette même sérénité à
              d&apos;autres mamans, et plus largement, à tous ceux qui rêvent de bien manger sans
              avoir le temps de cuisiner ?
            </p>
            <p className='text-justify'>
              Dans la vie, je suis ingénieure de formation, spécialisée en gestion de projets
              et excellence opérationnelle. Des mots qui peuvent sembler bien loin de la
              gastronomie ! Pourtant, c&apos;est exactement le secret d&apos;un <em>batch cooking</em>{' '}
              réussi : de l&apos;organisation, de l&apos;optimisation et une méthode fluide. J&apos;ai
              simplement choisi de mettre cette rigueur au service de ma plus grande passion :
              régaler les autres.
            </p>
            <p className='text-justify'>
              Mon inspiration culinaire, je la puise dans mes carnets de voyage. J&apos;ai eu la
              chance d&apos;explorer 22 pays, et c&apos;est sur le terrain, au cœur des cuisines du
              monde entier, que j&apos;ai forgé mon savoir-faire. Lors de mes longs séjours à
              l&apos;étranger, je m&apos;immerge dans la culture locale, j&apos;apprends auprès de ceux qui
              transmettent les traditions familiales, et je valide parfois ces acquis par des
              certifications sur place.
            </p>
            <p className='text-justify'>
              C&apos;est ce véritable tour du monde qui me permet aujourd&apos;hui de vous proposer
              des menus authentiques, savoureux et infiniment variés, pour que chaque semaine
              soit une nouvelle découverte.
            </p>

            <blockquote className="relative pl-6 border-l-2 border-amber py-2 mt-8">
              <Quote className="w-5 h-5 text-amber absolute -left-3 -top-1 bg-cream" />
              <p className="font-display text-lg lg:text-xl text-navy italic leading-relaxed text-justify">
                Mon but est simple : vous soulager de la fameuse charge mentale du
                « qu&apos;est-ce qu&apos;on mange ce soir ? » tout en prenant soin de votre
                alimentation.
              </p>
              <footer className="mt-3 text-sm text-ink-soft">— Ivy, fondatrice</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ─── VALUES ───────────────────────────────────────────────────── */}
      <section className="section-padding section-cream-soft">
        <div className="container-xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="eyebrow mb-4 justify-center">Notre love language</p>
            <h2 className="h-section">
              Une cuisine qui prend <span className="accent">soin de vous.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VALUES.map(({ Icon, title, text }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="card-base p-6 lg:p-7 flex gap-4"
              >
                <span className="w-12 h-12 rounded-2xl bg-amber-soft text-amber-deep flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-navy mb-1.5">
                    {title}
                  </h3>
                  <p className="text-sm text-ink-mid leading-relaxed">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ZONE ───────────────────────────────────────────────────────
      <section className="section-padding">
        <div className="container-xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="eyebrow mb-4">Notre terrain de jeu</p>
            <h2 className="h-section">
              Une cuisine sous le<br />
              <span className="accent">soleil de la Côte d&apos;Azur.</span>
            </h2>
            <p className="mt-6 text-ink-mid leading-relaxed max-w-xl">
              Lab&apos;s Food intervient sur l&apos;ensemble de la Côte d&apos;Azur — Nice, Cannes,
              Antibes, Monaco, Menton, Saint-Raphaël et alentours. Aucun frais de
              déplacement n&apos;est facturé en supplément.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 text-sm text-mint-ink bg-mint/40 border border-mint-deep/40 rounded-full px-4 py-2">
              <Clock className="w-4 h-4" />
              Sessions disponibles 7 j / 7
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-[rgba(31,42,55,0.06)] aspect-[4/3]">
            <iframe
              title="Zone Côte d'Azur"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d369145.5!2d6.94!3d43.65!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sCote%20d%27Azur!5e0!3m2!1sfr!2sfr!4v1700000000000"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section> */}

      {/* ─── CTA ──────────────────────────────────────────────────────── */}
      {/* <section className="section-padding section-paper">
        <div className="container-xl">
          <div className="relative overflow-hidden rounded-3xl bg-navy text-white p-10 lg:p-14 text-center">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber/25 blur-3xl pointer-events-none" />
            <p className="eyebrow justify-center mb-4" style={{ color: '#F39C12' }}>
              Prochaine étape
            </p>
            <h2
              className="font-display font-bold leading-[0.95]"
              style={{ fontSize: 'clamp(2rem, 4.6vw, 3.6rem)', letterSpacing: '-0.02em' }}
            >
              Prêt·e à reprendre<br />
              <span className="text-amber italic font-medium">une semaine de répit ?</span>
            </h2>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <ReserveButton variant="amber">
                Réserver ma session
                <ArrowRight className="w-4 h-4 icon-arrow" />
              </ReserveButton>
              <Link href="/faq" className="btn btn-outline-light">
                Lire la FAQ
              </Link>
            </div>
          </div>
        </div>
      </section> */}
    </div>
  )
}
