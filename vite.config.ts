import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { handleChangelogRequest } from "./src/server/changelog";

const siblingFluxVersionPath = resolve(__dirname, "../flux/version.json");

function fluxVersionDevPlugin(): Plugin {
  return {
    name: "flux-site-version-dev-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/version.json") !== true) {
          next();
          return;
        }
        if (!existsSync(siblingFluxVersionPath)) {
          next();
          return;
        }
        try {
          const body = readFileSync(siblingFluxVersionPath, "utf8");
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          res.end(body);
          return;
        } catch {
          next();
        }
      });
    },
  };
}

function changelogApiDevPlugin(): Plugin {
  return {
    name: "flux-site-changelog-dev-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/api/changelog") !== true) {
          next();
          return;
        }
        try {
          const response = await handleChangelogRequest(
            new URL(req.url, "http://localhost"),
            process.env
          );
          res.statusCode = response.status;
          Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          res.end(response.body);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({ error: (error as Error).message ?? "Changelog request failed" })
          );
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), fluxVersionDevPlugin(), changelogApiDevPlugin()],
    base: env.VITE_BASE ?? "/",
    server: {
      port: 5173
    },
    build: {
      assetsDir: "",
      sourcemap: true
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
      globals: true,
      include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
      exclude: [...configDefaults.exclude, "tests/e2e/**", "**/*.e2e.*"]
    }
  };
});
