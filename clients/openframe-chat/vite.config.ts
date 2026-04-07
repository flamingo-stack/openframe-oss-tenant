import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const appType = process.env.NEXT_PUBLIC_APP_TYPE || 'flamingo';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'next/image': path.resolve(__dirname, 'src/shims/next-image.tsx'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.NEXT_PUBLIC_APP_TYPE': JSON.stringify(appType),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 3003,
    strictPort: true,
    host: '127.0.0.1',
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_', 'NEXT_PUBLIC_'],
});
