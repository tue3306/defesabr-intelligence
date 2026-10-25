import { criarApp } from '../server/src/app.js'

// Função única da Vercel: o Express inteiro atrás de /api (ver vercel.json).
// Exportar o app, e não chamar `listen`, é o contrato do runtime Node.
export default criarApp()
