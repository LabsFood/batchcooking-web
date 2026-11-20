import { pageMetadata } from '@/lib/seo'
import BrandGuidelines from '@/components/shared/BrandGuidelines'

export const metadata = pageMetadata({
  title: 'Charte graphique',
  description: "Identité visuelle Lab's Food : couleurs, typographie, usage par branche.",
  path: '/brand',
  noIndex: true,
})

export default function BrandPage() {
  return (
    <div className="page-transition pt-20">
      {/* Page header */}
      <div className="section-navy py-20">
        <div className="container-xl">
          <p className="label-brand mb-4 text-[#D96941]">Documentation interne</p>
          <h1
            className="font-display font-bold text-white mb-4"
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            Charte graphique{' '}
            <span className="text-[#F39C12]">Lab&apos;s Food</span>
          </h1>
          <p className="text-white/60 text-base max-w-xl font-body leading-relaxed">
            Référence officielle pour l&apos;identité visuelle du groupe Lab&apos;s Food.
            Trois branches, trois univers distincts. Polices Fraunces (titres) et Montserrat (corps).
          </p>
        </div>
      </div>

      <BrandGuidelines />
    </div>
  )
}
