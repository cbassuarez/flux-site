import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    base: env.VITE_BASE ?? "/edit/",
    server: {
      port: 5173
    },
    build: {
      assetsDir: ""
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
      globals: true
    }
  };
});
