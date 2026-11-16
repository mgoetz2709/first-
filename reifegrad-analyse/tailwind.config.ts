import type { Config } from 'tailwindcss';

/**
 * Design-Tokens der MGIM-CI. Die Farbwerte selbst stehen als CSS-Variablen in
 * src/styles/global.css; hier werden sie nur benannt. Die Standardpalette von
 * Tailwind ist bewusst ersetzt, damit keine CI-fremden Farben verwendet werden.
 */
export default {
  content: ['./src/**/*.{astro,html,ts}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      'mg-grey': 'var(--mg-grey)',
      'mg-blue': 'var(--mg-blue)',
      'near-black': 'var(--near-black)',
      'light-grey': 'var(--light-grey)',
      'mid-grey': 'var(--mid-grey)',
      'off-white': 'var(--off-white)',
      'deep-blue': 'var(--deep-blue)',
    },
    fontFamily: {
      headline: ['Barlow', 'Arial', 'sans-serif'],
      body: ['Inter', 'Arial', 'sans-serif'],
    },
    extend: {
      lineHeight: {
        body: '1.5',
        headline: '1.2',
      },
      letterSpacing: {
        // CI: Labels mit +0.02 em
        label: '0.02em',
      },
      maxWidth: {
        seite: '72rem',
        text: '40rem',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  corePlugins: {
    boxShadow: false,
    backgroundImage: false,
    gradientColorStops: false,
    animation: false,
  },
  plugins: [],
} satisfies Config;
