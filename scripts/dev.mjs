// -----------------------------------------------------------------------------
// SOBE OS DOIS PROCESSOS COM UM COMANDO SÓ.
//
// Poderia ser `concurrently`, mas isso acrescentaria uma dependência para fazer
// o que 50 linhas de `child_process` fazem. Num projeto cujo servidor não tem
// dependência de coleta, seria incoerente.
//
//   npm run dev   → API em :3001 e interface em :5173
//   Ctrl+C        → derruba os dois juntos
// -----------------------------------------------------------------------------
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const noWindows = process.platform === 'win32'
const npm = noWindows ? 'npm.cmd' : 'npm'

const COR = { api: '\x1b[36m', web: '\x1b[35m', reset: '\x1b[0m', fraco: '\x1b[2m' }

/** Prefixa cada linha com o nome do processo, para não confundir as saídas. */
function encaminhar(nome, fluxo) {
  let buffer = ''
  fluxo.on('data', (pedaco) => {
    buffer += pedaco.toString()
    const linhas = buffer.split('\n')
    buffer = linhas.pop()
    linhas.forEach((l) => {
      if (l.trim()) process.stdout.write(`${COR[nome]}[${nome}]${COR.reset} ${l}\n`)
    })
  })
}

const filhos = []

/**
 * Ambiente de cada filho.
 *
 * A API e o Vite leem a MESMA variavel PORT. Rodando os dois juntos, uma PORT
 * definida no ambiente faria os dois tentarem a mesma porta e o segundo
 * morreria — com uma mensagem que nao explica a causa.
 *
 * Quem define PORT quase sempre quer mudar a porta da API, entao ela fica com
 * a variavel e o Vite volta ao proprio padrao.
 */
function ambientePara(nome) {
  if (nome !== 'web') return process.env
  const { PORT, ...resto } = process.env
  return resto
}

function iniciar(nome, cwd, args) {
  // No Windows, `npm` é um .cmd e precisa de shell. Passar argumentos separados
  // COM shell ativo é o que o Node avisa como arriscado (DEP0190): eles seriam
  // apenas concatenados, sem escape. Aqui os argumentos são literais fixos
  // deste script, então montar a linha é seguro — e o aviso some junto com a
  // ambiguidade que o motivou.
  const filho = noWindows
    ? spawn(`${npm} ${args.join(' ')}`, { cwd, shell: true, env: ambientePara(nome) })
    : spawn(npm, args, { cwd, env: ambientePara(nome) })

  encaminhar(nome, filho.stdout)
  encaminhar(nome, filho.stderr)
  filho.on('exit', (codigo) => {
    if (codigo !== 0 && codigo !== null) {
      process.stdout.write(`${COR[nome]}[${nome}]${COR.reset} saiu com código ${codigo}\n`)
    }
    encerrar()
  })
  filhos.push(filho)
  return filho
}

let encerrando = false
function encerrar() {
  if (encerrando) return
  encerrando = true
  filhos.forEach((f) => { try { f.kill() } catch { /* já morreu */ } })
  process.exit(0)
}

process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)

console.log(`${COR.fraco}DefesaBR Intelligence — subindo API e interface…${COR.reset}`)
iniciar('api', join(raiz, 'server'), ['run', 'dev'])
iniciar('web', raiz, ['run', 'dev:web'])
