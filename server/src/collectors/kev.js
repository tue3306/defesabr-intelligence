import { all, get, run, transacao } from '../db/index.js'
import { buscarJson } from '../lib/fetcher.js'

// -----------------------------------------------------------------------------
// VULNERABILIDADES EXPLORADAS — catálogo KEV da CISA
//
// A CISA, agência de cibersegurança dos EUA, mantém o catálogo "Known
// Exploited Vulnerabilities": falhas de software com exploração CONFIRMADA em
// ataques reais. É a lista que equipes de segurança usam para decidir o que
// corrigir primeiro. Arquivo JSON aberto, sem chave, atualizado em dias úteis.
//
// Não é um dado sobre o Brasil: é sobre o software que órgãos e empresas
// brasileiros também usam. A tela diz isso com todas as letras.
//
// O catálogo inteiro (~1.800 entradas) vem em cada chamada. Grava só o que
// ainda não está no banco; uma entrada não muda depois de publicada, salvo
// raras correções de texto, que não justificam reescrever tudo a cada ciclo.
// -----------------------------------------------------------------------------

export const URL_KEV = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
const PAGINA_CVE = 'https://nvd.nist.gov/vuln/detail/'
const LOTE = 200
const CVE = /^CVE-\d{4}-\d{4,}$/

const texto = (v, max) => String(v ?? '').trim().slice(0, max) || null
const dataIso = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null)

/** Normaliza uma entrada do catálogo; null se faltar o que a identifica. */
export function normalizarKev(v) {
  const cve = String(v?.cveID || '').trim().toUpperCase()
  const adicionada = dataIso(v?.dateAdded)
  if (!CVE.test(cve) || !adicionada) return null
  return [
    cve,
    texto(v.vendorProject, 120),
    texto(v.product, 120),
    texto(v.vulnerabilityName, 300),
    texto(v.shortDescription, 1500),
    adicionada,
    dataIso(v.dueDate),
    v.knownRansomwareCampaignUse === 'Known' ? 'Known' : 'Unknown',
  ]
}

export async function coletarKev() {
  const inicio = Date.now()
  const d = await buscarJson(URL_KEV, { tentativas: 2 })
  const linhas = (Array.isArray(d?.vulnerabilities) ? d.vulnerabilities : [])
    .map(normalizarKev)
    .filter(Boolean)
  if (!linhas.length) throw new Error('catálogo KEV veio vazio')

  let novos = 0
  await transacao(async () => {
    for (let i = 0; i < linhas.length; i += LOTE) {
      const lote = linhas.slice(i, i + LOTE)
      const r = await run(
        `INSERT INTO kev_vulnerabilities
           (cve_id, vendor, product, name, description, date_added, due_date, ransomware_use)
         VALUES ${lote.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
         ON CONFLICT (cve_id) DO NOTHING`,
        lote.flat(),
      )
      novos += r.changes
    }
  })

  return {
    coletor: 'kev',
    ok: true,
    encontrados: linhas.length,
    gravados: novos,
    novos,
    erro: null,
    duracaoMs: Date.now() - inicio,
  }
}

/**
 * Panorama para a tela: as entradas mais recentes e as contagens da janela.
 * `dias` limita a janela (padrão 90) e `limite` a lista (padrão 30).
 */
export async function panoramaKev({ dias = 90, limite = 30 } = {}) {
  const desde = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
  const [totais, fabricantes, recentes] = await Promise.all([
    get(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN date_added >= ? THEN 1 ELSE 0 END) AS janela,
              SUM(CASE WHEN date_added >= ? AND ransomware_use = 'Known' THEN 1 ELSE 0 END) AS ransomware,
              MAX(date_added) AS ultima
         FROM kev_vulnerabilities`,
      [desde, desde],
    ),
    all(
      `SELECT vendor, COUNT(*) AS n FROM kev_vulnerabilities
        WHERE date_added >= ? AND vendor IS NOT NULL
        GROUP BY vendor ORDER BY n DESC, vendor LIMIT 8`,
      [desde],
    ),
    all(
      `SELECT cve_id, vendor, product, name, description, date_added, ransomware_use
         FROM kev_vulnerabilities
        ORDER BY date_added DESC, cve_id DESC LIMIT ?`,
      [limite],
    ),
  ])
  return {
    dias,
    total: Number(totais?.total || 0),
    naJanela: Number(totais?.janela || 0),
    comRansomware: Number(totais?.ransomware || 0),
    ultimaInclusao: totais?.ultima || null,
    fabricantes: fabricantes.map((f) => ({ fabricante: f.vendor, total: Number(f.n) })),
    recentes: recentes.map((r) => ({
      cve: r.cve_id,
      fabricante: r.vendor,
      produto: r.product,
      nome: r.name,
      descricao: r.description,
      incluidaEm: r.date_added,
      usoEmRansomware: r.ransomware_use === 'Known',
      url: `${PAGINA_CVE}${r.cve_id}`,
    })),
  }
}

export default { coletarKev, panoramaKev, normalizarKev }
