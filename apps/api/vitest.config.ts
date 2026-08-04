/**
 * Vitest Configuration
 * Testing setup for Meridian API
 * Phase 0 - Testing Infrastructure Implementation
 */

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/tests/",
        "src/test-utils/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData/",
        "dist/",
        "**/__tests__/**",
        "**/types.ts",
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 55,
        statements: 60,
      },
    },
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    // 30s, not 10s. Many suites do `await import("../index")` inside the test
    // body, so the first one pays for transforming a large module graph. On a
    // loaded machine (CI, or another suite running alongside) that alone could
    // exceed 10s, and the failure did not look like a timeout: a test that
    // timed out mid-request left its continuation to consume the next test's
    // queued __setSelectResults entry, so a *sibling* failed with a bogus
    // "expected 404 to be 200". That produced a different red test on every
    // run. This is a false-failure ceiling, not a real-hang detector — a
    // genuinely stuck test still fails, just 20s later.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./src/tests"),
    },
  },
});
