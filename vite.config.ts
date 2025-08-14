import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
