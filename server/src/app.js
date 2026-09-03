import express from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import config from './config.js'
import noticias from './routes/news.js'
import dados from './routes/data.js'
import sistema from './routes/system.js'
import autenticacao from './routes/auth.js'
import { lerConta } from './lib/auth.js'

// -----------------------------------------------------------------------------
// APLICAÇÃO EXPRESS
//
// Separada de `index.js` para poder ser montada em teste sem abrir porta.
//
// Em PRODUÇÃO este mesmo processo serve a API e o front compilado. É a escolha
// certa para o Railway: um serviço, uma URL, e — o que mais economiza tempo —
// nenhuma requisição entre origens, portanto nenhum CORS para depurar.
// -----------------------------------------------------------------------------

export function criarApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '256kb' }))

  // CORS só importa em desenvolvimento, quando o Vite roda em outra porta.
  app.use(cors({
    origin(origem, cb) {
      // Sem origem = mesma origem, curl, ou o próprio front servido daqui.
      if (!origem) return cb(null, true)
      if (config.corsOrigens.includes(origem)) return cb(null, true)
      // Em desenvolvimento, qualquer localhost: o Vite troca de porta sozinho
      // quando a 5173 está ocupada, e depurar isso custa mais do que vale.
      if (config.ambiente !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem)) {
        return cb(null, true)
      }
      cb(null, false)
    },
    // O front envia X-Client-Id para os favoritos; sem declará-lo aqui o
    // preflight recusa e NENHUMA chamada passa — a interface fica de pé
    // dizendo "servidor fora do ar" com o servidor perfeitamente vivo.
    allowedHeaders: ['Content-Type', 'X-Client-Id'],
  }))

  // Log de uma linha por requisição. Suficiente para ver a integração
  // funcionando ao vivo numa demonstração, sem dependência de logger.
  if (config.ambiente !== 'test') {
    app.use((req, res, next) => {
      const t = Date.now()
      res.on('finish', () => {
        if (req.path.startsWith('/api')) {
          const cor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m'
          console.log(`  ${cor}${res.statusCode}\x1b[0m ${req.method.padEnd(6)} ${req.path} \x1b[2m${Date.now() - t}ms\x1b[0m`)
        }
      })
      next()
    })
  }

  // Lê a sessão ANTES das rotas: quem exige papel encontra `req.conta` pronto,
  // e quem não exige simplesmente ignora. Não bloqueia nada por si só.
  app.use('/api', lerConta)

  app.use('/api', autenticacao)
  app.use('/api', noticias)
  app.use('/api', dados)
  app.use('/api', sistema)

  // ── Front compilado ──
  //
  // Se `dist/` existir, este processo serve a interface também. Em
  // desenvolvimento a pasta não existe e o Vite cuida disso — por isso a
  // verificação, e não uma falha.
  if (existsSync(config.staticDir)) {
    app.use(express.static(config.staticDir, { maxAge: '1h', index: false }))
    // O front usa HashRouter, então não há rota de servidor para reescrever:
    // basta devolver o index para qualquer caminho que não seja /api.
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(join(config.staticDir, 'index.html')))
  }

  app.use('/api', (req, res) => {
    res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` })
  })

  // Tratamento de erro em último lugar: com quatro argumentos, o Express o
  // reconhece como manipulador de erro.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[api] erro não tratado:', err?.message || err)
    if (config.ambiente !== 'production') console.error(err?.stack)
    res.status(err?.status || 500).json({
      error: err?.expose ? err.message : 'Erro interno no servidor.',
      // O detalhe só sai fora de produção: em produção ele vaza estrutura
      // interna para quem quer que consiga provocar o erro.
      ...(config.ambiente !== 'production' ? { detalhe: String(err?.message || err) } : {}),
    })
  })

  return app
}

export default criarApp
