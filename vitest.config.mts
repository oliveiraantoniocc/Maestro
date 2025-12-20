import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'os';

// Calculate optimal worker count based on CPU cores
const cpuCount = os.cpus().length;
const maxForks = Math.max(2, Math.min(cpuCount - 1, 4)); // 2-4 forks

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'release', 'src/__tests__/integration/**'],

    // Parallelization settings for faster test execution
    // Use forks instead of threads for better jsdom isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 2,
        maxForks,
        // Don't isolate to speed up test file execution
        isolate: false,
      },
    },

    // Sequence tests within files for faster execution
    sequence: {
      shuffle: false,
    },

    // Test timeout and retry settings
    testTimeout: 10000, // 10s timeout per test
    hookTimeout: 10000, // 10s timeout for beforeAll/afterAll hooks

    // Reporter for cleaner output
    reporters: ['dot'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules',
        'dist',
        'src/__tests__/**',
        '**/*.d.ts',
        'src/main/preload.ts', // Electron preload script
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
