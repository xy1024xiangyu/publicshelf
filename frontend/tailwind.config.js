/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f4d9a6',
          300: '#ecbe6a',
          400: '#e39c34',
          500: '#d4801a',
          600: '#b86314',
          700: '#994c15',
          800: '#7d3d17',
          900: '#683315',
        },
      },
    },
  },
  plugins: [],
};
