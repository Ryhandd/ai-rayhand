/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090d',
          900: '#0b0d12',
          850: '#11141c',
          800: '#151922',
          750: '#181c27',
          700: '#1f2532',
          600: '#2a3142',
          500: '#3a4460',
        },
        accent: {
          300: '#a9c3ff',
          400: '#83a9ff',
          500: '#5b8cff',
          600: '#4472e0',
        },
        violet: {
          500: '#a06bff',
        },
        dim: '#8b93ab',
        faint: '#5c6379',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp .25s cubic-bezier(.4,0,.2,1)',
        blink: 'blink .9s step-end infinite',
        'dot-bounce': 'dotBounce 1.3s infinite',
        'slide-in': 'slideIn .2s ease-out',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        blink: { '50%': { opacity: '0' } },
        dotBounce: {
          '0%, 60%, 100%': { opacity: '.25', transform: 'translateY(0)' },
          '30%': { opacity: '1', transform: 'translateY(-3px)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
    },
  },
  plugins: [],
};
