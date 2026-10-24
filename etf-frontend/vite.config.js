import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx"
      }
    }
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8081", changeOrigin: true },
      "/auth": { target: "http://127.0.0.1:8081", changeOrigin: true }
    }
  },
  preview: {
    host: true,
    port: 3000,
    strictPort: true
  }
});
