import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * Split the vendors from the app code.
         *
         * This is about caching, not size: measured against a single bundle it
         * costs ~0.7 kB gzipped, because gzip compresses each file on its own
         * and loses some cross-file redundancy. What it buys is that react/ and
         * supabase/ keep their content hash across deploys, so a returning
         * visitor refetches only the ~33 kB app chunk instead of all ~165 kB.
         *
         * The admin dashboard is not listed here — it is code-split by route in
         * routes.tsx, so visitors who never open it never download it.
         */
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
