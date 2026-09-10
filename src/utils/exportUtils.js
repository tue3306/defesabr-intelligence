// -----------------------------------------------------------------------------
// As bibliotecas de PDF pesam ~590 kB somadas. Importá-las no topo colocava
// esse peso no bundle de TODA página que exporta qualquer coisa — inclusive as
// que só geram CSV. Aqui elas são carregadas sob demanda, na primeira vez que
// um PDF é realmente pedido.
// -----------------------------------------------------------------------------
let jsPDFModule = null
async function loadJsPDF() {
  if (!jsPDFModule) jsPDFModule = (await import('jspdf')).default
  return jsPDFModule
}

// Download generico de blob
function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportJSON(data, filename = 'export.json') {
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}

export function exportCSV(rows = [], filename = 'export.csv') {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename)
}

// -----------------------------------------------------------------------------
// AQUI HAVIA `exportElementToPDF` E, MAIS ABAIXO, `exportWeeklyToPDF`
//
// A primeira fotografava um elemento do DOM com html2canvas e colava a imagem
// num PDF. A segunda montava o PDF da "Análise Semanal de Cenários" — tela que
// foi removida quando o conteúdo redigido à mão saiu do produto.
//
// Nenhuma das duas era importada por arquivo nenhum. Juntas carregavam o
// html2canvas (~200 kB) no grafo de dependências de um módulo que toda tela com
// exportação importa.
//
// Um PDF por captura de tela também é o formato errado para este produto: gera
// imagem, e imagem não tem texto selecionável, não tem link clicável e não é
// pesquisável. O PDF do clipping é montado com texto de verdade, logo abaixo.
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// O PDF DO CLIPPING
//
// Era uma lista corrida de manchetes numeradas de 1 a N, sem data por item, sem
// o endereço da matéria, sem número de página e sem agrupamento. Um documento
// que se lê na tela e não se usa fora dela.
//
// ─────────────────────────────────────────────────────────────────────────────
// TRÊS COISAS ESTAVAM ERRADAS, E DUAS ERAM DE CONTEÚDO, NÃO DE FORMA
//
// 1. LIA CAMPOS QUE A EDIÇÃO NÃO TEM. `clipping.trends` e `clipping.editor_note`
//    são resquício do acervo de exemplo que precedeu a API: a ponte em
//    `apiBridge` nunca os preenche, então as duas seções nunca saíam. Ficaram
//    fora — código que não roda dá a impressão de que o documento tem seções
//    que ele não tem.
//
// 2. INVENTAVA O NÍVEL DE ALERTA. `clipping.alert_level || 'NORMAL'` — sem o
//    campo, o cabeçalho afirmava NORMAL. Num produto cuja regra é não preencher
//    o que não sabe, escrever "NORMAL" sobre ausência de dado é o pior dos
//    defaults possíveis: ausência de ocorrência não é calma. Agora, sem nível,
//    o cabeçalho diz que não houve ocorrência no período.
//
// 3. O RESUMO EXECUTIVO SAÍA COMO "—". Um travessão solto sob um cabeçalho lê-se
//    como falha de geração. A nota do servidor diz a verdade: não é falha, é
//    recurso que esta versão não tem.
//
// ─────────────────────────────────────────────────────────────────────────────
// O QUE MUDOU NA LEITURA
//
// - AGRUPADO POR CATEGORIA, não numerado em fila. Trinta manchetes seguidas são
//   trinta decisões de leitura; seis blocos de cinco são seis. E o agrupamento
//   já é informação: "Cibersegurança 8" diz algo antes de ler qualquer título.
// - CADA ITEM TRAZ A PROCEDÊNCIA: fonte, data, urgência e o ENDEREÇO. Sem o
//   endereço o PDF é um beco — quem lê não tem como conferir o original, que é
//   a única coisa que a plataforma pede que se faça.
// - OS TERMOS QUE APROVARAM cada matéria vão abaixo dela. É a auditoria do
//   filtro dentro do documento, e não só na tela.
// - PÁGINA X DE Y no rodapé de todas. Um documento de inteligência sem paginação
//   não pode ser citado numa reunião.
// - O PANORAMA DO PERÍODO abre o documento: alerta com score e distribuição,
//   quanto foi coletado, quanto o filtro aprovou, quantas fontes responderam.
//   São os números que dizem se o documento é representativo.
// -----------------------------------------------------------------------------

// Uma cor por urgência — as mesmas do `urgencyMeta` da interface, para que a
// tela e o papel não discordem sobre o que é crítico.
const COR = {
  fundo: [20, 28, 40],
  titulo: [26, 138, 184],
  corpo: [45, 50, 58],
  fraco: [125, 130, 138],
  linha: [215, 219, 224],
}
const COR_URGENCIA = {
  CRITICO: [192, 57, 43],
  ALTO: [212, 132, 26],
  MEDIO: [190, 160, 30],
  BAIXO: [46, 125, 70],
}
const ROTULO_URGENCIA = { CRITICO: 'CRÍTICO', ALTO: 'ALTO', MEDIO: 'MÉDIO', BAIXO: 'BAIXO' }
const ROTULO_ALERTA = { CRITICO: 'CRÍTICO', ALERTA: 'ALERTA', ATENCAO: 'ATENÇÃO', NORMAL: 'NORMAL' }

// -----------------------------------------------------------------------------
// O QUE A FONTE DO PDF CONSEGUE ESCREVER
//
// As fontes embutidas do jsPDF (Helvetica, Times, Courier) são WinAnsi: cobrem
// latin-1 mais um punhado de sinais tipográficos, e nada além. Qualquer
// caractere fora disso não é ignorado — ele desalinha a codificação do texto, e
// a LINHA INTEIRA sai desmontada:
//
//   "d e i x a r a m   d e z e n a s   d e   f e r i d o s ."
//
// A causa, no acervo real, era um emoji de campanha do G1 ("✅ Siga o canal…")
// no meio do resumo. Quarenta e sete das 496 matérias relevantes tinham algum
// caractere assim.
//
// A origem já é tratada na coleta (ver `removerChamadas` em relevance.js), e
// isto aqui é a rede embaixo: o acervo recebe texto de cinquenta fontes que
// ninguém controla, e a próxima campanha vai usar outro emoji. Um PDF ilegível
// é pior que um PDF sem um caractere.
//
// A ORDEM IMPORTA. Primeiro decompõe e tira o acento combinante — assim "ń"
// (U+0144, fora do WinAnsi) vira "n" em vez de sumir. Só depois se descarta o
// que sobrou fora da faixa, que a essa altura é emoji e pictograma, para os
// quais não existe transliteração honesta.
// -----------------------------------------------------------------------------

/** Sinais tipográficos que o WinAnsi tem, apesar de ficarem acima de U+00FF. */
const EXTRAS_WINANSI = new Set([
  0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022,
  0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178,
])

/** Texto que a fonte do PDF consegue desenhar, sem desmontar a linha. */
function paraWinAnsi(texto) {
  const bruto = String(texto ?? '')
  let saida = ''

  // NFD separa "ń" em "n" + acento combinante; o acento é descartado abaixo por
  // estar fora da faixa. Caracteres que JÁ existem em latin-1 (á, ç, õ) são
  // recompostos no fim para não perderem o acento.
  for (const c of bruto.normalize('NFD')) {
    const cp = c.codePointAt(0)
    // Marcas combinantes: mantidas para a recomposição seguinte.
    if (cp >= 0x0300 && cp <= 0x036F) { saida += c; continue }
    if (cp <= 0xFF || EXTRAS_WINANSI.has(cp)) { saida += c; continue }
    // Emoji e pictograma: não há transliteração honesta. Saem.
  }

  return saida
    .normalize('NFC')
    // O que a recomposição não reuniu (acento sem base em WinAnsi) sai agora.
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Data ISO -> `dd/mm/aaaa`, e string vazia quando não há data. */
function dataCurta(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

export async function exportClippingToPDF(clipping) {
  if (!clipping) return
  const jsPDF = await loadJsPDF()
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 16
  const LARGURA = W - M * 2
  let y = 0

  // ── Rodapé: a nota de procedência e a paginação ──
  //
  // O total de páginas só se conhece no fim, então o rodapé é escrito em TODAS
  // as páginas depois de o corpo estar montado. Antes ele era escrito durante a
  // quebra de página, o que tornava "página X de Y" impossível de calcular.
  const rodape = () => {
    const total = pdf.internal.getNumberOfPages()
    for (let p = 1; p <= total; p += 1) {
      pdf.setPage(p)
      pdf.setDrawColor(...COR.linha)
      pdf.line(M, H - 14, W - M, H - 14)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(...COR.fraco)
      pdf.text(
        'Montado a partir do acervo coletado de fontes públicas. Nenhum trecho foi escrito por modelo de linguagem.',
        M,
        H - 9.5
      )
      pdf.text(`${p}/${total}`, W - M, H - 9.5, { align: 'right' })
    }
  }

  const espaco = (precisa) => {
    if (y + precisa > H - 20) {
      pdf.addPage()
      y = M + 4
    }
  }

  const texto = (txt, { size = 9.5, cor = COR.corpo, estilo = 'normal', recuo = 0, altura = 4.6 } = {}) => {
    pdf.setFont('helvetica', estilo)
    pdf.setFontSize(size)
    pdf.setTextColor(...cor)
    pdf.splitTextToSize(paraWinAnsi(txt), LARGURA - recuo).forEach((ln) => {
      espaco(altura + 1)
      pdf.text(ln, M + recuo, y)
      y += altura
    })
  }

  const secao = (txt, contagem) => {
    espaco(16)
    y += 2
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11.5)
    pdf.setTextColor(...COR.titulo)
    pdf.text(paraWinAnsi(txt).toUpperCase(), M, y)
    if (contagem != null) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(...COR.fraco)
      pdf.text(String(contagem), W - M, y, { align: 'right' })
    }
    y += 2.5
    pdf.setDrawColor(...COR.titulo)
    pdf.setLineWidth(0.4)
    pdf.line(M, y, W - M, y)
    pdf.setLineWidth(0.2)
    y += 5.5
  }

  // ── CAPA ──
  const nivel = clipping.alert_level
  pdf.setFillColor(...COR.fundo)
  pdf.rect(0, 0, W, 30, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  pdf.text('DefesaBR Intelligence', M, 13)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(150, 201, 222)
  pdf.text('Clipping de Segurança e Defesa — nível tático', M, 19.5)
  const periodo = clipping.period_days ? `últimos ${clipping.period_days} dia(s)` : 'período corrente'
  pdf.text(`Edição de ${clipping.date || dataCurta(clipping.generatedAt)} · ${periodo}`, M, 25)

  // O nível de alerta ocupa a direita do cabeçalho, na cor dele. Sem nível,
  // diz que não houve ocorrência — nunca "NORMAL".
  if (nivel) {
    const c = COR_URGENCIA[nivel] || COR_URGENCIA.MEDIO
    pdf.setFillColor(...c)
    pdf.roundedRect(W - M - 46, 8, 46, 14, 2, 2, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text(ROTULO_ALERTA[nivel] || nivel, W - M - 23, 14.5, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.text(`${clipping.alert_score ?? '—'}/100`, W - M - 23, 19.5, { align: 'center' })
  } else {
    pdf.setFontSize(8)
    pdf.setTextColor(200, 205, 212)
    pdf.text('sem ocorrência no período', W - M, 16, { align: 'right' })
  }
  y = 40

  // ── PANORAMA: os números que dizem se o documento é representativo ──
  secao('Panorama do período')
  if (clipping.alert_basis) texto(`Nível de alerta: ${clipping.alert_basis}.`, { size: 9 })
  const dist = clipping.alert_distribution
  if (dist && Object.keys(dist).length) {
    const partes = ['CRITICO', 'ALTO', 'MEDIO', 'BAIXO']
      .filter((k) => dist[k])
      .map((k) => `${ROTULO_URGENCIA[k]} ${dist[k]}`)
      .join('  ·  ')
    texto(`Distribuição por urgência: ${partes}.`, { size: 9 })
  }
  const numeros = [
    clipping.total_collected != null ? `${clipping.total_collected} item(ns) no acervo` : null,
    clipping.relevant_total != null ? `${clipping.relevant_total} aprovados pelo filtro de relevância` : null,
    clipping.active_sources != null ? `${clipping.active_sources} fonte(s) responderam na última coleta` : null,
    `${(clipping.news || []).length} matéria(s) nesta edição`,
  ].filter(Boolean)
  texto(numeros.join('  ·  '), { size: 9, cor: COR.fraco })

  // ── SÍNTESE: o campo reservado, honesto quando vazio ──
  secao('Síntese do período')
  if (clipping.summary_executive) {
    String(clipping.summary_executive)
      .split('\n')
      .filter(Boolean)
      .forEach((p) => { texto(p); y += 1.5 })
  } else {
    texto(
      clipping.summary_note
        || 'Resumo executivo automático não é gerado nesta versão — exigiria um modelo de linguagem.',
      { size: 9, cor: COR.fraco, estilo: 'italic' }
    )
    texto(
      'O espaço fica vazio de propósito: preenchê-lo com texto plausível seria a única coisa que esta plataforma não faz.',
      { size: 8, cor: COR.fraco }
    )
  }

  // ── AS MATÉRIAS, AGRUPADAS POR CATEGORIA ──
  //
  // A ordem das categorias segue o VOLUME, e dentro de cada uma a urgência
  // decide — que é a ordem em que a edição já chega do servidor, preservada
  // por `Map`, que guarda ordem de inserção.
  const porCategoria = new Map()
  for (const n of clipping.news || []) {
    const cat = n.category || 'Sem categoria'
    if (!porCategoria.has(cat)) porCategoria.set(cat, [])
    porCategoria.get(cat).push(n)
  }
  const grupos = [...porCategoria.entries()].sort((a, b) => b[1].length - a[1].length)

  if (!grupos.length) {
    secao('Matérias do período', 0)
    texto(
      'Nenhuma matéria aprovada pelo filtro nesta janela. As fontes oficiais de defesa não publicam todo dia — o resultado vazio é o correto, e a plataforma indica em que janela há material.',
      { size: 9, cor: COR.fraco }
    )
  }

  for (const [categoria, itens] of grupos) {
    secao(categoria, itens.length)
    itens.forEach((n, i) => {
      espaco(24)

      // Faixa de urgência à esquerda do título: o olho encontra o crítico sem
      // ler nada. É a mesma cor da tela.
      const antes = y
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10.5)
      pdf.setTextColor(...COR.fundo)
      pdf.splitTextToSize(paraWinAnsi(`${i + 1}. ${n.title || 'Sem título'}`), LARGURA - 5).forEach((ln) => {
        espaco(6)
        pdf.text(ln, M + 5, y)
        y += 5
      })
      const cu = COR_URGENCIA[n.urgency] || COR.linha
      pdf.setFillColor(...cu)
      pdf.rect(M, antes - 3.6, 1.6, Math.max(4, y - antes), 'F')

      // Procedência: fonte, data e urgência numa linha só.
      const meta = [n.source, dataCurta(n.date), ROTULO_URGENCIA[n.urgency] || n.urgency]
        .filter(Boolean)
        .join('  ·  ')
      texto(meta, { size: 8, cor: COR.fraco, recuo: 5, altura: 4 })

      if (n.summary) texto(n.summary, { size: 9, recuo: 5 })

      // O ENDEREÇO. Sem ele o documento não permite conferir o original.
      if (n.url) texto(n.url, { size: 7.5, cor: COR.titulo, recuo: 5, altura: 4 })

      // A auditoria do filtro viaja com a matéria: por que ela está aqui.
      if (n.matchedTerms?.length) {
        texto(`Aprovada por: ${n.matchedTerms.slice(0, 6).join(', ')}`, {
          size: 7.5, cor: COR.fraco, recuo: 5, altura: 4,
        })
      }
      y += 3
    })
  }

  // ── COMO ESTE DOCUMENTO FOI MONTADO ──
  secao('Como este documento foi montado')
  texto(
    'A edição é montada pelo servidor a partir do que os coletores trouxeram e o filtro de relevância aprovou. Não há passo de análise por modelo de linguagem em nenhum ponto do caminho.',
    { size: 8.5, cor: COR.fraco }
  )
  texto(
    'O nível de alerta é a média ponderada da urgência de TODAS as ocorrências relevantes da janela — não da seleção exibida —, e a distribuição acima permite conferi-lo.',
    { size: 8.5, cor: COR.fraco }
  )
  texto(
    'Cada matéria traz a fonte, a data e o endereço original. Confira sempre o original antes de citar.',
    { size: 8.5, cor: COR.fraco }
  )

  rodape()

  const nomeData = (clipping.date || dataCurta(clipping.generatedAt) || '').replace(/\//g, '-')
  pdf.save(`clipping-defesabr${nomeData ? `-${nomeData}` : ''}.pdf`)
}
