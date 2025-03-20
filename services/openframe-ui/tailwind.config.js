/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Extract colors from existing CSS variables
        primary: 'var(--primary-color)',
        secondary: 'var(--text-color-secondary)',
        surface: {
          card: 'var(--surface-card)',
          ground: 'var(--surface-ground)',
          section: 'var(--surface-section)',
          border: 'var(--surface-border)',
          hover: 'var(--surface-hover)',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--border-radius)',
      },
      boxShadow: {
        card: 'var(--card-shadow)',
      },
    },
  },
  plugins: [],
}
