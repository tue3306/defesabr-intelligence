// -----------------------------------------------------------------------------
// CONFIGURAÇÃO DA CAMADA DE DADOS
//
// A plataforma tem BACKEND. Toda leitura passa por `src/services/*`, que fala
// HTTP com a API em `server/`.
//
// Não existe mais modo de demonstração. Se a API não responder, a interface diz
// isso — ela não substitui o dado ausente por conteúdo local, porque um sistema
// de monitoramento que preenche lacunas com invenção é pior que um vazio.
// -----------------------------------------------------------------------------

const env = import.meta.env || {}

/**
 * Endereço da API.
 *
 * Vazio por padrão, e isso é intencional: em produção o mesmo processo Node
 * serve a interface e a API, então o caminho relativo `/api` já aponta para o
 * lugar certo — sem variável para configurar no Railway e sem CORS.
 *
 * Em desenvolvimento o Vite faz proxy de `/api` para a porta 3001
 * (ver vite.config.js), então o padrão também funciona.
 */
export const API_BASE_URL = (env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const APP_NAME = env.VITE_APP_NAME || 'DefesaBR Intelligence'
export const APP_VERSION = env.VITE_APP_VERSION || '2.0.0'

/** Timeout das requisições. A coleta manual demora mais e pede o seu próprio. */
export const REQUEST_TIMEOUT = Number(env.VITE_API_TIMEOUT || 20000)
export const COLLECT_TIMEOUT = Number(env.VITE_COLLECT_TIMEOUT || 90000)

export const SETTINGS_STORAGE_KEY = 'defesabr-settings-v4'

/**
 * IDENTIFICADOR DO NAVEGADOR.
 *
 * Não há contas nesta versão. Os favoritos precisam de algum dono, então a
 * interface gera um identificador aleatório e o guarda localmente.
 *
 * O que ele é: uma chave para separar os favoritos deste navegador dos de
 * outro. O que ele NÃO é: identificação de pessoa. Não sai daqui para lugar
 * nenhum além da própria API, e some se o usuário limpar os dados do site.
 */
export function clientId() {
  const chave = 'defesabr-client-id'
  try {
    let id = localStorage.getItem(chave)
    if (!id) {
      id = `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      localStorage.setItem(chave, id)
    }
    return id
  } catch {
    // Modo privado bloqueia localStorage. Sem identificador, os favoritos
    // simplesmente não persistem — a interface avisa em vez de quebrar.
    return ''
  }
}

/** Fontes que a plataforma realmente consulta. Exibido em Sobre e no painel. */
export const FONTES = [
  {
    nome: 'Ministério da Defesa',
    tipo: 'RSS',
    url: 'https://www.gov.br/defesa',
    nota: 'Feed oficial do MD — a fonte de maior relevância direta para o domínio.',
  },
  {
    nome: 'Agência Brasil / Agência Gov (EBC)',
    tipo: 'RSS',
    url: 'https://agenciabrasil.ebc.com.br',
    nota: 'Seis editorias públicas, filtradas por relevância de defesa na coleta.',
  },
  {
    nome: 'Dados Abertos da Câmara dos Deputados',
    tipo: 'API',
    url: 'https://dadosabertos.camara.leg.br',
    nota: 'Proposições em tramitação: número, ementa e situação.',
  },
  {
    nome: 'World Bank Open Data',
    tipo: 'API',
    url: 'https://data.worldbank.org',
    nota: 'Gasto militar, efetivo e PIB — Brasil e cinco vizinhos, mesmo método.',
  },
  {
    nome: 'AwesomeAPI',
    tipo: 'API',
    url: 'https://docs.awesomeapi.com.br',
    nota: 'Cotação USD/BRL e EUR/BRL.',
  },
]

/** O que esta versão deliberadamente NÃO faz. Exibido em Sobre e no painel. */
export const NAO_IMPLEMENTADO = [
  {
    titulo: 'Análise por inteligência artificial',
    texto: 'Nenhum texto desta plataforma foi escrito por máquina. Resumo executivo e síntese '
      + 'exigiriam um modelo de linguagem — previsto para a próxima etapa.',
  },
  {
    titulo: 'Contas e permissões',
    texto: 'A plataforma é aberta. Não há login, e nenhum dado é por usuário — os favoritos usam '
      + 'um identificador do navegador, que não identifica pessoa.',
  },
  {
    titulo: 'Dossiês e avaliações de analista',
    texto: 'Conteúdo analítico é juízo humano e precisa de autoria registrada. Sem contas, não há '
      + 'a quem atribuir — então a funcionalidade não existe, em vez de existir com autor fictício.',
  },
]

export default { API_BASE_URL, APP_NAME, APP_VERSION, REQUEST_TIMEOUT, clientId, FONTES }
