/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        grouped: 'var(--bg-grouped)',
        surface: {
          DEFAULT: 'var(--surface)',
          secondary: 'var(--surface-secondary)',
        },
        label: 'var(--label)',
        secondary: 'var(--label-secondary)',
        tertiary: 'var(--label-tertiary)',
        separator: 'var(--separator)',
        fill: 'var(--fill)',
        accent: {
          DEFAULT: 'var(--accent)',
          tint: 'var(--accent-tint)',
        },
        green: {
          DEFAULT: 'var(--green)',
          tint: 'var(--green-tint)',
        },
        orange: {
          DEFAULT: 'var(--orange)',
          tint: 'var(--orange-tint)',
        },
        red: {
          DEFAULT: 'var(--red)',
          tint: 'var(--red-tint)',
        },
        teal: {
          DEFAULT: 'var(--teal)',
          tint: 'var(--teal-tint)',
        },
        indigo: {
          DEFAULT: 'var(--indigo)',
          tint: 'var(--indigo-tint)',
        },
      },
      borderRadius: {
        control: '10px',
        card: '16px',
        sheet: '20px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'token-pop': {
          '0%': { opacity: '0', transform: 'scale(0.7)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        'grow-bar': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
        'slide-up': 'slide-up 0.3s ease-out both',
        'slide-in-right': 'slide-in-right 0.3s ease-out both',
        'token-pop': 'token-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'grow-bar': 'grow-bar 0.6s ease-out both',
      },
    },
  },
  plugins: [],
}
