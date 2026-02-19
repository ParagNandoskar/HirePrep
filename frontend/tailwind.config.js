/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#001D3D',
          50: '#E6F0FF',
          100: '#CCE0FF',
          200: '#99C2FF',
          300: '#66A3FF',
          400: '#3385FF',
          500: '#0066FF',
          600: '#0052CC',
          700: '#003D99',
          800: '#002966',
          900: '#001D3D',
        },
        secondary: {
          DEFAULT: '#003566',
          50: '#E6F2FF',
          100: '#CCE5FF',
          200: '#99CBFF',
          300: '#66B0FF',
          400: '#3396FF',
          500: '#007BFF',
          600: '#0062CC',
          700: '#004A99',
          800: '#003566',
          900: '#002133',
        },
        tertiary: {
          DEFAULT: '#FFC300',
          50: '#FFFBF0',
          100: '#FFF7E0',
          200: '#FFEFC2',
          300: '#FFE7A3',
          400: '#FFDF85',
          500: '#FFD766',
          600: '#FFCF47',
          700: '#FFC300',
          800: '#E6AF00',
          900: '#CC9C00',
        },
        text: {
          DEFAULT: '#000814',
          light: '#495057',
          muted: '#6C757D',
        },
        background: {
          primary: '#F8F9FA',
          secondary: '#EAEAEA',
          tertiary: '#FFF9E6',
        },
      },
    },
  },
  plugins: [],
}