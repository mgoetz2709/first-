import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Alle Seiten werden statisch gebaut. Einzige Server-Route ist /api/submit
// (prerender = false), sie läuft auf Vercel als Function.
// Tailwind läuft über PostCSS (postcss.config.mjs).
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
});
