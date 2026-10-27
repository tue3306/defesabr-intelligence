import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { bancoLimpo } from './ajuda.js'
import { run, fecharBanco } from '../src/db/index.js'
import { normalizarKev, panoramaKev } from '../src/collectors/kev.js'

before(bancoLimpo)
after(fecharBanco)

test('normalizarKev recusa entrada sem CVE válido ou sem data', () => {
  assert.equal(normalizarKev({ cveID: 'nada', dateAdded: '2026-01-01' }), null)
  assert.equal(normalizarKev({ cveID: 'CVE-2026-1234', dateAdded: '01/01/2026' }), null)
  const l = normalizarKev({
    cveID: 'cve-2026-1234', dateAdded: '2026-01-02', vendorProject: 'Acme', product: 'X',
    vulnerabilityName: 'Acme X RCE', knownRansomwareCampaignUse: 'Known',
  })
  assert.equal(l[0], 'CVE-2026-1234')
  assert.equal(l[7], 'Known')
})

test('panoramaKev conta a janela e o uso em ransomware', async () => {
  const hoje = new Date().toISOString().slice(0, 10)
  await run(`INSERT INTO kev_vulnerabilities (cve_id, vendor, date_added, ransomware_use) VALUES
    ('CVE-2026-0001', 'Acme', ?, 'Known'), ('CVE-2026-0002', 'Acme', ?, 'Unknown'),
    ('CVE-2020-0003', 'Velha', '2021-11-03', 'Known')`, [hoje, hoje])
  const p = await panoramaKev({ dias: 30, limite: 2 })
  assert.equal(p.total, 3)
  assert.equal(p.naJanela, 2)
  assert.equal(p.comRansomware, 1)
  assert.deepEqual(p.fabricantes, [{ fabricante: 'Acme', total: 2 }])
  assert.equal(p.recentes.length, 2)
  assert.match(p.recentes[0].url, /^https:\/\/nvd\.nist\.gov\/vuln\/detail\/CVE-2026-000/)
})
