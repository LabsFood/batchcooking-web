import Link from 'next/link'
import { ChefHat, Instagram, Facebook, Youtube, Mail, Phone, MapPin, ArrowRight } from 'lucide-react'

const LINKS = {
  service: [
    { label: 'Notre concept', href: '/#concept' },
    { label: 'Comment ça marche', href: '/#how-it-works' },
    { label: 'Nos formules', href: '/#pricing' },
    { label: 'Menu de la semaine', href: '/menu' },
    { label: 'Recettes du monde', href: '/recettes' },
  ],
  chefs: [
    { label: 'Nos chefs', href: '/chefs' },
    { label: 'Devenir chef', href: '/chefs/rejoindre' },
    { label: 'Avantage fiscal', href: '/avantage-fiscal' },
    { label: 'Témoignages', href: '/#testimonials' },
    { label: 'FAQ', href: '/faq' },
  ],
  legal: [
    { label: 'Mentions légales', href: '/mentions-legales' },
    { label: 'CGV / CGU', href: '/cgv' },
    { label: 'Confidentialité', href: '/confidentialite' },
    { label: 'Attestation SAP', href: '/attestation-sap' },
  ],
}

const SOCIAL = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
]

export default function Footer() {
  return (
    <footer className="bg-navy text-cream-soft">
      {/* Newsletter banner */}
      <div className="border-b border-white/10">
        <div className="container-xl py-14">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-md">
              <p className="eyebrow mb-3" style={{ color: '#F39C12' }}>Newsletter</p>
              <h3 className="font-display text-2xl lg:text-3xl font-bold text-white">
                Recevez le menu de la semaine
              </h3>
              <p className="text-cream-soft/70 text-sm mt-2">
                Inspirations culinaires & offres exclusives, chaque lundi.
              </p>
            </div>
            <form className="flex w-full lg:max-w-md gap-2">
              <input
                type="email"
                placeholder="votre@email.fr"
                className="flex-1 px-5 py-3.5 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-white/40 text-sm outline-none focus:border-terra transition-colors"
              />
              <button type="submit" className="btn btn-primary flex-shrink-0" aria-label="S'inscrire">
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container-xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-full bg-terra flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-white">
                  Lab&apos;s Food
                </p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-cream-soft/60 font-mono">
                  Batch Cooking
                </p>
              </div>
            </Link>
            <p className="text-cream-soft/70 text-sm leading-relaxed mb-6 max-w-sm">
              Un chef professionnel vient cuisiner une semaine entière de repas chez vous,
              en une seule session.
            </p>
            <div className="space-y-3 mb-6">
              <a href="mailto:contact@labsfood.fr"
                className="flex items-center gap-3 text-sm text-cream-soft/80 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-terra" />
                contact@labsfood.fr
              </a>
              <div className="flex items-center gap-3 text-sm text-cream-soft/80">
                <Phone className="w-4 h-4 text-terra" />
                Lun–Ven · 9h–17h
              </div>
              <div className="flex items-center gap-3 text-sm text-cream-soft/80">
                <MapPin className="w-4 h-4 text-terra" />
                France entière
              </div>
            </div>
            {/* Socials */}
            <div className="flex items-center gap-3">
              {SOCIAL.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-cream-soft/70 hover:text-white hover:bg-terra hover:border-terra transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Service links */}
          <div>
            <p className="text-white font-display text-base font-bold mb-5">Service</p>
            <ul className="space-y-3">
              {LINKS.service.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-cream-soft/70 hover:text-terra transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Chefs links */}
          <div>
            <p className="text-white font-display text-base font-bold mb-5">Chefs & infos</p>
            <ul className="space-y-3">
              {LINKS.chefs.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-cream-soft/70 hover:text-terra transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-white font-display text-base font-bold mb-5">Légal</p>
            <ul className="space-y-3 mb-6">
              {LINKS.legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-cream-soft/70 hover:text-terra transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="rounded-xl p-4 border border-white/15 bg-white/5">
              <p className="text-[10px] tracking-[0.2em] uppercase font-mono text-terra mb-1">
                Service agréé
              </p>
              <p className="text-sm text-white font-semibold">Service à la Personne</p>
              <p className="text-xs text-cream-soft/60 mt-0.5">N° SAP-XXXXXX</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream-soft/60">
            © {new Date().getFullYear()} Lab&apos;s Food. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2 text-xs text-cream-soft/60">
            <span>Paiement sécurisé</span>
            <span className="opacity-30">·</span>
            <span>Visa</span>
            <span className="opacity-30">·</span>
            <span>Mastercard</span>
            <span className="opacity-30">·</span>
            <span>Stripe</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
