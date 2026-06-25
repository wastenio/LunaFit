import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e11d48',
        secondary: '#09090b',
        ink: '#09090b'
      }
    }
  },
  plugins: []
};

export default config;
