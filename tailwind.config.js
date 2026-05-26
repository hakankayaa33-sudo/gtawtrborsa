/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d0f14',
        foreground: '#f0f2f5',
        card: '#13161e',
        secondary: '#1c2030',
        muted: '#1a1e2a',
        'muted-fg': '#6b7280',
        border: 'rgba(255,255,255,0.08)',
        primary: '#ed3a32',
        accent: '#293286',
      },
      fontFamily: {
        sans: ['var(--font-outfit)'],
        mono: ['var(--font-dm-mono)'],
      },
    },
  },
  plugins: [],
};