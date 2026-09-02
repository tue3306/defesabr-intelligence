// -----------------------------------------------------------------------------
// PARSER DE FEED — RSS 2.0, Atom e RSS 1.0 (RDF)
//
// Sem dependência: os feeds usados são simples, e uma biblioteca de XML
// completa seria peso desproporcional ao problema.
//
// Precisa cobrir TRÊS dialetos porque as fontes reais usam três:
//
//   RSS 2.0  <item>   <pubDate>            Agência Brasil, Poder360
//   Atom     <entry>  <updated>, link href alguns feeds do EBC
//   RSS 1.0  <item rdf:about> <dc:date>    gov.br / Ministério da Defesa
//
// O terceiro caso custou caro para descobrir. Sem ler `<dc:date>`, todo item
// do feed do Ministério da Defesa entrava com data nula. A coleta *parecia*
// funcionar — dezenas de itens gravados, nenhum erro no log — mas o clipping
// filtra por período, então nada aparecia na tela. Falha silenciosa: o pior
// tipo, porque não há o que investigar.
// -----------------------------------------------------------------------------

// O gov.br publica ANEXOS como itens de notícia: PDFs, imagens e planilhas
// entram no feed com <dc:type>File</dc:type> e link terminado em "/view".
// Um regulamento em PDF listado como ocorrência de defesa é ruído que compete
// por atenção com a notícia de verdade.
const EXT_ANEXO = /\.(pdf|jpe?g|png|gif|svg|zip|docx?|xlsx?|pptx?)(\/view)?$/i
const TIPO_ANEXO = /^(file|image)$/i

function decodificar(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .trim()
}

const semTags = (s) => decodificar(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

function normalizarData(valor) {
  if (!valor) return null
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return null
  // Recusa data absurda: feed mal formado às vezes devolve ano 1970 ou 2099,
  // e um item assim desorganiza toda ordenação por data.
  const ano = d.getUTCFullYear()
  if (ano < 1990 || ano > new Date().getUTCFullYear() + 1) return null
  return d.toISOString()
}

/**
 * @returns {Array<{titulo, url, resumo, autor, publicadoEm, guid}>}
 */
export function parseFeed(xml) {
  const itens = []
  const blocos = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) || []

  for (const bloco of blocos) {
    const pegar = (tag) => {
      const m = bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
      return m ? decodificar(m[1]) : null
    }

    const titulo = pegar('title')
    if (!titulo) continue

    // Atom guarda o link em href; RSS, no conteúdo da tag.
    const linkAtributo = bloco.match(/<link[^>]*href=["']([^"']+)["']/i)
    const url = pegar('link') || (linkAtributo ? linkAtributo[1] : null)

    // Descarta anexos por qualquer um dos dois sinais: o tipo declarado é mais
    // confiável, a extensão cobre feeds que não declaram tipo.
    const tipo = pegar('dc:type')
    if (tipo && TIPO_ANEXO.test(tipo.trim())) continue
    if (url && EXT_ANEXO.test(url)) continue

    itens.push({
      titulo,
      url,
      resumo: semTags(pegar('description') || pegar('summary') || pegar('content:encoded') || pegar('content') || ''),
      autor: pegar('dc:creator') || pegar('author') || null,
      publicadoEm: normalizarData(
        pegar('pubDate') || pegar('dc:date') || pegar('updated') || pegar('published')
      ),
      guid: pegar('guid') || pegar('id') || url || titulo,
      // Veículo de origem, quando o feed o declara. Num feed comum é redundante
      // (a fonte É o veículo); num AGREGADOR é a única forma de saber quem
      // publicou de fato — o Google Notícias põe aqui "g1.globo.com" enquanto a
      // fonte cadastrada é o próprio Google.
      fonteOriginal: pegar('source') || null,
    })
  }

  return itens
}

export default parseFeed
