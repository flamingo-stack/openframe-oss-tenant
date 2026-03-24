import openframeCorePreset from '@flamingo-stack/openframe-frontend-core/tailwind.config.ts';
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@flamingo-stack/openframe-frontend-core/dist/**/*.{js,mjs,cjs}',
  ],
  plugins: [tailwindcssAnimate],
  // Use ui-kit configuration as preset - this provides all ODS colors
  presets: [openframeCorePreset],
};

export default config;
