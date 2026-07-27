import path from "node:path";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { type ProxyOptions, defineConfig } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { writeProxyErrorResponse } from "./src/lib/dev/proxy-error";

const apiTarget = `http://localhost:${process.env.API_PORT || "3005"}`;

// /api, /workspace and /uploads all proxy to the same API, so they share one
// set of options — including the error handler. Without that handler Vite
// answers an unreachable upstream with a bare `500 Internal Server Error`,
// which reads in the browser console exactly like a fault inside the API. It
// isn't one: apps/api runs under `tsx watch` and doesn't bind its port until
// initializeDatabase() resolves, so every save to the API opens a window where
// this fires. See src/lib/dev/proxy-error.ts.
const apiProxy: ProxyOptions = {
  target: apiTarget,
  changeOrigin: true,
  secure: false,
  configure: (proxy) => {
    proxy.on("error", (error, req, res) => {
      writeProxyErrorResponse({
        error,
        requestUrl: req.url,
        target: apiTarget,
        res,
      });
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  define: {
    "process.env": JSON.stringify(process.env),
    global: "globalThis",
  },
  plugins: [
    TanStackRouterVite(),
    react(),
    // Sentry source maps upload (only in production builds with SENTRY_AUTH_TOKEN)
    process.env.SENTRY_AUTH_TOKEN &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          assets: "./dist/**",
        },
      }),
  ].filter(Boolean),
  server: {
    host: true,
    hmr: true,
    port: 5174,
    proxy: {
      "/api": apiProxy,
      "/workspace": apiProxy,
      // Uploaded files (profile pictures, attachments) are stored and served
      // by the API, but referenced by relative URL, so they have to be
      // proxied like /api or every uploaded image 404s against the dev server.
      "/uploads": apiProxy,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Only self-contained leaf libraries get named chunks. Rollup (vite
        // 6.4.3+) hard-fails on circular chunks, which the old directory-based
        // app/vendor splits produced (app-team <-> app-dashboard, radix <->
        // misc via cmdk/react-remove-scroll). App code is already code-split
        // per route by TanStack Router's dynamic imports — leave it to rollup.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (
            /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)
          ) {
            return "vendor-react";
          }
          if (id.includes("@tanstack/react-router")) {
            return "vendor-router";
          }
          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          if (id.includes("@tiptap") || id.includes("prosemirror")) {
            return "vendor-editor";
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("date-fns")) {
            return "vendor-date";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("highlight.js") || id.includes("lowlight")) {
            return "vendor-highlight";
          }
          if (id.includes("@sentry")) {
            return "vendor-monitoring";
          }
          return "vendor-misc";
        },
      },
    },
    chunkSizeWarningLimit: 500, // Set to 500KB to catch large chunks early
    reportCompressedSize: true,
    // Performance budgets
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  // Performance optimization
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-router", "framer-motion"],
  },
});
