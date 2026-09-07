// -----------------------------------------------------------------------------
// CONFIGURAÇÃO DA CAMADA DE DADOS
//
// Há UM caminho de dados, e é a API. Toda leitura passa por
// `src/services/client.js`, que resolve pela ponte (`apiBridge.js`) quando o
// endpoint está mapeado e por HTTP direto quando não está. Se a API não
// responde, a consulta FALHA e a tela mostra erro — nenhum número aparece sem
// ter vindo de uma fonte.
//
// O QUE ESTE ARQUIVO DIZIA ATÉ AGORA, E POR QUE FOI REESCRITO
//
// O cabeçalho descrevia três caminhos, e o segundo e o terceiro eram
// "endpoint sem backend → src/data (meta.source = 'demo')" e "API caiu no
// meio → src/data (meta.source = 'fallback')". Isso deixou de ser verdade
// quando os resolvedores locais saíram: `viaPonte` lança, e não há reserva
// escrita à mão para cair.
//
// Junto do texto ficaram cinco exportações órfãs — `DATA_MODE`, `isDemoMode`,
// `MOCK_LATENCY`, `REFERENCE_DATE` e `referenceDate()` —, nenhuma importada
// por arquivo nenhum. `REFERENCE_DATE` era a mais perigosa das cinco: fixava
// 2026-08-24 como "hoje" para manter a coerência de um acervo demonstrativo
// que não existe mais. Bastava alguém reencontrá-la e usá-la achando que era
// a data de referência do produto para o painel inteiro congelar num dia
// arbitrário do passado.
//
// Documentação obsoleta não é neutra: num projeto cuja regra número um é não
// exibir dado inventado, um arquivo de configuração que descreve como cair
// para dados escritos à mão é um convite a reintroduzi-los.
// -----------------------------------------------------------------------------

const env = import.meta.env || {}

/**
 * Base da API.
 *
 * Vazio é o normal e o recomendado: o caminho relativo `/api` é encaminhado
 * pelo Vite em desenvolvimento e atendido pelo próprio servidor em produção —
 * mesma origem, nenhum CORS no caminho. Só se define quando o front é servido
 * separado da API.
 */
export const API_BASE_URL = (env.VITE_API_BASE_URL || '').replace(/\/$/, '')

/** Identidade da aplicação (exibida em rodapés, PDFs e cabeçalhos HTTP). */
export const APP_NAME = env.VITE_APP_NAME || 'DefesaBR Intelligence'

// A versao vinha fixa em '1.0.0' enquanto o package.json ja marcava 2.0.0 e a
// API respondia "versao":"2.0.0" — a interface se apresentava como uma versao
// que nao era a dela, inclusive no cabecalho X-Client-Version enviado ao
// servidor. `__APP_VERSION__` e injetado pelo Vite a partir do package.json
// (ver vite.config.js), entao passa a ser impossivel divergir.
export const APP_VERSION = env.VITE_APP_VERSION
  || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0')

/** Timeout padrão das requisições (ms). */
export const REQUEST_TIMEOUT = Number(env.VITE_API_TIMEOUT || 12000)

/** Chave de persistência dos ajustes (usada também fora do store). */
export const SETTINGS_STORAGE_KEY = 'defesabr-settings-v3'
