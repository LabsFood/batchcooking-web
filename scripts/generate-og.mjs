/**
 * Génère les images Open Graph du site dans `public/`.
 *
 * Les visuels sociaux sont des assets versionnés, pas une génération au build :
 * un `ImageResponse` par requête coûterait un cold start à chaque scrape de
 * Facebook, LinkedIn ou WhatsApp, pour une image qui ne change jamais.
 *
 * Prérequis : `rsvg-convert` (paquet `librsvg2-bin`) et les familles Montserrat
 * et Fraunces visibles par fontconfig. Fraunces vit dans le repo, il faut donc
 * la déclarer avant de lancer le script :
 *
 *   mkdir -p ~/.fonts && cp public/fraunces-font-family/Fraunces_72pt-SemiBold.ttf ~/.fonts/
 *   fc-cache -f
 *   node scripts/generate-og.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = path.join(ROOT, 'public')
const TMP = mkdtempSync(path.join(tmpdir(), 'og-'))

// Palette — doit rester alignée sur `tailwind.config.ts`.
const NAVY_DEEP = '#1F2D3D'
const NAVY = '#2C3E50'
const AMBER = '#F39C12'
const MINT = '#D1F2EB'

const MARK = readFileSync(path.join(PUBLIC, 'LogoOrange.png')).toString('base64')
const MARK_RATIO = 1812 / 1604

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function template({ w, h, eyebrow, headline, proof, hX, hY, hSize, hLead, markX, markY, markW }) {
  const lines = headline
    .map(
      (l, i) =>
        `<text x="${hX}" y="${hY + i * hLead}" font-family="Fraunces 72pt SemiBold" font-weight="600" font-size="${hSize}" fill="${l.amber ? AMBER : '#FFFFFF'}" letter-spacing="-1.6">${esc(l.t)}</text>`,
    )
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY_DEEP}"/>
      <stop offset="55%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="${AMBER}" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${MINT}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${MINT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <ellipse cx="${markX + markW / 2}" cy="${markY + markW * 0.565}" rx="${markW * 1.15}" ry="${markW * 1.15}" fill="url(#glow)"/>
  <ellipse cx="${w * 0.06}" cy="${h * 0.92}" rx="${w * 0.3}" ry="${h * 0.35}" fill="url(#glow2)"/>
  <image x="${markX}" y="${markY}" width="${markW}" height="${markW * MARK_RATIO}" xlink:href="data:image/png;base64,${MARK}" opacity="0.97"/>
  <rect x="${hX}" y="${hY - hSize - 78}" width="54" height="4" rx="2" fill="${AMBER}"/>
  <text x="${hX}" y="${hY - hSize - 40}" font-family="Montserrat" font-weight="700" font-size="${Math.round(hSize * 0.235)}" fill="${AMBER}" letter-spacing="${(hSize * 0.055).toFixed(1)}">${esc(eyebrow)}</text>
  ${lines}
  <text x="${hX}" y="${hY + (headline.length - 1) * hLead + hSize * 1.26}" font-family="Montserrat" font-weight="500" font-size="${Math.round(hSize * 0.315)}" fill="#FFFFFF" fill-opacity="0.72">${esc(proof)}</text>
  <text x="${hX}" y="${h - 62}" font-family="Fraunces 72pt SemiBold" font-weight="600" font-size="${Math.round(hSize * 0.44)}" fill="${AMBER}" letter-spacing="-0.6">Lab&#8217;s Food</text>
  <text x="${hX}" y="${h - 38}" font-family="Montserrat" font-weight="600" font-size="${Math.round(hSize * 0.17)}" fill="#FFFFFF" fill-opacity="0.5" letter-spacing="${(hSize * 0.05).toFixed(1)}">BATCH COOKING</text>
</svg>`
}

// Géométrie commune : 1200x630, le ratio 1.91:1 attendu par Facebook, LinkedIn,
// WhatsApp et les cartes `summary_large_image` de X.
const LAYOUT = { w: 1200, h: 630, hX: 76, hY: 232, hSize: 66, hLead: 80, markX: 826, markY: 136, markW: 298 }

const VARIANTS = [
  {
    file: 'og.png',
    ...LAYOUT,
    eyebrow: 'BATCH COOKING À DOMICILE · PARTOUT EN FRANCE',
    headline: [
      { t: 'Une semaine de repas' },
      { t: 'faits maison,' },
      { t: 'cuisinés chez vous.', amber: true },
    ],
    proof: 'Dès 50 € la session après crédit d’impôt · Avance immédiate Urssaf',
  },
  {
    file: 'og-devenir-chef.png',
    ...LAYOUT,
    eyebrow: 'DEVENIR BATCH COOKER · LAB’S FOOD',
    headline: [{ t: 'Cuisinez près de' }, { t: 'chez vous,' }, { t: 'à votre rythme.', amber: true }],
    proof: 'Des missions près de chez vous · Vous fixez vos tarifs et vos disponibilités',
  },
]

for (const variant of VARIANTS) {
  const svg = path.join(TMP, variant.file.replace(/\.png$/, '.svg'))
  const out = path.join(PUBLIC, variant.file)
  writeFileSync(svg, template(variant))
  execFileSync('rsvg-convert', ['-w', String(variant.w), '-h', String(variant.h), '-o', out, svg])
  console.log('→ public/' + variant.file)
}
