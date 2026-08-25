// -----------------------------------------------------------------------------
// CONFIGURAÇÃO DA CAMADA DE DADOS
//
// A plataforma tem HOJE apenas o front-end. Toda leitura passa por
// `src/services/*`, que resolve os dados de duas formas possíveis:
//
//   DATA_MODE = 'mock'  → repositórios locais (src/data/*), com latência
//                         simulada. É o modo de demonstração.
//   DATA_MODE = 'api'   → HTTP contra VITE_API_BASE_URL, mesmos contratos.
//
// Trocar o backend é, portanto, mudar UMA variável de ambiente — nenhum
// componente da interface conhece a origem do dado.
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
