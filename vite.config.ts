import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  optimizeDeps: { entries: ["index.html", "viewer.html"] },
  server: {
    strictPort: true,
    watch: {
      ignored: [
        "**/src-tauri/**",
        "**/.tools/**",
        "**/.pnpm-store/**",
        "**/test-results/**",
        "**/playwright-report/**",
      ],
    },
  },
  build: {
    rollupOptions: {
      input: { main: "index.html", viewer: "viewer.html" },
      output: {
        manualChunks: {
          three: ["three"],
          react: ["react", "react-dom"],
          social: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
