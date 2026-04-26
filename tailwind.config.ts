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
        ink: {
          DEFAULT: '#1F2A37',
          mid: '#4B5867',
          soft: '#7B8794',
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
        'fade-up': 'fade-up 0.6s ease forwards',
        'fade-in': 'fade-in 0.4s ease forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C79A3E 0%, #DDB96A 50%, #C79A3E 100%)',
        'gold-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(199,154,62,0.3) 50%, transparent 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0C0A08 0%, #16130E 100%)',
        'hero-overlay': 'linear-gradient(to right, rgba(12,10,8,0.95) 40%, rgba(12,10,8,0.5) 100%)',
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
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
