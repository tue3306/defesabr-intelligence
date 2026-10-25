import { existsSync } from 'node:fs'
import { get, pool, fecharBanco as encerrarPool } from './db/index.js'
import { aplicarMigracoes } from './db/migracoes.js'
import { semearTudo } from './db/semear.js'
import config from './config.js'
import { criarApp } from './app.js'
import { iniciarAgendador, coletarAgora, pararAgendador } from './collectors/index.js'
import { segredoDaSessao } from './lib/auth.js'
import { enderecoDoBanco } from './services/status.js'

// Encerra o pool uma vez só, mesmo que os dois caminhos de saída disparem:
// `pool.end()` chamado duas vezes rejeita, e a segunda chamada viria do
// temporizador de segurança do encerramento.
let bancoFechado = false
function fecharBanco() {
  if (bancoFechado) return
  bancoFechado = true
  encerrarPool().catch(() => { /* já encerrado */ })
}

// -----------------------------------------------------------------------------
// PONTO DE ENTRADA — SÓ PARA O DESENVOLVIMENTO LOCAL
//
// Ordem: migrações → semeadura → servidor → coleta.
//
// Em produção quem serve a API é a função da Vercel, e as migrações rodam no
// deploy (`npm run migrate`). Aqui o processo é longo e cuida de tudo sozinho,
// para que `npm run dev` num clone recém-feito suba com o banco pronto.
//
// A coleta vem DEPOIS do listen de propósito. Ela leva de 5 a 20 segundos
// (sete feeds, treze buscas na Câmara, quatro séries do World Bank); esperá-la
// atrasaria a primeira resposta da API sem motivo.
// -----------------------------------------------------------------------------

// `await` no topo do módulo: sem esperar, a porta abriria antes de o esquema
// existir e de a conta de administrador ser criada.
await aplicarMigracoes(pool)
const { fontes: fontesCriadas, contas } = await semearTudo()

const app = criarApp()
const servidor = app.listen(config.port, config.host, async () => {
  const linha = '─'.repeat(52)
  console.log(`\n  \x1b[1mDefesaBR Intelligence — API\x1b[0m`)
  console.log(`  \x1b[2m${linha}\x1b[0m`)
  console.log(`  API           http://localhost:${config.port}/api`)
  console.log(`  Ambiente      ${config.ambiente}`)
  console.log(`  Node          ${process.version}`)
  // Só host e nome do banco: a URL de conexão carrega usuário e senha.
  console.log(`  Banco         Postgres em ${enderecoDoBanco()}`)
  if (fontesCriadas) console.log(`  Fontes        ${fontesCriadas} cadastradas`)
  if (contas.criadas) console.log(`  Contas        conta de administrador criada (ADMIN_USERNAME)`)
  if (contas.assumidas) console.log(`  Contas        conta de administrador assumida pelo ambiente`)
  if (contas.removidas) console.log(`  Contas        ${contas.removidas} conta(s) pública(s) antiga(s) removida(s)`)
  for (const aviso of contas.avisos) console.log(`  [33mContas        ${aviso}[0m`)
  // De onde veio o segredo que assina as sessoes. Quem hospeda precisa saber:
  // 'banco' sobrevive a reinicio; 'memoria' nao.
  let seg = {}
  try {
    seg = await segredoDaSessao()
  } catch (err) {
    console.log(`  [33mSessões       segredo não resolvido: ${err?.message || err}[0m`)
  }
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

  // Coleta na subida se o acervo estiver vazio OU velho. Reiniciar o servidor
  // logo depois de uma coleta não deve disparar requisições externas à toa —
  // mas "já há dado no banco" não é o mesmo que "há dado de hoje". O banco
  // sobrevive a dias de serviço parado; a regra antiga subia servindo as
  // notícias de cinco dias atrás como "recentes" e só buscava as novas quinze
  // minutos depois, no primeiro ciclo do agendador.
  const artigos = (await get('SELECT COUNT(*) AS n FROM articles'))?.n ?? 0
  const ultima = (await get('SELECT MAX(last_fetch_at) AS t FROM sources'))?.t
  const idadeMin = ultima ? (Date.now() - Date.parse(ultima)) / 60_000 : Infinity
  const velho = agendador.ativo && idadeMin > agendador.intervaloMinutos
  if (artigos > 0 && velho) {
    console.log(`  \x1b[2m[coleta] última coleta há ${Math.round(idadeMin / 60)} h — atualizando agora…\x1b[0m`)
    coletarAgora('acervo-desatualizado')
      .then((r) => console.log(`  [coleta] notícias    ${r.noticias?.novos ?? 0} novo(s), ${r.noticias?.relevantes ?? 0} relevante(s)\n`))
      .catch((err) => console.error('  [coleta] falhou:', err?.message || err, '\n'))
    return
  }
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
//   com código 1 é o desfecho honesto — e o pool é encerrado antes, para as
//   conexões não ficarem penduradas no Postgres.
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

// Encerramento limpo. Sem isto, Ctrl+C deixaria conexões abertas penduradas
// no Postgres até o servidor as derrubar por inatividade.
for (const sinal of ['SIGTERM', 'SIGINT']) {
  process.on(sinal, () => {
    console.log(`\n  ${sinal} — encerrando…`)
    pararAgendador()
    servidor.close(() => { fecharBanco(); process.exit(0) })
    // Rede de segurança: se uma conexão HTTP ficar pendurada, sai mesmo assim.
    // Encerra o pool aqui também, senão este caminho sairia sem fechá-lo.
    setTimeout(() => { fecharBanco(); process.exit(0) }, 5000).unref()
  })
}

export default servidor
