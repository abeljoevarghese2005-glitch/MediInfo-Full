/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#00BCD4",
        secondary: "#2196F3",
        // New semantic tokens for the Landing redesign — read from CSS vars
        // defined in src/index.css, so light/dark mode just works.
        background: "var(--mi-background)",
        foreground: "var(--mi-foreground)",
        card: "var(--mi-card)",
        "card-foreground": "var(--mi-card-foreground)",
        muted: "var(--mi-muted)",
        "muted-foreground": "var(--mi-muted-foreground)",
        border: "var(--mi-border)",
        "mi-primary": "var(--mi-primary)",
        "mi-primary-foreground": "var(--mi-primary-foreground)",
        accent: "var(--mi-accent)",
        "accent-foreground": "var(--mi-accent-foreground)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Calisto MT", "Bookman Old Style", "Palatino", "Georgia", "serif"],
      },
      keyframes: {
        "mi-fade-up": {
          from: { opacity: 0, transform: "translateY(18px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "mi-fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "mi-scale-in": {
          from: { opacity: 0, transform: "scale(0.94)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        "mi-reveal-up": {
          from: { transform: "translateY(115%)" },
          to: { transform: "translateY(0)" },
        },
        "mi-aurora": {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "33%": { transform: "translate(6%, -8%) scale(1.12)" },
          "66%": { transform: "translate(-7%, 5%) scale(0.94)" },
        },
        "mi-pulse-dot": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.55)" },
          "70%": { boxShadow: "0 0 0 7px rgba(34,197,94,0)" },
        },
        "mi-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "mi-gradient-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        "mi-clock-hour": {
          to: { transform: "rotate(360deg)" },
        },
        "mi-clock-minute": {
          to: { transform: "rotate(360deg)" },
        },
        "mi-clock-float": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "50%": { transform: "translate(10px, -14px) rotate(3deg)" },
        },
      },
      animation: {
        "mi-fade-up": "mi-fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "mi-fade-in": "mi-fade-in 0.8s ease both",
        "mi-scale-in": "mi-scale-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "mi-reveal-up": "mi-reveal-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "mi-aurora": "mi-aurora 18s ease-in-out infinite",
        "mi-pulse-dot": "mi-pulse-dot 2s infinite",
        "mi-float": "mi-float 6s ease-in-out infinite",
        "mi-gradient-flow": "mi-gradient-flow 3s ease infinite",
        "mi-clock-hour": "mi-clock-hour 20s linear infinite",
        "mi-clock-minute": "mi-clock-minute 3s linear infinite",
        "mi-clock-float": "mi-clock-float 10s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}