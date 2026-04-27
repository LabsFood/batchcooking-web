import type { Metadata } from 'next'
import { CheckCircle, ArrowRight, FileText } from 'lucide-react'
import ReserveButton from '@/components/shared/ReserveButton'

export const metadata: Metadata = { title: 'Avantage Fiscal' }

export default function AvantagesFiscalPage() {
  const points = [
    'Lab\'s Food est déclaré organisme de services à la personne (agrément SAP)',
    'Applicable aux personnes fiscalement domiciliées en France',
    'Une attestation fiscale annuelle vous est envoyée automatiquement',
    'Valable pour la déclaration d\'impôts (cases 7DB/7DF)',
    'Applicable dès la première session, quel que soit le montant',
  ]

  return (
    <div className="page-transition pt-24 bg-cream min-h-screen">
      {/* Hero */}
      <section className="bg-navy text-white py-20 lg:py-24 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none flex items-center justify-end pr-12 opacity-10">
          <span
            className="font-display font-bold text-terra leading-none"
            style={{ fontSize: 'clamp(10rem, 22vw, 22rem)' }}
          >
            50%
          </span>
        </div>
        <div className="container-xl relative">
          <p className="eyebrow mb-5" style={{ color: '#F39C12' }}>Crédit d&apos;impôt</p>
          <h1
            className="font-display font-bold text-white leading-none mb-5"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', letterSpacing: '-0.02em' }}
          >
            50% remboursés <span className="text-terra italic font-medium">par l&apos;État.</span>
          </h1>
          <p className="text-white/70 max-w-xl text-lg leading-relaxed">
            Lab&apos;s Food est agréé Service à la Personne. À ce titre, 50% de votre dépense
            est déductible de vos impôts via le crédit d&apos;impôt services à la personne (CISAP).
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-xl max-w-5xl">
          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {[
              { val: '150€', label: 'Prix session Essentiel', note: 'avant crédit d\'impôt' },
              { val: '75€',  label: 'Coût réel',              note: 'après crédit d\'impôt 50%', highlight: true },
              { val: '75€',  label: 'Remboursé par l\'État',  note: 'déduit de vos impôts' },
            ].map((s) => (
              <div
                key={s.label}
                className={`p-8 rounded-2xl text-center ${
                  s.highlight
                    ? 'bg-terra text-white shadow-[0_30px_60px_-25px_rgba(217,105,65,0.45)]'
                    : 'bg-paper border border-[rgba(31,26,20,0.08)]'
                }`}
              >
                <p className={`font-display font-bold text-5xl mb-2 ${s.highlight ? 'text-white' : 'text-navy'}`}>
                  {s.val}
                </p>
                <p className={`font-semibold text-sm mb-1 ${s.highlight ? 'text-white' : 'text-navy'}`}>
                  {s.label}
                </p>
                <p className={`text-xs ${s.highlight ? 'text-white/80' : 'text-ink-soft'}`}>
                  {s.note}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-paper rounded-2xl p-8 lg:p-10 border border-[rgba(31,26,20,0.06)]">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-navy mb-6">
              Comment ça marche ?
            </h2>
            <ul className="space-y-4">
              {points.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-terra flex-shrink-0 mt-0.5" />
                  <p className="text-ink-mid leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <ReserveButton>
              Réserver et économiser 50%
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </ReserveButton>
            <a href="#" className="btn-outline">
              <FileText className="w-4 h-4" />
              Télécharger le guide fiscal
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
