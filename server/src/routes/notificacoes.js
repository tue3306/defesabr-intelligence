import { Router } from 'express'
import { exigirPapel } from '../lib/auth.js'
import { limite } from '../lib/parametros.js'
import {
  listarNotificacoes, notificacaoVisivel, marcarLida, marcarNaoLida, dispensar, marcarTodasLidas,
} from '../lib/notificacoes.js'

// -----------------------------------------------------------------------------
// NOTIFICAÇÕES DA CONTA
//
//   GET    /api/notifications            avisos visíveis e quantos estão por ler
//   POST   /api/notifications/read-all   marca todos como lidos
//   POST   /api/notifications/:id/read   marca um como lido
//   DELETE /api/notifications/:id/read   volta a não lido
//   DELETE /api/notifications/:id        dispensa (some da lista desta conta)
//
// Os avisos são gerados pela coleta (ver lib/notificacoes.js); aqui só se lê e
// se guarda o que cada conta fez com eles.
// -----------------------------------------------------------------------------

const router = Router()

router.get('/notifications', exigirPapel('user'), (req, res) => {
  res.json(listarNotificacoes(req.conta, { limite: limite(req.query.limit, 50, 200) }))
})

router.post('/notifications/read-all', exigirPapel('user'), (req, res) => {
  const alteradas = marcarTodasLidas(req.conta)
  res.json({ ok: true, alteradas, ...listarNotificacoes(req.conta) })
})

/** Carrega o id e confere que a conta enxerga o aviso. */
function alvo(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Identificador de notificação inválido.' })
    return null
  }
  // 404 tanto para inexistente quanto para aviso de outro papel: dizer "existe,
  // mas não é para você" revelaria o que o administrador recebe.
  if (!notificacaoVisivel(req.conta, id)) {
    res.status(404).json({ error: 'Notificação não encontrada.' })
    return null
  }
  return id
}

router.post('/notifications/:id/read', exigirPapel('user'), (req, res) => {
  const id = alvo(req, res)
  if (!id) return
  marcarLida(req.conta, id)
  res.json({ ok: true, id, read: true })
})

router.delete('/notifications/:id/read', exigirPapel('user'), (req, res) => {
  const id = alvo(req, res)
  if (!id) return
  marcarNaoLida(req.conta, id)
  res.json({ ok: true, id, read: false })
})

router.delete('/notifications/:id', exigirPapel('user'), (req, res) => {
  const id = alvo(req, res)
  if (!id) return
  dispensar(req.conta, id)
  res.json({ ok: true, id, dismissed: true })
})

export default router
