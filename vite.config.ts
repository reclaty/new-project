import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'simulation-landscape.jpg'],
    manifest: {
      name: 'Gaïa Drone Controller', short_name: 'GAÏA', description: 'Console de simulation et futur contrôleur de drone Wi-Fi.',
      theme_color: '#07110c', background_color: '#07110c', display: 'standalone', orientation: 'landscape',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
    },
    workbox: { navigateFallback: 'index.html', globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico,woff,woff2}'] }
  })]
});
