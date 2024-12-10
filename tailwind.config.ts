import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      typography: {
        DEFAULT: {
          css: {
            pre: {
              padding: 0,
              margin: 0,
              backgroundColor: 'transparent',
            },
            'pre code': {
              padding: '0',
              verticalAlign: 'baseline',
              whiteSpace: 'pre-wrap',
              margin: '0',
              display: 'inline',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  darkMode: 'selector',
} satisfies Config;

