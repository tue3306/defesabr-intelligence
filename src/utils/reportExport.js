import jsPDF from 'jspdf'

// =============================================================================
// RENDERIZAÇÃO DE RELATÓRIOS COMPOSTOS
//
// `doc` é o documento montado por `reportsService.compose()`:
//   { id, title, audience, period, periodLabel, generatedAt, summary,
//     sections: [{ label, type: 'text'|'bullets'|'table'|'blocks', … }],
//     disclaimer }
//
// O serviço entrega o CONTEÚDO; este módulo decide o FORMATO. Essa separação é
// o que permite acrescentar um novo formato de saída sem tocar na camada de
// dados — e trocar os dados por um backend sem tocar na renderização.
// =============================================================================

/** Download genérico de blob (mesma mecânica de exportUtils, sem acoplar). */
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

/** Nome de arquivo previsível: slug do título + data de emissão. */
function reportFilename(doc, ext) {
  const slug = (doc?.title || 'relatorio')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const date = (doc?.generatedAt || new Date().toISOString()).slice(0, 10)
  return `${slug}-${date}.${ext}`
}

const PT_BR_DATETIME = { dateStyle: 'short', timeStyle: 'short' }

const stamp = (doc) =>
  new Date(doc?.generatedAt || Date.now()).toLocaleString('pt-BR', PT_BR_DATETIME)

// ─────────────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────────────
export function exportReportToPDF(doc) {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 15
  const BOTTOM = H - 16
  let y = 0

  const newPage = () => {
    pdf.addPage()
    y = M + 6
  }
  const ensureSpace = (need) => {
    if (y + need > BOTTOM) newPage()
  }

  // ── Capa institucional ──
  pdf.setFillColor(21, 25, 30)
  pdf.rect(0, 0, W, 46, 'F')
  pdf.setTextColor(202, 167, 51)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('DEFESABR INTELLIGENCE', M, 14)
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(18)
  pdf.text(pdf.splitTextToSize(doc.title || 'Relatório', W - M * 2), M, 25)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(190, 195, 205)
  const metaLine = [
    doc.audience ? 'Publico: ' + doc.audience : null,
    doc.periodLabel ? 'Periodo: ' + doc.periodLabel : null,
    'Emitido em ' + stamp(doc),
  ].filter(Boolean).join('   |   ')
  pdf.text(metaLine, M, 39)
  y = 56

  const body = (txt, size = 10, color = [45, 45, 45], style = 'normal') => {
    pdf.setTextColor(color[0], color[1], color[2])
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.splitTextToSize(String(txt ?? ''), W - M * 2).forEach((ln) => {
      ensureSpace(6)
      pdf.text(ln, M, y)
      y += 5
    })
  }

  if (doc.summary) {
    body(doc.summary, 10, [70, 70, 70], 'italic')
    y += 4
  }

  const heading = (txt) => {
    ensureSpace(16)
    pdf.setTextColor(21, 25, 30)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text(txt, M, y)
    y += 5
    pdf.setDrawColor(202, 167, 51)
    pdf.setLineWidth(0.6)
    pdf.line(M, y, W - M, y)
    y += 6
  }

  // Tabela: larguras proporcionais ao conteúdo, cabeçalho repetido por página
  // e zebra. Células longas são truncadas em 3 linhas para não estourar a página.
  const table = (columns = [], rows = []) => {
    if (!columns.length || !rows.length) {
      body('Sem dados para o periodo selecionado.', 9, [120, 120, 120], 'italic')
      return
    }
    const usable = W - M * 2
    const weights = columns.map((col) => {
      const lens = rows.map((r) => String(r[col] ?? '').length)
      const avg = lens.reduce((a, b) => a + b, 0) / (lens.length || 1)
      return Math.max(col.length, Math.min(avg, 46))
    })
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1
    const widths = weights.map((w) => Math.max(16, (w / totalWeight) * usable))

    const drawHeader = () => {
      ensureSpace(10)
      pdf.setFillColor(238, 240, 243)
      pdf.rect(M, y - 4.5, usable, 7, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(35, 40, 48)
      let x = M + 1.5
      columns.forEach((col, i) => {
        pdf.text(pdf.splitTextToSize(col, widths[i] - 3)[0], x, y)
        x += widths[i]
      })
      y += 6
    }

    drawHeader()
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)

    rows.forEach((row, index) => {
      const cells = columns.map((col, i) =>
        pdf.splitTextToSize(String(row[col] ?? '-'), widths[i] - 3).slice(0, 3)
      )
      const lineCount = Math.max(...cells.map((c) => c.length), 1)
      const rowH = lineCount * 4 + 2

      if (y + rowH > BOTTOM) {
        newPage()
        drawHeader()
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
      }

      if (index % 2 === 1) {
        pdf.setFillColor(248, 249, 250)
        pdf.rect(M, y - 3.5, usable, rowH, 'F')
      }

      let x = M + 1.5
      cells.forEach((cellLines, i) => {
        pdf.setTextColor(50, 50, 50)
        cellLines.forEach((ln, li) => pdf.text(ln, x, y + li * 4))
        x += widths[i]
      })
      y += rowH
    })
    y += 3
  }

  const sections = doc.sections || []
  sections.forEach((section) => {
    heading(section.label)
    if (section.type === 'text') {
      body(section.text)
    } else if (section.type === 'bullets') {
      const bullets = section.bullets || []
      if (bullets.length) bullets.forEach((b) => body('•  ' + b, 9.5))
      else body('Sem registros no periodo.', 9, [120, 120, 120], 'italic')
    } else if (section.type === 'table') {
      table(section.columns, section.rows)
    } else if (section.type === 'blocks') {
      const blocks = section.blocks || []
      blocks.forEach((block) => {
        ensureSpace(12)
        body(block.title, 10.5, [21, 25, 30], 'bold')
        if (block.text) body(block.text, 9)
        const bullets = block.bullets || []
        bullets.forEach((b) => body('   -  ' + b, 9, [80, 88, 96]))
        y += 2
      })
    }
    y += 3
  })

  // Rodapé em todas as páginas — só aqui sabemos o total.
  const total = pdf.internal.getNumberOfPages()
  for (let page = 1; page <= total; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(140, 140, 140)
    pdf.text(doc.disclaimer || 'Documento demonstrativo - DefesaBR Intelligence.', M, H - 9)
    pdf.text('Pagina ' + page + ' de ' + total, W - M, H - 9, { align: 'right' })
  }

  const filename = reportFilename(doc, 'pdf')
  pdf.save(filename)
  return filename
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV — apenas as seções tabulares, cada uma precedida pelo seu título.
// ─────────────────────────────────────────────────────────────────────────────
export function exportReportToCSV(doc) {
  const tables = (doc.sections || []).filter((s) => s.type === 'table' && s.rows?.length)
  if (!tables.length) {
    throw new Error('Este relatório não possui seções tabulares para exportar em CSV.')
  }

  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const blocks = tables.map((section) => {
    const header = section.columns.map(esc).join(',')
    const rows = section.rows.map((r) => section.columns.map((c) => esc(r[c])).join(',')).join('\n')
    return esc(section.label) + '\n' + header + '\n' + rows
  })

  const csv = [
    esc(doc.title),
    esc('Período: ' + (doc.periodLabel || '—') + ' · emitido em ' + stamp(doc)),
    '',
    blocks.join('\n\n'),
  ].join('\n')

  const filename = reportFilename(doc, 'csv')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename)
  return filename
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON — o documento inteiro, para integração com outros sistemas.
// ─────────────────────────────────────────────────────────────────────────────
export function exportReportToJSON(doc) {
  const filename = reportFilename(doc, 'json')
  download(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), filename)
  return filename
}

/**
 * Ponto único de download. NUNCA lança exceção: devolve o resultado para que a
 * interface mostre um aviso coerente em vez de quebrar a tela.
 * @returns {{ok: true, filename: string} | {ok: false, error: string}}
 */
export function downloadReport(doc, format = 'pdf') {
  if (!doc) return { ok: false, error: 'Nenhum relatório foi montado.' }
  try {
    const filename =
      format === 'csv' ? exportReportToCSV(doc)
        : format === 'json' ? exportReportToJSON(doc)
          : exportReportToPDF(doc)
    return { ok: true, filename }
  } catch (err) {
    return { ok: false, error: err?.message || 'Falha ao gerar o arquivo.' }
  }
}
