import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "standalone" ? [viteSingleFile()] : [])],
  base: mode === "standalone" ? "./" : "/",
  build:
    mode === "standalone"
      ? { outDir: "standalone", assetsInlineLimit: 100000000 }
      : {},
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
}));
