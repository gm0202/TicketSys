/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F14', // Deep Charcoal
        surface: '#121826',    // Dark Slate
        primary: '#6366f1',    // Indigo (Stripe-like accent)
        'primary-dark': '#4f46e5',
        text: {
          primary: '#F3F4F6',   // Gray 100
          secondary: '#9CA3AF', // Gray 400
        },
        border: '#1F2937',      // Gray 800
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'label': '0.05em',
      }
    },
  },
  plugins: [],
}
