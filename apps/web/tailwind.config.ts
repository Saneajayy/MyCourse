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
        // Aesthetic: White + Industrial Orange + Dark Blue / Black
        course: {
          white: '#FFFFFF',
          bg: '#FAFAFA',
          black: '#000000',
          darkBlue: '#0A192F', // Deep navy for headings, body text, and dark sections
          navyMuted: '#1E293B',
          orange: '#E05305', // High-contrast industrial safety orange
          orangeHover: '#C44500',
          orangeSubtle: '#FFF7ED',
          border: '#000000',
        },
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
    },
  },
  plugins: [],
};

export default config;
