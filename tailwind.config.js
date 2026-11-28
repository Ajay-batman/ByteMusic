/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        18: '4.5rem',
      },
      fontFamily: {
        velvet: ['"Plus Jakarta Sans"', 'Urbanist', 'sans-serif'],
      },
      colors: {
        spotify: {
          green: '#1db954',
          dark: '#121212',
          card: '#181818',
          hover: '#282828',
          subdued: '#b3b3b3',
        },
        velvet: {
          lime: '#D2F843',
          dark: '#0B0B12',
          card: '#161623',
          dock: 'rgba(22, 23, 33, 0.72)',
        },
      },
    },
  },
  plugins: [],
};
