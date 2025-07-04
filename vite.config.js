import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "src/contributor.html"),
        contact: resolve(__dirname, "src/details.html"),
        services: resolve(__dirname, "src/search.html"),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
