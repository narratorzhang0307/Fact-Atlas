import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: "worker/index.mjs",
    outDir: "dist/server",
    emptyOutDir: false,
    target: "es2022",
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        format: "es",
      },
    },
  },
  ssr: {
    target: "webworker",
    noExternal: true,
  },
});
