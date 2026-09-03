import { existsSync } from 'node:fs'
import { migrate, get } from './db/index.js'
import config from './config.js'
import { criarApp } from './app.js'
import { semearFontes, iniciarAgendador, coletarAgora, pararAgendador } from './collectors/index.js'
import { db } from './db/index.js'

// Fecha o banco uma vez só, mesmo que os dois caminhos de saída disparem.
//
// Em modo WAL, sair sem fechar deixa o `-wal` sem checkpoint: o SQLite se
// recupera sozinho na abertura seguinte, então não há corrupção — mas o
// arquivo cresce e o primeiro acesso depois do deploy paga a recuperação.
let bancoFechado = false
function fecharBanco() {
  if (bancoFechado) return
  bancoFechado = true
  try { db.close() } catch { /* já fechado */ }
}
import { semearContas } from './routes/auth.js'

// -----------------------------------------------------------------------------
// PONTO DE ENTRADA
//
// Ordem: esquema → fontes → servidor → coleta.
//
// A coleta vem DEPOIS do listen de propósito. Ela leva de 5 a 20 segundos
// (sete feeds, treze buscas na Câmara, quatro séries do World Bank); esperá-la
// atrasaria o healthcheck e o Railway mataria o contêiner antes de subir.
// -----------------------------------------------------------------------------

migrate()
const fontesCriadas = semearFontes()
// `await` no topo do módulo, e não por elegância: `semearContas` passou a ser
// assíncrona (scrypt fora do event loop), e sem esperar por ela a porta abriria
// antes de as contas existirem — um login no primeiro segundo do contêiner
// receberia "e-mail ou senha incorretos" sobre uma conta que estava sendo
// criada. O banner também imprimiria uma Promise no lugar do número.
const contasCriadas = await semearContas()

const app = criarApp()
const servidor = app.listen(config.port, config.host, async () => {
  const linha = '─'.repeat(52)
  console.log(`\n  \x1b[1mDefesaBR Intelligence — API\x1b[0m`)
  console.log(`  \x1b[2m${linha}\x1b[0m`)
  console.log(`  API           http://localhost:${config.port}/api`)
  console.log(`  Ambiente      ${config.ambiente}`)
  console.log(`  Node          ${process.version}`)
  console.log(`  Banco         ${config.dbPath}`)
  if (fontesCriadas) console.log(`  Fontes        ${fontesCriadas} cadastradas`)
  if (contasCriadas) console.log(`  Contas        ${contasCriadas} de demonstração criadas`)
  if (config.auth.segredoFraco) {
    // Em amarelo, não em cinza: quem definiu a variável acredita ter
    // configurado a sessão, e precisa saber que ela foi RECUSADA.
    console.log('  [33mSessões       AUTH_SECRET tem menos de 16 caracteres e foi ignorado[0m')
    console.log('  [2m              Use uma string aleatoria longa; ha um gerador no README[0m')
  } else if (!config.auth.segredoFixado) {
    console.log('  [2mSessões       AUTH_SECRET não definido — expiram a cada reinício[0m')
  }

  // O front compilado existe?
  //
  // Sem `dist/` o servidor sobe, responde a API e serve a URL em BRANCO — o
  // healthcheck passa (ele testa /api/health) e o deploy é dado como bem
  // sucedido. É a falha mais cara possível: tudo indica sucesso e o site não
  // abre. Normalmente significa que o build pulou as devDependencies e o Vite
  // não rodou.
  if (!existsSync(config.staticDir)) {
    const aviso = '\x1b[33m'
    const fim = '\x1b[0m'
    console.warn("")
    console.warn(`  ${aviso}Interface não encontrada em ${config.staticDir}${fim}`)
    console.warn('  A API responde, mas a URL abrirá em branco.')
    console.warn('  Rode `npm run build`. Num deploy, confirme que a instalação')
    console.warn('  incluiu as devDependencies: npm install --include=dev')
    console.warn("")
  }

  const agendador = iniciarAgendador()
  console.log(`  Agendador     ${agendador.ativo
    ? `a cada ${agendador.intervaloMinutos} min`
    : '\x1b[33mdesligado (COLLECT_INTERVAL_MINUTES=0)\x1b[0m'}`)
  console.log(`  \x1b[2m${linha}\x1b[0m\n`)

  if (!config.coleta.naSubida) return

  // Só coleta na subida se o acervo estiver vazio. Reiniciar o servidor não
  // deve disparar sete requisições externas quando já há dado no banco.
  const artigos = get('SELECT COUNT(*) AS n FROM articles')?.n ?? 0
  if (artigos > 0) {
    // Prometer "próxima coleta pelo agendador" com o agendador desligado é a
    // mensagem mais confusa possível: quem lê espera atualização que não vem.
    console.log(`  \x1b[2m[coleta] acervo com ${artigos} artigo(s) — ${agendador.ativo
      ? 'próxima coleta pelo agendador'
      : 'agendador desligado; colete com npm run collect'}\x1b[0m\n`)
    return
  }

  console.log('  \x1b[2m[coleta] primeira execução — buscando as fontes reais…\x1b[0m')
  try {
    const r = await coletarAgora('primeira-execucao')
    console.log(`  [coleta] notícias    ${r.noticias.novos} novo(s), ${r.noticias.relevantes} relevante(s)`)
    console.log(`  [coleta] legislativo ${r.legislativo.novos} proposição(ões)`)
    console.log(`  [coleta] indicadores ${r.indicadores.gravados} ponto(s)`)
    console.log(`  [coleta] BCB         ${r.bcb?.gravados ?? 0} ponto(s) do SGS`)
    console.log(`  [coleta] Comex       ${r.comex?.gravados ?? 0} linha(s) de exportação`)
    console.log(`  \x1b[2m[coleta] concluída em ${(r.duracaoMs / 1000).toFixed(1)}s\x1b[0m\n`)
  } catch (err) {
    // Falha na coleta inicial não pode derrubar o servidor: a API continua
    // respondendo, o painel de status mostra o problema, e o agendador tenta
    // de novo. Um servidor que morre porque um feed caiu é pior que um
    // servidor com acervo vazio.
    console.error('  [coleta] falhou:', err?.message || err, '\n')
  }
})

// Encerramento limpo. Sem isto, o Railway espera o timeout a cada deploy —
// e conexões abertas ficam penduradas.
for (const sinal of ['SIGTERM', 'SIGINT']) {
  process.on(sinal, () => {
    console.log(`\n  ${sinal} — encerrando…`)
    pararAgendador()
    servidor.close(() => { fecharBanco(); process.exit(0) })
    // Rede de segurança: se uma conexão ficar pendurada, sai mesmo assim.
    // Fecha o banco aqui também, senão este caminho sairia sem checkpoint.
    setTimeout(() => { fecharBanco(); process.exit(0) }, 5000).unref()
  })
}

export default servidor
