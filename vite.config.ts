/// <reference types="vitest/config" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

/** Single-file classic SW: avoids `import` in background.js (Chrome needs `type: "module"` + chunk paths otherwise). */
function bundleBackgroundServiceWorker(): Plugin {
  return {
    name: "bundle-background-sw",
    apply: "build",
    enforce: "post",
    async closeBundle() {
      const esbuild = await import("esbuild")
      await esbuild.build({
        absWorkingDir: path.resolve(__dirname),
        entryPoints: [path.resolve(__dirname, "src/background.ts")],
        bundle: true,
        outfile: path.resolve(__dirname, "dist/background.js"),
        format: "iife",
        platform: "browser",
        target: "chrome100",
        alias: { "@": path.resolve(__dirname, "src") },
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bundleBackgroundServiceWorker()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
  base: "./", // CRITICAL: makes asset paths relative for Chrome extension
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
