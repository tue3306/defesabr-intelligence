// -----------------------------------------------------------------------------
// EXPORTAÇÃO
//
// Só CSV e JSON. As funções de PDF foram removidas junto das páginas que as
// usavam (relatórios, análise semanal) — manter 600 kB de jspdf e html2canvas
// no pacote para um botão que ninguém aperta seria custo sem contrapartida.
//
// Um CSV é o formato certo para este produto de qualquer forma: o destino do
// que se exporta daqui é uma planilha ou outro sistema, não uma impressora.
// -----------------------------------------------------------------------------

function baixar(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportJSON(dados, nomeArquivo = 'export.json') {
  baixar(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }), nomeArquivo)
}

/**
 * CSV a partir de uma lista de objetos. As chaves do primeiro item viram o
 * cabeçalho.
 *
 * Dois detalhes que a implementação ingênua erraria:
 *  • Aspas dentro do valor precisam ser duplicadas, senão o campo quebra.
 *  • O BOM inicial faz o Excel abrir em UTF-8; sem ele, todo acento vira lixo.
 */
export function exportCSV(linhas = [], nomeArquivo = 'export.csv') {
  if (!linhas.length) return
  const colunas = Object.keys(linhas[0])
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    colunas.map(esc).join(','),
    ...linhas.map((l) => colunas.map((c) => esc(l[c])).join(',')),
  ].join('\n')
  baixar(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), nomeArquivo)
}
