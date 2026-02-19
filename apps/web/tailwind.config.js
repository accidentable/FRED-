/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Override Tailwind's built-in black so bg-black → #1A1A1A instead of #000
        black: '#1A1A1A',
        // Semantic aliases for components
        background: '#1A1A1A',
        foreground: '#F9FAF9',
        card: '#242424',
        terminal: {
          bg: '#1A1A1A',
          black: '#111111',
          gray: '#333333',
          dim: '#888888',
          light: '#F9FAF9',
          green: '#00ff41',
          orange: '#ff5f1f',
          red: '#ff3333',
          // Text hierarchy
          primary: '#F9FAF9',
          secondary: '#C0C4CC',
          muted: '#888888',
        },
      },
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
