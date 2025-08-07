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
        'neon-green': '#39ff14',
        'dark-bg': '#0a0a0a',
        'card-bg': 'rgba(255, 255, 255, 0.1)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',
      },
      // 2️⃣ Custom animations for glowing effects and smooth transitions
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
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
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      // 4️⃣ Custom font family with Poppins as primary
      fontFamily: {
        'futuristic': ['Poppins', 'Inter', 'sans-serif'],
        'heading': ['Poppins', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      // 5️⃣ Custom backdrop blur values
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      // 6️⃣ Custom spacing for consistent layout
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // 7️⃣ Custom border radius for modern look
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      }
    },
  },
  plugins: [],
}
