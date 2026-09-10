import { get, run } from '../db/index.js'

// -----------------------------------------------------------------------------
// A CHAVE DO MODELO DE LINGUAGEM
//
// Este projeto é de código aberto e é hospedado por quem o usa. A chave da API
// é, portanto, de quem hospeda — e o lugar dela é o servidor daquela pessoa,
// nunca o navegador de quem consulta.
//
// ─────────────────────────────────────────────────────────────────────────────
// JÁ HOUVE UM CAMPO DE CHAVE NA TELA DE CONFIGURAÇÕES, E ELE ERA O ERRO
//
// Ele guardava a chave em texto puro no `localStorage`, de onde qualquer
// extensão do navegador a lê, e a mandava direto do front para a API do
// provedor — o que também expõe a chave a qualquer pessoa com o DevTools
// aberto. Foi removido, e a tela passou a explicar por que não havia campo.
//
// Esta é a metade que faltava, feita como o próprio projeto se comprometeu em
// ROADMAP.md: "a chave viverá apenas no servidor e o front chamará um endpoint
// próprio, que autentica quem pede e registra o consumo".
//
// ─────────────────────────────────────────────────────────────────────────────
// DUAS ORIGENS, E A PRECEDÊNCIA IMPORTA
//
//   1. AMBIENTE (`ANTHROPIC_API_KEY`). É como se configura em produção —
//      Railway, Docker, systemd. Nunca toca o disco da aplicação e não aparece
//      em backup do banco.
//
//   2. BANCO (`app_config`). Para quem subiu a instância e prefere configurar
//      pela tela, sem redeploy. Vale só quando não há variável de ambiente:
//      o ambiente é a fonte mais forte, e deixar a tela sobrescrevê-lo
//      permitiria mudar por dentro o que o operador fixou por fora.
//
// A chave NUNCA volta ao cliente. As rotas devolvem se existe, de onde veio e
// os quatro últimos caracteres — o suficiente para conferir qual chave está em
// uso, e insuficiente para usá-la.
// -----------------------------------------------------------------------------

const CHAVE_API = 'ia_api_key'
const CHAVE_MODELO = 'ia_modelo'

/**
 * Modelo padrão.
 *
 * Escolhido por ser o equilíbrio entre custo e qualidade para resumo e
 * classificação — que é todo o uso que esta plataforma faz. Quem hospeda pode
 * trocar pela tela ou por `ANTHROPIC_MODEL`.
 */
export const MODELO_PADRAO = 'claude-sonnet-5'

/** Formato plausível de uma chave da Anthropic. Não valida, só evita engano. */
const RX_CHAVE = /^sk-ant-[A-Za-z0-9_-]{20,}$/

const lerConfig = (chave) => {
  try {
    return get('SELECT valor FROM app_config WHERE chave = ?', [chave])?.valor || null
  } catch {
    // Banco ainda não migrado (primeiro boot). Ausência de chave é um estado
    // válido, não um erro: quem chama trata `configurada: false`.
    return null
  }
}

/**
 * A configuração de IA em vigor.
 *
 * @returns {{ chave: string|null, origem: 'ambiente'|'banco'|null, modelo: string,
 *             configurada: boolean, finalDaChave: string|null }}
 */
export function configIa() {
  const doAmbiente = (process.env.ANTHROPIC_API_KEY || '').trim()
  const doBanco = (lerConfig(CHAVE_API) || '').trim()
  const chave = doAmbiente || doBanco || null
  const origem = doAmbiente ? 'ambiente' : (doBanco ? 'banco' : null)

  const modelo = (process.env.ANTHROPIC_MODEL || '').trim()
    || lerConfig(CHAVE_MODELO)
    || MODELO_PADRAO

  return {
    chave,
    origem,
    modelo,
    configurada: !!chave,
    // Só o suficiente para a pessoa conferir QUAL chave está em uso.
    finalDaChave: chave ? `…${chave.slice(-4)}` : null,
  }
}

/**
 * Grava a chave no banco desta instalação.
 *
 * Recusa quando o ambiente já define uma: sobrescrever por dentro o que o
 * operador fixou por fora produz uma configuração que a tela mostra e o
 * servidor ignora — o pior tipo de divergência, porque é silenciosa.
 */
export function salvarChave(valor) {
  if (process.env.ANTHROPIC_API_KEY) {
    return { ok: false, erro: 'A chave está definida por variável de ambiente e tem precedência. Remova ANTHROPIC_API_KEY para configurá-la por aqui.' }
  }
  const limpa = String(valor || '').trim()
  if (!RX_CHAVE.test(limpa)) {
    return { ok: false, erro: 'Formato inesperado. Uma chave da Anthropic começa com "sk-ant-".' }
  }
  run('INSERT OR REPLACE INTO app_config (chave, valor) VALUES (?, ?)', [CHAVE_API, limpa])
  return { ok: true }
}

/** Remove a chave gravada. O ambiente, se houver, continua valendo. */
export function removerChave() {
  run('DELETE FROM app_config WHERE chave = ?', [CHAVE_API])
  return { ok: true }
}

/** Troca o modelo usado. Sem validação de existência: quem hospeda sabe qual quer. */
export function salvarModelo(valor) {
  const limpo = String(valor || '').trim()
  if (!limpo) {
    run('DELETE FROM app_config WHERE chave = ?', [CHAVE_MODELO])
    return { ok: true, modelo: MODELO_PADRAO }
  }
  if (!/^[a-z0-9.-]{3,64}$/i.test(limpo)) {
    return { ok: false, erro: 'Nome de modelo inválido.' }
  }
  run('INSERT OR REPLACE INTO app_config (chave, valor) VALUES (?, ?)', [CHAVE_MODELO, limpo])
  return { ok: true, modelo: limpo }
}

export default { configIa, salvarChave, removerChave, salvarModelo, MODELO_PADRAO }
