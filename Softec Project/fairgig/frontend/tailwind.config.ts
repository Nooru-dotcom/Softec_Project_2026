import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#090d14',
        panel: '#101726',
        teal: '#1de9c3',
        violet: '#7a5cff',
        orange: '#ff7b2c',
      },
      backgroundImage: {
        glow: 'radial-gradient(circle at 20% 20%, rgba(29,233,195,0.25), transparent 45%), radial-gradient(circle at 80% 0%, rgba(122,92,255,0.25), transparent 35%), linear-gradient(160deg, #090d14 0%, #0f1624 100%)',
      },
      boxShadow: {
        glass: '0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
