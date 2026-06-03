import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PotokSDK',
      formats: ['iife'],
      fileName: () => 'potok-sdk.js'
    },
    outDir: resolve(__dirname, '../../public/sdk'),
    emptyOutDir: true,
    sourcemap: false,
    minify: false
  }
});

