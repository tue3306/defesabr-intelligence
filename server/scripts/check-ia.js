// -----------------------------------------------------------------------------
// A CONFERÊNCIA CONTRA ALUCINAÇÃO — provada, não prometida
//
// O recurso de análise assistida faz uma promessa forte: o modelo escreve a
// prosa, mas nenhuma entidade brasileira que ele nomear aparece na tela sem
// existir de verdade na matéria correspondente.
//
// Uma promessa dessas não vale nada sem teste. Esta suíte forja respostas de
// modelo — incluindo alucinações deliberadas — e confere que `conferirCitacoes`
// as remove e as conta.
//
// NÃO CHAMA A API. É lógica pura sobre entrada conhecida, então roda sem chave,
// sem rede e sem custo — o que a torna executável em CI e por quem clona.
//
//   node server/scripts/check-ia.js
// -----------------------------------------------------------------------------
import { conferirCitacoes } from '../src/services/ia.js'

const cor = (t, c) => `[${c}m${t}[0m`

// As matérias que teriam sido enviadas, com a lista FECHADA de entidades que o
// detector determinístico encontrou em cada uma.
const ITENS = [
  {
    id: 101,
    titulo: 'Nuclep conclui seção do casco do submarino nuclear',
    entidades: [
      { nome: 'Nuclep', tipo: 'empresa' },
      { nome: 'Marinha do Brasil', tipo: 'orgao' },
    ],
  },
  {
    id: 102,
    titulo: 'Exportações da indústria de defesa crescem no trimestre',
    entidades: [{ nome: 'Embraer', tipo: 'empresa' }],
  },
  {
    id: 103,
    titulo: 'Nota do Ministério da Defesa sobre a fronteira norte',
    entidades: [],
  },
]

const CASOS = [
  {
    nome: 'entidade real passa',
    resposta: {
      leitura: 'As três matérias tratam da base industrial. [1][2]',
      itens: [{ n: 1, contexto: 'ctx', impacto: 'imp', entidades: ['Nuclep'] }],
    },
    espera: { descartadas: 0, citadasNoItem1: ['Nuclep'] },
  },
  {
    nome: 'entidade INVENTADA é removida e contada',
    resposta: {
      itens: [{ n: 1, contexto: 'ctx', impacto: 'imp', entidades: ['Nuclep', 'Petrobras'] }],
    },
    espera: { descartadas: 1, citadasNoItem1: ['Nuclep'] },
  },
  {
    nome: 'entidade de OUTRA matéria não vale para esta',
    // "Embraer" existe no acervo, mas na matéria 102 — citá-la na 101 é erro.
    resposta: {
      itens: [{ n: 1, contexto: 'ctx', impacto: 'imp', entidades: ['Embraer'] }],
    },
    espera: { descartadas: 1, citadasNoItem1: [] },
  },
  {
    nome: 'acento e caixa não fazem diferença',
    resposta: {
      itens: [{ n: 1, contexto: 'ctx', impacto: 'imp', entidades: ['marinha do brasil'] }],
    },
    espera: { descartadas: 0, citadasNoItem1: ['marinha do brasil'] },
  },
  {
    nome: 'matéria sem entidade nenhuma recusa qualquer citação',
    resposta: {
      itens: [{ n: 3, contexto: 'ctx', impacto: 'imp', entidades: ['Ministério da Defesa'] }],
    },
    espera: { descartadas: 1 },
  },
  {
    nome: 'item com índice inexistente é descartado inteiro',
    resposta: {
      itens: [
        { n: 1, contexto: 'ctx', impacto: 'imp', entidades: [] },
        { n: 99, contexto: 'inventado', impacto: 'inventado', entidades: ['Vale'] },
      ],
    },
    espera: { descartadas: 0, respondidos: 1 },
  },
  {
    nome: 'resposta sem lista de itens é recusada',
    resposta: { leitura: 'só prosa, sem itens' },
    espera: { nulo: true },
  },
  {
    nome: 'campo de entidades ausente não quebra',
    resposta: { itens: [{ n: 2, contexto: 'ctx', impacto: 'imp' }] },
    espera: { descartadas: 0, respondidos: 1 },
  },
]

let passaram = 0
let falharam = 0

console.log(`\n  Conferência contra alucinação — ${CASOS.length} casos\n`)

for (const caso of CASOS) {
  const r = conferirCitacoes(caso.resposta, ITENS)
  const e = caso.espera
  const problemas = []

  if (e.nulo) {
    if (r !== null) problemas.push(`esperava null, veio ${JSON.stringify(r)?.slice(0, 60)}`)
  } else {
    if (r === null) {
      problemas.push('veio null')
    } else {
      if (e.descartadas !== undefined && r.verificacao.entidadesDescartadas !== e.descartadas) {
        problemas.push(`descartadas: esperava ${e.descartadas}, veio ${r.verificacao.entidadesDescartadas}`)
      }
      if (e.respondidos !== undefined && r.verificacao.itensRespondidos !== e.respondidos) {
        problemas.push(`itens respondidos: esperava ${e.respondidos}, veio ${r.verificacao.itensRespondidos}`)
      }
      if (e.citadasNoItem1 !== undefined) {
        const veio = r.itens.find((i) => i.n === 1)?.entidadesCitadas || []
        if (JSON.stringify(veio) !== JSON.stringify(e.citadasNoItem1)) {
          problemas.push(`citadas: esperava ${JSON.stringify(e.citadasNoItem1)}, veio ${JSON.stringify(veio)}`)
        }
      }
    }
  }

  const ok = problemas.length === 0
  ok ? (passaram += 1) : (falharam += 1)
  console.log(`  ${ok ? cor('  ok  ', 32) : cor(' FALHA', 31)}  ${caso.nome}`)
  problemas.forEach((p) => console.log(`          ${p}`))
}

console.log(`\n${'─'.repeat(56)}`)
console.log(`  ${passaram} passaram · ${falharam} falharam\n`)
process.exit(falharam ? 1 : 0)
