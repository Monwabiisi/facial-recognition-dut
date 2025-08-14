/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.html",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./layout/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors with semantic meanings
        primary: {
          DEFAULT: '#0066CC', // Accessible blue
          light: '#3385D6',
          dark: '#004C99',
          contrast: '#FFFFFF'
        },
        secondary: {
          DEFAULT: '#2D3748', // Sophisticated slate
          light: '#4A5568',
          dark: '#1A202C',
          contrast: '#FFFFFF'
        },
        accent: {
          DEFAULT: '#00ABB3', // Professional teal
          light: '#00C4CC',
          dark: '#008F96',
          contrast: '#FFFFFF'
        },
        // Semantic UI colors
        interface: {
          success: '#00875A', // WCAG AAA compliant
          warning: '#B95000',
          error: '#DC2626',
          info: '#0284C7'
        },
        // Background system
        background: {
          primary: '#FFFFFF',
          secondary: '#F7FAFC',
          tertiary: '#EDF2F7',
          dark: '#1A202C'
        },
        // Professional glass effects
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.15)',
          heavy: 'rgba(255, 255, 255, 0.2)',
          border: 'rgba(255, 255, 255, 0.25)'
        },
      // 2️⃣ Custom animations for glowing effects and smooth transitions
      animation: {
        // Professional, subtle animations with performance considerations
        'fade': 'fade 200ms ease-out',
        'slide-up': 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'scale': 'scale 200ms ease-out',
        'loading': 'loading 2s ease-in-out infinite',
        'progress': 'progress 1s ease-out',
        // Reduced motion preferences respected
        'safe-spin': 'safeSpin 1s linear infinite',
      },
      // Performance-optimized keyframes
      keyframes: {
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
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
      // Professional typography system
      fontFamily: {
        sans: ['Inter var', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['SF Pro Display', 'Inter var', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      // Type scale based on perfect fourth (1.333)
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.333rem', { lineHeight: '2rem' }],
        '2xl': ['1.777rem', { lineHeight: '2.25rem' }],
        '3xl': ['2.369rem', { lineHeight: '2.5rem' }],
        '4xl': ['3.157rem', { lineHeight: '1' }],
      },
      // Professional spacing scale
      spacing: {
        '4xs': '0.125rem', // 2px
        '3xs': '0.25rem',  // 4px
        '2xs': '0.375rem', // 6px
        'xs': '0.5rem',    // 8px
        'sm': '0.75rem',   // 12px
        'md': '1rem',      // 16px
        'lg': '1.5rem',    // 24px
        'xl': '2rem',      // 32px
        '2xl': '3rem',     // 48px
        '3xl': '4rem',     // 64px
        '4xl': '6rem',     // 96px
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Professional blur system
      backdropBlur: {
        'none': '0',
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
        'xl': '24px',
      },
      // 7️⃣ Custom border radius for modern look
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
    disableColorOpacityUtilitiesByDefault: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
      },
      backgroundImage: {
        'gradient-professional': 'linear-gradient(135deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
        'gradient-subtle': 'linear-gradient(180deg, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)',
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)'
      },
      boxShadow: {
        'neon': '0 0 5px rgba(0,245,255,0.5), 0 0 20px rgba(0,245,255,0.3)',
        'glow-purple': '0 0 15px rgba(191,0,255,0.6)',
        'inner-glow': 'inset 0 0 20px rgba(255,255,255,0.15)'
      },
      backdropFilter: {
        'glass': 'blur(16px) saturate(180%)'
      },
      animation: {
        'matrix-text': 'matrix 20s linear infinite',
        'cyber-pulse': 'cyberPulse 1.5s ease-in-out infinite'
      },
      keyframes: {
        matrix: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' }
        },
        cyberPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
    disableColorOpacityUtilitiesByDefault: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  }
}