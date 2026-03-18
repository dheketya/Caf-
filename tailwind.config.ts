import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f0',
          100: '#fbe6dc',
          200: '#f7c9b8',
          300: '#f2a68e',
          400: '#ec7d5e',
          500: '#e85d3a',
          600: '#d44425',
          700: '#b0351d',
          800: '#8d2d1c',
          900: '#74281b',
        },
      },
    },
  },
  plugins: [],
}
export default config
