import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // A aplicacao tem BACKEND: nao roda em hospedagem estatica. O mesmo processo
  // Node serve a API e esta pasta, entao a base e sempre a raiz.
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy de /api para o servidor local. E o que permite ao front usar
    // caminho relativo em desenvolvimento e em producao: mesma origem nos dois,
    // portanto nenhum CORS para depurar e nenhuma variavel de ambiente para
    // configurar no Railway.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY || 'http://localhost:3001', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // ---------------------------------------------------------------------
        // SEPARAÇÃO DE VENDORS
        //
        // Sem isto, tudo o que não é rota cai num único `index` de ~570 kB que
        // precisa ser rebaixado inteiro a cada deploy — mesmo quando só um
        // texto mudou. Separando por biblioteca, o núcleo do React e as libs
        // pesadas ficam em cache entre versões, e o navegador baixa em paralelo.
        //
        // As libs de PDF (jspdf/html2canvas) não aparecem aqui de propósito:
        // são carregadas sob demanda em src/utils/exportUtils.js, só quando
        // alguém realmente exporta.
        // ---------------------------------------------------------------------
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // Núcleo do React — muda raramente, cacheia bem.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          // Animação: usada em quase toda página, mas é uma unidade coesa.
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'vendor-motion'
          }
          // Mapas: só o mapa de risco depende disto (d3-geo + topojson).
          if (/react-simple-maps|d3-geo|d3-array|topojson-client|delaunator|robust-predicates/.test(id)) {
            return 'vendor-maps'
          }
          // Ícones: o conjunto é grande e estável.
          if (id.includes('lucide-react')) return 'vendor-icons'

          return undefined
        },
      },
    },
  },
})
