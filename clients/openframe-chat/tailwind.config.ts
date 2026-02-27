import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@flamingo-stack/openframe-frontend-core/dist/**/*.{js,mjs,cjs}',
  ],
  prefix: '',
  safelist: [
    // Classes that may come from CMS / database HTML strings and therefore
    // are not detected at build-time. Keeping them prevents missing styles
    // such as the yellow quote bar in founder bios / team descriptions.
    'border-l-2',
    'border-l-4',
    'pl-6',
    'mt-4',
    'italic',
    // Footer responsive grid classes
    'lg:grid-cols-4',
    'lg:col-span-1',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      screens: {
        md: '860px', // Custom breakpoint for 2-column layout
        xl: '1550px', // Custom breakpoint for 3-column vendor grid
      },
      fontFamily: {
        heading: ['var(--font-azeret-mono)', 'monospace'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ODS semantic colors
        ods: {
          // Backgrounds
          bg: 'var(--color-bg)',
          card: 'var(--color-bg-card)',
          overlay: 'var(--color-bg-overlay)',
          skeleton: 'var(--color-bg-skeleton)',

          // Borders & Dividers
          border: 'var(--color-border-default)',
          bgHover: 'var(--color-bg-hover)',
          // Aliases to support kebab-case utility names used in components
          'bg-hover': 'var(--color-bg-hover)',
          'card-hover': 'var(--color-bg-hover)',
          'bg-active': 'var(--color-bg-active)',
          bgActive: 'var(--color-bg-active)',
          divider: 'var(--color-divider)',

          // Text Hierarchy
          text: {
            primary: 'var(--color-text-primary)',
            secondary: 'var(--color-text-secondary)',
            tertiary: 'var(--color-text-tertiary)',
            muted: 'var(--color-text-muted)',
            subtle: 'var(--color-text-subtle)',
            disabled: 'var(--color-text-disabled)',
            'on-accent': 'var(--color-text-on-accent)',
            'on-dark': 'var(--color-text-on-dark)',
          },

          // Accent Colors with Full States
          accent: {
            DEFAULT: 'var(--color-accent-primary)',
            hover: 'var(--color-accent-hover)',
            active: 'var(--color-accent-active)',
            focus: 'var(--color-accent-focus)',
            disabled: 'var(--color-accent-disabled)',
          },

          // Status Colors with Full States
          success: {
            DEFAULT: 'var(--color-success)',
            hover: 'var(--color-success-hover)',
            active: 'var(--color-success-active)',
          },
          error: {
            DEFAULT: 'var(--color-error)',
            hover: 'var(--color-error-hover)',
            active: 'var(--color-error-active)',
          },
          warning: {
            DEFAULT: 'var(--color-warning)',
            hover: 'var(--color-warning-hover)',
            active: 'var(--color-warning-active)',
          },
          info: {
            DEFAULT: 'var(--color-info)',
            hover: 'var(--color-info-hover)',
            active: 'var(--color-info-active)',
          },

          // Interactive States
          disabled: 'var(--color-disabled)',
          focus: 'var(--color-focus-ring)',
          'focus-visible': 'var(--color-focus-visible)',

          // Links
          link: {
            DEFAULT: 'var(--color-link)',
            hover: 'var(--color-link-hover)',
            visited: 'var(--color-link-visited)',
          },
        },

        // Extended Design Tokens
        spacing: {
          'component-xs': 'var(--space-component-xs)',
          'component-sm': 'var(--space-component-sm)',
          'component-md': 'var(--space-component-md)',
          'component-lg': 'var(--space-component-lg)',
          'component-xl': 'var(--space-component-xl)',
          'section-xs': 'var(--space-section-xs)',
          'section-sm': 'var(--space-section-sm)',
          'section-md': 'var(--space-section-md)',
          'section-lg': 'var(--space-section-lg)',
          'section-xl': 'var(--space-section-xl)',

          // Responsive Spacing System
          'responsive-zero': 'var(--spacing-system-zero)',
          'responsive-xxs': 'var(--spacing-system-xxs)',
          'responsive-xs': 'var(--spacing-system-xs)',
          'responsive-xsf': 'var(--spacing-system-xsf)',
          'responsive-s': 'var(--spacing-system-s)',
          'responsive-sf': 'var(--spacing-system-sf)',
          'responsive-m': 'var(--spacing-system-m)',
          'responsive-mf': 'var(--spacing-system-mf)',
          'responsive-l': 'var(--spacing-system-l)',
          'responsive-lf': 'var(--spacing-system-lf)',
          'responsive-xl': 'var(--spacing-system-xl)',
          'responsive-xlf': 'var(--spacing-system-xlf)',
          'responsive-xxl': 'var(--spacing-system-xxl)',

          // Responsive Component Spacing
          'responsive-component-xs': 'var(--space-responsive-component-xs)',
          'responsive-component-sm': 'var(--space-responsive-component-sm)',
          'responsive-component-md': 'var(--space-responsive-component-md)',
          'responsive-component-lg': 'var(--space-responsive-component-lg)',
          'responsive-component-xl': 'var(--space-responsive-component-xl)',

          // Responsive Section Spacing
          'responsive-section-xs': 'var(--space-responsive-section-xs)',
          'responsive-section-sm': 'var(--space-responsive-section-sm)',
          'responsive-section-md': 'var(--space-responsive-section-md)',
          'responsive-section-lg': 'var(--space-responsive-section-lg)',

          // Fluid Spacing (smooth scaling with clamp)
          'fluid-component-xs': 'var(--spacing-component-xs-fluid)',
          'fluid-component-sm': 'var(--spacing-component-sm-fluid)',
          'fluid-component-md': 'var(--spacing-component-md-fluid)',
          'fluid-component-lg': 'var(--spacing-component-lg-fluid)',
          'fluid-component-xl': 'var(--spacing-component-xl-fluid)',
          'fluid-section-xs': 'var(--spacing-section-xs-fluid)',
          'fluid-section-sm': 'var(--spacing-section-sm-fluid)',
          'fluid-section-md': 'var(--spacing-section-md-fluid)',
          'fluid-section-lg': 'var(--spacing-section-lg-fluid)',
          'fluid-section-xl': 'var(--spacing-section-xl-fluid)',
        },

        fontSize: {
          // Static Typography (fixed sizes) - Simplified for TypeScript compatibility
          'heading-1': 'var(--font-size-4xl)',
          'heading-2': 'var(--font-size-3xl)',
          'heading-3': 'var(--font-size-2xl)',
          'heading-4': 'var(--font-size-xl)',
          'heading-5': 'var(--font-size-lg)',
          'heading-6': 'var(--font-size-base)',
          'body-large': 'var(--font-size-lg)',
          'body-base': 'var(--font-size-base)',
          'body-small': 'var(--font-size-sm)',
          'body-xs': 'var(--font-size-xs)',
          caption: 'var(--font-size-sm)',
          label: 'var(--font-size-sm)',
          button: 'var(--font-size-base)',
          code: 'var(--font-size-sm)',

          // Responsive Typography (adapts to screen size)
          'responsive-h1': 'var(--font-size-h1-title)',
          'responsive-h2': 'var(--font-size-h2-sub-title)',
          'responsive-h3': 'var(--font-size-h3-body)',
          'responsive-h5': 'var(--font-size-h5-caption)',

          // Fluid Typography (smooth scaling with clamp)
          'fluid-h1': 'var(--font-size-h1-fluid)',
          'fluid-h2': 'var(--font-size-h2-fluid)',
          'fluid-h3': 'var(--font-size-h3-fluid)',
          'fluid-h4': 'var(--font-size-h4-fluid)',
          'fluid-h5': 'var(--font-size-h5-fluid)',
          'fluid-h6': 'var(--font-size-h6-fluid)',
          'fluid-body-large': 'var(--font-size-body-large-fluid)',
          'fluid-body-base': 'var(--font-size-body-base-fluid)',
          'fluid-body-small': 'var(--font-size-body-small-fluid)',
        },

        boxShadow: {
          card: 'var(--shadow-card)',
          'card-hover': 'var(--shadow-card-hover)',
          modal: 'var(--shadow-modal)',
          dropdown: 'var(--shadow-dropdown)',
          tooltip: 'var(--shadow-tooltip)',
          focus: 'var(--shadow-focus)',
          accent: 'var(--shadow-accent)',
          'accent-lg': 'var(--shadow-accent-lg)',
        },

        transitionDuration: {
          fast: 'var(--duration-fast)',
          normal: 'var(--duration-normal)',
          slow: 'var(--duration-slow)',
          slower: 'var(--duration-slower)',
        },

        transitionTimingFunction: {
          bounce: 'var(--ease-bounce)',
          elastic: 'var(--ease-elastic)',
        },

        zIndex: {
          dropdown: 'var(--z-dropdown)',
          sticky: 'var(--z-sticky)',
          fixed: 'var(--z-fixed)',
          'modal-backdrop': 'var(--z-modal-backdrop)',
          modal: 'var(--z-modal)',
          popover: 'var(--z-popover)',
          tooltip: 'var(--z-tooltip)',
          notification: 'var(--z-notification)',
          debug: 'var(--z-debug)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
