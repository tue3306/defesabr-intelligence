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

  // `trust proxy`: o Railway põe um balanceador na frente, e sem isto o IP de
  // TODA requisição chega como o do proxy. O teto por IP de `lib/limite.js`
  // passaria a contar o mundo inteiro num contador só — o primeiro visitante a
  // errar dez senhas trancaria o login para todos.
  app.set('trust proxy', 1)

  app.use(express.json({ limit: '256kb' }))

  // ── Cabeçalhos de segurança ──
  //
  // Quatro linhas, nenhuma dependência. Não há CSP aqui de propósito: a
  // interface carrega o atlas de países de um CDN e as fontes do Google, e uma
  // política restritiva escrita às pressas quebraria o mapa em produção sem
  // avisar. CSP é trabalho para quando houver tempo de testá-la.
  app.use((req, res, next) => {
    // Impede o navegador de "adivinhar" o tipo de um arquivo servido — é o que
    // transforma um upload de texto em script executável.
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // Sem isto a plataforma pode ser embutida num iframe de terceiro e ter os
    // cliques sequestrados por uma camada invisível por cima.
    res.setHeader('X-Frame-Options', 'DENY')
    // Não vaza o caminho interno visitado para sites externos ao clicar num link.
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    // Nada aqui usa câmera, microfone ou localização; declarar isso fecha a
    // porta para qualquer script de terceiro que tente pedi-los.
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    next()
  })

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
    // Todo cabeçalho que o front envia precisa estar declarado aqui: o que
    // faltar faz o preflight recusar e NENHUMA chamada passa — a interface
    // fica de pé dizendo "servidor fora do ar" com o servidor vivo.
    //
    // `Authorization` faltava, e era a falha mais cara da lista: sem ele,
    // qualquer instalação em que o front não seja servido por este mesmo
    // processo perderia TODA chamada autenticada. Passava despercebido porque
    // o proxy do Vite torna o desenvolvimento mesma-origem e a produção serve
    // o front daqui — os dois cenários em que o preflight nem acontece. Quem
    // apontasse VITE_API_BASE_URL para uma API remota, como o .env.example
    // descreve, veria login funcionar e todo o resto falhar.
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Id', 'X-Client-Version'],
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
