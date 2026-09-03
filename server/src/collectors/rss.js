import { all, get, run, insert, agora, transacao } from '../db/index.js'
import { buscarTexto } from '../lib/fetcher.js'
import { parseFeed } from '../lib/feedParser.js'
import { avaliarRelevancia, classificar, limparRodape, chaveDeTitulo } from '../lib/relevance.js'

// -----------------------------------------------------------------------------
// COLETA DE NOTÍCIAS (RSS)
//
// Roda no SERVIDOR, e é isso que a torna real: não há CORS no caminho, nem
// proxy de terceiro (rss2json e afins), nem chave de API. O servidor busca o
// XML direto de quem publica.
//
// Cada execução grava o que aconteceu na própria linha da fonte. Uma fonte que
// quebrou não avisa sozinha — ela apenas para de contribuir, e o acervo encolhe
// sem que ninguém perceba. O painel de status existe por causa disso.
// -----------------------------------------------------------------------------

/**
 * Fontes semeadas. Todas VERIFICADAS contra o feed real antes de entrar aqui.
 *
 * A lista começou maior. Ficaram de fora, e o motivo está registrado porque
 * senão alguém as recadastra achando que foi esquecimento:
 *
 *   STF ................. o feed em noticias.stf.jus.br/rss responde 202 com
 *                         HTML de desafio anti-robô. Respondeu XML uma vez e
 *                         passou a desafiar em seguida — é proteção de bot,
 *                         não indisponibilidade. Contorná-la seria evasão de
 *                         detecção, não coleta
 *   STJ ................. HTTP 403 em todos os caminhos testados, inclusive a
 *                         home; o portal recusa cliente automatizado
 *   CNJ ................. 200 com HTML de desafio, mesmo caso do STF
 *   Poder360 ............ HTTP 403 a cliente automatizado
 *   Marinha do Brasil ... HTTP 403
 *   FAB ................. HTTP 403
 *   Exército Brasileiro . HTTP 404 (não publica RSS)
 *   Câmara dos Deputados  200 com zero <item>; o portal mudou e o RSS ficou
 *                         vazio. As proposições vêm da API de Dados Abertos,
 *                         que funciona (server/src/collectors/camara.js)
 *
 * Cadastrá-las encheria o painel de governança de erro permanente que ninguém
 * pode consertar — e erro que não se pode consertar vira erro que se ignora.
 *
 * DUAS FONTES QUE FUNCIONAM AQUI E NÃO NO SERVIDOR
 *
 * Os dois feeds do Google Notícias respondem normalmente de uma máquina
 * doméstica e devolvem HTTP 503 quando pedidos de dentro do Railway. Não é
 * intermitência: é o Google recusando IP de datacenter, e o mesmo pedido
 * repetido também recebe 503. Contornar exigiria disfarçar a origem, o que é
 * evasão de detecção e não coleta.
 *
 * O Defesa Aérea & Naval entrou depois e caiu no mesmo caso: HTTP 403 de
 * dentro do Railway, 200 daqui. São TRÊS fontes com esse comportamento.
 *
 * Ficam cadastradas de propósito. Em desenvolvimento contribuem bastante — os
 * agregadores varrem a imprensa inteira em vez de um veículo só, e o Defesa
 * Aérea & Naval é especializado —, e em produção o painel as mostra em
 * vermelho com o código real. Um erro explicado no código é diferente de um
 * erro que ninguém entende: quem abrir o painel e vir 47 de 50 tem, aqui, a
 * resposta do porquê.
 *
 * SOBRE O CAMINHO `/RSS` DA RAIZ DO GOV.BR
 *
 * Polícia Federal, Ministério da Justiça, GSI, Defesa Civil, ABIN e Itamaraty
 * desativaram o RSS da PASTA de notícias (404 ou 200 vazio), mas mantêm o feed
 * da RAIZ do portal — `https://www.gov.br/<órgão>/RSS`, 15 itens, ao vivo.
 *
 * Esse feed não é de notícias: é o "modificado recentemente" do Plone, e traz
 * anexo junto com matéria — "Resultado Final.pdf", "WhatsApp Image ....jpeg",
 * "Nota de Empenho nº 214/2026". Guardar isso como notícia seria pior do que
 * não coletar: o acervo passaria a exibir nomes de arquivo como manchete.
 * Por isso `ehAnexo()` descarta esses itens antes de qualquer avaliação.
 */
export const FONTES_PADRAO = [
  {
    slug: 'ministerio-defesa',
    name: 'Ministério da Defesa',
    url: 'https://www.gov.br/defesa/pt-br/centrais-de-conteudo/noticias/RSS',
    site_url: 'https://www.gov.br/defesa',
    category: 'Oficial',
  },
  {
    slug: 'agencia-gov',
    name: 'Agência Gov (EBC)',
    url: 'https://agenciagov.ebc.com.br/rss.xml',
    site_url: 'https://agenciagov.ebc.com.br',
    category: 'Oficial',
  },
  {
    slug: 'abr-politica',
    name: 'Agência Brasil — Política',
    url: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    slug: 'abr-justica',
    name: 'Agência Brasil — Justiça e Segurança',
    url: 'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    slug: 'abr-internacional',
    name: 'Agência Brasil — Internacional',
    url: 'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    slug: 'abr-economia',
    name: 'Agência Brasil — Economia',
    url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    slug: 'abr-geral',
    name: 'Agência Brasil — Geral',
    url: 'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },
  {
    // Senado: onde a pauta legislativa de defesa aparece ANTES de virar norma.
    // Complementa o coletor da Câmara, que vê a proposição mas não o debate.
    slug: 'senado-noticias',
    name: 'Senado Federal — Notícias',
    url: 'https://www12.senado.leg.br/noticias/rss',
    site_url: 'https://www12.senado.leg.br/noticias',
    category: 'Legislativo',
  },
  {
    // Planalto: decretos, vetos, sanções e viagens presidenciais — a camada de
    // decisão que os feeds ministeriais só refletem depois.
    slug: 'planalto',
    name: 'Palácio do Planalto',
    url: 'https://www.gov.br/planalto/pt-br/acompanhe-o-planalto/noticias/RSS',
    site_url: 'https://www.gov.br/planalto',
    category: 'Oficial',
  },
  {
    slug: 'abr-direitos-humanos',
    name: 'Agência Brasil — Direitos Humanos',
    url: 'https://agenciabrasil.ebc.com.br/rss/direitos-humanos/feed.xml',
    site_url: 'https://agenciabrasil.ebc.com.br',
    category: 'Agência pública',
  },

  // ── Órgãos de segurança e defesa via feed da raiz do portal gov.br ──
  //
  // Todos verificados ao vivo: HTTP 200, 15 itens, datas de hoje. São feeds do
  // portal inteiro, não da pasta de notícias — ver a nota sobre `/RSS` acima e
  // `ehAnexo()`, que remove os anexos antes de qualquer avaliação.
  {
    slug: 'policia-federal',
    name: 'Polícia Federal',
    url: 'https://www.gov.br/pf/RSS',
    site_url: 'https://www.gov.br/pf',
    category: 'Oficial',
  },
  {
    slug: 'ministerio-justica',
    name: 'Ministério da Justiça e Segurança Pública',
    url: 'https://www.gov.br/mj/RSS',
    site_url: 'https://www.gov.br/mj',
    category: 'Oficial',
  },
  {
    // GSI: assessoramento direto da Presidência em segurança institucional —
    // é onde aparecem CREDEN, alertas e pauta de inteligência de Estado.
    slug: 'gsi-presidencia',
    name: 'GSI — Gabinete de Segurança Institucional',
    url: 'https://www.gov.br/gsi/RSS',
    site_url: 'https://www.gov.br/gsi',
    category: 'Oficial',
  },
  {
    slug: 'abin',
    name: 'ABIN — Agência Brasileira de Inteligência',
    url: 'https://www.gov.br/abin/RSS',
    site_url: 'https://www.gov.br/abin',
    category: 'Oficial',
  },
  {
    // Defesa Civil nacional está sob o Ministério da Integração e do
    // Desenvolvimento Regional; o feed do MIDR é o canal que existe.
    slug: 'defesa-civil',
    name: 'Defesa Civil Nacional (MIDR)',
    url: 'https://www.gov.br/mdr/RSS',
    site_url: 'https://www.gov.br/mdr',
    category: 'Oficial',
  },
  {
    slug: 'itamaraty',
    name: 'Itamaraty — Ministério das Relações Exteriores',
    url: 'https://www.gov.br/mre/RSS',
    site_url: 'https://www.gov.br/mre',
    category: 'Oficial',
  },

  // ── Imprensa especializada em defesa ──
  //
  // As fontes oficiais publicam pouco e devagar: o Ministério da Defesa solta
  // algumas notas por semana. Estas três cobrem defesa em tempo integral e
  // publicam TODO DIA, o que muda a natureza do acervo — deixa de ser um
  // arquivo de comunicados e vira acompanhamento corrente.
  {
    slug: 'defesanet',
    name: 'DefesaNet',
    url: 'https://www.defesanet.com.br/feed/',
    site_url: 'https://www.defesanet.com.br',
    category: 'Imprensa especializada',
  },
  {
    slug: 'naval',
    name: 'Poder Naval',
    url: 'https://www.naval.com.br/blog/feed/',
    site_url: 'https://www.naval.com.br',
    category: 'Imprensa especializada',
  },
  {
    slug: 'tecnodefesa',
    name: 'Tecnodefesa',
    url: 'https://tecnodefesa.com.br/feed/',
    site_url: 'https://tecnodefesa.com.br',
    category: 'Imprensa especializada',
  },

  // ── Imprensa especializada em defesa (verificada agora) ──
  {
    slug: 'forte-apache',
    name: 'Forte Apache',
    url: 'https://www.forte.jor.br/feed/',
    site_url: 'https://www.forte.jor.br',
    category: 'Imprensa especializada',
  },
  {
    slug: 'defesa-aerea-naval',
    name: 'Defesa Aérea & Naval',
    url: 'https://www.defesaaereanaval.com.br/feed',
    site_url: 'https://www.defesaaereanaval.com.br',
    category: 'Imprensa especializada',
  },

  // ══════════════════════════════════════════════════════════════════════
  // IMPRENSA GERAL — cobertura ampla, guardando só o que passa no filtro
  //
  // Estas fontes cobrem tudo: eleição, futebol, celebridade, defesa. Medido
  // nos feeds reais, 1% do que publicam passa no filtro de relevância — 2 de
  // 260 itens de G1, Folha e CNN.
  //
  // Cadastrá-las mesmo assim vale, porque esse 1% é grande em termos
  // absolutos: são os veículos de maior circulação do país, e a matéria de
  // defesa que eles publicam não aparece em lugar nenhum das fontes oficiais.
  // Um contrato do Exército noticiado pela Folha só entra no acervo por aqui.
  //
  // Mas guardá-las como as demais seria um erro caro: ~1.500 itens por ciclo,
  // 99% deles irrelevantes, empilhados num acervo cuja função é ser sobre
  // defesa. Por isso `somenteRelevantes`: o que o filtro recusa é descartado
  // em vez de gravado. A amostra de recusados que o Analista audita continua
  // vindo das fontes curadas, onde ela ensina alguma coisa — mil manchetes de
  // celebridade recusadas não ensinam nada sobre o filtro.
  // ══════════════════════════════════════════════════════════════════════
  { slug: 'g1-politica', name: 'G1 — Política', url: 'https://g1.globo.com/rss/g1/politica/', site_url: 'https://g1.globo.com', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'g1-mundo', name: 'G1 — Mundo', url: 'https://g1.globo.com/rss/g1/mundo/', site_url: 'https://g1.globo.com', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'g1-brasil', name: 'G1 — Brasil', url: 'https://g1.globo.com/rss/g1/brasil/', site_url: 'https://g1.globo.com', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'g1-tecnologia', name: 'G1 — Tecnologia', url: 'https://g1.globo.com/rss/g1/tecnologia/', site_url: 'https://g1.globo.com', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'o-globo', name: 'O Globo', url: 'https://oglobo.globo.com/rss/oglobo', site_url: 'https://oglobo.globo.com', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'folha-poder', name: 'Folha de S.Paulo — Poder', url: 'https://feeds.folha.uol.com.br/poder/rss091.xml', site_url: 'https://www1.folha.uol.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'folha-mundo', name: 'Folha de S.Paulo — Mundo', url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml', site_url: 'https://www1.folha.uol.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'folha-mercado', name: 'Folha de S.Paulo — Mercado', url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml', site_url: 'https://www1.folha.uol.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'uol-noticias', name: 'UOL Notícias', url: 'https://rss.uol.com.br/feed/noticias.xml', site_url: 'https://noticias.uol.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'estadao-politica', name: 'Estadão — Política', url: 'https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/politica/?outputType=xml', site_url: 'https://www.estadao.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'estadao-internacional', name: 'Estadão — Internacional', url: 'https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/internacional/?outputType=xml', site_url: 'https://www.estadao.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'cnn-brasil', name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/', site_url: 'https://www.cnnbrasil.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'poder360', name: 'Poder360', url: 'https://www.poder360.com.br/feed/', site_url: 'https://www.poder360.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'metropoles', name: 'Metrópoles', url: 'https://www.metropoles.com/feed', site_url: 'https://www.metropoles.com', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'gazeta-do-povo', name: 'Gazeta do Povo — República', url: 'https://www.gazetadopovo.com.br/feed/rss/republica.xml', site_url: 'https://www.gazetadopovo.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'veja', name: 'Veja', url: 'https://veja.abril.com.br/feed/', site_url: 'https://veja.abril.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'istoe', name: 'IstoÉ', url: 'https://istoe.com.br/feed/', site_url: 'https://istoe.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'carta-capital', name: 'CartaCapital', url: 'https://www.cartacapital.com.br/feed/', site_url: 'https://www.cartacapital.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'jovem-pan', name: 'Jovem Pan', url: 'https://jovempan.com.br/feed', site_url: 'https://jovempan.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'terra', name: 'Terra', url: 'https://www.terra.com.br/rss/', site_url: 'https://www.terra.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'nexo', name: 'Nexo Jornal', url: 'https://www.nexojornal.com.br/rss.xml', site_url: 'https://www.nexojornal.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'bbc-brasil', name: 'BBC News Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', site_url: 'https://www.bbc.com/portuguese', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'exame', name: 'Exame', url: 'https://exame.com/feed/', site_url: 'https://exame.com', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'infomoney', name: 'InfoMoney', url: 'https://www.infomoney.com.br/feed/', site_url: 'https://www.infomoney.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'conjur', name: 'Consultor Jurídico', url: 'https://www.conjur.com.br/rss.xml', site_url: 'https://www.conjur.com.br', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'agencia-publica', name: 'Agência Pública', url: 'https://apublica.org/feed/', site_url: 'https://apublica.org', category: 'Imprensa geral', somenteRelevantes: true },
  { slug: 'intercept-brasil', name: 'Intercept Brasil', url: 'https://www.intercept.com.br/feed/', site_url: 'https://www.intercept.com.br', category: 'Imprensa geral', somenteRelevantes: true },

  // ── Agregador ──
  //
  // O Google News expõe qualquer busca como RSS. É a única fonte aqui que
  // varre a imprensa inteira em vez de um veículo só, e por isso é a que mais
  // alimenta a correlação por país: notícia de defesa publicada em qualquer
  // jornal brasileiro entra por aqui.
  //
  // Em troca exige limpeza — ver `limparAgregador()` abaixo. O título vem com
  // " - veículo" grudado no fim e a descrição é uma âncora HTML, não um
  // resumo. Sem tratar, o cartão exibiria lixo e o filtro avaliaria o nome do
  // jornal como se fosse conteúdo.
  {
    slug: 'google-news-defesa',
    name: 'Google Notícias — Defesa',
    url: 'https://news.google.com/rss/search?q=defesa+militar+%22Forcas+Armadas%22+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    site_url: 'https://news.google.com',
    category: 'Agregador',
  },
  {
    slug: 'google-news-forcas',
    name: 'Google Notícias — Marinha, Exército e FAB',
    url: 'https://news.google.com/rss/search?q=Marinha+OR+%22Exercito+Brasileiro%22+OR+%22Forca+Aerea%22+defesa&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    site_url: 'https://news.google.com',
    category: 'Agregador',
  },
]

/**
 * Limpeza do que vem de agregador (Google Notícias).
 *
 * Dois defeitos, ambos com consequência real se ignorados:
 *
 *   TÍTULO   chega como "Marinha incorpora nova fragata - Poder Naval". O
 *            sufixo é o veículo, não parte da manchete. Deixá-lo faria o
 *            filtro de relevância avaliar o nome do jornal junto do assunto —
 *            e um veículo chamado "Poder Naval" casaria com termo forte em
 *            toda matéria que publicasse, inclusive as que não são de defesa.
 *
 *   RESUMO   não existe. A descrição é `<a href="...">título</a>`, marcação
 *            pura. Guardá-la encheria o cartão de HTML e daria ao filtro uma
 *            cópia do título como se fosse conteúdo novo.
 *
 * O veículo real vem no elemento `<source>`, que o parser já extrai.
 */
// Extensões que denunciam anexo. A lista é fechada de propósito: um título
// legítimo pode terminar em ponto seguido de letras ("...da Lei n. 14.133"),
// e um teste genérico de "termina em .algo" cortaria manchete de verdade.
const RX_ANEXO = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|csv|odt|ods|jpe?g|png|gif|webp|mp[34]|avi|mov)\s*$/i

/**
 * O item é um arquivo, não uma matéria?
 *
 * Os feeds da raiz do gov.br sindicalizam TUDO que muda no portal, e a maior
 * parte do que muda é anexo: edital em PDF, foto de WhatsApp, planilha de
 * resultado. Nenhum deles é notícia, e todos passariam pelo filtro de
 * relevância se o nome do arquivo contivesse um termo do domínio — "Pregão
 * 90014_2026.zip" publicado pela ABIN casaria com a fonte e entraria no acervo
 * como manchete.
 *
 * Dois sinais, qualquer um basta: o título termina em extensão conhecida, ou a
 * URL aponta para o download de um arquivo do Plone.
 */
export function ehAnexo(item) {
  const titulo = (item?.titulo || '').trim()
  const url = item?.url || ''
  return RX_ANEXO.test(titulo)
    || /\/@@download\//i.test(url)
    || RX_ANEXO.test(url.split('?')[0])
}

// Registro de agenda de autoridade: "Agenda de Luiz Fernando Corrêa para
// 26/08/2026". A ABIN publicou 14 num só dia, todos sem resumo e todos
// apontando para /acesso-a-informacao/agenda-de-autoridades/.
const RX_AGENDA = /^agenda\s+d[eo]\s+.+\s+para\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/i

// Título que é só código de documento: "APC 03/2026", "AA 02/2026",
// "ALERTA 78/2026". Sem resumo, não há o que ler — o cartão exibiria a sigla.
const RX_CODIGO = /^[A-ZÇÃÕÁÉÍÓÚÂÊÔ]{2,10}(?:[\s-][A-ZÇÃÕ]{2,10})?\s*n?[º°]?\s*\d+[/-]\d{2,4}\s*$/

// Seções do portal que não são jornalismo: transparência, licitação, agenda.
const RX_SECAO_ADMINISTRATIVA =
  /\/(acesso-a-informacao|agenda-de-autoridades|licitacoes?|contratos?|editais?|concursos?)\//i

/**
 * O item não é notícia?
 *
 * Reúne os três descartes, todos observados no acervo real depois de cadastrar
 * os portais gov.br: anexo, registro de agenda e título que é só código.
 *
 * O critério é sempre o mesmo — o item tem conteúdo LEGÍVEL? "ALERTA 78/2026"
 * sem resumo não informa nada a quem lê o clipping; guardá-lo seria inflar a
 * contagem de artigos sem acrescentar uma linha de informação, que é
 * exatamente o tipo de número vazio que este projeto evita.
 */
export function ehNaoNoticia(item) {
  const titulo = (item?.titulo || '').trim()
  const url = item?.url || ''
  if (ehAnexo(item)) return true
  if (RX_SECAO_ADMINISTRATIVA.test(url)) return true
  if (RX_AGENDA.test(titulo)) return true
  // Código só descarta quando não há resumo: com texto, ainda há o que ler.
  if (RX_CODIGO.test(titulo) && !(item?.resumo || '').trim()) return true
  return false
}

export function limparAgregador(item) {
  let titulo = item.titulo || ''
  const veiculo = item.fonteOriginal || ''

  // Remove " - Veículo" do fim, e só do fim: manchetes legítimas usam hífen no
  // meio ("Operação Ágata - balanço"), e cortar no primeiro hífen as mutilaria.
  if (veiculo && titulo.endsWith(` - ${veiculo}`)) {
    titulo = titulo.slice(0, -(veiculo.length + 3)).trim()
  } else {
    titulo = titulo.replace(/\s+-\s+[^-]{3,40}$/, '').trim() || titulo
  }

  // Descrição que é só marcação não vira resumo.
  const resumo = /^\s*<a\s/i.test(item.resumo || '') ? null : item.resumo

  return { ...item, titulo, resumo, veiculo: veiculo || null }
}


/** Cadastra as fontes padrão que ainda não existem. Não sobrescreve ajustes. */
export function semearFontes() {
  let criadas = 0
  for (const f of FONTES_PADRAO) {
    if (get('SELECT id FROM sources WHERE slug = ?', [f.slug])) continue
    run(
      `INSERT INTO sources (slug, name, url, site_url, kind, category, somente_relevantes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [f.slug, f.name, f.url, f.site_url, 'rss', f.category, f.somenteRelevantes ? 1 : 0]
    )
    criadas += 1
  }
  return criadas
}

/** Coleta UMA fonte. Nunca lança: o resultado descreve o que aconteceu. */
export async function coletarFonte(fonte) {
  const inicio = Date.now()
  try {
    const xml = await buscarTexto(fonte.url)
    const itens = parseFeed(xml)

    let novos = 0
    let relevantes = 0
    let duplicadas = 0

    // Fontes de agregador precisam de limpeza antes de qualquer avaliação —
    // ver `limparAgregador()`. As demais passam direto.
    const ehAgregador = fonte.category === 'Agregador'

    transacao(() => {
      for (const bruto of itens) {
        // Anexo, agenda de autoridade e código de documento não são notícia.
        // Descartados antes de tudo — inclusive antes da deduplicação, para
        // não ocupar guid no acervo.
        if (ehNaoNoticia(bruto)) continue

        const item = ehAgregador ? limparAgregador(bruto) : bruto

        // O rodapé de manchetes vizinhas sai ANTES de qualquer avaliação: não
        // pertence a esta matéria, então não pode nem qualificá-la como
        // relevante nem aparecer no cartão como se fosse o resumo dela.
        const resumo = limparRodape(item.resumo) || null
        const palheiro = `${item.titulo} ${resumo || ''}`

        const r = avaliarRelevancia(palheiro)
        const { categoria, urgencia } = classificar(palheiro)

        // Fonte de imprensa geral guarda SÓ o que passa no filtro. Ver a nota
        // em FONTES_PADRAO: são ~1.500 itens por ciclo com 1% de aproveitamento,
        // e gravar os 99% restantes encheria de futebol e celebridade um acervo
        // que existe para ser sobre defesa.
        if (fonte.somente_relevantes && !r.relevante) continue

        // guid único: a coleta roda a cada 30 min e não pode reinserir.
        if (get('SELECT id FROM articles WHERE guid = ?', [item.guid])) continue

        // Mesma matéria vinda de OUTRA fonte — ou da mesma com guid novo, que
        // é o que o Google Notícias faz. Ver `chaveDeTitulo`.
        const chave = chaveDeTitulo(item.titulo)
        if (chave && get('SELECT id FROM articles WHERE title_key = ?', [chave])) {
          duplicadas += 1
          continue
        }

        run(
          `INSERT INTO articles
             (source_id, guid, title, title_key, url, summary, author, published_at,
              category, urgency, relevant, relevance_score, matched_terms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            // Num agregador, quem assina a matéria é o veículo que a publicou,
            // não o agregador. Guardar "Google Notícias" como autor apagaria a
            // procedência justamente na fonte em que ela mais importa.
            fonte.id, item.guid, item.titulo, chave, item.url, resumo,
            item.veiculo || item.autor,
            item.publicadoEm, categoria, urgencia,
            r.relevante ? 1 : 0, r.pontos, r.termos.slice(0, 8).join(', ') || null,
          ]
        )
        novos += 1
        if (r.relevante) relevantes += 1
      }

      run(
        `UPDATE sources SET
           last_fetch_at = ?, last_status = 'ok', last_error = NULL,
           last_count = ?, last_duration = ?,
           total_runs = total_runs + 1, total_items = total_items + ?
         WHERE id = ?`,
        [agora(), novos, Date.now() - inicio, novos, fonte.id]
      )
    })

    return {
      fonte: fonte.name, slug: fonte.slug, ok: true,
      encontrados: itens.length, novos, relevantes,
      duracaoMs: Date.now() - inicio,
    }
  } catch (err) {
    const mensagem = String(err?.message || err).slice(0, 200)
    run(
      `UPDATE sources SET
         last_fetch_at = ?, last_status = 'erro', last_error = ?,
         last_count = 0, last_duration = ?,
         total_runs = total_runs + 1, total_failures = total_failures + 1
       WHERE id = ?`,
      [agora(), mensagem, Date.now() - inicio, fonte.id]
    )
    return {
      fonte: fonte.name, slug: fonte.slug, ok: false,
      erro: mensagem, duracaoMs: Date.now() - inicio,
    }
  }
}

/**
 * Coleta todas as fontes habilitadas, EM PARALELO.
 *
 * Sequencial, sete fontes com timeout de 15s levariam até 105s no pior caso —
 * tempo suficiente para o agendador seguinte disparar por cima. Em paralelo, o
 * pior caso é o timeout de uma só.
 */
export async function coletarTodas() {
  const fontes = all("SELECT * FROM sources WHERE enabled = 1 AND kind = 'rss'")
  const resultados = await Promise.all(fontes.map((f) => coletarFonte(f)))
  return {
    fontes: resultados.length,
    // `encontrados` faltava no agregado, e o registro da execução caía no
    // fallback zero. A trilha de auditoria exibia "0 encontrados, 268 novos" —
    // impossível, e justamente numa tela cuja função é ser confiável.
    encontrados: resultados.reduce((a, r) => a + (r.encontrados || 0), 0),
    novos: resultados.reduce((a, r) => a + (r.novos || 0), 0),
    relevantes: resultados.reduce((a, r) => a + (r.relevantes || 0), 0),
    falhas: resultados.filter((r) => !r.ok).length,
    detalhes: resultados,
  }
}

export default { coletarTodas, coletarFonte, semearFontes, FONTES_PADRAO }
