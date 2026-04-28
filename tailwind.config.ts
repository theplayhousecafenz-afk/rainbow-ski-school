import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        alpine: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          600: '#1e3a8a',
          700: '#1e3070',
          800: '#172554',
          900: '#0f1a3d',
        },
      },
    },
  },
  plugins: [],
}

export default config
