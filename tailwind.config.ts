import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmic: {
          void: "#05070F",       // Deep Space Canvas
          surface: "#0B0F1E",    // Orbital Card base
          card: "rgba(15, 23, 42, 0.65)", // Glassmorphism backdrop-blur
          cyan: "#00F5D4",       // Nebula Cyan
          violet: "#8B5CF6",     // Starlight Violet
          gold: "#FFD166",       // Supernova Gold
          pink: "#EC4899",       // Pulsar Pink
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "cosmic-gradient": "radial-gradient(circle at 50% 50%, #161F38 0%, #05070F 100%)",
      },
      boxShadow: {
        "nebula-cyan": "0 0 25px rgba(0, 245, 212, 0.25)",
        "starlight-violet": "0 0 25px rgba(139, 92, 246, 0.25)",
        "supernova-gold": "0 0 25px rgba(255, 209, 102, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
