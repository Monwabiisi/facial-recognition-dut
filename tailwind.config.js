/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // 1️⃣ Custom colors for futuristic neon theme
      colors: {
        'neon-blue': '#00f5ff',
        'neon-purple': '#bf00ff',
        'neon-pink': '#ff0080',
        'dark-bg': '#0a0a0a',
        'card-bg': 'rgba(255, 255, 255, 0.1)',
      },
      // 2️⃣ Custom animations for glowing effects
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      // 3️⃣ Keyframes for custom animations
      keyframes: {
        glow: {
          '0%': { 
            boxShadow: '0 0 5px #00f5ff, 0 0 10px #00f5ff, 0 0 15px #00f5ff',
          },
          '100%': { 
            boxShadow: '0 0 10px #00f5ff, 0 0 20px #00f5ff, 0 0 30px #00f5ff',
          }
        }
      },
      // 4️⃣ Custom font family
      fontFamily: {
        'futuristic': ['Inter', 'Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
} 