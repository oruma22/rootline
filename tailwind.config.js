/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        overdue: 'var(--overdue)',
        'overdue-bg': 'var(--overdue-bg)',
        warning: 'var(--warning)',
        'warning-bg': 'var(--warning-bg)',
        success: 'var(--success)',
        'success-bg': 'var(--success-bg)',
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 8px)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        serif: ['var(--font-lora)', 'Lora', 'Georgia', 'serif'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '16px', letterSpacing: '0.02em' }],
        'sm': ['13px', { lineHeight: '20px' }],
        'base': ['14px', { lineHeight: '24px' }],
        'md': ['15px', { lineHeight: '24px' }],
        'lg': ['16px', { lineHeight: '28px' }],
        'xl': ['18px', { lineHeight: '28px' }],
        '2xl': ['20px', { lineHeight: '32px' }],
        '3xl': ['24px', { lineHeight: '36px' }],
        '4xl': ['28px', { lineHeight: '40px' }],
      },
      boxShadow: {
        'notebook': '2px 2px 0 #D4C9B0, 4px 4px 0 #C9BEA5, 0 8px 32px rgba(92,61,46,0.12)',
        'card-sm': '0 1px 4px rgba(92,61,46,0.08), 0 0 0 1px rgba(92,61,46,0.06)',
        'card-md': '0 4px 16px rgba(92,61,46,0.10), 0 1px 4px rgba(92,61,46,0.06)',
        'sticky': '1px 2px 4px rgba(92,61,46,0.15), 0 1px 2px rgba(92,61,46,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-save': 'savePulse 0.6s ease-in-out',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};