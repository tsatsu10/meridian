import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'integration',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup/integration-setup.ts'],
    include: ['./src/__tests__/integration/**/*.integration.test.ts'],
    exclude: ['./src/__tests__/unit/**', './src/__tests__/e2e/**'],
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true, // Run each test file in isolation
    pool: 'forks', // Use forked processes for better isolation
    poolOptions: {
      forks: {
        singleFork: true // Run tests sequentially to avoid WebSocket port conflicts
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/hooks/use*WebSocket*.ts', 'src/hooks/useWebSocketAnalytics.ts'],
      exclude: ['src/__tests__/**', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    },
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results/integration-test-results.xml'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': '"test"',
    'import.meta.env.VITE_API_URL': '"http://localhost:3008"',
    'import.meta.env.VITE_WS_URL': '"http://localhost:3008"',
    'import.meta.env.VITE_DISABLE_WEBSOCKET': '"false"'
  }
});