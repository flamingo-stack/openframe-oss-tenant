/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include ui-kit components
    "../../../ui-kit/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "ods-bg-primary": "#161616",
        "ods-bg-card": "#212121",
        "ods-bg-hover": "#2b2b2b",
        "ods-bg-active": "#353535",
        "ods-bg-surface": "#3a3a3a",
        
        "ods-text-primary": "#fafafa",
        "ods-text-secondary": "#888888",
        "ods-text-tertiary": "#444444",
        "ods-text-muted": "#747474",
        "ods-text-disabled": "#3a3a3a",
        "ods-text-on-accent": "#212121",
        "ods-text-on-dark": "#fafafa",
        
        "ods-border-primary": "#3a3a3a",
        "ods-border-hover": "#444444",
        "ods-border-active": "#4e4e4e",
        
        "ods-accent-primary": "#ffc008",
        "ods-accent-hover": "#f5b600",
        "ods-accent-active": "#ebac00",
        
        "ods-error": "#ef4444",
        "ods-error-hover": "#dc2626",
        "ods-error-active": "#b91c1c",
        
        "ods-success": "#10b981",
        "ods-warning": "#f59e0b",
        "ods-info": "#3b82f6"
      },
      animation: {
        'pulse-cursor': 'pulse-cursor 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-cursor': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        }
      }
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}