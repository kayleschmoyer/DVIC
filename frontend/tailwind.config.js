// frontend/tailwind.config.js
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#eff6ff',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
          }
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-out',
          'slide-up': 'slideUp 0.5s ease-out',
          'pulse-slow': 'pulse 3s infinite',
        },
        backdropBlur: {
          xs: '2px',
        }
      },
    },
    plugins: [],
  }