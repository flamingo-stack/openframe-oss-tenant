import openframeCorePreset from '@flamingo-stack/openframe-frontend-core/tailwind.config.ts'
import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@flamingo-stack/openframe-frontend-core/dist/**/*.{js,mjs,cjs}',
  ],
  theme: {
    extend: {
      // Extend with ui-kit design tokens
      fontFamily: {
        'body': ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['var(--font-azeret-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
  // Use ui-kit configuration as preset - this provides all ODS colors
  presets: [openframeCorePreset],
}

export default config