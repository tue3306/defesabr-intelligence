// -----------------------------------------------------------------------------
// CONFIGURAÇÃO DA CAMADA DE DADOS
//
// A plataforma TEM backend (`server/`). Toda leitura passa por
// `src/services/*`, que hoje resolve de três formas — nesta ordem:
//
//   1. PONTE      endpoint com backend real  → HTTP     (meta.source = 'live')
//   2. LOCAL      endpoint sem backend       → src/data (meta.source = 'demo')
//   3. RESERVA    API caiu no meio           → src/data (meta.source = 'fallback')
//
// A ponte (`apiBridge.js`) ativa SOZINHA quando a API responde: ela usa o
// caminho relativo `/api`, que o Vite encaminha em desenvolvimento e que o
// próprio servidor atende em produção. Não há variável para configurar.
//
// Por que híbrido: parte do produto tem fonte pública verificável — notícias,
// proposições, indicadores, saúde do sistema — e parte não tem e não terá
// enquanto não houver analista ou modelo de linguagem. Os selos "AO VIVO" e
// "DEMO" já existentes na interface dizem qual é qual, tela a tela.
//
// `DATA_MODE` continua existindo para forçar HTTP em TODOS os endpoints
// (inclusive os sem backend), o que só faz sentido quando a API cobrir tudo.
// -----------------------------------------------------------------------------

const env = import.meta.env || {}

/** 'mock' | 'api' */
export const DATA_MODE = (env.VITE_DATA_MODE || 'mock').toLowerCase() === 'api' ? 'api' : 'mock'

/** Base da API quando DATA_MODE === 'api' (ex.: https://api.defesabr.gov.br/v1). */
export const API_BASE_URL = (env.VITE_API_BASE_URL || '').replace(/\/$/, '')

/** Identidade da aplicação (exibida em rodapés, PDFs e cabeçalhos HTTP). */
export const APP_NAME = env.VITE_APP_NAME || 'DefesaBR Intelligence'
export const APP_VERSION = env.VITE_APP_VERSION || '1.0.0'

/** Timeout padrão das requisições (ms). */
export const REQUEST_TIMEOUT = Number(env.VITE_API_TIMEOUT || 12000)

/**
 * Latência simulada no modo mock. Sem ela, os estados de carregamento nunca
 * aparecem e a demonstração parece irreal — e defeitos de "loading" passam
 * despercebidos. Pode ser desligada com VITE_MOCK_LATENCY=0.
 */
export const MOCK_LATENCY = (() => {
  const raw = env.VITE_MOCK_LATENCY
  if (raw === '0' || raw === 'false') return { min: 0, max: 0 }
  return { min: 180, max: 520 }
})()

/** Chave de persistência dos ajustes (usada também fora do store). */
export const SETTINGS_STORAGE_KEY = 'defesabr-settings-v3'

/** true quando a plataforma roda em modo demonstração (sem backend). */
export const isDemoMode = () => DATA_MODE === 'mock' || !API_BASE_URL

/**
 * DATA DE REFERÊNCIA DO CONJUNTO DEMONSTRATIVO.
 *
 * O acervo de demonstração foi escrito em torno de uma data fixa: prazos da
 * fila de produção, agenda estratégica, marcos de programas e trilha de
 * auditoria são coerentes entre si a partir dela. Usar `new Date()` faria a
 * demonstração envelhecer sozinha — prazos venceriam, a agenda esvaziaria e o
 * conjunto perderia a coerência interna.
 *
 * Ao ligar um backend real, troque por `new Date().toISOString().slice(0, 10)`
 * num único lugar: nenhuma tela precisa mudar.
 */
export const REFERENCE_DATE = env.VITE_REFERENCE_DATE || '2026-08-24'

/** A data de referência como Date no fuso local (evita o desvio de UTC). */
export function referenceDate() {
  const [y, m, d] = REFERENCE_DATE.split('-').map(Number)
  return new Date(y, m - 1, d)
}
