import path from 'path'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./ui-kit/src/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        'md': '860px',     // Custom breakpoint for 2-column layout
        'xl': '1550px',    // Custom breakpoint for 3-column vendor grid
      },
      fontFamily: {
        heading: ["var(--font-azeret-mono)", "monospace"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-azeret-mono)", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ODS semantic colors - comprehensive set from multi-platform-hub
        ods: {
          // Backgrounds
          bg: "var(--color-bg)",
          card: "var(--color-bg-card)",
          overlay: "var(--color-bg-overlay)",
          skeleton: "var(--color-bg-skeleton)",
          
          // Borders & Dividers
          border: "var(--color-border-default)",
          bgHover: "var(--color-bg-hover)",
          // Aliases to support kebab-case utility names used in components
          "bg-hover": "var(--color-bg-hover)",
          "card-hover": "var(--color-bg-hover)",
          "bg-active": "var(--color-bg-active)",
          bgActive: "var(--color-bg-active)",
          divider: "var(--color-divider)",
          
          // Text Hierarchy
          text: {
            primary: "var(--color-text-primary)",
            secondary: "var(--color-text-secondary)",
            tertiary: "var(--color-text-tertiary)",
            muted: "var(--color-text-muted)",
            subtle: "var(--color-text-subtle)",
            disabled: "var(--color-text-disabled)",
            "on-accent": "var(--color-text-on-accent)",
            "on-dark": "var(--color-text-on-dark)",
          },
          
          // Accent Colors with Full States
          accent: {
            DEFAULT: "var(--color-accent-primary)",
            hover: "var(--color-accent-hover)",
            active: "var(--color-accent-active)",
            focus: "var(--color-accent-focus)",
            disabled: "var(--color-accent-disabled)",
          },
          
          // Status Colors with Full States
          success: {
            DEFAULT: "var(--color-success)",
            hover: "var(--color-success-hover)",
            active: "var(--color-success-active)",
          },
          error: {
            DEFAULT: "var(--color-error)",
            hover: "var(--color-error-hover)",
            active: "var(--color-error-active)",
          },
          warning: {
            DEFAULT: "var(--color-warning)",
            hover: "var(--color-warning-hover)",
            active: "var(--color-warning-active)",
          },
          info: {
            DEFAULT: "var(--color-info)",
            hover: "var(--color-info-hover)",
            active: "var(--color-info-active)",
          },
          
          // Interactive States
          disabled: "var(--color-disabled)",
          focus: "var(--color-focus-ring)",
          "focus-visible": "var(--color-focus-visible)",
          
          // Links
          link: {
            DEFAULT: "var(--color-link)",
            hover: "var(--color-link-hover)",
            visited: "var(--color-link-visited)",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}