import { randomBytes, scrypt, timingSafeEqual, createHmac } from 'node:crypto'
import { promisify } from 'node:util'
import config from '../config.js'
import { resolverSegredo } from './segredo.js'
import { get } from '../db/index.js'

// -----------------------------------------------------------------------------
// AUTENTICAÇÃO
//
// Até aqui os perfis eram verificados só no navegador: trocar de perfil
// mudava o que a interface mostrava, e a API atendia qualquer requisição sem
// perguntar quem chamava. Esconder um menu não é controle de acesso — quem
// soubesse o endereço do endpoint entrava.
//
// Este módulo é o mínimo para que a diferença entre Usuário e Administrador
// seja verificada no SERVIDOR, sem dependência externa:
//
//   senha    scrypt com sal por conta (node:crypto)
//   sessão   token assinado com HMAC-SHA256, contendo id, papel e validade
//
// Por que token assinado e não sessão em memória: o Railway reinicia o
// contêiner a cada deploy, e sessão em memória some junto. Um token assinado é
// verificável sem estado — o servidor confere a assinatura e a validade.
//
// O QUE ISTO NÃO É: não há recuperação de senha nem verificação de e-mail —
// as duas dependem de envio de mensagem, que a instalação não tem. A revogação
// antes do vencimento existe: ver `lerConta` e a coluna `sessoes_desde`.
// -----------------------------------------------------------------------------

const ALGORITMO_SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

// scrypt é caro DE PROPÓSITO: 26 ms medidos por derivação, que é o que torna
// uma tabela de senhas inviável de atacar. O problema não era o custo, era a
// versão: `scryptSync` gasta esses 26 ms DENTRO do event loop, e o Node tem um
// só. Cerca de 39 logins por segundo bastavam para o servidor parar de
// responder a tudo — inclusive a `/api/health`, o que faz o Railway concluir
// que a aplicação morreu e reiniciar o contêiner. Derrubar a plataforma não
// exigia exploit nenhum, só um laço de shell.
//
// A versão assíncrona faz a mesma conta no pool de threads do libuv. O event
// loop segue atendendo enquanto ela roda, e o teto por IP em `lib/limite.js`
// cuida do abuso.
const derivar = promisify(scrypt)

/** Gera sal e derivação da senha. Nunca guarde a senha em texto. */
export async function hashSenha(senha, salExistente) {
  const sal = salExistente || randomBytes(16).toString('hex')
  const bruto = await derivar(senha, sal, ALGORITMO_SCRYPT.keylen, ALGORITMO_SCRYPT)
  return { sal, hash: bruto.toString('hex') }
}

/**
 * Compara em tempo constante.
 *
 * Uma comparação com `===` vaza informação pelo TEMPO: ela retorna mais cedo
 * no primeiro byte diferente, e medir isso permite descobrir o hash byte a
 * byte. `timingSafeEqual` sempre percorre o buffer inteiro.
 */
export async function senhaConfere(senha, sal, hashEsperado) {
  const { hash } = await hashSenha(senha, sal)
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(hashEsperado, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const base64url = (buf) => Buffer.from(buf).toString('base64url')

// O segredo e resolvido UMA VEZ, na primeira assinatura, e nao na carga do
// modulo: `resolverSegredo()` toca o banco, e o banco so existe depois de
// `migrate()`. Resolver no topo do arquivo criaria uma ordem de importacao
// fragil — o tipo de dependencia implicita que este projeto ja pagou caro.
let cache = null
export function segredoDaSessao() {
  if (!cache) cache = resolverSegredo()
  return cache
}

function assinar(payloadB64) {
  return createHmac('sha256', segredoDaSessao().segredo).update(payloadB64).digest('base64url')
}

/**
 * Emite um token para a conta.
 *
 * Formato: `<payload em base64url>.<assinatura>`. O payload é legível por
 * qualquer um — e deve ser: ele não guarda segredo, só id, nome, papel e
 * vencimento. O que impede forjar um papel de administrador é a assinatura,
 * que exige o segredo do servidor.
 */
export function emitirToken(conta) {
  const payload = {
    sub: conta.id,
    name: conta.name,
    email: conta.email,
    role: conta.role,
    // Emissão: comparada com `sessoes_desde` para revogar tokens antigos.
    iat: Date.now(),
    exp: Date.now() + config.auth.duracaoHoras * 3600_000,
  }
  const corpo = base64url(JSON.stringify(payload))
  return `${corpo}.${assinar(corpo)}`
}

/**
 * Valida um token e devolve o payload, ou `null`.
 *
 * Devolve null para tudo — formato errado, assinatura inválida, vencido. Quem
 * chama não precisa saber qual dos três foi, e dizer isso a um cliente não
 * autenticado só ajuda quem está tentando adivinhar.
 */
export function lerToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [corpo, assinatura] = token.split('.')
  if (!corpo || !assinatura) return null

  const esperada = assinar(corpo)
  const a = Buffer.from(assinatura)
  const b = Buffer.from(esperada)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'))
    if (!payload?.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Papéis que herdam as capacidades dos anteriores.
 *
 * Eram três, com `analyst` no meio. Nenhuma conta chegava a ele — a instalação
 * semeia usuário e administrador, o cadastro cria usuário e a governança só
 * atribui esses dois —, e o que ele guardava (fontes, execuções, método do
 * filtro) é operação da instalação. Papel intermediário sem ninguém dentro só
 * multiplica os casos a conferir.
 */
const HIERARQUIA = { user: 1, admin: 2 }

/**
 * Middleware: lê o token do cabeçalho e põe a conta em `req.conta`.
 *
 * Não bloqueia — rotas públicas continuam públicas. Quem exige papel usa
 * `exigirPapel` abaixo.
 */
export function lerConta(req, _res, next) {
  const cabecalho = req.headers.authorization || ''
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null
  const payload = token ? lerToken(token) : null

  // ───────────────────────────────────────────────────────────────────────────
  // O TOKEN PROVA QUEM É. O BANCO DIZ O QUE ESSA PESSOA PODE AGORA.
  //
  // Esta função confiava no papel gravado DENTRO do token. A assinatura
  // garante que o token não foi forjado — mas não que ele continua valendo:
  // ela diz o que era verdade quando ele foi emitido, e ele vale doze horas.
  //
  // O efeito era que nenhuma decisão de governança tinha efeito imediato.
  // Rebaixar um administrador deixava a pessoa administrando até o token
  // vencer. Suspender ou excluir uma conta não fazia nada — o token continuava
  // abrindo todas as rotas que abria antes.
  //
  // Agora o token identifica, e o banco autoriza. Uma leitura por chave
  // primária no SQLite por requisição, que é o preço de uma revogação que
  // funciona. Conta inexistente ou suspensa vira ausência de sessão: 401, e o
  // navegador desconecta.
  // ───────────────────────────────────────────────────────────────────────────
  if (!payload) {
    req.conta = null
    return next()
  }

  let atual = null
  try {
    atual = get('SELECT name, role, status, sessoes_desde FROM users WHERE id = ?', [payload.sub])
  } catch {
    atual = null
  }

  // Token emitido antes do marco de revogação — troca de senha ou "encerrar
  // as outras sessões" — deixa de valer, mesmo com assinatura e prazo em dia.
  const revogado = atual?.sessoes_desde && (payload.iat || 0) < atual.sessoes_desde

  req.conta = atual && (atual.status || 'ativo') === 'ativo' && !revogado
    ? { ...payload, role: atual.role, name: atual.name }
    : null
  next()
}

/**
 * Middleware: exige papel mínimo.
 *
 * 401 quando não há sessão, 403 quando há sessão sem o papel — a distinção
 * importa para a interface saber se pede login ou explica a restrição.
 */
export function exigirPapel(papelMinimo) {
  const minimo = HIERARQUIA[papelMinimo] || 1
  return (req, res, next) => {
    if (!req.conta) {
      return res.status(401).json({
        error: 'Esta consulta exige uma sessão. Entre na plataforma.',
        code: 'SEM_SESSAO',
      })
    }
    if ((HIERARQUIA[req.conta.role] || 0) < minimo) {
      return res.status(403).json({
        error: `Esta consulta exige o perfil ${papelMinimo}. O seu é ${req.conta.role}.`,
        code: 'PAPEL_INSUFICIENTE',
        papelNecessario: papelMinimo,
        papelAtual: req.conta.role,
      })
    }
    next()
  }
}

export default { hashSenha, senhaConfere, emitirToken, lerToken, lerConta, exigirPapel }
