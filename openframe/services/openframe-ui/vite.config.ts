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
      host: true,
      hmr: {
        protocol: 'wss',
        host: 'openframe-gateway.192.168.100.100.nip.io',
        clientPort: 443,
        // path: '/ws'
      }
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
      include: []
    }
  }
})
