import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // Use automatic JSX runtime for smaller bundle
      jsxRuntime: 'automatic',
      // Only use Fast Refresh in development
      fastRefresh: true
    })
  ],
  base: './',
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'icons': ['lucide-react'],
          'xlsx': ['xlsx']
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Minify and compress
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace']
      },
      format: {
        comments: false // Remove all comments
      }
    },
    // Generate smaller chunks
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    // Source maps only in dev
    sourcemap: false,
    // Target modern browsers for smaller output
    target: 'es2015',
    // Optimize CSS
    cssMinify: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    // Pre-bundle these for faster dev server
    force: false
  },
  // Enable compression
  server: {
    compress: true,
    // Faster HMR
    hmr: {
      overlay: true
    },
    // Proxy API requests to backend in development
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // Preview server config
  preview: {
    port: 4173,
    strictPort: false,
    open: true
  }
});
