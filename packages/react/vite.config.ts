/// <reference types="vitest/config" />
import { basename } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Stable, readable class names: Button.module.css `.label` → `sk-Button-label`.
const scopedName = (local: string, filename: string) =>
  `sk-${basename(filename).replace(/\.module\.css.*$/, '')}-${local}`;

export default defineConfig({
  plugins: [react()],
  css: { modules: { generateScopedName: scopedName } },
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], cssFileName: 'styles' },
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/],
      output: { preserveModules: true, preserveModulesRoot: 'src', entryFileNames: '[name].js' },
    },
  },
  test: {
    environment: 'jsdom',
    // 'scoped' makes Vitest use generateScopedName, so tests see real class names.
    css: { include: /.+/, modules: { classNameStrategy: 'scoped' } },
  },
});
