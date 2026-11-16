'use client'

import { motion } from 'framer-motion'
import { fadeUpInView } from '@/lib/motion'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

// ─── Data ──────────────────────────────────────────────────────────────────────

const BRAND_COLUMNS = [
  {
    id: 'corporate',
    label: '01',
    name: 'Corporate',
    context: 'Communications générales Lab\'s Food, institutionnel, marque globale',
    colors: [
      { hex: '#00234B', name: 'Navy Principal',  role: 'Fond sombre, titres, autorité' },
      { hex: '#2C3E50', name: 'Slate',           role: 'Texte secondaire, nuances' },
      { hex: '#F4F6F7', name: 'Off-White',       role: 'Fond clair, espaces neutres' },
    ],
    accentColor: '#00234B',
    textOnAccent: '#FFFFFF',
    bgTint: '#EEF1F4',
  },
  {
    id: 'batch',
    label: '02',
    name: 'Batch Cooking',
    context: 'Branche services — site batch cooking, communications clients, réservations',
    colors: [
      { hex: '#D96941', name: 'Terracotta',     role: 'CTA, accents, énergie chaude' },
      { hex: '#F39C12', name: 'Amber',           role: 'Highlights, stats, mise en avant' },
      { hex: '#FAD7A0', name: 'Pêche',           role: 'Fonds clairs, sections douces' },
    ],
    accentColor: '#D96941',
    textOnAccent: '#FFFFFF',
    bgTint: '#FEF0EB',
  },
  {
    id: 'kossam',
    label: '03',
    name: 'Kossam',
    context: 'Branche produits — communications autour de la gamme produits Kossam',
    colors: [
      { hex: '#193C40', name: 'Teal Profond',   role: 'Fond premium, autorité naturelle' },
      { hex: '#D1F2EB', name: 'Menthe',          role: 'Accents frais, légèreté' },
      { hex: '#D4AF37', name: 'Or',              role: 'Prestige, finition, signature' },
    ],
    accentColor: '#193C40',
    textOnAccent: '#FFFFFF',
    bgTint: '#EBF7F5',
  },
]

const FONTS = [
  {
    name: 'Fraunces',
    role: 'Titres & Display',
    usage: 'Tous les titres H1–H4, grandes citations, hero headlines',
    weight: '700 — Bold',
    specimen: 'Le goût du fait maison.',
    note: 'Optical size variable · Style Soft (S050) · Italic disponible',
    css: "font-family: 'Fraunces', serif; font-weight: 700;",
  },
  {
    name: 'Montserrat',
    role: 'Corps de texte & UI',
    usage: 'Corps, labels, boutons, navigation, formulaires, légendes',
    weight: '400 / 500 / 600 / 700',
    specimen: 'Un chef professionnel à votre domicile.',
    note: 'Geometric sans-serif · Très lisible à toutes les tailles',
    css: "font-family: 'Montserrat', sans-serif; font-weight: 500;",
  },
]

// ─── Sub-component: Color Swatch ──────────────────────────────────────────────

function ColorSwatch({ hex, name, role }: { hex: string; name: string; role: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Determine text color (light or dark) based on hex luminance
  const isDark = parseInt(hex.slice(1), 16) < 0x888888
  const textColor = isDark ? '#FFFFFF' : '#00234B'
  const subColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,35,75,0.55)'

  return (
    <button
      onClick={copy}
      className="group relative w-full text-left "
      title={`Copier ${hex}`}
    >
      {/* Swatch block */}
      <div
        className="w-full h-28 flex flex-col justify-between p-4"
        style={{ backgroundColor: hex }}
      >
        <div className="flex items-start justify-between">
          <span className="text-xs font-mono font-medium opacity-80" style={{ color: textColor }}>
            {hex}
          </span>
          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ color: textColor }}
          >
            {copied
              ? <Check className="w-3 h-3" />
              : <Copy className="w-3 h-3" />
            }
          </div>
        </div>
      </div>
      {/* Label below */}
      <div className="pt-2.5 pb-1">
        <p className="text-xs font-semibold text-[#00234B] font-body">{name}</p>
        <p className="text-xs text-[#2C3E50] opacity-60 font-body mt-0.5">{role}</p>
      </div>
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BrandGuidelines() {
  return (
    <section
      className="section-padding bg-white border-t border-[rgba(0,35,75,0.07)]"
      id="brand"
    >
      <div className="container-xl">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <motion.div
          // slow-out : se pose en 240 ms
          {...fadeUpInView()}
          className="mb-16"
        >
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <h2
              className="h-section text-[#00234B]"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Charte graphique{' '}
              <span className="text-[#D96941]">Lab&apos;s Food</span>
            </h2>
            <p className="text-[#2C3E50]/70 text-sm max-w-sm leading-relaxed font-body">
              Trois identités visuelles distinctes selon la branche de communication.
              Chaque colonne de couleurs correspond à un univers précis.
            </p>
          </div>
          <div className="terra-divider mt-8" />
        </motion.div>

        {/* ── 3 Brand Columns ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-[rgba(0,35,75,0.08)] mb-20">
          {BRAND_COLUMNS.map((col, i) => (
            <motion.div
              key={col.id}
              // slow-out : se pose en 240 ms
              {...fadeUpInView(i * 0.08)}
              className={`flex flex-col ${i < 2 ? 'lg:border-r border-[rgba(0,35,75,0.08)]' : ''}`}
            >
              {/* Column header */}
              <div
                className="p-6 border-b border-[rgba(0,35,75,0.08)]"
                style={{ backgroundColor: col.bgTint }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="tabular-nums text-xs font-medium opacity-40"
                    style={{ fontFamily: 'var(--font-montserrat)' }}
                  >
                    {col.label}
                  </span>
                  <div
                    className="px-3 py-1 text-xs font-bold tracking-wider uppercase"
                    style={{
                      backgroundColor: col.accentColor,
                      color: col.textOnAccent,
                      fontFamily: 'var(--font-montserrat)',
                    }}
                  >
                    {col.name}
                  </div>
                </div>
                <p className="text-xs text-[#2C3E50]/70 font-body leading-relaxed">
                  {col.context}
                </p>
              </div>

              {/* Swatches */}
              <div className="p-6 bg-white flex-1">
                <div className="grid grid-cols-3 gap-3">
                  {col.colors.map((c) => (
                    <ColorSwatch key={c.hex} {...c} />
                  ))}
                </div>

                {/* Usage example */}
                <div className="mt-6 pt-5 border-t border-[rgba(0,35,75,0.06)]">
                  <p className="label-muted mb-3">Utilisation type</p>
                  <div
                    className="p-4 text-sm font-semibold font-body"
                    style={{ backgroundColor: col.accentColor, color: col.textOnAccent }}
                  >
                    Bouton principal · CTA
                  </div>
                  <div
                    className="p-3 mt-2 text-xs font-body border"
                    style={{
                      backgroundColor: col.bgTint,
                      color: col.accentColor,
                      borderColor: col.accentColor,
                    }}
                  >
                    Section / fond de page · {col.name}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Typography ───────────────────────────────────────────────── */}
        <motion.div
          // slow-out : se pose en 240 ms
          {...fadeUpInView(0.08)}
        >
          <p className="label-brand mb-8">Typographie</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {FONTS.map((font) => (
              <div
                key={font.name}
                className="border border-[rgba(0,35,75,0.08)] bg-white p-8"
              >
                {/* Specimen */}
                <div className="mb-8 pb-8 border-b border-[rgba(0,35,75,0.06)]">
                  <p
                    className="leading-none mb-3"
                    style={{
                      fontFamily:
                        font.name === 'Fraunces'
                          ? 'var(--font-fraunces)'
                          : 'var(--font-montserrat)',
                      fontWeight: 700,
                      fontSize: font.name === 'Fraunces' ? 'clamp(2rem, 4vw, 3.5rem)' : '1.5rem',
                      color: '#00234B',
                      letterSpacing: font.name === 'Fraunces' ? '-0.03em' : '-0.01em',
                    }}
                  >
                    {font.specimen}
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase text-white"
                      style={{ backgroundColor: '#D96941', fontFamily: 'var(--font-montserrat)' }}
                    >
                      {font.role}
                    </span>
                    <span
                      className="tabular-nums text-xs text-[#2C3E50]/50"
                      style={{ fontFamily: 'var(--font-montserrat)' }}
                    >
                      {font.weight}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div>
                    <p className="label-muted mb-1.5">Nom</p>
                    <p
                      className="text-[#00234B] font-semibold text-base"
                      style={{
                        fontFamily:
                          font.name === 'Fraunces'
                            ? 'var(--font-fraunces)'
                            : 'var(--font-montserrat)',
                      }}
                    >
                      {font.name}
                    </p>
                  </div>
                  <div>
                    <p className="label-muted mb-1.5">Utilisation</p>
                    <p className="text-xs text-[#2C3E50]/70 font-body">{font.usage}</p>
                  </div>
                  <div>
                    <p className="label-muted mb-1.5">Note</p>
                    <p className="text-xs text-[#2C3E50]/60 font-body">{font.note}</p>
                  </div>
                  <div className="pt-3 border-t border-[rgba(0,35,75,0.06)]">
                    <p className="label-muted mb-1.5">CSS</p>
                    <code
                      className="block text-xs bg-[#F4F6F7] p-3 text-[#D96941] font-mono break-all"
                      style={{ fontFamily: 'var(--font-montserrat)' }}
                    >
                      {font.css}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Règle d'usage ────────────────────────────────────────────── */}
        <motion.div
          // slow-out : se pose en 240 ms
          {...fadeUpInView(0.08)}
          className="mt-12 p-8 bg-[#F4F6F7] border border-[rgba(0,35,75,0.07)]"
        >
          <p className="label-brand mb-3">Règle d&apos;or</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01', color: '#00234B', label: 'Institutional',
                rule: 'Bleu navy (#00234B) pour toute communication de marque globale Lab\'s Food : site institutionnel, pitch deck, RH.',
              },
              {
                num: '02', color: '#D96941', label: 'Batch Cooking',
                rule: 'Terracotta (#D96941) pour ce site et toutes les communications autour du service de batch cooking.',
              },
              {
                num: '03', color: '#193C40', label: 'Kossam',
                rule: 'Teal (#193C40) exclusivement pour la gamme de produits Kossam. Ne pas mélanger avec les autres branches.',
              },
            ].map((r) => (
              <div key={r.num} className="flex gap-4">
                <div
                  className="tabular-nums w-8 h-8 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: r.color, fontFamily: 'var(--font-montserrat)' }}
                >
                  {r.num}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#00234B] mb-1 font-body">
                    {r.label}
                  </p>
                  <p className="text-xs text-[#2C3E50]/70 leading-relaxed font-body">{r.rule}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}
