// -----------------------------------------------------------------------------
// CABEÇALHOS DE SEGURANÇA — fonte única
//
// Uma camada só os aplica: o Express, que serve a API E o front compilado. Não
// há CDN nem arquivo de configuração de plataforma repetindo estes valores —
// eram duas cópias que podiam divergir, e um teste existia só para guardar a
// igualdade. `test/cabecalhos.test.js` agora confere a resposta de verdade.
//
// A CSP não libera nenhuma origem de fora: fontes e atlas de países são
// servidos pelo próprio site. Nenhum script de terceiro roda nesta origem, que
// é onde mora o token de sessão. `'unsafe-inline'` vale só para ESTILO: gráficos e animações escrevem
// `style=` no elemento.
// -----------------------------------------------------------------------------

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

/** Cabeçalhos que só fazem sentido com HTTPS e sem o Vite de desenvolvimento. */
export const CABECALHOS_SO_PRODUCAO = ['Content-Security-Policy', 'Strict-Transport-Security']

export const CABECALHOS_SEGURANCA = [
  { key: 'Content-Security-Policy', value: CSP },
  // Impede o navegador de tentar HTTP de novo nos próximos 180 dias.
  { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
  // Impede o navegador de "adivinhar" o tipo de um arquivo servido.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Sem isto a plataforma pode ser embutida num iframe e ter cliques sequestrados.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Não vaza o caminho interno visitado para sites externos.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nada aqui usa câmera, microfone ou localização.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
