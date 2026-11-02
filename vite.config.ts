import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
// GitHub Pages公開時（例: https://<username>.github.io/GlassiumOS-V4.0/）は
// VITE_GH_PAGES=true で '/GlassiumOS-V4.0/'、通常ビルド・プレビュー時は './' または '/' を自動適用
export default defineConfig({
  plugins: [react()],

  base:
    process.env.VITE_GH_PAGES === 'true'
      ? '/GlassiumOS-V4.0/'
      : process.env.NODE_ENV === 'production'
      ? './'
      : '/',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  optimizeDeps: {
    include: ['lucide-react', 'three', 'framer-motion'],
  },
});
