import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue()],
    server: {
      port: parseInt(env.PORT || '3000'),
      strictPort: true,
      host: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env': {},
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_GATEWAY_URL': JSON.stringify(env.VITE_GATEWAY_URL),
      'import.meta.env.VITE_GRAFANA_URL': JSON.stringify(env.VITE_GRAFANA_URL),
      'import.meta.env.VITE_CLIENT_ID': JSON.stringify(env.VITE_CLIENT_ID),
      'import.meta.env.VITE_CLIENT_SECRET': JSON.stringify(env.VITE_CLIENT_SECRET),
      'import.meta.env.MODE': JSON.stringify(mode)
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          sourcemapExcludeSources: true
        }
      }
    },
    optimizeDeps: {
      include: [
        'rxjs',
        '@grafana/experimental',
        '@grafana/faro-core',
        '@grafana/faro-web-sdk',
        '@opentelemetry/api',
        'dompurify',
        'micro-memoize',
        'performance-now',
        'react-from-dom',
        'react-inlinesvg',
        'react-window',
        'tabbable',
        '@reduxjs/toolkit',
        'immer',
        'react-redux',
        'html-parse-stringify',
        'redux',
        'reselect'
      ]
    }
  }
})
