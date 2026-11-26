import Link from 'next/link'
import {
  Instagram, Linkedin, Facebook,
  Mail, Phone, MapPin, ArrowRight, ArrowUpRight,
} from 'lucide-react'
import Logo from '@/components/shared/Logo'
import ReserveButton from '@/components/shared/ReserveButton'
import CookieSettingsLink from './CookieSettingsLink'

const LINKS = {
  service: [
    { label: 'Notre concept', href: '/#concept' },
    { label: 'Comment ça marche ?', href: '/#how-it-works' },
    { label: 'Devenir batch cooker', href: '/devenir-chef' },
    { label: 'Espace batch cooker', href: '/auth/login' },
  ],
  about: [
    { label: 'À propos', href: '/a-propos' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
  ],
  legal: [
    { label: 'Mentions légales', href: '/mentions-legales' },
    { label: 'Comment fonctionne la plateforme', href: '/mentions-legales#fonctionnement' },
    { label: 'CGU', href: '/cgu' },
    { label: 'CGV', href: '/cgv' },
    { label: 'Confidentialité', href: '/confidentialite' },
    { label: 'Se rétracter', href: '/espace-client/commandes' },
    { label: 'Signaler un contenu', href: 'mailto:signalement@labsfood.fr' },
  ],
}

/** lucide-react n'a pas d'icône TikTok : le logo est tracé ici, au même gabarit. */
function TikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.6 6.7a5.3 5.3 0 0 1-3.2-1.1 5.3 5.3 0 0 1-2-3.6h-3.3v12.6a2.4 2.4 0 1 1-1.7-2.3V8.9a5.7 5.7 0 1 0 5 5.7V9.2a8.6 8.6 0 0 0 5.2 1.7V7.6a5.3 5.3 0 0 1-.1-.9Z" />
    </svg>
  )
}

const SOCIAL = [
  { Icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/labs_food' },
  { Icon: Facebook, label: 'Facebook', href: 'https://www.facebook.com/share/1CD552gDxM/?mibextid=wwXIfr' },
  { Icon: TikTok, label: 'TikTok', href: 'https://www.tiktok.com/@labs_food' },
  { Icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/company/labs-food' },
]

export default function Footer() {
  return (
    <footer className="relative">
      {/* ── CTA STRIPE ──────────────────────────────────────────────── */}
      <section className="relative px-4 -mb-24 z-10">
        <div className="container-xl">
          {/*
            Blanc sur ambre (décision du 26/11 — préférence de marque, 2,2:1
            assumé). Ni surtitre, ni mot en italique, ni filigrane : le titre
            et le bouton suffisent (docs/ui-ux-guidelines.md, § 4).
          */}
          <div className="rounded-3xl bg-terra p-8 text-white shadow-[0_24px_48px_-28px_rgba(31,42,55,0.55)] sm:p-10 lg:p-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <h2
                className="max-w-xl font-display font-bold leading-[1.02] text-white"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', letterSpacing: '-0.02em' }}
              >
                Cuisinons ensemble cette semaine.
              </h2>
              <ReserveButton variant="navy" className="shrink-0 self-start lg:self-auto">
                Réserver ma session
                <ArrowRight className="icon-arrow h-4 w-4" aria-hidden />
              </ReserveButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN FOOTER ────────────────────────────────────────────── */}
      <div className="bg-navy text-cream-soft pt-40 pb-10 relative overflow-hidden">

        <div className="container-xl relative">
          {/* Top : Brand statement */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-14 border-b border-white/10">
            {/* Brand statement */}
            <div className="lg:col-span-7">
              <Logo variant="white" size="lg" className="mb-7" />
              <p
                className="font-display font-bold text-white leading-[0.95]"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 4.5rem)', letterSpacing: '-0.025em' }}
              >
                Le batch cooking, à votre porte.
              </p>
              <p className="mt-6 text-cream-soft/65 max-w-md text-base leading-relaxed">
                Un cuisinier vient préparer une semaine entière de repas chez vous,
                en une seule session.
              </p>
            </div>

          </div>

          {/* Middle : Contact + Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 py-14 border-b border-white/10">
            {/* Contact */}
            <div className="lg:col-span-4">
              <p className="mb-5 font-display text-base font-bold text-white">Nous contacter</p>
              <ul className="space-y-4">
                <li>
                  <a href="mailto:contact@labsfood.fr"
                    className="group flex items-center gap-3 text-cream-soft hover:text-white transition-colors">
                    <span className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center group-hover:bg-terra group-hover:border-terra transition-colors">
                      <Mail className="w-4 h-4" />
                    </span>
                    <span className="text-sm">contact@labsfood.fr</span>
                  </a>
                </li>
                <li className="flex items-center gap-3 text-cream-soft">
                  <span className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </span>
                  <a href="tel:+33749755684" className="text-sm hover:text-white">07 49 75 56 84 · Lun–Ven 9h–17h</a>
                </li>
                <li className="flex items-center gap-3 text-cream-soft">
                  <span className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <span className="text-sm">France entière</span>
                </li>
              </ul>

              {/* Socials */}
              <div className="mt-8">
                <p className="mb-4 text-sm font-semibold text-cream-soft/70">Suivez-nous</p>
                <div className="flex items-center gap-3">
                  {SOCIAL.map(({ Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-cream-soft transition-colors duration-200 hover:border-terra hover:bg-terra hover:text-navy"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Service */}
            <FooterColumn title="Service" span="lg:col-span-3">
              {LINKS.service.map((l) => <FooterLink key={l.href} {...l} />)}
            </FooterColumn>

            {/* À propos */}
            <FooterColumn title="À propos">
              {LINKS.about.map((l) => <FooterLink key={l.href} {...l} />)}
            </FooterColumn>

            {/* Legal */}
            <FooterColumn title="Légal" span="lg:col-span-3">
              {LINKS.legal.map((l) => <FooterLink key={l.href} {...l} />)}
              <CookieSettingsLink />
            </FooterColumn>
          </div>

          {/* Massive brand wordmark */}
          <div aria-hidden className="pointer-events-none select-none py-12 text-center">
            <p
              className="font-display font-bold leading-none tracking-[-0.04em] text-white/[0.07]"
              style={{ fontSize: 'clamp(4rem, 16vw, 14rem)' }}
            >
              Lab&apos;s Food
            </p>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cream-soft/55">
              <p>© {new Date().getFullYear()} LAB&apos;S FOOD - BATCHCOOKING</p>
              <span className="hidden md:inline opacity-30">·</span>
              <p>LAB&apos;S FOOD - BATCHCOOKING SASU · 200 rue de la Croix Nivert, 75015 Paris</p>
              <span className="hidden md:inline opacity-30">·</span>
              <p>Agréé Services à la Personne n°&nbsp;SAP100715036</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-cream-soft/55">
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
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  children,
  span = 'lg:col-span-2',
}: {
  title: string
  children: React.ReactNode
  /** Service et Légal portent des libellés longs : trois colonnes, pour tenir sur une ligne. */
  span?: string
}) {
  return (
    <div className={span}>
      <p className="text-white font-display text-base font-bold mb-5">{title}</p>
      <ul className="space-y-3">{children}</ul>
    </div>
  )
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 text-sm text-cream-soft/65 hover:text-terra transition-colors"
      >
        <span className="xl:whitespace-nowrap">{label}</span>
        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </Link>
    </li>
  )
}
