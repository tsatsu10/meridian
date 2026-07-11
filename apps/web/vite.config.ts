import path from "node:path";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

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
      "/api": {
        target: `http://localhost:${process.env.API_PORT || "3005"}`,
        changeOrigin: true,
        secure: false,
      },
      "/workspace": {
        target: `http://localhost:${process.env.API_PORT || "3005"}`,
        changeOrigin: true,
        secure: false,
      },
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
        manualChunks: (id) => {
          // Core dependencies - CRITICAL: Keep these small and separate
          if (id.includes("node_modules")) {
            // React core (most critical - loaded on every page)
            if (id.includes("react/") && !id.includes("react-dom")) {
              return "vendor-react-core";
            }
            if (id.includes("react-dom")) {
              return "vendor-react-dom";
            }
            if (id.includes("scheduler")) {
              return "vendor-react-core";
            }

            // Router (needed early)
            if (id.includes("@tanstack/react-router")) {
              return "vendor-router";
            }

            // Query (needed early for data fetching)
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }

            // UI Framework - Split Radix into smaller chunks
            if (
              id.includes("@radix-ui/react-dialog") ||
              id.includes("@radix-ui/react-dropdown-menu")
            ) {
              return "vendor-radix-overlay";
            }
            if (
              id.includes("@radix-ui/react-tooltip") ||
              id.includes("@radix-ui/react-popover")
            ) {
              return "vendor-radix-float";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-radix-core";
            }

            // Heavy libraries - Separate to avoid blocking initial load
            if (id.includes("framer-motion")) {
              return "vendor-motion";
            }
            if (id.includes("recharts")) {
              return "vendor-recharts";
            }
            if (id.includes("d3-")) {
              return "vendor-d3";
            }
            // Rich text editor (rarely used)
            if (id.includes("@tiptap") || id.includes("prosemirror")) {
              return "vendor-editor";
            }

            // Forms and validation
            if (id.includes("zod")) {
              return "vendor-zod";
            }
            if (id.includes("react-hook-form")) {
              return "vendor-forms";
            }

            // Real-time features
            if (id.includes("socket.io-client")) {
              return "vendor-socket";
            }

            // State management
            if (id.includes("zustand")) {
              return "vendor-state";
            }

            // Utilities
            if (id.includes("date-fns")) {
              return "vendor-date";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (
              id.includes("class-variance-authority") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge")
            ) {
              return "vendor-utils";
            }

            // Analytics & monitoring
            if (id.includes("@sentry") || id.includes("firebase")) {
              return "vendor-monitoring";
            }

            // Highlight.js for code blocks (rarely used)
            if (id.includes("highlight.js") || id.includes("lowlight")) {
              return "vendor-highlight";
            }

            // All other node_modules - still separate but smaller now
            return "vendor-misc";
          }

          // Application code splitting - More granular
          if (id.includes("/components/chat/")) {
            return "app-chat";
          }
          if (id.includes("/components/analytics/")) {
            return "app-analytics";
          }
          if (
            id.includes("/components/workflow/") ||
            id.includes("/components/workflows/")
          ) {
            return "app-workflow";
          }
          if (id.includes("/components/team/")) {
            return "app-team";
          }
          if (id.includes("/components/ui/")) {
            return "app-ui";
          }
          if (id.includes("/components/dashboard/")) {
            return "app-dashboard";
          }
          if (id.includes("/components/kanban")) {
            return "app-kanban";
          }
          if (id.includes("/components/magicui")) {
            return "app-magicui";
          }
          if (id.includes("/routes/dashboard/analytics/")) {
            return "route-analytics";
          }
          if (id.includes("/routes/dashboard/teams")) {
            return "route-teams";
          }
          if (id.includes("/routes/dashboard/projects")) {
            return "route-projects";
          }
          if (id.includes("/routes/dashboard/all-tasks")) {
            return "route-tasks";
          }
          if (id.includes("/routes/dashboard/executive")) {
            return "route-executive";
          }
          if (id.includes("/routes/workflows/")) {
            return "route-workflows";
          }
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
