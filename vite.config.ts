import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Le service worker se met à jour tout seul dès qu'une nouvelle version
      // est déployée : les utilisateurs ne restent jamais bloqués sur du vieux code.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // On conserve le manifest statique existant (public/manifest.json).
      manifest: false,
      workbox: {
        // Sert la coquille de l'app hors-ligne (navigation SPA).
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
