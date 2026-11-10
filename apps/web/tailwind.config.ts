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
          brandBlue: '#000000', // Monochrome black branding
          white: '#FFFFFF',
          bg: '#000000',
          black: '#000000',
          darkBlue: '#0A0A0A', // Deep black for dark sections
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
        sans: ['"Reddit Sans"', 'var(--font-inclusive)', 'system-ui', 'sans-serif'],
        inclusive: ['var(--font-inclusive)', 'Inclusive Sans', 'sans-serif'],
        heading: ['"Reddit Sans"', 'system-ui', 'sans-serif'],
        reddit: ['"Reddit Sans"', 'sans-serif'],
        elms: ['"Elms Sans"', 'sans-serif'],
        poppins: ['"Poppins"', 'sans-serif'],
        questrial: ['"Questrial"', 'sans-serif'],
        snippet: ['"Snippet"', 'sans-serif'],
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
