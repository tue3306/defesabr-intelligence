// -----------------------------------------------------------------------------
// OPÇÕES DE CONEXÃO — funções puras, testáveis sem banco.
//
// TLS. A string de conexão que o Supabase entrega não traz `sslmode`, e o `pg`
// sem `ssl` conecta em TEXTO PURO: senha e acervo atravessariam a rede abertos.
// Pôr `sslmode=require` na URL também não serve: o pg-connection-string 2.x
// trata `require` como `verify-full`, e a cadeia do Supabase não é de uma CA
// pública — a conexão falharia. Por isso o `ssl` é decidido aqui, explícito:
//
//   • host local (Docker)          → sem TLS, o contêiner não o oferece;
//   • remoto + DATABASE_CA_CERT    → TLS verificado contra a CA do Supabase;
//   • remoto sem CA                → TLS cifrado SEM verificar o servidor, com
//                                    aviso: protege de quem só escuta, não de
//                                    quem se põe no meio.
//
// PRECEDÊNCIA. O `pg` faz `Object.assign({}, config, parse(connectionString))`:
// parâmetros `ssl*` da URL SOBRESCREVEM o `ssl` explícito. Então eles são
// removidos da URL antes de chegar ao Pool — a decisão acima é a única que vale.
// -----------------------------------------------------------------------------

const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const PARAMETROS_SSL = ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslcrl']

/** Tempo máximo esperando o socket abrir: sem isso uma rede muda pendura a função até o teto da Vercel. */
const TIMEOUT_CONEXAO_MS = 5000
/**
 * Conexão ociosa sai do pool em 5 s. Na Vercel (Fluid compute) a instância é
 * congelada entre requisições; socket aberto num processo congelado morre do
 * lado do pooler e volta como erro na próxima consulta. Soltar cedo evita isso.
 */
const OCIOSA_MS = 5000

const hostDe = (url) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/**
 * Decide o TLS da conexão.
 * @param {string} url  string de conexão Postgres
 * @param {Record<string, string | undefined>} env  ambiente (process.env)
 * @returns {{ ssl: false | object, modo: 'local' | 'verificado' | 'sem-verificacao' }}
 */
export function opcoesSsl(url, env) {
  if (HOSTS_LOCAIS.has(hostDe(url))) return { ssl: false, modo: 'local' }
  // Painéis de variáveis às vezes guardam o PEM numa linha só, com `\n` literal.
  const ca = (env.DATABASE_CA_CERT || '').replace(/\\n/g, '\n').trim()
  if (ca) return { ssl: { ca, rejectUnauthorized: true }, modo: 'verificado' }
  return { ssl: { rejectUnauthorized: false }, modo: 'sem-verificacao' }
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
  }
}

/** Texto curto do modo de TLS, para o painel de status. */
export const descricaoTls = (modo) => ({
  local: 'local, sem TLS',
  verificado: 'TLS verificado',
  'sem-verificacao': 'TLS cifrado sem verificação (defina DATABASE_CA_CERT)',
}[modo] || modo)
