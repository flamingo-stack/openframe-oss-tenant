import openframeCorePreset from '@flamingo-stack/openframe-frontend-core/tailwind.config.ts';
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
    './node_modules/@flamingo-stack/openframe-frontend-core/dist/**/*.{js,mjs,cjs}',
  ],
  plugins: [tailwindcssAnimate],
  presets: [openframeCorePreset],
};

export default config;
