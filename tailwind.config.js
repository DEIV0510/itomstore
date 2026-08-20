/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        whatsapp: '#25D366',
        ink: '#050506',
        carbon: '#0A0A0C',
        graphite: '#121215',
        elevated: '#17171B',
        hairline: 'rgba(255,255,255,0.08)',
        gold: {
          100: '#FBF3DC',
          200: '#F3E3B6',
          300: '#E9D090',
          400: '#DCBB66',
          500: '#C9A227',
          600: '#A8842A',
          700: '#7C6120',
          900: '#3B2E0F',
        },
        silver: {
          100: '#F5F6F8',
          300: '#D3D6DC',
          500: '#A7ADB7',
          700: '#7E838D',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { tightest: '-0.045em', label: '0.22em' },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.6), 0 12px 32px -12px rgba(0,0,0,.9)',
        lift: '0 2px 4px rgba(0,0,0,.6), 0 28px 60px -20px rgba(0,0,0,1)',
        goldglow: '0 0 0 1px rgba(201,162,39,.35), 0 12px 40px -12px rgba(201,162,39,.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.06)',
      },
      backgroundImage: {
        'gold-metal': 'linear-gradient(135deg,#7C6120 0%,#C9A227 28%,#F3E3B6 48%,#C9A227 68%,#7C6120 100%)',
        'silver-metal': 'linear-gradient(160deg,#FFFFFF 0%,#D3D6DC 35%,#8A9099 62%,#F5F6F8 100%)',
        'fade-b': 'linear-gradient(180deg,rgba(5,5,6,0) 0%,rgba(5,5,6,.72) 55%,#050506 100%)',
      },
      transitionTimingFunction: { premium: 'cubic-bezier(.22,1,.36,1)' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(18px)' }, '100%': { opacity: '1', transform: 'none' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-160% 0' }, '100%': { backgroundPosition: '260% 0' } },
        'sweep': { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(220%)' } },
        'pulse-ring': { '0%': { transform: 'scale(.9)', opacity: '.55' }, '70%,100%': { transform: 'scale(1.5)', opacity: '0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .6s ease both',
        shimmer: 'shimmer 1.7s linear infinite',
        sweep: 'sweep 2.4s cubic-bezier(.22,1,.36,1) infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(.22,1,.36,1) infinite',
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
