import { Router } from 'express'
import { exigirPapel } from '../lib/auth.js'
import { TELAS, NIVEIS, CONCEITOS, NAO_FAZ, PRIMEIROS_PASSOS } from '../lib/guia.js'

// -----------------------------------------------------------------------------
// GET /api/guia — o guia escrito da plataforma, para o botão de ajuda
//
// Conteúdo estático de server/src/lib/guia.js. Exige sessão porque o botão só
// aparece para quem entrou; não há nada nele que precise ser escondido.
// -----------------------------------------------------------------------------

const router = Router()

router.get('/guia', exigirPapel('user'), (_req, res) => {
  res.json({
    telas: TELAS,
    niveis: NIVEIS,
    conceitos: CONCEITOS,
    naoFaz: NAO_FAZ,
    primeirosPassos: PRIMEIROS_PASSOS,
  })
})

export default router
