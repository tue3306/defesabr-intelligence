import { existsSync } from 'node:fs'
import { migrate, get } from './db/index.js'
import config from './config.js'
import { criarApp } from './app.js'
import { semearFontes, iniciarAgendador, coletarAgora, pararAgendador } from './collectors/index.js'
import { semearAgregadores } from './collectors/newsapi.js'
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
import { segredoDaSessao } from './lib/auth.js'

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
const fontesCriadas = semearFontes() + semearAgregadores()
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
  if (contasCriadas) console.log(`  Contas        ${contasCriadas} conta(s) inicial(is) criada(s)`)
  // De onde veio o segredo que assina as sessoes. Quem hospeda precisa saber:
  // 'banco' sobrevive a reinicio; 'memoria' nao.
  const seg = segredoDaSessao()
  if (seg.origem === 'banco-novo') {
    console.log('  [2mSessões       segredo gerado e guardado no banco desta instalação[0m')
  } else if (seg.origem === 'banco') {
    console.log('  [2mSessões       segredo do banco — sobrevivem ao reinício[0m')
  } else if (seg.origem === 'memoria') {
    console.log('  [33mSessões       segredo em memória: caem a cada reinício (banco não gravável)[0m')
  }
  if (config.auth.segredoFraco) {
    // Em amarelo, não em cinza: quem definiu a variável acredita ter
    // configurado a sessão, e precisa saber que ela foi RECUSADA.
    console.log('  [33mSessões       AUTH_SECRET tem menos de 16 caracteres e foi ignorado[0m')
    console.log('  [2m              Use uma string aleatoria longa; ha um gerador no README[0m')
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

// ─────────────────────────────────────────────────────────────────────────────
// FALHAS QUE NINGUÉM PEGOU
//
// Faltavam os dois tratadores de nível de processo, e a ausência não é
// teórica: desde o Node 15, uma promessa rejeitada sem `catch` DERRUBA o
// processo. Basta um `await` sem proteção em qualquer caminho novo — uma rota
// assíncrona escrita sem `next(err)`, um coletor chamado fora de `registrar()`
// — para o servidor inteiro morrer por causa de um feed fora do ar.
//
// No Railway isso é caro de um jeito específico: o disco é efêmero, então cada
// reinício recomeça o acervo do zero e a plataforma passa alguns minutos com
// as telas vazias. E `restartPolicyMaxRetries: 3` significa que três quedas
// seguidas param o serviço de vez.
//
// OS DOIS CASOS PEDEM RESPOSTAS OPOSTAS, e é por isso que não há um tratador
// só para ambos:
//
//   REJEIÇÃO NÃO TRATADA — o processo continua. Uma promessa rejeitada não diz
//   nada sobre o resto da memória: o servidor segue capaz de responder o
//   acervo que já tem. Derrubar a API porque uma coleta falhou é trocar um
//   problema pequeno por um grande. Fica registrado em vermelho para não
//   virar silêncio.
//
//   EXCEÇÃO NÃO CAPTURADA — o processo sai. Aqui a pilha foi interrompida no
//   meio, e o que sobrou pode estar pela metade: uma transação aberta, um
//   arquivo sem fechar. Seguir servindo a partir de um estado que ninguém
//   consegue descrever é como se serve dado errado com cara de certo. Sair
//   com código 1 e deixar o Railway subir de novo é o desfecho honesto — e o
//   banco é fechado antes, para o WAL não ficar sem checkpoint.
// ─────────────────────────────────────────────────────────────────────────────
process.on('unhandledRejection', (motivo) => {
  console.error('[31m[processo] promessa rejeitada sem tratamento:[0m', motivo?.message || motivo)
  if (config.ambiente !== 'production') console.error(motivo?.stack)
})

process.on('uncaughtException', (err) => {
  console.error('[31m[processo] exceção não capturada:[0m', err?.message || err)
  console.error(err?.stack)
  pararAgendador()
  fecharBanco()
  process.exit(1)
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
