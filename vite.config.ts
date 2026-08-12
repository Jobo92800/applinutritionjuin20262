import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Une nouvelle version n'est appliquée qu'après confirmation de l'utilisateur
      // (bandeau « Actualiser »), pour ne pas mélanger ancienne et nouvelle version
      // pendant la navigation en cours.
      registerType: 'prompt',
      // L'enregistrement est fait par le composant UpdatePrompt, qui a besoin
      // des rappels de mise à jour.
      injectRegister: null,
      // On conserve le manifest statique existant (public/manifest.json).
      manifest: false,
      workbox: {
        // Ajoute la réception des notifications push au service worker.
        importScripts: ['/push-handler.js'],
        // Sert la coquille de l'app hors-ligne (navigation SPA).
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/push-handler.js'],
        // Les appels réseau (Supabase, audio des podcasts...) restent toujours
        // servis depuis le réseau — jamais depuis un cache potentiellement périmé.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && url.pathname.startsWith('/icons/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-icons',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      // Pas de service worker en développement (évite les soucis de cache local).
      devOptions: { enabled: false },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
