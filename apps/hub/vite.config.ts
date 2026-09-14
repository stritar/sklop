/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The token page shows computed values; unminified CSS keeps them as tokens.json publishes them.
  build: { cssMinify: false },
  test: { environment: 'jsdom' },
});
