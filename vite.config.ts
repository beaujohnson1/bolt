import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy /api/* to local netlify dev if running
      '/api': {
        target: 'http://localhost:8888/.netlify/functions',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/?/, '/'),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[PROXY] Netlify dev not running, functions will use mocks');
          });
        }
      }
    }
  },
  build: {
    sourcemap: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
