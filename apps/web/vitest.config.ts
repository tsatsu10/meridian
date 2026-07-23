import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    testTimeout: 10000, // Increase timeout for integration tests
    hookTimeout: 10000,
    // The jsdom suites leak memory across test files within a worker, so runs
    // die with "Ineffective mark-compacts near heap limit" mid-suite. Keep the
    // default fork-per-CPU spread (fewer files per worker = less accumulation)
    // and raise each fork's old-space ceiling for headroom. Do NOT cap
    // maxForks low — concentrating files in fewer workers makes the leak worse.
    pool: "forks",
    poolOptions: {
      forks: {
        // Headroom over Node's ~4GB default; a runaway test renders as heap
        // exhaustion in whichever worker it lands in, so a higher ceiling only
        // delays that crash — fix the test, don't raise this further.
        execArgv: ["--max-old-space-size=6144"],
      },
    },
    // The orchestrator process also OOMs at Node's default ~4GB ceiling when it
    // retains every worker's console output for the run summary. Only keep
    // output from failing tests. (Raise the main heap with NODE_OPTIONS if the
    // suite grows further.)
    silent: "passed-only",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "src/test/",
        "src/__tests__/",
        "src/routeTree.gen.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "**/dist/**",
        "**/build/**",
        "**/.{idea,git,cache,output,temp}/**",
        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
        "**/playwright.config.*",
        "**/e2e/**",
        "**/stories/**",
        "**/.storybook/**",
        "**/mockData/**",
        "**/migration/**", // Migration compatibility layer
        "**/types/**", // Type definitions don't need coverage
      ],
      include: ["src/**/*.{ts,tsx}"],
      all: true,
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 50,
        statements: 55,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
