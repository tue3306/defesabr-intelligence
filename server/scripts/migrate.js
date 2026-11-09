import pg from 'pg'
import config from '../src/config.js'
import { aplicarMigracoes } from '../src/db/migracoes.js'
import { opcoesDoCliente } from '../src/db/conexao.js'

// Aplica as migrações de db/migrations no banco de DATABASE_URL e, em seguida, a
// semeadura (fontes padrão, conta de administrador, versão da lente mundial).
//
// NÃO é obrigatório num deploy: a subida do servidor (src/index.js) já faz as
// duas coisas antes de abrir a porta. Este script serve a quem precisa migrar
// SEM reiniciar a aplicação, ou de fora do projeto — da sua máquina, com a
// DATABASE_PUBLIC_URL do Railway.
//
// As migrações usam um `pg.Client` próprio, e não o pool do adaptador: assim o
// esquema existe antes de qualquer módulo que consulta o banco ser carregado.
// A semeadura entra por import dinâmico DEPOIS, pelo mesmo motivo.
// Mesmo TLS do pool (db/conexao.js): de fora do projeto a conexão é remota.
const cliente = new pg.Client(opcoesDoCliente({ url: config.banco.url, env: process.env }))

try {
  await cliente.connect()
  const { aplicadas, puladas } = await aplicarMigracoes(cliente)
  console.log(aplicadas.length ? `Aplicadas: ${aplicadas.join(', ')}` : 'Banco já está em dia.')
  // `puladas` é sempre vazia hoje (nenhuma migração depende de extensão
  // opcional), mas imprimir o que foi pulado em silêncio é o que impede um
  // esquema incompleto passar por "Banco já está em dia".
  if (puladas.length) console.log(`Puladas: ${puladas.join(', ')}`)
} catch (erro) {
  console.error(erro.message)
  process.exitCode = 1
} finally {
  await cliente.end()
}

if (!process.exitCode) {
  const { semearTudo } = await import('../src/db/semear.js')
  const { fecharBanco } = await import('../src/db/index.js')
  try {
    const { fontes, contas, lenteReavaliada } = await semearTudo()
    if (fontes) console.log(`Fontes: ${fontes} cadastrada(s).`)
    if (contas.criadas) console.log('Contas: administrador criado (ADMIN_USERNAME).')
    if (contas.assumidas) console.log('Contas: administrador assumido pelo ambiente.')
    if (contas.removidas) console.log(`Contas: ${contas.removidas} conta(s) pública(s) antiga(s) removida(s).`)
    for (const aviso of contas.avisos) console.log(`Contas: ${aviso}`)
    if (lenteReavaliada) console.log('Lente mundial: versão nova, acervo marcado para reavaliação.')
  } catch (erro) {
    console.error(erro.message)
    process.exitCode = 1
  } finally {
    await fecharBanco()
  }
}
