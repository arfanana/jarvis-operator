/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#09090B",
        panel: "#121215",
        border: "#27272A",
        muted: "#A1A1AA",
        cream: "#FAF7F1",
        pine: {
          50: "#EFF6F5",
          100: "#D7E9E6",
          700: "#0F766E",
          800: "#115E59",
          900: "#0C3B38",
          950: "#042F2D",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "Inter", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      fontSize: { "2xs": ["0.65rem", { lineHeight: "0.9rem" }] },
      keyframes: {
        "tm-fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "tm-fade-up": "tm-fade-up 0.6s ease-out both" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
