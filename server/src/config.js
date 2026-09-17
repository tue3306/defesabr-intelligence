import { randomBytes } from 'node:crypto'
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

// Número positivo, com padrão quando o valor não serve.
const num = (valor, padrao) => {
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? n : padrao
}

// Número que ACEITA zero.
//
// `num()` trata 0 como "valor inválido, use o padrão", o que é certo para
// PORT e para o tempo limite — porta zero e timeout zero não fazem sentido —
// e errado para o intervalo de coleta, cujo zero significa "não agende".
// `COLLECT_INTERVAL_MINUTES=0` estava documentado como o jeito de desligar o
// agendador, no comentário abaixo e no .env.example, e devolvia 30: quem o
// usasse em teste automatizado teria a coleta rodando por cima do teste sem
// entender por quê.
const numOuZero = (valor, padrao) => {
  if (valor === undefined || valor === '') return padrao
  const n = Number(valor)
  return Number.isFinite(n) && n >= 0 ? n : padrao
}

export const config = {
  // O Railway injeta PORT; localmente cai em 3001.
  port: num(process.env.PORT, 3001),

  // '0.0.0.0' é obrigatório em contêiner: escutar em 'localhost' faz o
  // servidor subir e ficar inalcançável de fora do contêiner.
  host: process.env.HOST || '0.0.0.0',

  // AMBIENTE — e por que ele não é só `process.env.NODE_ENV`.
  //
  // O Railway não define NODE_ENV por conta própria. O deploy subia, portanto,
  // com `ambiente: 'development'`, e três comportamentos de desenvolvimento
  // ficavam ativos num serviço público:
  //
  //   • o tratador de erros anexava `detalhe` com a mensagem crua da exceção,
  //     expondo estrutura interna a quem conseguisse provocar um 500;
  //   • o CORS liberava QUALQUER origem localhost — conferido no ar, a
  //     produção respondia `access-control-allow-origin: http://localhost:9999`;
  //   • o log despejava o stack de cada erro.
  //
  // Depender de alguém lembrar de definir a variável no painel é depender de
  // memória para uma decisão de segurança. O Railway injeta as suas próprias
  // variáveis em todo deploy; a presença delas é sinal suficiente.
  //
  // NODE_ENV explícito continua tendo a palavra final — quem quiser depurar em
  // produção define `NODE_ENV=development` e assume a escolha.
  ambiente: process.env.NODE_ENV
    || (process.env.RAILWAY_ENVIRONMENT
      || process.env.RAILWAY_ENVIRONMENT_NAME
      || process.env.RAILWAY_PROJECT_ID
      || process.env.RAILWAY_SERVICE_ID
      ? 'production'
      : 'development'),

  // O banco fica em server/data/ por padrão. No Railway, apontar DB_PATH para
  // um volume montado é o que dá persistência entre deploys — sem volume, o
  // disco é efêmero e o acervo é recoletado a cada reinício.
  // ───────────────────────────────────────────────────────────────────────────
  // ONDE O BANCO MORA, E POR QUE O VOLUME É DETECTADO SOZINHO
  //
  // No Railway, o disco do contêiner é EFÊMERO: cada publicação sobe um
  // contêiner novo e o banco nasce vazio. O acervo se recoleta em segundos, mas
  // as CONTAS não voltam — quem tinha conta some, e a instalação fica sem
  // administrador. Foi o que aconteceu neste projeto, deploy após deploy.
  //
  // A solução é montar um volume. O que se pedia era montar o volume E definir
  // `DB_PATH` apontando para ele — duas ações, e esquecer a segunda deixa tudo
  // exatamente como estava, sem erro nenhum na tela.
  //
  // O Railway injeta `RAILWAY_VOLUME_MOUNT_PATH` em todo serviço com volume
  // montado. Lendo essa variável, montar o volume BASTA: o banco passa a viver
  // nele sozinho. `DB_PATH` continua tendo precedência, para quem quiser
  // escolher o caminho.
  // ───────────────────────────────────────────────────────────────────────────
  dbPath: (() => {
    const p = process.env.DB_PATH
    if (p) return isAbsolute(p) ? p : join(process.cwd(), p)
    const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH
    if (volume) return join(volume, 'defesabr.db')
    return join(raiz, 'data', 'defesabr.db')
  })(),

  // O banco sobrevive à próxima publicação?
  //
  // `efemero` é só para produção: na máquina de quem desenvolve, `server/data`
  // persiste e não há nada a avisar.
  armazenamento: {
    volume: process.env.RAILWAY_VOLUME_MOUNT_PATH || null,
    caminhoEscolhido: Boolean(process.env.DB_PATH),
  },

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

  // Agregadores com chave. OPCIONAIS: sem a variavel, o coletor nao roda e
  // nao aparece como falha. Ver server/src/collectors/newsapi.js — as 50
  // fontes RSS ja cobrem os mesmos veiculos que eles indexam.
  agregadores: {
    gnews: process.env.GNEWS_API_KEY || null,
    newsdata: process.env.NEWSDATA_API_KEY || null,
  },

  // ransomware.live — vitimas divulgadas por grupos de extorsao.
  //
  // A chave do plano gratuito fica embutida por decisao do dono do projeto,
  // para que a tela de Ameacas Ciberneticas funcione em qualquer clone sem
  // configuracao. O plano e gratuito e sem custo por chamada.
  //
  // O que isso implica, para quem mantiver: este repositorio e publico, e
  // chave em repositorio publico e indexada por buscadores e varrida por
  // robos. Se a cota comecar a se esgotar sem explicacao, e isso — o remedio
  // e gerar outra em ransomware.live e defini-la em RANSOMWARE_API_KEY, que
  // tem precedencia sobre o valor abaixo e nunca precisa ser commitada.
  ransomware: {
    chave: process.env.RANSOMWARE_API_KEY || '07e8cc54-f885-4f3f-88cb-04f77b0a5da6',
  },

  auth: {
    // Segredo que assina os tokens de sessão.
    //
    // Sem AUTH_SECRET no ambiente, gera um aleatório a cada boot — o que
    // INVALIDA as sessões a cada reinício. É o padrão certo: um segredo fixo
    // embutido no código seria público (o repositório é aberto), e qualquer
    // pessoa poderia assinar um token de administrador.
    //
    // No Railway, defina AUTH_SECRET para as sessões sobreviverem ao deploy.
    // Um segredo curto é pior que nenhum: dá a sensação de estar configurado
    // e é adivinhável por força bruta. Abaixo de 16 caracteres ele é recusado
    // em favor do aleatório, e `segredoFraco` faz o servidor avisar no boot.
    segredo: (process.env.AUTH_SECRET || '').length >= 16
      ? process.env.AUTH_SECRET
      : randomBytes(32).toString('hex'),
    segredoFixado: (process.env.AUTH_SECRET || '').length >= 16,
    segredoFraco: Boolean(process.env.AUTH_SECRET) && process.env.AUTH_SECRET.length < 16,
    duracaoHoras: num(process.env.AUTH_TTL_HOURS, 12),

    // A CONTA DE ADMINISTRADOR DA INSTALAÇÃO — só por variável de ambiente.
    //
    // O repositório é público: credencial escrita no código ou no README é
    // credencial de qualquer um. `ADMIN_USERNAME` e `ADMIN_PASSWORD` criam a
    // conta na primeira subida; depois disso a senha é trocada pela própria
    // plataforma (Minha conta → Segurança) e a variável não a sobrescreve.
    //
    // Sem as duas variáveis nenhuma conta de administrador é criada, e o
    // servidor avisa no boot. As demais contas nascem pelo cadastro, com papel
    // de usuário; promover alguém é ato do administrador.
    administrador: {
      usuario: String(process.env.ADMIN_USERNAME || '').trim().toLowerCase() || null,
      senha: process.env.ADMIN_PASSWORD || null,
    },
  },

  coleta: {
    // Intervalo do ciclo de coleta. 0 desliga — útil em teste automatizado.
    //
    // 15 minutos vale para as notícias. Fontes que mudam devagar (Câmara,
    // Banco Central, World Bank, Comex Stat) têm espaçamento mínimo próprio em
    // `CADENCIA` (collectors/index.js), para o ciclo mais curto não multiplicar
    // chamadas a APIs que não têm nada novo a cada quarto de hora.
    intervaloMinutos: numOuZero(process.env.COLLECT_INTERVAL_MINUTES, 15),
    // Coletar assim que o servidor sobe, se o acervo estiver vazio.
    naSubida: process.env.COLLECT_ON_BOOT !== '0',
    timeoutMs: num(process.env.COLLECT_TIMEOUT_MS, 15000),
    userAgent: process.env.COLLECT_USER_AGENT
      || 'DefesaBR-Intelligence/2.0 (agregador academico de fontes publicas)',
  },

  // A cobertura internacional que só a lente mundial aprovou (relevant = 0 e
  // mundo = 1) é volumosa — as editorias de mundo publicam centenas de itens
  // por dia — e não tem o valor de arquivo do acervo de defesa do Brasil.
  // Passados estes dias ela sai do banco; a de defesa do Brasil não. Ver
  // collectors/geografia.js, que também poupa o que alguém guardou na pasta.
  mundo: {
    retencaoDias: num(process.env.MUNDO_RETENCAO_DIAS, 180),
  },

  versao: process.env.npm_package_version || '2.0.0',

  // ───────────────────────────────────────────────────────────────────────────
  // QUAL COMMIT ESTÁ NO AR
  //
  // Faltava a resposta mais básica que se pede a um serviço em produção, e a
  // falta custou caro: o deploy passou mais de uma hora servindo código de
  // versões anteriores enquanto o repositório já tinha nove commits novos, e
  // não havia como perceber. `/api/health` respondia `ok: true` — porque o
  // processo estava mesmo de pé; ele só não era o processo que se esperava.
  //
  // "Está no ar" e "está atualizado" são perguntas diferentes, e uma sonda que
  // só responde a primeira deixa a segunda sem dono.
  //
  // O Railway injeta estas variáveis em todo deploy originado do GitHub, sem
  // configuração nenhuma. Localmente elas não existem e o bloco vira `null` —
  // que é a resposta correta: `npm start` na máquina de quem clona não é um
  // deploy e não tem commit associado.
  //
  // Só o SHA curto sai na resposta. O SHA completo não acrescenta nada a quem
  // compara com `git log`, e a mensagem de commit pode conter qualquer coisa
  // que alguém escreveu — não é campo para servir em rota pública.
  // ───────────────────────────────────────────────────────────────────────────
  deploy: (() => {
    const sha = process.env.RAILWAY_GIT_COMMIT_SHA || ''
    const branch = process.env.RAILWAY_GIT_BRANCH || ''
    const id = process.env.RAILWAY_DEPLOYMENT_ID || ''
    if (!sha && !branch && !id) return null
    return {
      commit: sha ? sha.slice(0, 7) : null,
      branch: branch || null,
      deploymentId: id || null,
      // Quando ESTE processo subiu. Junto do commit, responde "o deploy de
      // agora é o do último push?" sem abrir o painel.
      subiuEm: new Date(Date.now() - Math.round(process.uptime() * 1000)).toISOString(),
    }
  })(),
}

// Produção sem volume e sem caminho escolhido = banco recriado a cada deploy.
config.armazenamento.efemero = config.ambiente === 'production'
  && !config.armazenamento.volume
  && !config.armazenamento.caminhoEscolhido

export default config
