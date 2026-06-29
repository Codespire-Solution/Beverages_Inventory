/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FCFBF8',
        paper: '#FFFFFF',
        wash: '#F6F1E8',
        ink: { DEFAULT: '#17150F', 60: '#6B655A' },
        accent: { DEFAULT: '#E08A2B', ink: '#B0640C' },
        line: '#ECE6DA',
        mint: '#CFE6D0',
        berry: '#F4C9D4',
        litchi: '#F7D9BD',
        warn: { bg: '#FBEAD3', ink: '#9A5A12' },
        ok: { bg: '#D8EBD9', ink: '#2F6135' },
        primary: { 50: '#FBF1E3', 100: '#F7E2C6', 200: '#F0C98F', 300: '#E9B058', 400: '#E49B38', 500: '#E08A2B', 600: '#C77B22', 700: '#B0640C', 800: '#8A4F0A', 900: '#5F3707' },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-assistant)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '12px', '2xl': '16px' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        rise: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
        rise: 'rise 0.45s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}

