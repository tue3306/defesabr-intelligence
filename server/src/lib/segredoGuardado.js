import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { resolverSegredo } from './segredo.js'

// -----------------------------------------------------------------------------
// GUARDAR UM SEGREDO DE OUTRA PESSOA
//
// A chave de API que alguém cola aqui é dinheiro: quem a tiver gasta na conta
// dela. Guardá-la em texto puro numa coluna significa que qualquer cópia do
// banco — um backup, um dump de suporte, um volume esquecido — entrega a chave
// de todo mundo de uma vez.
//
// AES-256-GCM com chave derivada do segredo da instalação. O GCM autentica além
// de cifrar: um valor adulterado no banco falha a verificação em vez de
// decifrar em lixo silencioso.
//
// ─────────────────────────────────────────────────────────────────────────────
// O QUE ISTO PROTEGE, E O QUE NÃO PROTEGE — porque a diferença importa
//
// PROTEGE contra o banco vazar sozinho: backup, volume, cópia de disco, um
// `SELECT` de alguém com acesso ao SQLite e nada mais. É o cenário comum.
//
// NÃO PROTEGE contra quem já tem o servidor. A chave de cifra é derivada do
// mesmo `AUTH_SECRET` que o processo precisa ter em memória para funcionar —
// quem executa código ali dentro alcança as duas coisas. Cifrar não vira
// cofre; vira uma camada a menos de exposição acidental.
//
// Fingir o contrário seria o mesmo erro que esta plataforma combate nos dados:
// um selo de segurança que promete mais do que entrega.
//
// ─────────────────────────────────────────────────────────────────────────────
// A ROTAÇÃO DO SEGREDO INVALIDA O QUE FOI GUARDADO, E ISSO É TRATADO
//
// Trocar `AUTH_SECRET` muda a chave derivada, e o que estava cifrado deixa de
// abrir. `decifrar()` devolve `null` nesse caso, em vez de lançar: para quem
// usa, é como se a chave nunca tivesse sido configurada — a tela pede de novo,
// que é a recuperação correta e a única possível.
// -----------------------------------------------------------------------------

const ALGORITMO = 'aes-256-gcm'
const TAMANHO_IV = 12
const TAMANHO_TAG = 16

/**
 * A chave de cifra, derivada uma vez por processo.
 *
 * `scrypt` é caro de propósito, e o custo é pago no primeiro uso — não a cada
 * leitura. O sal é fixo e público: ele não protege contra dicionário aqui (o
 * segredo já tem 256 bits de entropia), só separa esta derivação de qualquer
 * outra que use o mesmo segredo.
 */
let chaveCache = null
function chave() {
  if (!chaveCache) {
    chaveCache = scryptSync(resolverSegredo().segredo, 'defesabr:segredo-guardado:v1', 32)
  }
  return chaveCache
}

/**
 * Cifra um valor. Devolve `iv.tag.texto`, tudo em base64url.
 *
 * O IV é sorteado por gravação — reutilizá-lo em GCM quebra a cifra por
 * completo, e é o erro clássico de quem guarda o IV junto do código.
 */
export function cifrar(valor) {
  const texto = String(valor ?? '')
  if (!texto) return null
  const iv = randomBytes(TAMANHO_IV)
  const c = createCipheriv(ALGORITMO, chave(), iv)
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  const tag = c.getAuthTag()
  return [iv, tag, dados].map((b) => b.toString('base64url')).join('.')
}

/**
 * Decifra. Devolve `null` para qualquer falha — formato inesperado, segredo
 * trocado, valor adulterado.
 *
 * Não distingue os casos de propósito: para quem chama, todos significam "não
 * há chave utilizável", e a resposta é a mesma. Distinguir só serviria para
 * quem estivesse tentando descobrir se um valor foi adulterado.
 */
export function decifrar(guardado) {
  if (!guardado || typeof guardado !== 'string') return null
  const partes = guardado.split('.')
  if (partes.length !== 3) return null
  try {
    const [iv, tag, dados] = partes.map((p) => Buffer.from(p, 'base64url'))
    if (iv.length !== TAMANHO_IV || tag.length !== TAMANHO_TAG) return null
    const d = createDecipheriv(ALGORITMO, chave(), iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(dados), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

export default { cifrar, decifrar }
