import { Router } from 'express'

// -----------------------------------------------------------------------------
// ROTEADOR COM ROTAS ASSÍNCRONAS
//
// Com o Postgres, toda rota que toca o banco passou a ser `async`. O Express 4
// não olha a promessa que um handler devolve: uma consulta que falha vira
// rejeição sem dono, o processo só registra e a requisição fica PENDURADA até o
// cliente desistir — nada de 500, nada no tratador de erros do app.
//
// Escrever `try { … } catch (err) { next(err) }` em cada uma das dezenas de
// rotas resolve, mas basta esquecer em uma para o defeito voltar, e o
// esquecimento não aparece em teste nenhum até o banco falhar de verdade. Este
// envoltório faz o encaminhamento uma vez, no registro da rota: o que a rota
// rejeitar chega a `next(err)` e sai como 500 JSON pelo tratador de `app.js`.
//
// Tratadores de erro (quatro argumentos) passam intactos: o Express os
// reconhece pela aridade, e embrulhá-los esconderia isso.
// -----------------------------------------------------------------------------

const METODOS = ['get', 'post', 'put', 'patch', 'delete', 'all']

/** Encaminha a rejeição do handler para `next`, sem mudar o que ele faz. */
function encaminharErros(handler) {
  if (typeof handler !== 'function' || handler.length === 4) return handler
  return function rotaAssincrona(req, res, next) {
    const resultado = handler(req, res, next)
    if (resultado && typeof resultado.catch === 'function') resultado.catch(next)
    return resultado
  }
}

/** `Router()` do Express cujas rotas encaminham rejeições para `next(err)`. */
export function roteador() {
  const router = Router()
  for (const metodo of METODOS) {
    const registrar = router[metodo].bind(router)
    router[metodo] = (caminho, ...handlers) => registrar(caminho, ...handlers.flat().map(encaminharErros))
  }
  return router
}

export default roteador
