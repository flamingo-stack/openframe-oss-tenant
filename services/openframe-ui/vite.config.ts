import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [vue()],
    server: {
      port: 5174,
      strictPort: true,
      host: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env': env,
      'window.__RUNTIME_CONFIG__': JSON.stringify({
        apiUrl: env.API_URL || 'http://localhost:8090',
        gatewayUrl: env.GATEWAY_URL || 'http://localhost:8100',
        clientId: env.CLIENT_ID || 'openframe_web_dashboard',
        clientSecret: env.CLIENT_SECRET || 'prod_secret'
      })
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
