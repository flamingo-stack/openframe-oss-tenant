import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: ({ source, type }) => {
          if (type === 'asset' && source?.toString().includes('text/css')) {
            return 'assets/styles.[hash].css'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})
