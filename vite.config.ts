import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // relative paths so the build works from a GitHub Pages project subpath regardless of repo name
  plugins: [react()],
  test: {
    environment: 'node',
    globals: false,
  },
})
