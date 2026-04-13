import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    testTimeout: 10000, // Increase timeout for integration tests
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        'src/__tests__/',
        'src/routeTree.gen.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/build/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/playwright.config.*',
        '**/e2e/**',
        '**/stories/**',
        '**/.storybook/**',
        '**/mockData/**',
        '**/migration/**', // Migration compatibility layer
        '**/types/**', // Type definitions don't need coverage
      ],
      include: ['src/**/*.{ts,tsx}'],
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
      '@': path.resolve(__dirname, './src'),
    },
  },
});