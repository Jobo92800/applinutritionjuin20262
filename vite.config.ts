import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Le nouveau service worker prend la main dès qu'il est installé.
      // En mode 'prompt', il resterait « en attente » tant que toutes les fenêtres
      // de l'application ne sont pas fermées : des utilisateurs pouvaient rester
      // bloqués très longtemps sur une ancienne version.
      // Le composant UpdatePrompt affiche ensuite un bandeau invitant à recharger
      // la page, sans jamais l'imposer au milieu d'une saisie.
      registerType: 'autoUpdate',
      // L'enregistrement est fait par UpdatePrompt, qui a besoin des rappels
      // de mise à jour (et ne doit pas recharger la page automatiquement).
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
