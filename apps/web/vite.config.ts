import path from "node:path";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  define: {
    'process.env': JSON.stringify(process.env),
    global: 'globalThis',
  },
  plugins: [
    TanStackRouterVite(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['meridian-logomark.png'],
      manifest: {
        name: 'Meridian - Project Management Platform',
        short_name: 'Meridian',
        description: 'Advanced project management and team collaboration platform with real-time analytics and workflow automation',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'business', 'collaboration'],
        icons: [
          {
            src: 'meridian-logomark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'meridian-logomark.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'meridian-logomark.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View your project dashboard',
            url: '/dashboard',
            icons: [{ src: 'meridian-logomark.png', sizes: '96x96' }]
          },
          {
            name: 'Tasks',
            short_name: 'Tasks',
            description: 'Manage your tasks',
            url: '/dashboard/all-tasks',
            icons: [{ src: 'meridian-logomark.png', sizes: '96x96' }]
          },
          {
            name: 'Analytics',
            short_name: 'Analytics',
            description: 'View project analytics',
            url: '/dashboard/analytics',
            icons: [{ src: 'meridian-logomark.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit (increased from 2MB default)
        skipWaiting: true,
        clientsClaim: true,
        // Do not SPA-fallback document requests under /api (offline shell should not swallow API paths)
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-bypass',
            },
          },
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            urlPattern: ({ url, request }) => {
              const rawUrl =
                typeof request?.url === 'string'
                  ? request.url
                  : typeof request?.url === 'object' && request.url !== null
                  ? request.url.toString?.() ?? ''
                  : url?.href ?? '';

              const targetUrl = typeof rawUrl === 'string' ? rawUrl : rawUrl?.toString?.() ?? '';

              // Don't cache Vite dev server URLs in development (/@fs/ paths)
              if (targetUrl?.includes?.('/@fs/')) {
                return false;
              }

              return /\.(?:js|css)$/.test(targetUrl);
            },
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    }),
    // Sentry source maps upload (only in production builds with SENTRY_AUTH_TOKEN)
    process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/**',
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
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core dependencies - CRITICAL: Keep these small and separate
          if (id.includes('node_modules')) {
            // React core (most critical - loaded on every page)
            if (id.includes('react/') && !id.includes('react-dom')) {
              return 'vendor-react-core';
            }
            if (id.includes('react-dom')) {
              return 'vendor-react-dom';
            }
            if (id.includes('scheduler')) {
              return 'vendor-react-core';
            }
            
            // Router (needed early)
            if (id.includes('@tanstack/react-router')) {
              return 'vendor-router';
            }
            
            // Query (needed early for data fetching)
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            
            // UI Framework - Split Radix into smaller chunks
            if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-dropdown-menu')) {
              return 'vendor-radix-overlay';
            }
            if (id.includes('@radix-ui/react-tooltip') || id.includes('@radix-ui/react-popover')) {
              return 'vendor-radix-float';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix-core';
            }
            
            // Heavy libraries - Separate to avoid blocking initial load
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            if (id.includes('d3-')) {
              return 'vendor-d3';
            }
            if (id.includes('reactflow') || id.includes('@reactflow')) {
              return 'vendor-reactflow';
            }
            
            // Rich text editor (rarely used)
            if (id.includes('@tiptap') || id.includes('prosemirror')) {
              return 'vendor-editor';
            }
            
            // Forms and validation
            if (id.includes('zod')) {
              return 'vendor-zod';
            }
            if (id.includes('react-hook-form')) {
              return 'vendor-forms';
            }
            
            // Real-time features
            if (id.includes('socket.io-client')) {
              return 'vendor-socket';
            }
            
            // State management
            if (id.includes('zustand')) {
              return 'vendor-state';
            }
            
            // Utilities
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-utils';
            }
            
            // Analytics & monitoring
            if (id.includes('@sentry') || id.includes('firebase')) {
              return 'vendor-monitoring';
            }
            
            // Highlight.js for code blocks (rarely used)
            if (id.includes('highlight.js') || id.includes('lowlight')) {
              return 'vendor-highlight';
            }
            
            // All other node_modules - still separate but smaller now
            return 'vendor-misc';
          }

          // Application code splitting - More granular
          if (id.includes('/components/chat/')) {
            return 'app-chat';
          }
          if (id.includes('/components/analytics/')) {
            return 'app-analytics';
          }
          if (id.includes('/components/workflow/') || id.includes('/components/workflows/')) {
            return 'app-workflow';
          }
          if (id.includes('/components/team/')) {
            return 'app-team';
          }
          if (id.includes('/components/ui/')) {
            return 'app-ui';
          }
          if (id.includes('/components/dashboard/')) {
            return 'app-dashboard';
          }
          if (id.includes('/components/kanban')) {
            return 'app-kanban';
          }
          if (id.includes('/components/magicui')) {
            return 'app-magicui';
          }
          if (id.includes('/routes/dashboard/analytics/')) {
            return 'route-analytics';
          }
          if (id.includes('/routes/dashboard/teams')) {
            return 'route-teams';
          }
          if (id.includes('/routes/dashboard/projects')) {
            return 'route-projects';
          }
          if (id.includes('/routes/dashboard/all-tasks')) {
            return 'route-tasks';
          }
          if (id.includes('/routes/dashboard/executive')) {
            return 'route-executive';
          }
          if (id.includes('/routes/workflows/')) {
            return 'route-workflows';
          }
        }
      },
    },
    chunkSizeWarningLimit: 500, // Set to 500KB to catch large chunks early
    reportCompressedSize: true,
    // Performance budgets
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  // Performance optimization
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-router', 'framer-motion'],
    exclude: ['@vite-pwa/assets-generator']
  }
});

