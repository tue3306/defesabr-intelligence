import { get, run } from '../db/index.js'
import { cifrar, decifrar } from './segredoGuardado.js'

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
// TRÊS ORIGENS, E A PRECEDÊNCIA É DA MAIS ESPECÍFICA PARA A MAIS GERAL
//
//   1. A CONTA (`users.ia_api_key`, cifrada). Quem usa traz a própria chave e
//      paga o próprio consumo. É o caminho principal: numa instalação com
//      várias pessoas, a alternativa seria o dono bancar o uso de todas.
//
//   2. AMBIENTE (`ANTHROPIC_API_KEY`). A chave da instalação, para quem quer
//      oferecer o recurso a quem não tem chave própria. É como se configura em
//      produção — Railway, Docker — e nunca toca o disco da aplicação.
//
//   3. BANCO (`app_config`). A mesma ideia da anterior, para quem prefere
//      configurar pela tela sem redeploy. Vale só quando não há variável de
//      ambiente: deixar a tela sobrescrever o que o operador fixou por fora
//      produziria uma configuração que a tela mostra e o servidor ignora.
//
// A CONTA VEM ANTES DA INSTALAÇÃO porque é a escolha explícita de quem está
// usando. Quem colou a própria chave espera que ela seja a usada — e espera
// ver o gasto na própria fatura, não na de outra pessoa.
//
// A chave NUNCA volta ao cliente, em nenhuma das três. As rotas devolvem se
// existe, de onde veio e os quatro últimos caracteres — o suficiente para
// conferir qual está em uso, e insuficiente para usá-la.
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

/** A chave e o modelo que a conta guardou, se guardou. */
function daConta(userId) {
  if (!userId) return { chave: null, modelo: null }
  try {
    const u = get('SELECT ia_api_key, ia_modelo FROM users WHERE id = ?', [userId])
    return {
      // `decifrar` devolve null quando o segredo da instalação mudou — para
      // quem usa, é como se a chave nunca tivesse sido configurada, e a tela
      // pede outra. É a única recuperação possível, e a correta.
      chave: decifrar(u?.ia_api_key) || null,
      modelo: u?.ia_modelo || null,
    }
  } catch {
    // Banco sem as colunas ainda (primeiro boot antes da migração).
    return { chave: null, modelo: null }
  }
}

/**
 * A configuração de IA em vigor para quem está pedindo.
 *
 * @param {number|null} userId  a conta da sessão; sem ela, só a instalação vale
 * @returns {{ chave: string|null, origem: 'conta'|'ambiente'|'banco'|null,
 *             modelo: string, configurada: boolean, finalDaChave: string|null,
 *             daInstalacao: boolean }}
 */
export function configIa(userId = null) {
  const conta = daConta(userId)
  const doAmbiente = (process.env.ANTHROPIC_API_KEY || '').trim()
  const doBanco = (lerConfig(CHAVE_API) || '').trim()

  const chave = conta.chave || doAmbiente || doBanco || null
  const origem = conta.chave ? 'conta' : (doAmbiente ? 'ambiente' : (doBanco ? 'banco' : null))

  const modelo = conta.modelo
    || (process.env.ANTHROPIC_MODEL || '').trim()
    || lerConfig(CHAVE_MODELO)
    || MODELO_PADRAO

  return {
    chave,
    origem,
    modelo,
    configurada: !!chave,
    // Só o suficiente para a pessoa conferir QUAL chave está em uso.
    finalDaChave: chave ? `…${chave.slice(-4)}` : null,
    // A tela usa isto para dizer "você está usando a chave da instalação" —
    // que muda quem paga a conta, e é informação que a pessoa merece ter.
    daInstalacao: !conta.chave && !!chave,
    // Existe chave da instalação? A tela oferece "usar a da instalação" como
    // alternativa a colar a própria.
    instalacaoTemChave: !!(doAmbiente || doBanco),
  }
}

/** Grava a chave DA CONTA, cifrada. */
export function salvarChaveDaConta(userId, valor) {
  const limpa = String(valor || '').trim()
  if (!RX_CHAVE.test(limpa)) {
    return { ok: false, erro: 'Formato inesperado. Uma chave da Anthropic começa com "sk-ant-".' }
  }
  run('UPDATE users SET ia_api_key = ? WHERE id = ?', [cifrar(limpa), userId])
  return { ok: true }
}

/** Remove a chave da conta. A da instalação, se houver, volta a valer. */
export function removerChaveDaConta(userId) {
  run('UPDATE users SET ia_api_key = NULL WHERE id = ?', [userId])
  return { ok: true }
}

/** Modelo escolhido pela conta. Vazio volta a herdar o da instalação. */
export function salvarModeloDaConta(userId, valor) {
  const limpo = String(valor || '').trim()
  if (limpo && !/^[a-z0-9.-]{3,64}$/i.test(limpo)) {
    return { ok: false, erro: 'Nome de modelo inválido.' }
  }
  run('UPDATE users SET ia_modelo = ? WHERE id = ?', [limpo || null, userId])
  return { ok: true }
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

export default {
  configIa, salvarChave, removerChave, salvarModelo,
  salvarChaveDaConta, removerChaveDaConta, salvarModeloDaConta,
  MODELO_PADRAO,
}
