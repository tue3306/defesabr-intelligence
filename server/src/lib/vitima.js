// -----------------------------------------------------------------------------
// O NOME DA ORGANIZAÇÃO ATACADA
//
// O campo `victim` do ransomware.live não é o nome de uma organização. É o
// TÍTULO DO POST que o grupo criminoso publicou no próprio site de extorsão —
// texto livre, escrito por quem atacou, para o público que ele queria atingir.
//
// Medido nas 552 organizações brasileiras do acervo:
//
//   192 (35%)  têm um domínio no lugar do nome        "frm.ind.br", "uva.edu.br"
//    17 ( 3%)  carregam o sufixo do país              "UniCursos, Brazil"
//     5         trazem a chantagem no título          ver abaixo
//
// E os cinco são o motivo de esta função existir. A plataforma exibia, como se
// fosse a razão social de uma organização brasileira:
//
//   "JBS Brazil - We have 3TB of your data - Pics added"
//   "500gb/www.confins.com.br/10kk/BR/Come to chat or we will attack you again."
//   "ELOTECH - HACKED AND MORE THEN 100 GB DATA LEAKED!"
//
// Republicar a ameaça de um extorsionário num campo rotulado "organização" é
// dar-lhe o alcance que ele buscava, e num produto de inteligência é pior:
// confunde o que a FONTE afirma com o que a plataforma apurou. O fato que
// interessa é "esta organização teve dados divulgados por este grupo" — o
// resto é o texto de marketing do criminoso.
//
// ─────────────────────────────────────────────────────────────────────────────
// LIMPAR NÃO É INVENTAR, E A DIFERENÇA ESTÁ EM DEVOLVER OS DOIS
//
// A função devolve `nome` (o que se exibe) e `bruto` (o que a fonte trouxe),
// sempre. Nenhum caractere é acrescentado: tudo o que sai de `nome` estava no
// texto original. Quando a limpeza muda alguma coisa, a tela pode mostrar o
// original — e é isso que mantém a afirmação conferível, que é a regra da casa.
//
// A normalização é de LEITURA, não de gravação. O banco continua com o campo
// como a fonte o entregou: corrigir uma regra aqui melhora todas as respostas
// no próximo pedido, sem migração nem recoleta.
// -----------------------------------------------------------------------------

/**
 * Marcadores de extorsão e de volume de dados.
 *
 * Não são adjetivos de uma organização; são o recado do atacante. "sample",
 * "leaked", "3TB", "come to chat" — nenhum descreve quem foi atacado.
 */
const RX_CHANTAGEM = new RegExp(
  [
    '\\bwe have\\b', '\\bsample\\b', '\\bpics? added\\b', '\\buploaded\\b',
    '\\bleaked?\\b', '\\bhacked\\b', '\\bdownload\\b', '\\bfull data\\b',
    '\\ball data\\b', '\\bdata (?:leak|breach)\\b', '\\bpart \\d+\\b',
    '\\bcome to chat\\b', '\\bwe will attack\\b', '\\bupdated\\b',
    '\\d+\\s*(?:tb|gb|mb|kk)\\b',
  ].join('|'),
  'i',
)

/**
 * Parece um domínio? (`empresa.com.br`, `www.orgao.gov.br`)
 *
 * Cada rótulo exige DOIS caracteres, e o último exige ser só letras. A versão
 * frouxa (`[a-z0-9-]+`) considerava "S.J" um domínio, e o nome "S.J. Louis"
 * era decepado para "Louis". Domínio de um caractere por rótulo não existe na
 * prática, e exigir dois separa o endereço da abreviatura.
 */
const RX_DOMINIO = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]{2,}(?:\.[a-z0-9-]{2,})*\.[a-z]{2,24}\.?$/i

/** Sufixo de país no fim do rótulo — redundante numa plataforma sobre o Brasil. */
const RX_SUFIXO_PAIS = /[\s,–—-]+brazil\.?$/i

/** `www.` e a barra final que a fonte às vezes deixa. */
const limparDominio = (d) => String(d || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')

/**
 * Nome exibível de uma organização atacada.
 *
 * @param {string} victim   o campo cru da fonte
 * @param {string} website  o domínio, quando a fonte o traz
 * @returns {{ nome: string, bruto: string, limpo: boolean, ehDominio: boolean }}
 *   `limpo` diz se algo foi removido — é o gatilho para a tela oferecer o
 *   original. `ehDominio` diz que não há nome, só endereço: a tela então
 *   apresenta como domínio, em vez de fingir que é uma razão social.
 */
export function nomeDaVitima(victim, website) {
  const bruto = String(victim || '').trim()
  const dominio = limparDominio(website)

  if (!bruto) {
    return { nome: dominio || 'Organização não identificada', bruto, limpo: false, ehDominio: !!dominio }
  }

  // Protocolo e barra final saem antes de qualquer coisa: sem isso,
  // "https://www.personalservice.com.br/" era partido no "//" e sobrava
  // "https" como nome da organização.
  const semProtocolo = bruto.replace(/^https?:\/\//i, '').replace(/\/+$/, '')

  // ───────────────────────────────────────────────────────────────────────────
  // REMOVER O QUE É CHANTAGEM, E CONSERVAR TODO O RESTO
  //
  // A primeira versão desta função ESCOLHIA um pedaço — o primeiro que não
  // fosse domínio — e descartava os demais. Parecia razoável e destruía nome
  // legítimo: "AFECC - Hospital Santa Rita de Cássia" virava "AFECC", perdendo
  // justamente o hospital, que é a organização atacada.
  //
  // A regra correta é a inversa e mais modesta: sai o que é PROVADAMENTE o
  // recado do atacante (volume de dados, "sample uploaded", "come to chat"),
  // e o que sobra é recolado como veio. A plataforma não escolhe qual parte do
  // nome importa — ela só remove o que sabe não ser nome.
  //
  // A barra exige cuidado dobrado: separa pedaços do título ("CEAGESP /
  // Netfeirasp") e também abrevia razão social ("LCM Construção e Comércio
  // S/A"). Uma letra sozinha depois da barra é abreviatura, nunca um segundo
  // nome — e foi assim que "…Comércio S/A" virava "…Comércio S".
  // ───────────────────────────────────────────────────────────────────────────
  const SEPARADOR = /\s+[-–—|]\s+|\s*\/\s*(?![A-Za-z]\.?\s*$)/
  const partes = RX_DOMINIO.test(semProtocolo)
    ? [semProtocolo]
    : semProtocolo.split(SEPARADOR).map((p) => p.trim()).filter(Boolean)

  const uteis = partes.filter((p) => !RX_CHANTAGEM.test(p) && !/^[A-Z]{2}$/.test(p))

  // Se TODO pedaço era chantagem, o domínio é o que resta de identificação.
  if (!uteis.length) {
    return { nome: dominio || bruto, bruto, limpo: (dominio || bruto) !== bruto, ehDominio: !!dominio }
  }

  // Preferir o que não é domínio quando há nome de verdade entre os pedaços;
  // caso contrário, recolar tudo o que sobrou.
  const semDominio = uteis.filter((p) => !RX_DOMINIO.test(p))

  // Nada foi removido? Devolve o título como veio, com a pontuação original.
  // Recolar os pedaços trocaria a barra de "CEAGESP / Netfeirasp" por um
  // travessão — mudança gratuita num texto que a fonte escreveu assim.
  const nadaRemovido = uteis.length === partes.length && semDominio.length === uteis.length
  let nome = nadaRemovido
    ? semProtocolo.trim()
    : (semDominio.length ? semDominio : uteis).join(' - ').trim()

  // "nuclep.gov.br. Nuclep" — o domínio abre o título e o nome vem depois do
  // ponto. O espaço é OBRIGATÓRIO e o prefixo precisa ser um domínio de
  // verdade: sem as duas exigências, "frm.ind.br" era lido como o domínio
  // "frm.ind" seguido do nome "br".
  const colado = nome.match(/^(\S+?)\.\s+(.+)$/)
  if (colado && RX_DOMINIO.test(colado[1])) nome = colado[2].trim()

  // O ponto final FICA. Removê-lo transformava "Werken Química Brasil S.A." em
  // "…S.A", que é erro de grafia num nome de empresa — e o ponto solto que
  // realmente sobra vem sempre acompanhado de vírgula ou travessão.
  nome = nome.replace(RX_SUFIXO_PAIS, '').replace(/[\s,;:–—-]+$/, '').trim()

  // Nada sobrou de aproveitável: o domínio é a identificação honesta.
  if (!nome || RX_DOMINIO.test(nome)) {
    const alvo = nome || dominio
    return {
      nome: limparDominio(alvo) || bruto,
      bruto,
      limpo: limparDominio(alvo) !== bruto,
      ehDominio: true,
    }
  }

  return { nome, bruto, limpo: nome !== bruto, ehDominio: false }
}

export default { nomeDaVitima }
