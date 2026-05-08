import Link from 'next/link'
import {
  Instagram, Facebook, Youtube,
  Mail, Phone, MapPin, ArrowRight, ArrowUpRight,
} from 'lucide-react'
import Logo from '@/components/shared/Logo'
import ReserveButton from '@/components/shared/ReserveButton'

const LINKS = {
  service: [
    { label: 'Notre concept',         href: '/#concept' },
    { label: 'Comment ça marche',     href: '/#how-it-works' },
    { label: 'Nos formules',          href: '/#pricing' },
    { label: 'Menu de la semaine',    href: '/menu' },
  ],
  about: [
    { label: 'À propos',         href: '/a-propos' },
    { label: 'Notre histoire',   href: '/a-propos#histoire' },
    { label: 'Témoignages',      href: '/#testimonials' },
    { label: 'FAQ',              href: '/faq' },
  ],
  legal: [
    { label: 'Mentions légales',  href: '/mentions-legales' },
    { label: 'CGV',               href: '/cgv' },
    { label: 'Confidentialité',   href: '/confidentialite' },
    { label: 'Cookies',           href: '/confidentialite#cookies' },
  ],
}

const SOCIAL = [
  { Icon: Instagram, label: 'Instagram', href: '#' },
  { Icon: Facebook,  label: 'Facebook',  href: '#' },
  { Icon: Youtube,   label: 'YouTube',   href: '#' },
]

export default function Footer() {
  return (
    <footer className="relative">
      {/* ── CTA STRIPE ──────────────────────────────────────────────── */}
      <section className="relative px-4 -mb-24 z-10">
        <div className="container-xl">
          <div className="relative bg-terra rounded-3xl overflow-hidden p-10 lg:p-14 text-white shadow-[0_30px_70px_-30px_rgba(217,105,65,0.6)]">
            {/* Decorative dot pattern bottom-right */}
            <div className="absolute right-8 bottom-8 grid grid-cols-6 gap-2 opacity-25 pointer-events-none">
              {Array.from({ length: 36 }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
              ))}
            </div>
            {/* Big watermark word */}
            <span
              aria-hidden="true"
              className="absolute -top-6 -right-6 font-display font-bold text-white/[0.08] leading-none select-none pointer-events-none"
              style={{ fontSize: 'clamp(8rem, 18vw, 18rem)' }}
            >
              Hello.
            </span>

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-white/70 text-xs font-mono uppercase tracking-[0.2em] mb-4">
                  Et maintenant ?
                </p>
                <h3
                  className="font-display font-bold text-white leading-[0.95]"
                  style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', letterSpacing: '-0.02em' }}
                >
                  Cuisinons ensemble<br />
                  <span className="italic font-medium">cette semaine.</span>
                </h3>
              </div>
              <div className="lg:justify-self-end">
                <ReserveButton
                  asChild
                  className="group inline-flex items-center gap-4 bg-white text-navy rounded-full pl-8 pr-3 py-3 font-semibold uppercase text-sm tracking-[0.08em] hover:bg-navy hover:text-white transition-colors duration-300"
                >
                  Réserver ma session
                  <span className="w-11 h-11 rounded-full bg-terra text-white flex items-center justify-center group-hover:bg-white group-hover:text-navy transition-colors duration-300">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </ReserveButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN FOOTER ────────────────────────────────────────────── */}
      <div className="bg-navy text-cream-soft pt-40 pb-10 relative overflow-hidden">
        {/* Decorative dot grid — top left */}
        <div className="absolute top-44 left-8 grid grid-cols-6 gap-2 opacity-15 pointer-events-none hidden md:grid">
          {Array.from({ length: 36 }).map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-terra" />
          ))}
        </div>
        {/* Decorative blurred gradient — bottom right */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(217,105,65,0.18), transparent 70%)' }} />

        <div className="container-xl relative">
          {/* Top : Brand statement + Newsletter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-14 border-b border-white/10">
            {/* Brand statement */}
            <div className="lg:col-span-7">
              <Logo variant="white" size="lg" className="mb-7" />
              <p
                className="font-display font-bold text-white leading-[0.95]"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 4.5rem)', letterSpacing: '-0.025em' }}
              >
                Le batch cooking,<br />
                <span className="text-terra italic font-medium">à votre porte.</span>
              </p>
              <p className="mt-6 text-cream-soft/65 max-w-md text-base leading-relaxed">
                Un chef professionnel vient cuisiner une semaine entière de repas chez vous,
                en une seule session. Sain, varié, sans effort.
              </p>
            </div>

            {/* Newsletter */}
            <div className="lg:col-span-5 lg:pl-10 lg:border-l lg:border-white/10">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terra mb-4">
                Newsletter hebdo
              </p>
              <h4 className="font-display text-2xl text-white font-bold mb-3 leading-tight">
                Recevez le menu de la semaine
              </h4>
              <p className="text-sm text-cream-soft/65 mb-6">
                Inspirations culinaires & offres exclusives, chaque lundi matin.
              </p>
              <form className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="email"
                  required
                  placeholder="votre@email.fr"
                  className="flex-1 px-5 py-3.5 bg-white/[0.06] border border-white/15 rounded-full text-white placeholder:text-white/35 text-sm outline-none focus:border-terra focus:bg-white/[0.1] transition-all"
                />
                <button
                  type="submit"
                  className="bg-terra hover:bg-terra-deep text-white font-semibold uppercase text-xs tracking-[0.08em] rounded-full px-6 py-3.5 transition-all hover:shadow-[0_10px_24px_-8px_rgba(217,105,65,0.6)] flex items-center justify-center gap-2"
                >
                  S&apos;inscrire
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
              <p className="text-xs text-cream-soft/45">
                Pas de spam. Désabonnement en 1 clic.
              </p>
            </div>
          </div>

          {/* Middle : Contact + Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 py-14 border-b border-white/10">
            {/* Contact */}
            <div className="lg:col-span-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-terra mb-5">
                Nous contacter
              </p>
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
                  <span className="text-sm">Lun–Ven · 9h–17h</span>
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
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cream-soft/45 mb-4">
                  Suivez-nous
                </p>
                <div className="flex items-center gap-3">
                  {SOCIAL.map(({ Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      className="group w-11 h-11 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center text-cream-soft hover:bg-terra hover:border-terra hover:text-white transition-all duration-300 hover:-translate-y-1"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Service */}
            <FooterColumn title="Service">
              {LINKS.service.map((l) => <FooterLink key={l.href} {...l} />)}
            </FooterColumn>

            {/* À propos */}
            <FooterColumn title="À propos">
              {LINKS.about.map((l) => <FooterLink key={l.href} {...l} />)}
            </FooterColumn>

            {/* Legal */}
            <FooterColumn title="Légal">
              {LINKS.legal.map((l) => <FooterLink key={l.href} {...l} />)}
            </FooterColumn>
          </div>

          {/* Massive brand wordmark */}
          <div className="py-12 text-center select-none pointer-events-none">
            <h2
              className="font-display font-bold leading-none tracking-[-0.04em] bg-clip-text text-transparent"
              style={{
                fontSize: 'clamp(4rem, 16vw, 14rem)',
                backgroundImage: 'linear-gradient(180deg, rgba(245,238,226,0.18) 0%, rgba(245,238,226,0.04) 100%)',
              }}
            >
              Lab&apos;s Food.
            </h2>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cream-soft/55">
              <p>© {new Date().getFullYear()} Lab&apos;s Food</p>
              <span className="hidden md:inline opacity-30">·</span>
              <p>Service à la Personne agréé · N° SAP-XXXXXX</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-cream-soft/55">
              <span>Paiement sécurisé</span>
              <span className="opacity-30">·</span>
              <span className="font-mono tracking-wider">VISA</span>
              <span className="opacity-30">·</span>
              <span className="font-mono tracking-wider">MASTERCARD</span>
              <span className="opacity-30">·</span>
              <span className="font-mono tracking-wider">STRIPE</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="lg:col-span-2 lg:col-start-auto">
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
        <span>{label}</span>
        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </Link>
    </li>
  )
}
