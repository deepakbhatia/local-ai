/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: '#0A0A0B',
        surface: '#111113',
        'surface-elevated': '#1A1A1E',
        border: '#2A2A2E',
        'text-primary': '#F4F4F5',
        'text-secondary': '#A1A1AA',
        'text-muted': '#52525B',
        accent: {
          DEFAULT: '#3B82F6',
          legal: '#8B5CF6',
          medical: '#10B981',
          finance: '#F59E0B',
          research: '#06B6D4',
        }
      }
    },
  },
  plugins: [],
}
