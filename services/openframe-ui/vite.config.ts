import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(() => {
  console.log('Environment variables:', process.env)

  if (!process.env.PORT) {
    throw new Error('PORT environment variable is required')
  }

  return {
    plugins: [vue()],
    server: {
      port: parseInt(process.env.PORT),
      strictPort: true,
      host: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env': process.env,
      'window.__RUNTIME_CONFIG__': JSON.stringify({
        apiUrl: process.env.API_URL,
        gatewayUrl: process.env.GATEWAY_URL,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET
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
