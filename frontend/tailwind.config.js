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
        // Evolved depth: hard brutalist shadow + soft colored glow.
        glow: "0 0 24px 0 rgba(190,242,100,0.55)",
        "glow-sm": "0 0 14px 0 rgba(190,242,100,0.45)",
        "brutal-glow": "4px 4px 0 0 #0B0B0B, 0 0 22px -2px rgba(190,242,100,0.5)",
        "brutal-glow-lg": "7px 7px 0 0 #0B0B0B, 0 0 30px -2px rgba(190,242,100,0.45)",
      },
      backgroundImage: {
        "grad-lime": "linear-gradient(135deg, #C6FF3D 0%, #84CC16 100%)",
        "grad-ink": "linear-gradient(150deg, #1C1C1A 0%, #0B0B0B 70%)",
        "grad-panel": "linear-gradient(160deg, #FFFFFF 0%, #F4F4F0 100%)",
        "grad-mesh":
          "radial-gradient(120% 120% at 0% 0%, rgba(190,242,100,0.22) 0%, transparent 45%), radial-gradient(120% 120% at 100% 100%, rgba(132,204,22,0.16) 0%, transparent 50%)",
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
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(190,242,100,0.0)" },
          "50%": { boxShadow: "0 0 18px 1px rgba(190,242,100,0.55)" },
        },
      },
      animation: {
        "pulse-bar": "pulse-bar 1.4s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        blink: "blink 1.1s step-end infinite",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
