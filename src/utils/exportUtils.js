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

let html2canvasModule = null
async function loadHtml2Canvas() {
  if (!html2canvasModule) html2canvasModule = (await import('html2canvas')).default
  return html2canvasModule
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

// Captura um elemento do DOM e gera PDF (paginado)
export async function exportElementToPDF(element, filename = 'documento.pdf') {
  if (!element) return
  const [jsPDF, html2canvas] = await Promise.all([loadJsPDF(), loadHtml2Canvas()])
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#141c28',
    useCORS: true,
    logging: false,
  })
  const img = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (canvas.height * pageW) / canvas.width
  let heightLeft = imgH
  let position = 0
  pdf.addImage(img, 'PNG', 0, position, pageW, imgH)
  heightLeft -= pageH
  while (heightLeft > 0) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(img, 'PNG', 0, position, pageW, imgH)
    heightLeft -= pageH
  }
  pdf.save(filename)
}

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
    pdf.splitTextToSize(String(txt), LARGURA - recuo).forEach((ln) => {
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
    pdf.text(String(txt).toUpperCase(), M, y)
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
      pdf.splitTextToSize(`${i + 1}. ${n.title || 'Sem título'}`, LARGURA - 5).forEach((ln) => {
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

// PDF da Análise Semanal (cenários, oportunidades, riscos, recomendações e indicadores)
export async function exportWeeklyToPDF(analysis, meta = {}) {
  if (!analysis) return
  const jsPDF = await loadJsPDF()
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 15
  let y = 0

  const ensureSpace = (need) => {
    if (y + need > H - 18) {
      footer()
      pdf.addPage()
      y = M
    }
  }

  pdf.setFillColor(20, 28, 40)
  pdf.rect(0, 0, W, 28, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('DefesaBR Intelligence', M, 13)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(150, 201, 222)
  pdf.text('Análise Semanal de Cenários — Segurança e Defesa', M, 19)
  pdf.text(`${meta.week || ''}${meta.focusLabel ? `  |  Perspectiva: ${meta.focusLabel}` : ''}`, M, 24)
  y = 36

  const heading = (txt) => {
    ensureSpace(12)
    pdf.setTextColor(26, 138, 184)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text(txt, M, y)
    y += 6
    pdf.setDrawColor(26, 138, 184)
    pdf.line(M, y, W - M, y)
    y += 5
  }

  const body = (txt, size = 10, color = [40, 40, 40]) => {
    pdf.setTextColor(...color)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(size)
    pdf.splitTextToSize(txt, W - M * 2).forEach((ln) => {
      ensureSpace(6)
      pdf.text(ln, M, y)
      y += 5
    })
  }

  const footer = () => {
    pdf.setFontSize(7)
    pdf.setTextColor(140, 140, 140)
    pdf.text('Gerado a partir do acervo coletado pela plataforma. Nenhum trecho escrito por maquina.', M, H - 10)
    pdf.text('DefesaBR Intelligence', W - M, H - 10, { align: 'right' })
  }

  // Contexto
  if (analysis.context) {
    heading('Contexto da Semana')
    body(`Eventos monitorados: ${analysis.context.events_monitored ?? '—'}`)
    body(`Nível de tensão: ${analysis.context.tension_level ?? '—'}/100`)
    if (analysis.context.active_regions?.length) body(`Regiões ativas: ${analysis.context.active_regions.join(', ')}`)
    y += 2
  }

  // Cenários
  if (analysis.scenarios?.length) {
    heading('Análise de Cenários')
    analysis.scenarios.forEach((sc) => {
      ensureSpace(16)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(20, 28, 40)
      body(`${sc.type} — ${sc.title} (${sc.probability}%)`, 11, [20, 28, 40])
      body(sc.description, 9)
      if (sc.factors?.length) body(`Fatores: ${sc.factors.join('; ')}`, 9, [70, 90, 110])
      y += 2
    })
  }

  // Oportunidades x Riscos
  if (analysis.opportunities?.length) {
    heading('Oportunidades')
    analysis.opportunities.forEach((o) => body(`• ${o.title} (prob. ${o.probability} · impacto ${o.impact})`))
  }
  if (analysis.risks?.length) {
    heading('Riscos')
    analysis.risks.forEach((r) => body(`• ${r.title} (prob. ${r.probability} · impacto ${r.impact})`))
  }

  // Recomendações
  if (analysis.recommendations && Object.keys(analysis.recommendations).length) {
    heading('Recomendações por Perfil')
    Object.entries(analysis.recommendations).forEach(([profile, text]) => {
      body(`${profile}:`, 10, [20, 28, 40])
      body(text, 9)
      y += 1
    })
  }

  // Indicadores
  if (analysis.indicators?.length) {
    heading('Indicadores a Monitorar')
    analysis.indicators.forEach((ind) => body(`• ${ind.name}: ${ind.value} (meta ${ind.target}) — ${ind.status}`))
  }

  footer()
  pdf.save(`analise-semanal-${(meta.focusLabel || 'defesabr').toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
