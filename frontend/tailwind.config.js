/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Core neutrals — soft slate operations-room feel
        canvas: '#EEF1F5',
        surface: '#FFFFFF',
        ink: {
          900: '#101827',
          700: '#33415C',
          500: '#5B6B85',
          300: '#93A1B8',
          100: '#DDE3EC',
        },
        // Primary — "route" blue, distinct from generic SaaS indigo
        route: {
          50: '#EAF2FB',
          100: '#CFE2F6',
          400: '#2E76C4',
          500: '#0F5FA6',
          600: '#0B4A82',
          700: '#083960',
        },
        // Status system used across vehicles / drivers / trips / maintenance
        status: {
          available: '#0E9F6E',
          onTrip: '#0F5FA6',
          shop: '#D97706',
          retired: '#5B6B85',
          draft: '#5B6B85',
          dispatched: '#0F5FA6',
          completed: '#0E9F6E',
          cancelled: '#DC2626',
          suspended: '#DC2626',
          offDuty: '#5B6B85',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 39, 0.04), 0 4px 16px rgba(16, 24, 39, 0.06)',
        modal: '0 12px 48px rgba(16, 24, 39, 0.24)',
      },
      backgroundImage: {
        'route-dashed':
          'repeating-linear-gradient(90deg, currentColor 0 6px, transparent 6px 12px)',
      },
    },
  },
  plugins: [],
};
