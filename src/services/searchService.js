import { request } from './client'
import { glossary } from '../data/learnData'
import { palavrasDaConsulta, prepararTexto, avaliarPalavras } from '../utils/semanticSearch'
import { worldService } from './worldService'

// -----------------------------------------------------------------------------
// BUSCA GLOBAL
//
// `/api/search` procura no banco: notícias coletadas, proposições da Câmara e
// fontes cadastradas. As TELAS do menu, os conflitos de Mundo & Conflitos e o
// glossário do Centro Educacional entram aqui, no cliente.
//
// A comparação é POR PALAVRAS: todas as palavras significativas, em qualquer
// ordem, sem acento e sem caixa ("de", "da", "para"… não contam). Nas notícias
// não há sinônimo: "submarino" não encontra "PROSUB" se a palavra não estiver
// no texto. Nas telas há: cada uma traz as palavras que um iniciante usaria
// para chegar nela ("exportação" leva à Indústria de defesa).
// -----------------------------------------------------------------------------

/** Tipos de resultado, na ordem em que aparecem. */
export const SEARCH_TYPES = [
  { id: 'tela', label: 'Telas', icon: 'Compass' },
  { id: 'conflito', label: 'Conflitos no mundo', icon: 'Swords' },
  { id: 'noticia', label: 'Notícias', icon: 'Newspaper', to: '/clipping', capability: 'news.read' },
  { id: 'proposicao', label: 'Legislativo', icon: 'Landmark', to: '/legislativo', capability: 'legislative.access' },
  { id: 'termo', label: 'Glossário', icon: 'BookOpen', to: '/aprender' },
  // A página de fontes é de administração; para os demais o resultado aparece
  // marcado como restrito, em vez de levar a uma tela de bloqueio.
  { id: 'fonte', label: 'Fontes', icon: 'Radio', to: '/fontes', capability: 'sources.reliability' },
]

const CAPACIDADE_DO_TIPO = Object.fromEntries(SEARCH_TYPES.map((t) => [t.id, t.capability]))

/**
 * Consultas que exercitam o acervo em um clique.
 *
 * São termos que sabidamente encontram resultado no que a coleta traz.
 */
export const SUGESTOES = [
  'Marinha', 'fragata', 'Amazônia Azul', 'faixa de fronteira', 'Operação Ágata',
  'ciberdefesa', 'Gripen', 'submarino', 'orçamento de defesa', 'Venezuela',
]

// ─────────────────────────────────────────────────────────────────────────────
// TELAS — as do menu, com as palavras que levam a cada uma.
//
// `id` é o mesmo da paleta de comandos (Ctrl + K), que usa estas palavras.
// As palavras descrevem o que a tela MOSTRA hoje; não prometem conteúdo que
// ela não tem.
// ─────────────────────────────────────────────────────────────────────────────
export const TELAS = [
  { id: 'painel', label: 'Painel', to: '/painel', icon: 'LayoutDashboard', descricao: 'O resumo do dia: o que mudou, alertas e atalhos.',
    palavras: ['início', 'inicio', 'resumo', 'visão geral', 'principal', 'hoje', 'dashboard', 'meu painel'] },
  { id: 'clipping', label: 'Notícias do dia', to: '/clipping', icon: 'Newspaper', descricao: 'As notícias de segurança e defesa da edição de hoje, com filtro por assunto e urgência.',
    palavras: ['notícias', 'notícia', 'manchetes', 'jornal', 'imprensa', 'clipping', 'edição de hoje', 'últimas notícias', 'matérias', 'urgentes'] },
  { id: 'correlacoes', label: 'Correlações', to: '/correlacoes', icon: 'Link2', descricao: 'Notícias que podem ter ligação com ataques, grupos ou infraestrutura do Brasil.',
    palavras: ['ligação', 'ligações', 'relação', 'conexão', 'cruzamento', 'notícias ligadas a ataques', 'evidência'] },
  { id: 'arquivo', label: 'Minha pasta e arquivo', to: '/arquivo', icon: 'Archive', descricao: 'As notícias que você salvou e as edições que arquivou.',
    palavras: ['salvas', 'salvos', 'salvar', 'favoritos', 'guardadas', 'pasta', 'arquivo', 'edições anteriores', 'histórico'] },
  { id: 'ciberameacas', label: 'Incidentes no Brasil', to: '/ciberameacas', icon: 'ShieldAlert', descricao: 'Organizações brasileiras que grupos criminosos dizem ter atacado, com os órgãos públicos primeiro.',
    palavras: ['ataque hacker', 'ataques hackers', 'hacker', 'ataques cibernéticos', 'ciberataque', 'ransomware', 'vazamento de dados', 'sequestro de dados', 'órgão público', 'órgãos públicos atacados', 'prefeitura', 'prefeituras', 'vítimas', 'invasão', 'incidente', 'cibersegurança'] },
  { id: 'atores', label: 'Grupos contra o Brasil', to: '/atores', icon: 'Crosshair', descricao: 'As quadrilhas que já atacaram organizações brasileiras e como costumam agir.',
    palavras: ['grupos criminosos', 'quadrilhas', 'gangues', 'hackers', 'criminosos', 'atores de ameaça', 'ransomware', 'quem ataca'] },
  { id: 'mapa', label: 'Mapa estratégico', to: '/mapa', icon: 'Globe2', descricao: 'Os países que aparecem nas notícias e o que cada um tem a ver com o Brasil.',
    palavras: ['mapa', 'mapa do mundo', 'países', 'país', 'geografia', 'relações internacionais', 'onde'] },
  { id: 'mundo', label: 'Mundo & Conflitos', to: '/mundo', icon: 'Swords', descricao: 'Notícias sobre outros países e sobre as guerras e crises em curso.',
    palavras: ['guerra', 'guerras', 'conflito', 'conflitos', 'crise', 'crises', 'internacional', 'exterior', 'outros países', 'geopolítica'] },
  { id: 'economia', label: 'Economia & Defesa', to: '/economia', icon: 'DollarSign', descricao: 'Câmbio, juros, inflação e reservas do Banco Central, e o gasto em defesa entre países.',
    palavras: ['economia', 'câmbio', 'dólar', 'juros', 'Selic', 'inflação', 'IPCA', 'reservas', 'Banco Central', 'gasto militar', 'gasto em defesa', 'orçamento', 'PIB', 'Banco Mundial', 'World Bank'] },
  { id: 'industria', label: 'Indústria de defesa', to: '/industria', icon: 'Factory', descricao: 'Quanto o Brasil exportou em aeronaves, armas e munições, para quais países, e as empresas do setor.',
    palavras: ['exportação', 'exportações', 'exportou', 'armas', 'munições', 'armamento', 'aeronaves', 'aviões', 'empresas', 'Embraer', 'Comex', 'comércio exterior', 'fabricantes', 'venda de armas'] },
  { id: 'legislativo', label: 'Projetos de lei', to: '/legislativo', icon: 'Landmark', capability: 'legislative.access', descricao: 'Propostas em análise na Câmara dos Deputados sobre defesa, Forças Armadas e segurança.',
    palavras: ['projeto de lei', 'projetos de lei', 'PL', 'PEC', 'proposta', 'proposição', 'Congresso', 'Câmara', 'Câmara dos Deputados', 'deputados', 'legislação', 'lei', 'leis', 'tramitação', 'votação', 'legislativo'] },
  { id: 'dados', label: 'Séries e indicadores', to: '/dados', icon: 'LineChart', descricao: 'Os gráficos da plataforma: volume de notícias, gasto militar e comparação entre países.',
    palavras: ['gráficos', 'gráfico', 'séries', 'indicadores', 'estatísticas', 'números', 'dados', 'tendência', 'evolução', 'volume de notícias'] },
  { id: 'aprender', label: 'Centro Educacional', to: '/aprender', icon: 'GraduationCap', descricao: 'Trilhas de estudo, conceitos, glossário de siglas, documentos oficiais e quiz.',
    palavras: ['aprender', 'curso', 'trilhas', 'estudo', 'glossário', 'siglas', 'conceitos', 'quiz', 'iniciante', 'começar', 'documentos oficiais', 'o que é', 'educação'] },
  { id: 'metodologia', label: 'Metodologia', to: '/metodologia', icon: 'Scale', descricao: 'O que cada rótulo quer dizer, como é calculado e o que não quer dizer.',
    palavras: ['nível', 'níveis', 'alto', 'médio', 'baixo', 'crítico', 'urgência', 'urgente', 'alerta', 'régua', 'escala', 'como funciona', 'como é calculado', 'critério', 'rótulo', 'método', 'classificação'] },
  { id: 'config', label: 'Configurações', to: '/configuracoes', icon: 'Settings', descricao: 'Aparência e acessibilidade, assuntos de interesse e avisos na tela.',
    palavras: ['tema escuro', 'modo escuro', 'tema claro', 'modo noturno', 'dark', 'aparência', 'cores', 'daltonismo', 'daltônico', 'acessibilidade', 'tamanho do texto', 'letra maior', 'fonte maior', 'assuntos de interesse', 'avisos', 'preferências', 'ajustes'] },
  { id: 'conta', label: 'Minha conta', to: '/conta', icon: 'UserCircle', descricao: 'Seu nome, sua senha e sua sessão.',
    palavras: ['senha', 'trocar senha', 'mudar senha', 'nome', 'perfil', 'sessão', 'sair', 'excluir conta', 'usuário', 'login'] },
  { id: 'notificacoes', label: 'Notificações', to: '/notificacoes', icon: 'Bell', descricao: 'Avisos de notícias urgentes e de ataques a organizações brasileiras.',
    palavras: ['avisos', 'alertas', 'sininho', 'notificação', 'notícias urgentes', 'novidades'] },
]

const TEXTO_DA_TELA = Object.fromEntries(
  TELAS.map((t) => [t.id, { nome: prepararTexto(t.label), tudo: prepararTexto(t.label, t.palavras, t.descricao) }]),
)

/**
 * Telas que casam com a consulta, da mais forte para a mais fraca.
 *
 * `parcial: true` aceita a tela que tem ao menos uma das palavras — é o que
 * a busca sugere quando nada casa com todas.
 */
export function buscarTelas(q, { parcial = false } = {}) {
  const raizes = palavrasDaConsulta(q)
  if (!raizes.length) return []
  return TELAS
    .map((t) => {
      const { nome, tudo } = TEXTO_DA_TELA[t.id]
      const r = avaliarPalavras(raizes, tudo)
      const noNome = avaliarPalavras(raizes, nome).acertos
      return { tela: t, ok: parcial ? r.acertos > 0 : r.todas, pontos: r.acertos * 2 + noNome * 3 }
    })
    .filter((r) => r.ok)
    .sort((a, b) => b.pontos - a.pontos)
    .map((r) => r.tela)
}

const telaComoResultado = (t) => ({
  id: `tela-${t.id}`,
  type: 'tela',
  typeLabel: 'Telas',
  title: t.label,
  subtitle: null,
  snippet: t.descricao,
  badge: null,
  to: t.to,
  icon: t.icon,
  telaCapability: t.capability,
})

// ─────────────────────────────────────────────────────────────────────────────
// CONFLITOS — o catálogo vem de `/api/mundo/metodo`, o mesmo que a tela
// Mundo & Conflitos usa. Cada teatro casa pelo nome e pelas palavras da regra
// que o servidor usa para classificar as notícias ("Ucrânia", "Kiev", "Gaza").
// Uma consulta por sessão; falha não fica guardada.
// ─────────────────────────────────────────────────────────────────────────────
let teatrosEmVoo = null

export function catalogoDeConflitos() {
  if (!teatrosEmVoo) {
    teatrosEmVoo = worldService.metodo()
      .then(({ data }) => (data?.teatros || []).map((t) => ({
        id: t.id,
        nome: t.nome,
        texto: prepararTexto(t.nome, (t.regras || []).flat(3).filter((x) => typeof x === 'string')),
      })))
      .catch(() => {
        teatrosEmVoo = null
        return []
      })
  }
  return teatrosEmVoo
}

export function buscarConflitos(q, catalogo = []) {
  const raizes = palavrasDaConsulta(q)
  if (!raizes.length) return []
  return catalogo.filter((t) => avaliarPalavras(raizes, t.texto).todas).slice(0, 6)
}

const conflitoComoResultado = (t) => ({
  id: `conflito-${t.id}`,
  type: 'conflito',
  typeLabel: 'Conflitos no mundo',
  title: t.nome,
  subtitle: 'Mundo & Conflitos',
  snippet: 'A página do conflito: notícias por dia, países citados e fontes.',
  badge: null,
  to: `/mundo/teatro/${encodeURIComponent(t.id)}`,
})

const SEM_GENERICAS = new Set()

function noGlossario(q) {
  const raizes = palavrasDaConsulta(q)
  if (!raizes.length) return []
  return glossary
    .map((g) => ({
      g,
      termo: avaliarPalavras(raizes, prepararTexto(g.term), SEM_GENERICAS).acertos,
      ok: avaliarPalavras(raizes, prepararTexto(g.term, g.definition), SEM_GENERICAS).todas,
    }))
    .filter((r) => r.ok)
    .sort((x, y) => y.termo - x.termo)
    .slice(0, 10)
    .map(({ g }) => ({
      id: `termo-${g.term}`,
      type: 'termo',
      typeLabel: 'Glossário',
      title: g.term,
      subtitle: g.category,
      snippet: g.definition,
      badge: null,
      to: `/aprender?termo=${encodeURIComponent(g.term)}`,
    }))
}

/** Telas para oferecer quando a busca não encontra nada. */
const TELAS_DE_PARTIDA = ['clipping', 'ciberameacas', 'mundo', 'aprender']

export function sugestoesSemResultado(q) {
  const perto = buscarTelas(q, { parcial: true })
  const lista = perto.length ? perto : TELAS.filter((t) => TELAS_DE_PARTIDA.includes(t.id))
  return lista.slice(0, 4)
}

export const searchService = {
  /** Banco (notícias, proposições, fontes) + telas, conflitos e glossário locais. */
  query: async ({ q } = {}) => {
    const consulta = q || ''
    const [r, conflitos] = await Promise.all([
      request('GET /search', { params: { q } }),
      catalogoDeConflitos(),
    ])
    const doServidor = r?.data?.items || []
    const locais = [
      ...buscarTelas(consulta).slice(0, 6).map(telaComoResultado),
      ...buscarConflitos(consulta, conflitos).map(conflitoComoResultado),
    ]
    const itens = [...locais, ...doServidor, ...noGlossario(consulta)]
      .map((i) => ({ ...i, capability: i.telaCapability || CAPACIDADE_DO_TIPO[i.type] }))
    const groups = SEARCH_TYPES
      .map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: itens.filter((i) => i.type === t.id).length }))
      .filter((g) => g.count > 0)
    return {
      data: { items: itens, total: itens.length, groups, query: q },
      meta: r?.meta || null,
    }
  },

  /** Termos sugeridos — constante de interface, sem ida ao servidor. */
  suggestions: async () => ({
    data: { items: SUGESTOES },
    meta: { source: 'config', endpoint: 'GET /search/suggestions' },
  }),
}

export default searchService
