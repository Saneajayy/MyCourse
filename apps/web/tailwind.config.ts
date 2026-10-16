import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        course: {
          white: '#FFFFFF',
          bg: '#FAFAFA',
          black: '#000000',
          darkBlue: '#0A192F', // Deep navy for headings, body text, and dark sections
          navyMuted: '#1E293B', // Secondary text (14.3:1 contrast on white)
          navySubtle: '#475569',
          orange: '#E05305', // High-contrast industrial safety orange
          orangeHover: '#C44500',
          orangeSubtle: '#FFF7ED',
          border: '#000000', // 1px black borders on buttons and interactive tabs
          borderMuted: '#CBD5E1', // Subtle technical divider lines
          error: '#DC2626',
          success: '#16A34A',
          warning: '#D97706',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Enforce STRICT NO-SHADOW policy
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        none: 'none',
      },
      backgroundImage: {
        // Enforce STRICT NO-GRADIENT policy
        'gradient-radial': 'none',
        'gradient-conic': 'none',
      },
      borderWidth: {
        DEFAULT: '1px',
        thin: '1px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
