import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "VITE_BASE=/edit/ npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173/edit/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
