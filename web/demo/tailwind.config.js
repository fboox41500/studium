/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        sm: '2rem',
        lg: '3rem',
        xl: '4rem',
      },
    },
    extend: {
      colors: {
        brand: {
          50: '#f4f8ff',
          100: '#e6efff',
          200: '#c5dbff',
          300: '#9ec4ff',
          400: '#76aaff',
          500: '#4a8dff',
          600: '#256bfa',
          700: '#1c56d0',
          800: '#1a48a3',
          900: '#193f7c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        floating: '0 24px 60px -15px rgba(15, 23, 42, 0.45)',
      },
    },
  },
  plugins: [],
}
