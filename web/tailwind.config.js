/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hyper: "#FF2D55",
        lmp2: "#22A7FF",
        lmgt3: "#37D67A",
        ink: "#06080D",
        panel: "rgba(12,16,24,0.78)",
      },
      fontFamily: {
        mono: ["'Geist Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
