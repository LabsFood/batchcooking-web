'use client'
import { FileText, Calendar, ShoppingCart, LogOut, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const TABS = [
  { icon: Calendar,     label: 'Mes réservations',   count: 2 },
  { icon: ShoppingCart, label: 'Listes de courses',  count: 3 },
  { icon: FileText,     label: 'Mes factures',       count: 5 },
]

export default function EspaceClientPage() {
  return (
    <div className="page-transition pt-24 min-h-screen bg-cream">
      {/* Header */}
      <section className="bg-navy text-white py-16 lg:py-20">
        <div className="container-xl flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="eyebrow mb-3" style={{ color: '#F39C12' }}>Espace personnel</p>
            <h1 className="font-display font-bold text-white leading-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}>
              Bonjour, <span className="text-terra italic font-medium">Sophie 👋</span>
            </h1>
            <p className="text-white/60 text-sm mt-2">
              Formule Confort · Cliente depuis janvier 2026
            </p>
          </div>
          <button className="btn-outline-light text-xs px-5 py-2.5 self-start md:self-auto">
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>
      </section>

      <div className="container-xl py-12 lg:py-16">
        {/* Quick tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {TABS.map(({ icon: Icon, label, count }) => (
            <button key={label}
              className="card-base p-6 text-left flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full bg-[rgba(217,105,65,0.1)] flex items-center justify-center flex-shrink-0 group-hover:bg-terra transition-colors">
                <Icon className="w-5 h-5 text-terra group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-navy">{label}</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  {count} document{count > 1 ? 's' : ''}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-soft group-hover:text-terra group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        {/* Next session */}
        <div className="bg-paper rounded-2xl p-8 lg:p-10 border border-[rgba(31,26,20,0.06)]">
          <h2 className="font-display font-bold text-navy text-2xl mb-6">
            Prochaine session
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 lg:p-6 rounded-xl bg-cream border border-[rgba(217,105,65,0.2)]">
            <div>
              <p className="font-semibold text-navy">Session Confort · 7 plats</p>
              <p className="text-sm text-ink-mid mt-1">
                Samedi 3 mai 2026 · 9h00 · Avec Ivy Siyaptze
              </p>
            </div>
            <span className="chip chip-terra">Confirmée</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/reservation" className="btn-primary">
              Réserver une nouvelle session
              <ArrowRight className="w-4 h-4 icon-arrow" />
            </Link>
            <Link href="/menu" className="btn-outline">
              Voir le menu de la semaine
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
