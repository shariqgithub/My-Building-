import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.json',
        includeAssets: [
          'apple-touch-icon.png',
          'icon.svg',
          'manifest.json',
          'manifest.webmanifest',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'screenshot-mobile.png',
          'screenshot-mobile-2.png',
          'screenshot-desktop.png',
          'screenshot-desktop-2.png',
          'sw.js',
          'pwabuilder-sw.js',
          'registerSW.js',
          'offline.html',
        ],
        manifest: {
          id: '/',
          name: 'Building Sub-Meter Electricity Tracker',
          short_name: 'Flat Tracker',
          description: 'Mobile-first electricity bill and building expenditure tracking app for buildings with 15 flats sharing one common meter, supporting secure PIN login, monthly expenditure logging, net savings vs out-of-pocket accounting, custom flat rates, UPI payments, and admin reading management.',
          theme_color: '#047857',
          background_color: '#0f172a',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'en',
          dir: 'ltr',
          categories: ['utilities', 'finance', 'productivity', 'business', 'lifestyle'],
          prefer_related_applications: false,
          related_applications: [],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/screenshot-mobile.png',
              sizes: '540x960',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Flat electricity sub-meter bill details and instant UPI payments',
            },
            {
              src: '/screenshot-mobile-2.png',
              sizes: '540x960',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Direct UPI payment QR code and payment history breakdown',
            },
            {
              src: '/screenshot-desktop.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Secretary sub-meter readings and building maintenance ledger',
            },
            {
              src: '/screenshot-desktop-2.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Annual expenditure ledger and flat settlement summaries',
            },
          ],
          shortcuts: [
            {
              name: 'Flat Bill',
              short_name: 'My Bill',
              description: 'View monthly electricity bill and pay via UPI',
              url: '/?action=bill',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Quick UPI Pay',
              short_name: 'Pay UPI',
              description: 'Instant UPI payment for active electricity bill',
              url: '/?action=pay',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Secretary Office',
              short_name: 'Admin',
              description: 'Building meter readings and expenditure ledger',
              url: '/?view=admin',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
          share_target: {
            action: '/',
            method: 'GET',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
            },
          },
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Service-Worker-Allowed': '/',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Service-Worker-Allowed': '/',
      },
    },
  };
});
