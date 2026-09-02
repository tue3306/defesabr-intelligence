import { dirname, join, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

// -----------------------------------------------------------------------------
// CONFIGURAÇÃO
//
// Tudo por variável de ambiente, com padrão que funciona sem nenhuma delas —
// é isso que faz `npm start` funcionar tanto na máquina de quem clona quanto
// no Railway, sem arquivo de configuração no meio.
//
// Nenhum caminho absoluto: os que existem são derivados de import.meta.url.
// -----------------------------------------------------------------------------

// `raiz` é a pasta server/ — este arquivo está em server/src/.
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
// `projeto` é a raiz do repositório, onde o Vite escreve dist/.
const projeto = join(raiz, '..')

const num = (valor, padrao) => {
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? n : padrao
}

export const config = {
  // O Railway injeta PORT; localmente cai em 3001.
  port: num(process.env.PORT, 3001),

  // '0.0.0.0' é obrigatório em contêiner: escutar em 'localhost' faz o
  // servidor subir e ficar inalcançável de fora do contêiner.
  host: process.env.HOST || '0.0.0.0',

  ambiente: process.env.NODE_ENV || 'development',

  // O banco fica em server/data/ por padrão. No Railway, apontar DB_PATH para
  // um volume montado é o que dá persistência entre deploys — sem volume, o
  // disco é efêmero e o acervo é recoletado a cada reinício.
  dbPath: (() => {
    const p = process.env.DB_PATH
    if (!p) return join(raiz, 'data', 'defesabr.db')
    return isAbsolute(p) ? p : join(process.cwd(), p)
  })(),

  // Em produção o próprio servidor entrega o front compilado, então não há
  // requisição entre origens. Em desenvolvimento o Vite roda à parte.
  corsOrigens: (process.env.CORS_ORIGINS
    || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173')
    .split(',').map((s) => s.trim()).filter(Boolean),

  // Pasta do front compilado. Se existir, é servida na raiz.
  staticDir: process.env.STATIC_DIR || join(projeto, 'dist'),

  // Raiz do repositório. Serve para exibir caminhos relativos na interface em
  // vez do absoluto da máquina de quem roda.
  raizProjeto: projeto,

  coleta: {
    // Intervalo do agendador. 0 desliga — útil em teste automatizado.
    intervaloMinutos: num(process.env.COLLECT_INTERVAL_MINUTES, 30),
    // Coletar assim que o servidor sobe, se o acervo estiver vazio.
    naSubida: process.env.COLLECT_ON_BOOT !== '0',
    timeoutMs: num(process.env.COLLECT_TIMEOUT_MS, 15000),
    userAgent: process.env.COLLECT_USER_AGENT
      || 'DefesaBR-Intelligence/2.0 (agregador academico de fontes publicas)',
  },

  versao: process.env.npm_package_version || '2.0.0',
}

export default config
