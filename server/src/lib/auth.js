import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'
import config from '../config.js'

// -----------------------------------------------------------------------------
// AUTENTICAÇÃO
//
// Até aqui os quatro perfis eram verificados só no navegador: trocar de perfil
// mudava o que a interface mostrava, e a API atendia qualquer requisição sem
// perguntar quem chamava. Esconder um menu não é controle de acesso — quem
// soubesse o endereço do endpoint entrava.
//
// Este módulo é o mínimo para que a diferença entre Usuário, Analista e
// Administrador seja verificada no SERVIDOR, sem dependência externa:
//
//   senha    scrypt com sal por conta (node:crypto)
//   sessão   token assinado com HMAC-SHA256, contendo id, papel e validade
//
// Por que token assinado e não sessão em memória: o Railway reinicia o
// contêiner a cada deploy, e sessão em memória some junto. Um token assinado é
// verificável sem estado — o servidor confere a assinatura e a validade.
//
// O QUE ISTO NÃO É: não há recuperação de senha, verificação de e-mail, nem
// revogação de token antes do vencimento. São coisas necessárias num produto
// real, e a ausência está declarada no painel de saúde em vez de simulada.
// -----------------------------------------------------------------------------

const ALGORITMO_SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

/** Gera sal e derivação da senha. Nunca guarde a senha em texto. */
export function hashSenha(senha, salExistente) {
  const sal = salExistente || randomBytes(16).toString('hex')
  const hash = scryptSync(senha, sal, ALGORITMO_SCRYPT.keylen, ALGORITMO_SCRYPT).toString('hex')
  return { sal, hash }
}

/**
 * Compara em tempo constante.
 *
 * Uma comparação com `===` vaza informação pelo TEMPO: ela retorna mais cedo
 * no primeiro byte diferente, e medir isso permite descobrir o hash byte a
 * byte. `timingSafeEqual` sempre percorre o buffer inteiro.
 */
export function senhaConfere(senha, sal, hashEsperado) {
  const { hash } = hashSenha(senha, sal)
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(hashEsperado, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const base64url = (buf) => Buffer.from(buf).toString('base64url')

function assinar(payloadB64) {
  return createHmac('sha256', config.auth.segredo).update(payloadB64).digest('base64url')
}

/**
 * Emite um token para a conta.
 *
 * Formato: `<payload em base64url>.<assinatura>`. O payload é legível por
 * qualquer um — e deve ser: ele não guarda segredo, só id, papel, plano e
 * vencimento. O que impede forjar um papel de administrador é a assinatura,
 * que exige o segredo do servidor.
 */
export function emitirToken(conta) {
  const payload = {
    sub: conta.id,
    name: conta.name,
    email: conta.email,
    role: conta.role,
    plan: conta.plan,
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

/** Papéis que herdam as capacidades dos anteriores. */
const HIERARQUIA = { user: 1, analyst: 2, admin: 3 }

/**
 * Middleware: lê o token do cabeçalho e põe a conta em `req.conta`.
 *
 * Não bloqueia — rotas públicas continuam públicas. Quem exige papel usa
 * `exigirPapel` abaixo.
 */
export function lerConta(req, _res, next) {
  const cabecalho = req.headers.authorization || ''
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null
  req.conta = token ? lerToken(token) : null
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
