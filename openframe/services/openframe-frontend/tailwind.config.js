import designSystemConfig from './ui-kit/tailwind.config.js'

/** @type {import('tailwindcss').Config} */
export default {
  ...designSystemConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './ui-kit/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    ...designSystemConfig.theme,
    extend: {
      ...designSystemConfig.theme?.extend,
      // Add any OpenFrame-specific theme extensions here
    }
  }
}