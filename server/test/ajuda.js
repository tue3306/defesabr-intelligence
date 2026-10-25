// Este arquivo precisa ser o PRIMEIRO import de todo teste: config.js lê
// DATABASE_URL uma vez, ao carregar, e um import anterior fixaria o banco de
// desenvolvimento. bancoLimpo() recria o schema inteiro — rodar contra o banco
// errado apagaria dados de verdade.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'postgres://defesabr:defesabr@localhost:54329/defesabr_test'
