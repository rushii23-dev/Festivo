import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // Next.js turns image imports into { src, width, height, blurDataURL }; Vite does not.
    {
      name: "next-static-image-stub",
      enforce: "pre",
      resolveId(id) {
        return /\.(jpe?g|png|webp)$/.test(id)
          ? fileURLToPath(new URL("./tests/setup/image-stub.ts", import.meta.url))
          : null;
      },
    },
  ],
  resolve: {
    alias: {
      "@": root,
      // `server-only` throws outside React Server Components; tests run server code directly.
      "server-only": fileURLToPath(new URL("./tests/setup/empty.ts", import.meta.url)),
    },
  },
  test: {
    // Unit tests run in Node (fast, no DOM); component tests get jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "api",
          environment: "node",
          include: ["tests/api/**/*.test.ts"],
          setupFiles: ["tests/setup/api.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.tsx"],
          setupFiles: ["tests/setup/component.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      // The whole app: domain logic, components, hooks, pages, route handlers, proxy.
      include: [
        "lib/**/*.ts",
        "components/**/*.{ts,tsx}",
        "hooks/**/*.ts",
        "app/**/*.{ts,tsx}",
        "proxy.ts",
      ],
      exclude: [
        "lib/**/*.d.ts",
        // Browser-only: the root HTML document (fonts, nonce script), the GSAP scroll
        // scenes and the canvas petals cannot run in jsdom. Playwright covers them.
        "app/layout.tsx",
        "components/landing/LandingMotion.tsx",
        "components/landing/PetalFall.tsx",
      ],
      reporter: ["text", "html", "lcov"],
      // Ratchets just under what the code measures today (the brief asks for 80% on
      // lib/), so a change that drops coverage fails CI.
      thresholds: {
        statements: 95,
        branches: 86,
        functions: 94,
        lines: 96,
        "lib/**/*.ts": { statements: 97, branches: 90, functions: 97, lines: 98 },
      },
    },
  },
});
