import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig(() => {
  return {
    plugins: [vue(), crx({ manifest })],
    build: {
      sourcemap: true,
      rollupOptions: {
        // CRX plugin handles entries via manifest
      }
    }
  };
});

