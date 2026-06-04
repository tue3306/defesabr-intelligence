import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// `base` deve ser o nome do repositorio no GitHub Pages.
// Em dev usamos '/' para o servidor local funcionar normalmente.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/defesabr-intelligence/' : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
}))
