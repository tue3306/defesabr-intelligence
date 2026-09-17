import { request } from './client'

// -----------------------------------------------------------------------------
// MUNDO & CONFLITOS
//
// O acervo tinha uma lente só — a defesa do Brasil — e ela decidia na ENTRADA o
// que era gravado. Matéria sobre a guerra na Ucrânia ou sobre o Pentágono era
// descartada antes de existir, e por isso nenhuma tela conseguia mostrá-la. A
// lente mundial (`server/src/lib/mundo.js`) passou a gravar essas matérias, e
// as rotas `/api/mundo/*` as servem.
//
// As rotas não passam pela ponte (`apiBridge`): a forma da resposta já sai do
// servidor pronta para a tela, e não há transformação a fazer. Vão pelo HTTP
// direto de `request()`, com a sessão no cabeçalho.
//
// Nome de país vai na URL com `encodeURIComponent`: os nomes do catálogo são os
// do world-atlas, em inglês e com espaço ("United States of America"), e o
// `request()` separa método e caminho por espaço — um nome cru quebraria a rota.
// -----------------------------------------------------------------------------

/** Parâmetros opcionais: vazio não viaja (o `request()` já ignora vazios). */
const filtros = ({ days, page, pais, teatro, idioma, urgencia, q } = {}) => ({
  days, page, pais, teatro, idioma, urgencia, q,
})

export const worldService = {
  /** Panorama: totais, teatros do catálogo, países mais citados e destaques. */
  panorama: (days) => request('GET /mundo/panorama', { params: { days } }),

  /** Dossiê mundial de um país — `nome` é a chave do catálogo (world-atlas). */
  pais: (nome, { days, page, teatro, idioma } = {}) =>
    request(`GET /mundo/pais/${encodeURIComponent(nome)}`, { params: filtros({ days, page, teatro, idioma }) }),

  /** Um teatro de conflito do catálogo, pelo id fixo. */
  teatro: (id, { days, page, pais, idioma } = {}) =>
    request(`GET /mundo/teatro/${encodeURIComponent(id)}`, { params: filtros({ days, page, pais, idioma }) }),

  /** Feed internacional paginado, com filtros. */
  feed: (opcoes = {}) => request('GET /mundo/feed', { params: filtros(opcoes) }),

  /** Como a lente decide: versão, regra, regras de cada teatro e fontes. */
  metodo: () => request('GET /mundo/metodo'),
}

// ─────────────────────────────────────────────────────────────────────────────
// NOME DE TEATRO A PARTIR DO ID
//
// A notícia traz `teatros: ["russia-ucrania"]` — o id, não o nome. O feed e as
// páginas de país e de teatro precisam do nome para o selo, e nenhuma dessas
// respostas traz o catálogo inteiro. O método traz, e ele não muda enquanto a
// página está aberta: uma consulta por sessão, compartilhada. Falha não fica
// guardada — a próxima tela tenta de novo, e enquanto isso o selo mostra o id.
// ─────────────────────────────────────────────────────────────────────────────
let nomesEmVoo = null

export function nomesDosTeatros() {
  if (!nomesEmVoo) {
    nomesEmVoo = worldService.metodo()
      .then(({ data }) => Object.fromEntries((data?.teatros || []).map((t) => [t.id, t.nome])))
      .catch(() => {
        nomesEmVoo = null
        return {}
      })
  }
  return nomesEmVoo
}

export default worldService
