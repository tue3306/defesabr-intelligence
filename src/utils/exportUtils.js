import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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

// PDF "de inteligência" gerado proceduralmente a partir do clipping
export function exportClippingToPDF(clipping) {
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

  // Cabeçalho
  pdf.setFillColor(20, 28, 40)
  pdf.rect(0, 0, W, 28, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('DefesaBR Intelligence', M, 13)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(150, 201, 222)
  pdf.text('Clipping Diário de Segurança e Defesa', M, 19)
  pdf.text(`Data: ${clipping.date || ''}  |  Nível: ${clipping.alert_level || 'NORMAL'}`, M, 24)
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
    const lines = pdf.splitTextToSize(txt, W - M * 2)
    lines.forEach((ln) => {
      ensureSpace(6)
      pdf.text(ln, M, y)
      y += 5
    })
  }

  const footer = () => {
    pdf.setFontSize(7)
    pdf.setTextColor(140, 140, 140)
    pdf.text(
      'Documento demonstrativo — análise gerada por IA, não substitui análise humana especializada.',
      M,
      H - 10
    )
    pdf.text('DefesaBR Intelligence', W - M, H - 10, { align: 'right' })
  }

  // Resumo executivo
  heading('Resumo Executivo')
  body(clipping.summary_executive || '—')
  y += 3

  // Notícias
  heading(`Principais Notícias (${clipping.news?.length || 0})`)
  ;(clipping.news || []).forEach((n, i) => {
    ensureSpace(20)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(20, 28, 40)
    const titleLines = pdf.splitTextToSize(`${i + 1}. ${n.title}`, W - M * 2)
    titleLines.forEach((ln) => {
      ensureSpace(6)
      pdf.text(ln, M, y)
      y += 5
    })
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    body(`${n.source} · ${n.category} · ${n.urgency} · ${n.region || ''}`, 8, [120, 120, 120])
    body(n.summary, 9)
    if (n.impact_br) body(`Impacto BR: ${n.impact_br}`, 9, [70, 90, 110])
    y += 3
  })

  // Tendências
  if (clipping.trends?.length) {
    heading('Tendências do Dia')
    clipping.trends.forEach((t) => body(`• ${t}`))
  }

  // Nota do editor
  if (clipping.editor_note) {
    y += 2
    heading('Nota do Analista')
    body(clipping.editor_note, 10, [60, 60, 60])
  }

  footer()
  pdf.save(`clipping-${(clipping.date || '').replace(/\//g, '-')}.pdf`)
}
