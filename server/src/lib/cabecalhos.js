// -----------------------------------------------------------------------------
// CABEÇALHOS DE SEGURANÇA — fonte única
//
// Duas camadas os aplicam: o Express (API e `npm start`) e o `vercel.json` (CDN,
// que serve o front sem passar pela função). JSON não importa JS, então o
// `vercel.json` repete estes valores e `test/vercel.test.js` falha se divergirem.
//
// A CSP lista exatamente o que a interface carrega de fora — as fontes do Google
// e o atlas de países do jsDelivr, que o mapa busca por `fetch` — e mais nada:
// nenhum script de terceiro roda nesta origem, que é onde mora o token de
// sessão. `'unsafe-inline'` vale só para ESTILO: gráficos e animações escrevem
// `style=` no elemento.
// -----------------------------------------------------------------------------

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://cdn.jsdelivr.net",
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
