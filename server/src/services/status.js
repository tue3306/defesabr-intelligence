import { relative } from 'node:path'
import { all, get } from '../db/index.js'
import config from '../config.js'
import { estadoDoAgendador } from '../collectors/index.js'
import { METODO_RELEVANCIA } from '../lib/relevance.js'

/**
 * Caminho enxuto para exibir na tela: relativo à raiz do projeto, com barras
 * normais em qualquer sistema.
 *
 * O caminho absoluto não ajuda ninguém e atrapalha duas vezes: revela a árvore
 * de diretórios de quem roda o servidor, e num contêiner aponta para um lugar
 * que não existe fora dele.
 */
function caminhoRelativo(absoluto) {
  const rel = relative(config.raizProjeto, absoluto).replace(/\\/g, '/')
  // Se o banco estiver fora da árvore do projeto (`DB_PATH` apontando para um
  // volume, por exemplo), `relative` devolve uma escada de "../". Nesse caso o
  // absoluto é a informação honesta.
  return rel && !rel.startsWith('..') ? rel : absoluto
}

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
// que impede a plataforma de prometer o que não entrega.
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

  // ── Estado do assistente por IA ──
  //
  // Contado do banco, como todo o resto desta tela: quantas contas trouxeram
  // chave própria, se a instalação tem a de reserva, e quantas sínteses já
  // foram geradas. Nenhum destes números é estimado.
  const contasComChave = get('SELECT COUNT(*) AS n FROM users WHERE ia_api_key IS NOT NULL')?.n ?? 0
  const instalacaoTemChave = !!process.env.ANTHROPIC_API_KEY
    || !!get("SELECT valor FROM app_config WHERE chave = 'ia_api_key'")?.valor
  const iaLigada = contasComChave > 0 || instalacaoTemChave
  const sinteses = get("SELECT COUNT(*) AS n FROM app_config WHERE chave LIKE 'ia_sintese:%'")?.n ?? 0

  return [
    // ── COLETA ──
    capacidadeDeColeta({
      id: 'coleta-rss',
      nome: 'Coleta de notícias (RSS)',
      coletor: 'rss',
      descricao: 'O servidor busca o XML direto de quem publica — sem proxy de terceiro e sem chave de API.',
      // Listava três domínios quando o catálogo tem dezenas de fontes.
      fonte: `${contar('SELECT COUNT(*) AS n FROM sources WHERE enabled = 1')} fonte(s) ativa(s) no catálogo — ver Governança → Fontes e coleta`,
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
      // O coletor `cambio` deixou de existir: a AwesomeAPI recusava o IP do
      // Railway e o BCB já traz dólar e euro. A capacidade continua fazendo
      // sentido — ela descreve o dado, não o processo —, mas precisa medir o
      // coletor que de fato o produz, senão fica em "nunca executado" para
      // sempre por procurar execuções de um coletor removido.
      coletor: 'bcb',
      descricao: 'Cotação USD/BRL e EUR/BRL. Muda ao longo do dia, então o que vale é a hora da coleta.',
      fonte: 'api.bcb.gov.br — SGS (séries 1 e 21619)',
      contagem: () => contar("SELECT COUNT(*) AS n FROM indicators WHERE provider = 'bcb' AND code IN ('usd','eur')"),
      evidencia: (t) => `${t} cotação(ões) registradas`,
    }),

    // ── COLETORES QUE O PAINEL NÃO LISTAVA ──
    //
    // O ciclo roda nove coletores e esta tela mostrava quatro. Exportações,
    // ransomware, atores e correlações alimentam telas inteiras — e, se um
    // deles parasse, o painel de saúde continuaria verde.
    capacidadeDeColeta({
      id: 'coleta-comex',
      nome: 'Exportações de defesa',
      coletor: 'comex',
      descricao: 'Exportações brasileiras por NCM do setor de defesa, pela API pública do Comex Stat.',
      fonte: 'api-comexstat.mdic.gov.br',
      contagem: () => contar("SELECT COUNT(*) AS n FROM indicators WHERE provider = 'comexstat'"),
      evidencia: (t) => `${t} registro(s) de exportação`,
    }),
    capacidadeDeColeta({
      id: 'coleta-ransomware',
      nome: 'Vítimas de ransomware',
      coletor: 'ransomware',
      descricao: 'Organizações brasileiras divulgadas por grupos de extorsão, com data e grupo.',
      fonte: 'ransomware.live',
      contagem: () => contar('SELECT COUNT(*) AS n FROM ransomware_victims'),
      evidencia: (t) => `${t} vítima(s) registradas`,
    }),
    capacidadeDeColeta({
      id: 'coleta-atores',
      nome: 'Atores de ameaça',
      coletor: 'atores',
      descricao: 'Grupos de extorsão com vítima brasileira registrada, com técnicas (identificador MITRE ATT&CK) e ferramentas.',
      fonte: 'ransomware.live',
      contagem: () => contar('SELECT COUNT(*) AS n FROM threat_actors'),
      evidencia: (t) => `${t} ator(es) catalogados`,
    }),
    capacidadeDeColeta({
      id: 'correlacoes',
      nome: 'Correlações entre notícias',
      coletor: 'correlacoes',
      descricao: 'Vínculos por entidade em comum (país, organização, programa) entre matérias aprovadas.',
      fonte: 'server/src/collectors/correlacoes.js',
      contagem: () => contar('SELECT COUNT(*) AS n FROM correlations'),
      evidencia: (t) => `${t} correlação(ões) calculadas`,
    }),
    (() => {
      // Agregadores com chave são opcionais: sem chave não rodam, e isso não é
      // falha. Com chave, medem-se como qualquer coletor.
      const temChave = !!(config.agregadores?.gnews || config.agregadores?.newsdata)
      if (temChave) {
        const execucao = ultimaExecucao('agregadores')
        return {
          id: 'coleta-agregadores',
          nome: 'Agregadores de notícias',
          grupo: 'Coleta',
          estado: execucao?.ok ? 'operacional' : 'degradado',
          detalhe: !execucao ? 'Nunca executado nesta instalação.'
            : execucao.ok ? `${execucao.items_new ?? 0} novo(s) na última execução`
              : `Última execução falhou: ${execucao.error || 'sem detalhe'}`,
          descricao: 'Busca por palavra-chave em GNews e NewsData, com a mesma regra de relevância do RSS.',
          fonte: 'gnews.io · newsdata.io',
          metricas: {
            ultimaExecucao: execucao?.finished_at || null,
            duracaoMs: execucao?.duration_ms ?? null,
            novosNaUltima: execucao?.items_new ?? null,
            confiabilidade: confiabilidade('agregadores'),
          },
        }
      }
      return {
        id: 'coleta-agregadores',
        nome: 'Agregadores de notícias',
        grupo: 'Coleta',
        estado: 'opcional',
        detalhe: 'Não configurado (GNEWS_API_KEY ou NEWSDATA_API_KEY). As fontes RSS cobrem os mesmos veículos.',
        descricao: 'Opcional. Sem chave, o coletor não roda e não conta como falha.',
        fonte: 'gnews.io · newsdata.io',
        metricas: {},
      }
    })(),

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
      // Caminho RELATIVO à raiz do projeto. O absoluto expunha a árvore de
      // diretórios da máquina de quem roda ("C:\Users\fulano\Desktop\...") numa
      // tela que qualquer administrador abre — e num deploy o caminho do
      // contêiner não diz nada a ninguém.
      detalhe: `${all("SELECT name FROM sqlite_master WHERE type='table'").length} tabelas · ${caminhoRelativo(config.dbPath)}`,
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
      fonte: 'server/src/routes/data.js',
      metricas: { registros: artigos },
    },
    {
      id: 'favoritos',
      nome: 'Favoritos',
      grupo: 'Entrega',
      estado: 'operacional',
      detalhe: `${contar('SELECT COUNT(*) AS n FROM bookmarks')} item(ns) salvos`,
      descricao: 'Guardados por conta no servidor: a pasta acompanha a pessoa em qualquer navegador. '
        + 'Remover a conta remove a pasta junto.',
      fonte: 'server/src/routes/system.js',
      metricas: { registros: contar('SELECT COUNT(*) AS n FROM bookmarks') },
    },

    {
      id: 'contas',
      nome: 'Contas e permissões',
      grupo: 'Acesso',
      estado: 'operacional',
      detalhe: 'Senha por scrypt, token assinado, e papel e situação conferidos no banco a cada requisição.',
      descricao: 'A senha é guardada como hash scrypt com sal por conta; o login devolve um token '
        + 'HMAC-SHA256 com validade; cada rota protegida passa por `exigirPapel()`, que responde 401 '
        + 'sem sessão e 403 com papel insuficiente. O token só identifica: papel e situação são lidos '
        + 'do banco a cada requisição, então suspender, remover ou trocar o papel de uma conta vale na '
        + 'requisição seguinte, sem esperar o token vencer. `npm run check:auth` confere as rotas.',
      fonte: 'server/src/lib/auth.js · server/src/routes/auth.js',
      pendente: 'Recuperação de senha e confirmação de e-mail não existem: dependem de envio de '
        + 'e-mail, que esta instalação não tem.',
      metricas: {
        contas: get('SELECT COUNT(*) AS n FROM users')?.n ?? 0,
        papeis: 2,
      },
    },
    {
      id: 'assistente-ia',
      nome: 'Assistente por IA',
      grupo: 'IA',
      estado: iaLigada ? 'operacional' : 'opcional',
      detalhe: iaLigada
        ? `Ligado: ${contasComChave} conta(s) com chave própria${instalacaoTemChave ? ', e a chave da instalação configurada' : ''}.`
        : 'Desligado até alguém configurar uma chave — em Minha conta → Segurança, onde cada conta guarda a própria e o administrador pode definir a da instalação.',
      descricao: 'Resumo da semana, perguntas ao acervo, análise assistida de até 15 matérias escolhidas '
        + 'e o guia da plataforma. Todo texto gerado vem marcado como escrito por máquina, e as citações '
        + 'são conferidas contra o que foi coletado. A chave fica cifrada no servidor e nunca volta ao '
        + 'navegador; quem usa paga o próprio consumo.',
      fonte: 'server/src/services/ia.js · server/src/routes/ia.js · server/src/lib/chaveIa.js',
      pendente: null,
      metricas: {
        contasComChave: contasComChave,
        chaveDaInstalacao: instalacaoTemChave ? 1 : 0,
        sintesesGuardadas: sinteses,
      },
    },
  ]
}

/** Panorama consolidado, com o resumo que o cabeçalho do painel exibe. */
export function panorama() {
  const caps = capacidades()
  const porEstado = (e) => caps.filter((c) => c.estado === e).length
  // Opcional (sem chave, por decisão de quem instala) também fica fora da conta:
  // não é algo que a plataforma deixou de entregar.
  const implementadas = caps.filter((c) => c.estado !== 'nao_implementado' && c.estado !== 'opcional')

  return {
    geradoEm: new Date().toISOString(),
    resumo: {
      total: caps.length,
      operacional: porEstado('operacional'),
      degradado: porEstado('degradado'),
      naoImplementado: porEstado('nao_implementado'),
      opcional: porEstado('opcional'),
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
      banco: caminhoRelativo(config.dbPath),
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
