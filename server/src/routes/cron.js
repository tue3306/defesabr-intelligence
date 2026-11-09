import { createHash, timingSafeEqual } from 'node:crypto'
import { roteador } from '../lib/roteador.js'
import config from '../config.js'
import { CADENCIA_MINUTOS, iniciarColeta } from '../collectors/index.js'

// -----------------------------------------------------------------------------
// ROTA DO CICLO — gatilho EXTERNO da coleta
//
// No Railway o processo fica de pé e o agendador interno
// (COLLECT_INTERVAL_MINUTES, ver collectors/index.js) já roda o ciclo sozinho.
// Esta rota é o caminho de fora: um Cron Service do Railway, um monitor, um
// `curl` de quem administra.
//
// A coleta leva 25–60 s e quem chama um webhook desiste em segundos. Por isso a
// rota responde 202 na hora e entrega o ciclo a `emSegundoPlano`
// (lib/segundoplano.js). Um arrendamento em banco impede ciclos sobrepostos
// (409).
// -----------------------------------------------------------------------------

const MIN_SEGREDO = 16

// SHA-256 dos dois lados antes do timingSafeEqual: ele exige buffers do mesmo
// tamanho, e comparar o comprimento à parte vazaria o do segredo.
const hash = (texto) => createHash('sha256').update(texto).digest()

function bearerConfere(cabecalho, segredo) {
  const prefixo = 'Bearer '
  if (typeof cabecalho !== 'string' || !cabecalho.startsWith(prefixo)) return false
  return timingSafeEqual(hash(cabecalho.slice(prefixo.length)), hash(segredo))
}

/**
 * `emSegundoPlano(promessa)`: recebe o ciclo em andamento.
 * `segredo` é injetável para teste (o `config` é lido uma vez no import);
 * sem a opção, vale `config.cron.segredo`.
 */
export function criarRotaCron({ emSegundoPlano, ...opcoes }) {
  const router = roteador()

  router.post('/cron/ciclo', async (req, res) => {
    const segredo = Object.hasOwn(opcoes, 'segredo') ? opcoes.segredo : config.cron.segredo
    if (!segredo || segredo.length < MIN_SEGREDO) {
      return res.status(503).json({ error: 'CRON_SECRET não configurado.' })
    }
    if (!bearerConfere(req.get('authorization'), segredo)) {
      return res.status(401).json({ error: 'Não autorizado.' })
    }

    const pedido = typeof req.query.coletor === 'string' ? req.query.coletor : ''
    const somente = pedido.split(',').map((s) => s.trim()).filter(Boolean)
    const desconhecidos = somente.filter((n) => !Object.hasOwn(CADENCIA_MINUTOS, n))
    if (desconhecidos.length) {
      return res.status(400).json({ error: `Coletor desconhecido: ${desconhecidos.join(', ')}.` })
    }

    // Gatilho 'agendado' (e não um próprio): é ele que respeita a cadência por
    // coletor — o cron roda a cada 5 min, a Câmara e o World Bank não.
    const coleta = await iniciarColeta('agendado', somente.length ? { somente } : {})
    if (!coleta) return res.status(409).json({ error: 'Já existe uma coleta em andamento.' })

    // O catch é obrigatório: a promessa entregue nunca pode virar rejeição sem
    // dono — desde o Node 15 isso derruba o processo.
    emSegundoPlano(coleta.concluido.catch((err) => {
      console.error('[cron] ciclo falhou:', err?.message || err)
    }))
    res.status(202).json({ aceito: true, somente: somente.length ? somente : null })
  })

  return router
}

export default criarRotaCron
