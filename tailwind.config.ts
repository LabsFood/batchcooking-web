import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#2C3E50',
          mid: '#34495E',
          deep: '#1F2D3D',
        },
        terra: {
          DEFAULT: '#F39C12',
          deep: '#D68B0E',
        },
        amber: {
          DEFAULT: '#F39C12',
          deep: '#D68B0E',
          soft: '#FCE3B5',
          /** Ambre pour du TEXTE sur fond clair (≥ 4,5:1). */
          ink: '#9A5B00',
        },
        mint: {
          DEFAULT: '#D1F2EB',
          deep: '#A7E0D0',
          ink: '#14695F',
        },
        peach: '#FAD7A0',
        cream: {
          DEFAULT: '#FBFCFD',
          soft: '#F1F5F8',
          deep: '#E5ECF1',
        },
        /** Le fond des espaces connectés — voir `--shell` dans globals.css. */
        shell: '#EDF2F7',
        ink: {
          DEFAULT: '#1F2A37',
          mid: '#4B5867',
          soft: '#5F6B7A',
        },
        border: 'rgba(31,42,55,0.10)',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', ...fontFamily.serif],
        sans: ['var(--font-montserrat)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      fontSize: {
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
        '10xl': ['10rem', { lineHeight: '0.9' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '120': '30rem',
      },
      animation: {
        // slow-out : se pose en 240 ms (fade-up), 180 ms (fade-in)
        'fade-up': 'fade-up 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionTimingFunction: {
        'expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
