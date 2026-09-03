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
      // Named tiers for the sizes the app was already reaching for via
      // arbitrary `text-[Npx]` values (round 2 of the visual pass: audited
      // 51 arbitrary usages across ~30 files). Every value here is copied
      // verbatim from what was already in use — this renames the scale,
      // it doesn't change it, so there's zero visual diff, just less risk
      // of the next screen picking 12px where the rest of the app uses 11.
      // Deliberately plain strings (font-size only, no bundled line-height)
      // so these always compose safely with whatever `leading-*` class a
      // call site already has, instead of the two fighting over which
      // line-height wins in the cascade — the same class of bug the
      // `.glass`/`shadow-card` box-shadow collision was, last pass.
      fontSize: {
        "2xs": "10px", // nav labels, tiny inline badge counters
        caption: "11px", // eyebrow labels, disclaimers, small badges — the single most-used tier
        tooltip: "12px", // Tooltip primitive only
        label: "13px", // tab pills, small buttons
        body: "15px", // onboarding copy, card titles, large buttons
        title: "22px", // mobile page/section h1s
        "title-lg": "28px", // desktop variant of `title` (StudentHome/BusinessHome lg:)
        heading: "26px", // ScreenHeader and onboarding/choose-plan success headlines
        subsection: "19px", // a heading *inside* a section (e.g. "Student track"
        // inside Features), one real tier below a section's own heading —
        // not the same size/weight as the section heading it lives under.
        display: "34px", // landing page hero only
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
        // Multi-layer elevation recipe (crisp near-shadow + soft diffuse
        // far-shadow) instead of a single soft blur — the near layer is
        // what actually reads as "this surface is lifted," which the
        // single-shadow version was missing, especially on the near-white
        // light theme where there's little luminance gap to rely on.
        subtle: "0 1px 2px hsl(var(--shadow-color) / 0.22)",
        card: "inset 0 1px 0 var(--card-highlight), 0 1px 1px hsl(var(--shadow-color) / 0.22), 0 4px 10px -4px hsl(var(--shadow-color) / 0.32), 0 20px 40px -20px hsl(var(--shadow-color) / 0.55)",
        raised: "inset 0 1px 0 var(--card-highlight), 0 2px 6px -1px hsl(var(--shadow-color) / 0.3), 0 10px 24px -8px hsl(var(--shadow-color) / 0.45)",
        pop: "inset 0 1px 0 var(--card-highlight), 0 8px 16px -6px hsl(var(--shadow-color) / 0.35), 0 28px 56px -16px hsl(var(--shadow-color) / 0.55)",
        // Neutral elevated hover shadow for interactive cards that aren't
        // inherently accent-branded (a plain career-progress or CTA card
        // shouldn't glow purple on hover just because it's clickable).
        float: "inset 0 1px 0 var(--card-highlight), 0 12px 24px -8px hsl(var(--shadow-color) / 0.35), 0 32px 64px -24px hsl(var(--shadow-color) / 0.5)",
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
