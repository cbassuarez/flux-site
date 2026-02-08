/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        fluxBlue: "#00CDFE"
      },
      fontFamily: {
        sans: ["var(--font-body)", "IBM Plex Mono", "ui-monospace", "monospace"],
        mono: ["var(--font-body)", "IBM Plex Mono", "ui-monospace", "monospace"],
        body: ["var(--font-body)", "IBM Plex Mono", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "Noto Serif Display", "ui-serif", "serif"]
      },
      boxShadow: {
        "flux-card": "0 18px 45px rgba(0, 0, 0, 0.45)"
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem"
      }
    }
  },
  plugins: []
};
