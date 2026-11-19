import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2rem",
        "2xl": "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        // One type system site-wide, taken from the editorial pages (Work,
        // Aviation, Now): Geist for body/UI, Instrument Serif for display.
        // `editorial` and `body` stay as aliases of the same families.
        sans: ['Geist', 'system-ui', 'sans-serif'],
        // The two Fallback families are metric-matched local stand-ins
        // (see the @font-face block in index.html's <head>).
        display: ['Instrument Serif', 'Instrument Serif Fallback', 'Instrument Serif Fallback TNR', 'Georgia', 'serif'],
        editorial: ['Instrument Serif', 'Instrument Serif Fallback', 'Instrument Serif Fallback TNR', 'Georgia', 'serif'],
        body: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Editorial palette (hex by design; see design_handoff README).
        ed: {
          bg: "#040208",
          ink: "#ece6f5",
          body: "#c9c3d6",
          muted: "#a79fb8",
          accent: "#8033cc",
          light: "#b48cf0",
          hover: "#9146db",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(30px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-10px)",
          },
        },
        "draw-line": {
          "0%": {
            strokeDashoffset: "1000",
          },
          "100%": {
            strokeDashoffset: "0",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "0.6",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "1",
            transform: "scale(1.05)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        "float": "float 3s ease-in-out infinite",
        "draw-line": "draw-line 2s ease-out forwards",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
      backgroundImage: {
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-dusk': 'var(--gradient-dusk)',
        'gradient-subtle': 'var(--gradient-subtle)',
        'gradient-card': 'var(--gradient-card)',
        'texture-overlay': 'var(--texture-overlay)',
      },
      boxShadow: {
        'elegant': 'var(--shadow-elegant)',
        'glow': 'var(--shadow-glow)',
        'warm': 'var(--shadow-warm)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    // Height-based variants for small phones and phones in landscape, where a
    // full-viewport composition has to tighten up to stay on screen.
    // short: is a viewport 700px tall or less, squat: is 600px or less.
    // They key off classes the inline script in index.html sets on <html>
    // from the small viewport height (100svh), not a max-height media query:
    // Safari's toolbar collapses on the first scroll, the viewport grows by
    // about 90px, and a media query would flip the hero layout mid-scroll.
    // The extra class also outranks the sm:/md: rules, so no ! is needed.
    plugin(({ addVariant }) => {
      addVariant("short", ".vh-short &");
      addVariant("squat", ".vh-squat &");
    }),
  ],
} satisfies Config;
