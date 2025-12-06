import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // Setting base to './' ensures that the app loads assets correctly
  // regardless of whether it's at the root domain or a subdirectory (like GitHub Pages).
  base: './', 
})