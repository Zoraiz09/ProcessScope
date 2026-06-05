/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neo-brutalist canvas
        paper: "#F4F4F0",
        panel: "#FFFFFF",
        ink: "#0B0B0B",
        "ink-soft": "#3A3A38",
        muted: "#7A7A75",
        line: "#0B0B0B",
        // Lime accent system (from design inspo)
        lime: {
          DEFAULT: "#BEF264",
          bright: "#C6FF3D",
          deep: "#A3E635",
          dark: "#84CC16",
        },
        // Semantic status
        danger: "#FF4D4D",
        warn: "#FFB020",
        ok: "#22C55E",
        info: "#3B82F6",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        brutal: "4px 4px 0 0 #0B0B0B",
        "brutal-sm": "2px 2px 0 0 #0B0B0B",
        "brutal-lg": "7px 7px 0 0 #0B0B0B",
        "brutal-xl": "10px 10px 0 0 #0B0B0B",
        "brutal-lime": "5px 5px 0 0 #BEF264",
      },
      borderWidth: {
        3: "3px",
      },
      keyframes: {
        "pulse-bar": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        "pulse-bar": "pulse-bar 1.4s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        blink: "blink 1.1s step-end infinite",
      },
    },
  },
  plugins: [],
};
