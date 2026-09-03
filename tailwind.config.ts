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
      // Named type-scale tiers (spec §3: Display 48-64/650-700, Page title
      // 32-40/650-700, Section title 20-24/600-650, Body 15-16/400-450,
      // Secondary 13-14). This tier system already existed pre-spec
      // (reverse-engineered from ~51 arbitrary text-[Npx] usages across the
      // app) and is relied on by 41 files, most of them in the
      // authenticated /app product this pass cannot screenshot/verify.
      //
      // DECISION: only `display` — used in exactly one place app-wide (the
      // public landing hero, per its own existing comment, confirmed via
      // grep) — has been resized into the spec's stated range, since it's
      // the one tier this pass can actually verify with Playwright.
      // `title`/`title-lg`/`heading`/`subsection` sit close to but not
      // exactly on the spec's page-title/section-title ranges (e.g.
      // title-lg=28px vs. spec's page-title 32-40px); resizing them here
      // would cascade into 40 files of authenticated pages sight-unseen —
      // real risk of overflow/wrapping regressions this pass can't confirm
      // or deny. Flagged explicitly for Phase 2: re-tune those tiers to the
      // spec ranges page-by-page, verified visually as each page is swept
      // (font *weight* has the same problem — weights are applied via
      // Tailwind utilities at each call site, not bundled into these
      // size-only tokens, so enforcing spec's 650-700/600-650/400-450
      // weight ranges is inherently a per-page-file job, not a token one).
      fontSize: {
        "2xs": "10px", // nav labels, tiny inline badge counters
        caption: "11px", // eyebrow labels, disclaimers, small badges — the single most-used tier
        tooltip: "12px", // Tooltip primitive only
        label: "13px", // tab pills, small buttons — spec "secondary" tier (13-14px)
        body: "15px", // onboarding copy, card titles, large buttons — spec "body" tier (15-16px)
        title: "22px", // mobile page/section h1s
        "title-lg": "28px", // desktop variant of `title` (StudentHome/BusinessHome lg:) — Phase 2: spec wants 32-40px
        heading: "26px", // ScreenHeader and onboarding/choose-plan success headlines — Phase 2: spec wants 20-24px (or reclassify as page-title)
        subsection: "19px", // a heading *inside* a section, one tier below a section's own heading
        display: "52px", // landing page hero only — resized into spec's 48-64px range (was 34px); verified via Playwright render
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
        // Spec's third ("muted") text tier — additive, not yet consumed by
        // any existing call site. See globals.css header note.
        "muted-foreground-subtle": "hsl(var(--muted-foreground-subtle))",
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
      // Spacing: Tailwind's default rem-based scale already satisfies the
      // spec's preferred 4/8/12/16/20/24/32/40/48/64/80px values 1:1
      // (4=spacing-1, 8=spacing-2, 12=spacing-3, 16=spacing-4, 20=spacing-5,
      // 24=spacing-6, 32=spacing-8, 40=spacing-10, 48=spacing-12,
      // 64=spacing-16, 80=spacing-20) — verified against Tailwind v3's
      // default theme. No custom spacing scale needed; nothing added here.
      borderRadius: {
        // Spec §6 named tiers, transcribed directly:
        sm: "8px", // spec "small"
        md: "12px", // spec "medium"
        lg: "16px", // spec "large"
        // Spec doesn't define tiers past "large" — these three are this
        // codebase's own pre-existing bigger tiers (hero panels, big
        // illustration blocks), reeled in from their previous, more
        // exaggerated values (22/28/34px) to fit the calmer overall scale
        // without a page-by-page radius audit.
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
        // Explicit semantic tokens for the component-specific radii the
        // spec calls out by name (§6/§7), so Button/Input/Select/Card/Modal
        // reach for a named token instead of a magic arbitrary value:
        button: "9px", // spec "buttons: 8-10px"
        input: "9px", // spec "inputs: 8-10px"
        card: "14px", // spec "cards: 12-16px" — mid-range default
        modal: "16px", // upper end of the card-like range for the one tier of surface bigger than a card
      },
      boxShadow: {
        // Spec §10: "no shadow or extremely subtle" for default UI, subtle
        // only for dropdowns/modals/elevated elements. This replaces the
        // previous multi-layer elevation recipe (crisp near-shadow + soft
        // diffuse far-shadow + an inset top-edge "glass" highlight) — that
        // recipe was intensity-tuned for a translucent/glass surface
        // treatment that no longer exists (see globals.css `.glass` note);
        // every tier below is meaningfully lower-opacity than before, and
        // the inset highlight layer has been dropped entirely.
        subtle: "0 1px 2px hsl(var(--shadow-color) / 0.08)",
        // Cards should rely on their border for definition, not a shadow
        // (spec §5: "subtle border, minimal or no shadow") — this is
        // intentionally close to imperceptible, kept only so call sites
        // that explicitly opt into `shadow-card` don't get zero elevation.
        card: "0 1px 2px hsl(var(--shadow-color) / 0.04)",
        // Dropdowns / floating nav / tooltips — "subtle shadow" per spec.
        raised: "0 4px 12px -2px hsl(var(--shadow-color) / 0.12), 0 2px 4px -2px hsl(var(--shadow-color) / 0.08)",
        // Modals / toasts — the single most-elevated tier, still restrained.
        pop: "0 16px 32px -12px hsl(var(--shadow-color) / 0.18), 0 4px 8px -4px hsl(var(--shadow-color) / 0.10)",
        // Hover-elevated interactive cards.
        float: "0 8px 20px -6px hsl(var(--shadow-color) / 0.14)",
        // `glow-accent` / `glow-mission` removed — grepped zero call sites
        // across src/, and a glowing colored shadow is exactly the §10/§11
        // anti-pattern this pass is removing, not one to keep on standby.
      },
      backgroundImage: {
        // Gradient stops are equal (--accent-end == --accent) — see
        // globals.css file-header note. Kept as a two-stop gradient
        // mechanically (not hardcoded to a flat color) so nothing breaks if
        // a future token pass reintroduces a deliberate two-tone accent.
        "gradient-brand": "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent-end)) 100%)",
        // Flattened to a single mission-via stop — the old 3-stop coral/
        // pink/purple gradient is gone from every `bg-gradient-mission`
        // call site; --mission-from/--mission-to remain distinct, muted
        // tokens elsewhere (category tag colors). See globals.css note.
        "gradient-mission": "linear-gradient(135deg, hsl(var(--mission-via)) 0%, hsl(var(--mission-via)) 100%)",
        // `gradient-radial-glow` removed — zero call sites in src/.
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
