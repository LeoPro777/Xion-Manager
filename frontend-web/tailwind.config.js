/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand-primary, #0891b2)',
          primary: 'var(--brand-primary, #0891b2)',
          foreground: 'var(--brand-primary-foreground, #ffffff)',
        },
        primary: {
          DEFAULT: 'var(--brand-primary, #0891b2)',
          foreground: 'var(--brand-primary-foreground, #ffffff)',
          50: 'rgba(var(--brand-primary-rgb, 8, 145, 178), 0.05)',
          100: 'rgba(var(--brand-primary-rgb, 8, 145, 178), 0.1)',
          200: 'rgba(var(--brand-primary-rgb, 8, 145, 178), 0.2)',
          300: 'rgba(var(--brand-primary-rgb, 8, 145, 178), 0.35)',
          400: 'var(--brand-primary, #0891b2)',
          500: 'var(--brand-primary, #0891b2)',
          600: 'var(--brand-primary, #0891b2)',
          700: 'var(--brand-primary, #0891b2)',
        },
        cyan: {
          50: 'var(--cyan-50, #ecfeff)',
          100: 'var(--cyan-100, #cffafe)',
          200: 'var(--cyan-200, #a5f3fc)',
          300: 'var(--cyan-300, #67e8f9)',
          400: 'var(--cyan-400, #22d3ee)',
          500: 'var(--cyan-500, #06b6d4)',
          600: 'var(--cyan-600, #0891b2)',
          700: 'var(--cyan-700, #0e7490)',
          800: 'var(--cyan-800, #155e75)',
          900: 'var(--cyan-900, #164e63)',
        },
        slate: {
          50: 'rgba(var(--slate-50-rgb, 248, 250, 252), <alpha-value>)',
          100: 'rgba(var(--slate-100-rgb, 241, 245, 249), <alpha-value>)',
          200: 'rgba(var(--slate-200-rgb, 226, 232, 240), <alpha-value>)',
          300: 'rgba(var(--slate-300-rgb, 203, 213, 225), <alpha-value>)',
          400: 'rgba(var(--slate-400-rgb, 148, 163, 184), <alpha-value>)',
          500: 'rgba(var(--slate-500-rgb, 100, 116, 139), <alpha-value>)',
          600: 'rgba(var(--slate-600-rgb, 71, 85, 105), <alpha-value>)',
          700: 'rgba(var(--slate-700-rgb, 51, 65, 85), <alpha-value>)',
          800: 'rgba(var(--slate-800-rgb, 30, 41, 59), <alpha-value>)',
          900: 'rgba(var(--slate-900-rgb, 15, 23, 42), <alpha-value>)',
          950: 'rgba(var(--slate-950-rgb, 2, 6, 23), <alpha-value>)',
        },
        surface: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
        }
      },
    },
  },
  plugins: [],
}
