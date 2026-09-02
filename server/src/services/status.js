import { all, get } from '../db/index.js'
import config from '../config.js'
import { estadoDoAgendador } from '../collectors/index.js'
import { METODO_RELEVANCIA } from '../lib/relevance.js'

// -----------------------------------------------------------------------------
// STATUS DA PLATAFORMA
//
// Responde uma pergunta só, com evidência: O QUE AQUI FUNCIONA DE VERDADE?
//
// Um painel de status que pinta tudo de verde porque alguém escreveu
// `status: 'ok'` no código é pior que nenhum painel — ele treina quem olha a
// não olhar. Então cada linha aqui é DERIVADA do banco: quantas linhas
// existem, quando foi a última execução, o que a fonte respondeu.
//
// Os três estados possíveis são deliberadamente distintos:
//
//   operacional     funciona, e há prova disso no banco
//   degradado       implementado, mas a última execução falhou ou nada trouxe
//   nao_implementado  a funcionalidade não existe nesta versão
//
// "Não implementado" não é falha: é um recurso que esta instalação não oferece.
// Dizer isso é mais útil que exibir verde que não corresponde a nada — e é o
// que impede a demonstração de prometer o que não entrega.
// -----------------------------------------------------------------------------

const contar = (sql, params = []) => get(sql, params)?.n ?? 0

/** Última execução registrada de um coletor. */
function ultimaExecucao(coletor) {
  return get(
    `SELECT started_at, finished_at, duration_ms, ok, items_found, items_new, error, trigger
     FROM collector_runs WHERE collector = ? ORDER BY started_at DESC LIMIT 1`,
    [coletor]
  )
}

/** Taxa de sucesso recente — distingue "quebrou agora" de "vive quebrado". */
function confiabilidade(coletor, ultimas = 10) {
  const linhas = all(
    'SELECT ok FROM collector_runs WHERE collector = ? ORDER BY started_at DESC LIMIT ?',
    [coletor, ultimas]
  )
  if (!linhas.length) return null
  return Math.round((linhas.filter((l) => l.ok).length / linhas.length) * 100)
}

function capacidadeDeColeta({ id, nome, coletor, descricao, evidencia, contagem, fonte }) {
  const execucao = ultimaExecucao(coletor)
  const total = contagem()

  let estado
  let detalhe
  if (!execucao) {
    estado = 'degradado'
    detalhe = 'Nunca executado nesta instalação.'
  } else if (!execucao.ok) {
    estado = 'degradado'
    detalhe = `Última execução falhou: ${execucao.error || 'sem detalhe'}`
  } else if (total === 0) {
    estado = 'degradado'
    detalhe = 'Executou sem erro, mas o acervo está vazio.'
  } else {
    estado = 'operacional'
    detalhe = evidencia(total, execucao)
  }

  return {
    id,
    nome,
    grupo: 'Coleta',
    estado,
    detalhe,
    descricao,
    fonte,
    metricas: {
      registros: total,
      ultimaExecucao: execucao?.finished_at || null,
      duracaoMs: execucao?.duration_ms ?? null,
      novosNaUltima: execucao?.items_new ?? null,
      confiabilidade: confiabilidade(coletor),
    },
  }
}

/** Todas as capacidades da plataforma, com o estado real de cada uma. */
export function capacidades() {
  const artigos = contar('SELECT COUNT(*) AS n FROM articles')
  const relevantes = contar('SELECT COUNT(*) AS n FROM articles WHERE relevant = 1')

  return [
    // ── COLETA ──
    capacidadeDeColeta({
      id: 'coleta-rss',
      nome: 'Coleta de notícias (RSS)',
      coletor: 'rss',
      descricao: 'O servidor busca o XML direto de quem publica — sem proxy de terceiro e sem chave de API.',
      fonte: 'gov.br/defesa · agenciabrasil.ebc.com.br · agenciagov.ebc.com.br',
      contagem: () => artigos,
      evidencia: (t, e) => `${t} artigo(s) no acervo · ${e.items_new} novo(s) na última execução`,
    }),
    capacidadeDeColeta({
      id: 'coleta-camara',
      nome: 'Proposições legislativas',
      coletor: 'camara',
      descricao: 'Dados Abertos da Câmara, consultados por 13 palavras-chave do domínio e deduplicados por id.',
      fonte: 'dadosabertos.camara.leg.br',
      contagem: () => contar('SELECT COUNT(*) AS n FROM bills'),
      evidencia: (t) => `${t} proposição(ões) acompanhadas`,
    }),
    capacidadeDeColeta({
      id: 'coleta-worldbank',
      nome: 'Indicadores econômicos',
      coletor: 'worldbank',
      descricao: 'Séries oficiais de gasto militar, efetivo e PIB — Brasil e cinco vizinhos, mesmo método.',
      fonte: 'api.worldbank.org',
      contagem: () => contar("SELECT COUNT(*) AS n FROM indicators WHERE provider = 'worldbank'"),
      evidencia: (t) => `${t} ponto(s) de série histórica`,
    }),
    capacidadeDeColeta({
      id: 'coleta-cambio',
      nome: 'Câmbio',
      coletor: 'cambio',
      descricao: 'Cotação USD/BRL e EUR/BRL. Muda ao longo do dia, então o que vale é a hora da coleta.',
      fonte: 'economia.awesomeapi.com.br',
      contagem: () => contar("SELECT COUNT(*) AS n FROM indicators WHERE provider = 'awesomeapi'"),
      evidencia: (t) => `${t} cotação(ões) registradas`,
    }),

    // ── PROCESSAMENTO ──
    {
      id: 'filtro-relevancia',
      nome: 'Filtro de relevância',
      grupo: 'Processamento',
      estado: artigos > 0 ? 'operacional' : 'degradado',
      detalhe: artigos > 0
        ? `${relevantes} de ${artigos} artigos aprovados (${Math.round((relevantes / artigos) * 100)}%)`
        : 'Sem artigos para filtrar.',
      descricao: `Regra declarada e auditável: ${METODO_RELEVANCIA.regra}. `
        + `${METODO_RELEVANCIA.termosFortes} termos inequívocos, `
        + `${METODO_RELEVANCIA.termosFracos} ambíguos, ${METODO_RELEVANCIA.exclusoes} exclusões.`,
      fonte: 'server/src/lib/relevance.js',
      metricas: { registros: relevantes, taxaAprovacao: artigos ? Math.round((relevantes / artigos) * 100) : null },
    },
    {
      id: 'classificacao',
      nome: 'Classificação por categoria e urgência',
      grupo: 'Processamento',
      estado: relevantes > 0 ? 'operacional' : 'degradado',
      detalhe: relevantes > 0
        ? `${contar('SELECT COUNT(DISTINCT category) AS n FROM articles WHERE relevant = 1')} categoria(s) em uso`
        : 'Sem artigos classificados.',
      descricao: 'Derivada por regra de palavra-chave. A urgência é medida só na abertura do texto — '
        + 'numa janela grande quase todo texto tem alguma palavra tensa, e uma escala em que tudo é '
        + 'crítico não ordena nada.',
      fonte: 'server/src/lib/relevance.js',
      metricas: { registros: relevantes },
    },
    {
      id: 'agendador',
      nome: 'Agendador de coleta',
      grupo: 'Processamento',
      ...(() => {
        const s = estadoDoAgendador()
        return {
          estado: s.ativo ? 'operacional' : 'nao_implementado',
          detalhe: s.ativo
            ? `A cada ${s.intervaloMinutos} min · próxima em ${s.proximaExecucao ? new Date(s.proximaExecucao).toLocaleTimeString('pt-BR') : '—'}`
            : 'Desligado por configuração (COLLECT_INTERVAL_MINUTES=0).',
          metricas: { proximaExecucao: s.proximaExecucao, emAndamento: s.emAndamento },
        }
      })(),
      descricao: 'Ciclo periódico com trava contra sobreposição: uma coleta longa não é atropelada pela seguinte.',
      fonte: 'server/src/collectors/index.js',
    },
    {
      id: 'persistencia',
      nome: 'Persistência (SQLite)',
      grupo: 'Processamento',
      estado: 'operacional',
      detalhe: `${all("SELECT name FROM sqlite_master WHERE type='table'").length} tabelas · ${config.dbPath}`,
      descricao: 'Módulo nativo node:sqlite — sem compilação de binário nativo, o que faz `npm install` '
        + 'funcionar na primeira tentativa em qualquer máquina.',
      fonte: 'node:sqlite',
      metricas: { registros: artigos + contar('SELECT COUNT(*) AS n FROM bills') },
    },

    // ── ENTREGA ──
    {
      id: 'api-rest',
      nome: 'API REST',
      grupo: 'Entrega',
      estado: 'operacional',
      detalhe: 'Respondendo — esta própria resposta é a prova.',
      descricao: 'Express sobre Node. Todos os dados da interface vêm daqui; não há JSON estático no front.',
      fonte: `porta ${config.port}`,
      metricas: {},
    },
    {
      id: 'busca',
      nome: 'Busca global',
      grupo: 'Entrega',
      estado: artigos > 0 ? 'operacional' : 'degradado',
      detalhe: artigos > 0
        ? 'Busca por texto em notícias e proposições, no banco.'
        : 'Sem acervo para buscar.',
      descricao: 'LIKE sobre título, resumo e ementa. Suficiente para este volume; um índice FTS5 '
        + 'seria o próximo passo se o acervo crescer uma ordem de grandeza.',
      fonte: 'server/src/routes/search.js',
      metricas: { registros: artigos },
    },
    {
      id: 'favoritos',
      nome: 'Favoritos',
      grupo: 'Entrega',
      estado: 'operacional',
      detalhe: `${contar('SELECT COUNT(*) AS n FROM bookmarks')} item(ns) salvos`,
      descricao: 'Sem sistema de contas, o dono é o navegador: a interface gera um identificador local. '
        + 'Não identifica pessoa — e some se o usuário limpar os dados do site.',
      fonte: 'server/src/routes/bookmarks.js',
      metricas: { registros: contar('SELECT COUNT(*) AS n FROM bookmarks') },
    },

    // ── O QUE NÃO EXISTE ──
    //
    // Declarado com a mesma seriedade do que existe. Um sistema que não
    // publica seus limites convida quem o usa a atribuir-lhe capacidades que
    // ele não tem — e numa demonstração isso é a diferença entre honestidade
    // técnica e propaganda.
    {
      id: 'ia-analise',
      nome: 'Análise por IA',
      grupo: 'Não implementado',
      estado: 'nao_implementado',
      detalhe: 'Nenhum texto desta plataforma foi escrito por máquina.',
      descricao: 'Resumo executivo, síntese e classificação semântica exigiriam um modelo de linguagem. '
        + 'Previsto para a próxima etapa; até lá os campos correspondentes ficam explicitamente vazios '
        + 'em vez de preenchidos com texto plausível.',
      fonte: '—',
      metricas: {},
    },
    {
      id: 'contas',
      nome: 'Contas e permissões',
      grupo: 'Parcial',
      estado: 'degradado',
      detalhe: 'Perfis funcionam no navegador; o servidor não autentica ninguém.',
      descricao: 'A distinção importa e o painel não deve escondê-la. O que EXISTE: quatro perfis '
        + '(visitante, assinante, analista, administrador), um mapa de permissões e telas que se '
        + 'adaptam ao perfil — tudo real, e é isso que se demonstra ao trocar de conta. O que NÃO '
        + 'existe: verificação no servidor. A API responde a qualquer requisição sem perguntar quem '
        + 'é; trocar de perfil muda o que a interface mostra, não o que o backend entrega. Para virar '
        + 'controle de acesso de verdade faltam sessão, senha e checagem por rota — o esquema já '
        + 'isola o que seria por conta, então isso se acrescenta sem remodelar o banco.',
      fonte: 'src/auth/permissions.js (navegador)',
      metricas: {},
    },
    {
      id: 'analise-produzida',
      nome: 'Dossiês e avaliações de analista',
      grupo: 'Não implementado',
      estado: 'nao_implementado',
      detalhe: 'As telas existem e são navegáveis; o conteúdo é redigido, não coletado.',
      descricao: 'Dossiês, matriz de riscos, narrativas e cenários são telas completas e demonstráveis '
        + '— mas o que elas exibem foi escrito à mão para servir de exemplo, não sai de nenhuma coleta. '
        + 'Ficam marcadas assim de propósito: são a parte do produto que depende de juízo humano, e '
        + 'apresentá-las como saída automática seria a única mentira do painel. O que falta para virar '
        + 'funcionalidade real é fluxo de redação com autoria registrada, o que por sua vez depende de '
        + 'contas no servidor.',
      fonte: 'src/data/ (conteúdo editorial)',
      metricas: {},
    },
  ]
}

/** Panorama consolidado, com o resumo que o cabeçalho do painel exibe. */
export function panorama() {
  const caps = capacidades()
  const porEstado = (e) => caps.filter((c) => c.estado === e).length
  const implementadas = caps.filter((c) => c.estado !== 'nao_implementado')

  return {
    geradoEm: new Date().toISOString(),
    resumo: {
      total: caps.length,
      operacional: porEstado('operacional'),
      degradado: porEstado('degradado'),
      naoImplementado: porEstado('nao_implementado'),
      // A saúde só conta o que a plataforma se propõe a fazer. Contar o não
      // implementado como falha puniria a honestidade de declará-lo.
      saude: implementadas.length
        ? Math.round((implementadas.filter((c) => c.estado === 'operacional').length / implementadas.length) * 100)
        : 0,
    },
    capacidades: caps,
    agendador: estadoDoAgendador(),
    acervo: {
      artigos: contar('SELECT COUNT(*) AS n FROM articles'),
      artigosRelevantes: contar('SELECT COUNT(*) AS n FROM articles WHERE relevant = 1'),
      proposicoes: contar('SELECT COUNT(*) AS n FROM bills'),
      indicadores: contar('SELECT COUNT(*) AS n FROM indicators'),
      fontes: contar('SELECT COUNT(*) AS n FROM sources'),
      fontesComErro: contar("SELECT COUNT(*) AS n FROM sources WHERE last_status = 'erro'"),
      favoritos: contar('SELECT COUNT(*) AS n FROM bookmarks'),
    },
    ambiente: {
      node: process.version,
      ambiente: config.ambiente,
      versao: config.versao,
      uptimeSegundos: Math.round(process.uptime()),
      banco: config.dbPath,
    },
  }
}

/** Histórico de execuções, para o painel mostrar tendência e não só o agora. */
export const historicoDeExecucoes = (limite = 40) => all(
  `SELECT id, collector, started_at, finished_at, duration_ms, ok,
          items_found, items_new, error, trigger
   FROM collector_runs ORDER BY started_at DESC LIMIT ?`,
  [limite]
)

export default { capacidades, panorama, historicoDeExecucoes }
