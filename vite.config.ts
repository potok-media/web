import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('hls.js')) {
            return 'hls-vendor';
          }
          if (id.includes('artplayer')) {
            return 'artplayer-vendor';
          }
        }
      }
    }
  }
})
