// -----------------------------------------------------------------------------
// OPÇÕES DE CONEXÃO — funções puras, testáveis sem banco.
//
// TLS, e por que ele NÃO é "sempre ligado".
//
// O `pg` sem a opção `ssl` conecta em TEXTO PURO, e pôr `sslmode=require` na
// string de conexão não resolve: o pg-connection-string 2.x trata `require`
// como `verify-full`, e um certificado autoassinado faria a conexão falhar.
// Então a decisão fica aqui, explícita:
//
//   • host local (Docker)            → sem TLS, o contêiner não o oferece;
//   • `*.railway.internal`           → sem TLS. É a REDE PRIVADA do projeto no
//                                      Railway: o tráfego não sai para a
//                                      internet, e a imagem de Postgres do
//                                      Railway aceita conexão simples ali. Pedir
//                                      TLS a um servidor que não o oferece dá
//                                      "the server does not support SSL
//                                      connections" e o deploy morre no boot;
//   • remoto + DATABASE_CA_CERT      → TLS verificado contra a CA informada;
//   • remoto sem CA                  → TLS cifrado SEM verificar o servidor, com
//                                      aviso: protege de quem só escuta, não de
//                                      quem se põe no meio. É o caso do acesso
//                                      pelo domínio público do Railway
//                                      (DATABASE_PUBLIC_URL) e de qualquer
//                                      Postgres gerenciado de terceiro.
//
// DATABASE_SSL força a mão quando o palpite acima estiver errado: `off`
// (desliga) ou `on` (liga). Serve a um Postgres gerenciado na rede privada que
// EXIJA TLS, e ao contrário — um host remoto que não o ofereça.
//
// PRECEDÊNCIA. O `pg` faz `Object.assign({}, config, parse(connectionString))`:
// parâmetros `ssl*` da URL SOBRESCREVEM o `ssl` explícito. Então eles são
// removidos da URL antes de chegar ao Pool — a decisão acima é a única que vale.
// -----------------------------------------------------------------------------

const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const SUFIXO_PRIVADO = '.railway.internal'
const PARAMETROS_SSL = ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslcrl']

/** Tempo máximo esperando o socket abrir, para uma rede muda não pendurar o boot. */
const TIMEOUT_CONEXAO_MS = 5000
/**
 * Conexão ociosa sai do pool em 30 s.
 *
 * Eram 5 s porque a instância serverless era congelada entre requisições e um
 * socket congelado volta como erro na consulta seguinte. Num processo longo o
 * problema é o oposto: soltar a conexão a cada 5 s faz o servidor reabrir
 * conexão (e renegociar TLS) a toda rajada de requisições. 30 s atravessa a
 * navegação de uma pessoa sem deixar conexão parada à noite.
 */
const OCIOSA_MS = 30_000

const hostDe = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/** Interpreta DATABASE_SSL. Devolve true (ligar), false (desligar) ou null (decidir pelo host). */
function forcado(valor) {
  const v = String(valor ?? '').trim().toLowerCase()
  if (!v) return null
  if (['0', 'off', 'false', 'no', 'disable', 'desligado'].includes(v)) return false
  if (['1', 'on', 'true', 'yes', 'require', 'ligado'].includes(v)) return true
  return null
}

/**
 * Decide o TLS da conexão.
 * @param {string} url  string de conexão Postgres
 * @param {Record<string, string | undefined>} env  ambiente (process.env)
 * @returns {{ ssl: false | object, modo: 'local' | 'privado' | 'desligado' | 'verificado' | 'sem-verificacao' }}
 */
export function opcoesSsl(url, env) {
  // Painéis de variáveis às vezes guardam o PEM numa linha só, com `\n` literal.
  const ca = (env.DATABASE_CA_CERT || '').replace(/\\n/g, '\n').trim()
  const comCa = () => (ca
    ? { ssl: { ca, rejectUnauthorized: true }, modo: 'verificado' }
    : { ssl: { rejectUnauthorized: false }, modo: 'sem-verificacao' })

  const escolha = forcado(env.DATABASE_SSL)
  if (escolha === false) return { ssl: false, modo: 'desligado' }
  if (escolha === true) return comCa()

  const host = hostDe(url)
  if (HOSTS_LOCAIS.has(host)) return { ssl: false, modo: 'local' }
  if (host.endsWith(SUFIXO_PRIVADO)) return { ssl: false, modo: 'privado' }
  return comCa()
}

/** Remove da URL os parâmetros `ssl*`, que o `pg` deixaria valer sobre o `ssl` explícito. */
export function semParametrosSsl(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return url
  }
  for (const p of PARAMETROS_SSL) u.searchParams.delete(p)
  return u.toString()
}

/**
 * Opções completas do `pg.Pool`.
 * @param {{ url: string, poolMax: number, env: Record<string, string | undefined> }} entrada
 */
export function opcoesDoPool({ url, poolMax, env }) {
  return {
    connectionString: semParametrosSsl(url),
    max: poolMax,
    ssl: opcoesSsl(url, env).ssl,
    connectionTimeoutMillis: TIMEOUT_CONEXAO_MS,
    idleTimeoutMillis: OCIOSA_MS,
    // Mantém o socket vivo contra equipamento de rede que corta conexão quieta.
    // Sem isto, a primeira consulta depois de um período calmo falhava com
    // "Connection terminated unexpectedly" em vez de simplesmente responder.
    keepAlive: true,
  }
}

/**
 * Opções de um `pg.Client` avulso (scripts de migração e reset), com o mesmo
 * TLS e o mesmo timeout do pool: `npm run migrate` de fora do projeto também
 * atravessa a internet, e não pode ir em texto puro.
 * @param {{ url: string, env: Record<string, string | undefined> }} entrada
 */
export function opcoesDoCliente({ url, env }) {
  return {
    connectionString: semParametrosSsl(url),
    ssl: opcoesSsl(url, env).ssl,
    connectionTimeoutMillis: TIMEOUT_CONEXAO_MS,
  }
}

/** Texto curto do modo de TLS, para o painel de status. */
export const descricaoTls = (modo) => ({
  local: 'local, sem TLS',
  privado: 'rede privada do projeto, sem TLS',
  desligado: 'sem TLS (DATABASE_SSL=off)',
  verificado: 'TLS verificado',
  'sem-verificacao': 'TLS cifrado sem verificação (defina DATABASE_CA_CERT)',
}[modo] || modo)
