import express from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import config from './config.js'
import noticias from './routes/news.js'
import dados from './routes/data.js'
import sistema from './routes/system.js'
import autenticacao from './routes/auth.js'
import inteligencia from './routes/intel.js'
import guia from './routes/guia.js'
import metodo from './routes/metodo.js'
import notificacoes from './routes/notificacoes.js'
import mundo from './routes/mundo.js'
import { lerConta } from './lib/auth.js'
import { waitUntil } from '@vercel/functions'
import { criarRotaCron } from './routes/cron.js'
import { CABECALHOS_SEGURANCA, CABECALHOS_SO_PRODUCAO } from './lib/cabecalhos.js'

// -----------------------------------------------------------------------------
// APLICAÇÃO EXPRESS
//
// Separada de `index.js` para poder ser montada em teste sem abrir porta.
//
// Em PRODUÇÃO este mesmo processo serve a API e o front compilado. É a escolha
// certa para um deploy de origem única: uma URL e — o que mais economiza tempo —
// nenhuma requisição entre origens, portanto nenhum CORS para depurar.
// -----------------------------------------------------------------------------

export function criarApp() {
  const app = express()

  app.disable('x-powered-by')

  // `trust proxy`: a Vercel põe um proxy na frente, e sem isto o IP de
  // TODA requisição chega como o do proxy. O teto por IP de `lib/limite.js`
  // passaria a contar o mundo inteiro num contador só — o primeiro visitante a
  // errar dez senhas trancaria o login para todos.
  app.set('trust proxy', 1)

  app.use(express.json({ limit: '256kb' }))

  // ── Cabeçalhos de segurança ──
  //
  // Valores em `lib/cabecalhos.js`, a fonte única (o vercel.json os repete e um
  // teste guarda a igualdade). CSP e HSTS só em produção: o Vite de
  // desenvolvimento injeta script inline para o recarregamento a quente, e a
  // política o bloquearia. Conferida servindo o `dist/` com NODE_ENV=production.
  const producao = config.ambiente === 'production'
  const aplicaveis = CABECALHOS_SEGURANCA.filter(
    ({ key }) => producao || !CABECALHOS_SO_PRODUCAO.includes(key),
  )

  app.use((req, res, next) => {
    for (const { key, value } of aplicaveis) res.setHeader(key, value)
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
  // funcionando ao vivo, sem dependência de logger.
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

  // ── Parâmetros de consulta: um texto por nome ──
  //
  // O Express entrega `?q=a&q=b` como ARRAY e `?q[x]=1` como OBJETO. Nenhuma
  // rota espera isso, e várias chamam `.trim()` ou passam o valor direto ao
  // SQLite: `/api/search?q=a&q=b` respondia 500 ("trim is not a function"), e
  // `/api/news?category=a&category=b` também, na ligação do parâmetro. Fica o
  // primeiro valor de texto; o que não é texto some, como se não tivesse vindo.
  app.use('/api', (req, res, next) => {
    for (const [k, v] of Object.entries(req.query)) {
      if (Array.isArray(v)) {
        if (typeof v[0] === 'string') req.query[k] = v[0]
        else delete req.query[k]
      } else if (v !== undefined && typeof v !== 'string') {
        delete req.query[k]
      }
    }
    next()
  })

  // Lê a sessão ANTES das rotas: quem exige papel encontra `req.conta` pronto,
  // e quem não exige simplesmente ignora. Não bloqueia nada por si só.
  //
  // `lerConta` é assíncrona (assinatura e conta vêm do banco). O Express 4 não
  // olha a promessa: sem o `.catch(next)`, uma falha ao resolver o segredo
  // deixaria a requisição pendurada em vez de virar 500 JSON.
  app.use('/api', (req, res, next) => lerConta(req, res, next).catch(next))

  // Fora da Vercel `waitUntil` não faz nada (o contexto não existe) e a promessa
  // segue por conta própria, pois o processo continua vivo. A promessa recebida
  // já vem com `.catch`, então nunca vira rejeição sem dono.
  app.use('/api', criarRotaCron({ emSegundoPlano: waitUntil }))

  app.use('/api', autenticacao)
  app.use('/api', noticias)
  app.use('/api', dados)
  app.use('/api', inteligencia)
  app.use('/api', guia)
  app.use('/api', metodo)
  app.use('/api', notificacoes)
  app.use('/api', mundo)
  app.use('/api', sistema)

  // ── Front compilado ──
  //
  // Se `dist/` existir, este processo serve a interface também. Em
  // desenvolvimento a pasta não existe e o Vite cuida disso — por isso a
  // verificação, e não uma falha.
  if (existsSync(config.staticDir)) {
    // ── CACHE: OS ARQUIVOS COM HASH SIM, O `index.html` NUNCA ──
    //
    // O Vite põe o hash do conteúdo no nome de cada bundle
    // (`index-CDdGef2R.js`), então esses arquivos são IMUTÁVEIS: o nome muda
    // quando o conteúdo muda. Podem ser guardados por um ano sem risco.
    //
    // O `index.html` é o oposto: o nome nunca muda e o conteúdo aponta para os
    // bundles do build atual. Guardá-lo em cache é o que faz um navegador
    // continuar pedindo, depois de um deploy, os arquivos do build anterior —
    // que não existem mais.
    app.use(express.static(config.staticDir, {
      index: false,
      maxAge: '1y',
      immutable: true,
      setHeaders(res, caminho) {
        if (caminho.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
      },
    }))

    // ── ARQUIVO ESTÁTICO QUE NÃO EXISTE DEVE DAR 404, NÃO HTML ──
    //
    // O catch-all abaixo devolvia `index.html` para QUALQUER caminho fora de
    // /api — inclusive para `/assets/Home-BezuJ_e3.js`. Conferido no navegador:
    // depois de um deploy, a aba que já estava aberta pede os bundles antigos,
    // recebe HTML no lugar de JavaScript e morre com
    //
    //   "Expected a JavaScript-or-Wasm module script but the server responded
    //    with a MIME type of text/html"
    //
    // seguido de "Failed to fetch dynamically imported module" e uma tela em
    // branco. O erro não diz o que aconteceu, e acontece com TODA pessoa que
    // estiver com a plataforma aberta no momento de uma publicação.
    //
    // Com 404, o navegador reporta arquivo ausente — que é a verdade — e o
    // ErrorBoundary do front consegue oferecer recarregar.
    const RX_ARQUIVO = /\.[a-z0-9]{2,5}$/i
    app.get(/^(?!\/api).*/, (req, res) => {
      if (RX_ARQUIVO.test(req.path)) {
        return res.status(404).type('text/plain').send(
          'Arquivo não encontrado. Se a plataforma acabou de ser publicada, recarregue a página.'
        )
      }
      // O front usa HashRouter, então não há rota de servidor para reescrever:
      // qualquer caminho que não seja /api nem arquivo recebe o index.
      res.sendFile(join(config.staticDir, 'index.html'))
    })
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
      ...(err?.expose && err.code ? { code: err.code } : {}),
      // O detalhe só sai fora de produção: em produção ele vaza estrutura
      // interna para quem quer que consiga provocar o erro.
      ...(config.ambiente !== 'production' ? { detalhe: String(err?.message || err) } : {}),
    })
  })

  return app
}

export default criarApp
