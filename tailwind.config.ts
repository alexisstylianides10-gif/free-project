import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-raised": "hsl(var(--surface-raised))",
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          soft: "hsl(var(--accent-soft))",
          end: "hsl(var(--accent-end))",
        },
        mission: {
          from: "hsl(var(--mission-from))",
          via: "hsl(var(--mission-via))",
          to: "hsl(var(--mission-to))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          soft: "hsl(var(--warning-soft))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          soft: "hsl(var(--danger-soft))",
        },
        school: "hsl(var(--school))",
        future: "hsl(var(--future))",
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "18px",
        xl: "22px",
        "2xl": "28px",
        "3xl": "34px",
      },
      boxShadow: {
        subtle: "0 1px 2px hsl(var(--shadow-color) / 0.2)",
        card: "0 1px 3px hsl(var(--shadow-color) / 0.3), 0 12px 32px -16px hsl(var(--shadow-color) / 0.5)",
        raised: "0 4px 16px hsl(var(--shadow-color) / 0.4)",
        pop: "0 20px 48px -12px hsl(var(--shadow-color) / 0.6)",
        "glow-accent": "0 12px 32px -10px hsl(var(--accent) / 0.55)",
        "glow-mission": "0 12px 32px -10px hsl(var(--mission-via) / 0.5)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent-end)) 100%)",
        "gradient-mission": "linear-gradient(135deg, hsl(var(--mission-from)) 0%, hsl(var(--mission-via)) 55%, hsl(var(--mission-to)) 100%)",
        "gradient-radial-glow": "radial-gradient(60% 60% at 50% 0%, hsl(var(--accent) / 0.25) 0%, transparent 70%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "fade-up": "fade-up 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
