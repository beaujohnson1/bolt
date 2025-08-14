import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'EasyFlip.ai - AI-Powered Resale Automation',
        short_name: 'EasyFlip',
        description: 'Transform your unused items into cash with AI-powered listing automation',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['productivity', 'shopping', 'business']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  },
  // PERFORMANCE OPTIMIZATION: Enhanced build configuration for better performance
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    sourcemap: false, // Disabled for production performance
    rollupOptions: {
      output: {
        // Smart chunking for better caching and load performance
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'recharts'],
          'vendor-api': ['axios', '@supabase/supabase-js'],
          'vendor-utils': ['zod'],
          
          // AI services chunk (loaded on-demand)
          'ai-services': [
            './src/services/openaiService.js',
            './src/services/AIAccuracyAgent.ts',
            './src/services/OCRKeywordOptimizer.ts'
          ],
          
          // eBay services chunk
          'ebay-services': [
            './src/services/ebayApi.ts',
            './src/services/EbayMarketResearch.ts',
            './src/services/EbayCategoryManager.ts'
          ]
        },
        // Optimize file names for better caching
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return 'img/[name]-[hash][extname]';
          }
          if (/css/i.test(extType || '')) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // Optimize terser for better compression
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.logs for debugging (change to true for production)
        drop_debugger: true,
        passes: 2
      },
      mangle: {
        safari10: true
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'recharts'
    ],
    exclude: [
      'lucide-react',
      // Large AI libraries loaded dynamically
      '@google-cloud/vision',
      'openai'
    ],
  },
  // Preview server optimization
  preview: {
    port: 4173,
    strictPort: true,
    host: true
  }
});
