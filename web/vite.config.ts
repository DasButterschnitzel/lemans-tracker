import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base for the production build so it works under any GitHub Pages
// subpath (https://<user>.github.io/<repo>/); absolute "/" for the dev server.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
}));
