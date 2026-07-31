/**
 * NOTE (Tailwind CSS v4): this project uses the v4 CSS-first engine
 * (`@import "tailwindcss";` in styles/globals.css via @tailwindcss/postcss).
 * Since v4 no longer auto-loads a JS config file, the settings below are
 * NOT applied to the build. They are kept only so editor tooling (e.g. the
 * Tailwind CSS IntelliSense extension) can still offer autocomplete/hints
 * for values that mirror the real, active configuration.
 *
 * The values actually used by the build live in styles/globals.css:
 *   - dark mode strategy  -> `@custom-variant dark (&:where(.dark, .dark *));`
 *   - fonts, brand colors, animations -> the `@theme { ... }` block
 *
 * If you need to change fonts, colors, shadows, or the dark mode strategy,
 * edit styles/globals.css, not this file.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          950: "#0a0a0f",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        sm: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)",
        DEFAULT:
          "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07)",
        md: "0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.07)",
        lg: "0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.08)",
        xl: "0 25px 50px -12px rgba(0,0,0,0.12)",
        glow: "0 0 30px rgba(99,102,241,0.15)",
        "glow-lg": "0 0 60px rgba(99,102,241,0.2)",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
