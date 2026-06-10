/** @type {import('tailwindcss').Config} */
<<<<<<< HEAD
export default {
=======
module.exports = {
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
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
<<<<<<< HEAD
        sans: ['var(--font-outfit)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'custom-bg': "url('/background2.webp')",
=======
        sans: ['var(--font-outfit)'],
        mono: ['var(--font-dm-mono)'],
>>>>>>> 6ab6976ea0e5f3b6f0ff38fe8d9587e0b1ba223e
      },
    },
  },
  plugins: [],
};