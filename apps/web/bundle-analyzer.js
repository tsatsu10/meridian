import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Bundle analysis configuration
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['@tanstack/react-router'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'state-vendor': ['zustand', '@reduxjs/toolkit', 'redux-persist'],
          'chart-vendor': ['recharts', 'date-fns'],
          'utils-vendor': ['zod', 'framer-motion', 'lucide-react'],
          
          // Application chunks
          'stores': [
            'src/store/consolidated/ui',
            'src/store/consolidated/tasks', 
            'src/store/consolidated/communication',
            'src/store/consolidated/settings',
            'src/store/consolidated/cache',
            'src/store/consolidated/teams'
          ],
          'legacy-stores': [
            'src/store/slices/authSlice',
            'src/store/slices/workspaceSlice',
            'src/store/slices/projectSlice',
            'src/store/slices/taskSlice',
            'src/store/slices/teamSlice',
            'src/store/slices/communicationSlice',
            'src/store/slices/uiSlice'
          ],
          'migration': [
            'src/store/migration/compatibility-layer',
            'src/store/migration/legacy-hooks',
            'src/store/migration/migration-provider'
          ]
        }
      }
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  define: {
    'process.env.ANALYZE_BUNDLE': 'true',
  },
});