import { get, run } from '../db/index.js'
import { hashSenha, senhaConfere } from './auth.js'

// -----------------------------------------------------------------------------
// ADOÇÃO DA INSTALAÇÃO — o caminho de quem não tem como definir variáveis
//
// O caminho normal para existir um administrador é `ADMIN_USERNAME` /
// `ADMIN_PASSWORD` no ambiente. Num deploy onde essas variáveis não chegaram, a
// plataforma sobe **sem ninguém que a administre** — e a tela de entrada
// responde "usuário ou senha incorretos" a quem tenta, porque a conta de fato
// não existe. Foi o que aconteceu num deploy real: o disco do Railway é
// efêmero, cada publicação recria o banco vazio, e sem as variáveis nenhuma
// conta de administrador voltava.
//
// A ADOÇÃO É A SAÍDA, e ela só existe enquanto o problema existe:
//
//   • só funciona quando NÃO HÁ administrador ativo na instalação;
//   • exige um CÓDIGO DE ADOÇÃO que só o dono tem;
//   • criado o administrador, a rota se fecha sozinha — com um administrador
//     ativo, ela responde 409 e não olha mais o código.
//
// O QUE ESTÁ NESTE ARQUIVO NÃO É O CÓDIGO: é o hash scrypt dele, com sal. O
// repositório é público, e um hash scrypt de um código aleatório de 16
// caracteres não volta a ser o código. Quem tem o hash não tem a chave.
//
// Para trocar o código, gere outro e substitua as duas constantes:
//
//   node -e "import('./src/lib/auth.js').then(async ({hashSenha}) => { \
//     const c = 'SEU-CODIGO'; console.log(await hashSenha(c)) })"
//
// Para desligar a adoção de vez, defina `ADMIN_CLAIM_DISABLED=1` — ou apenas
// configure `ADMIN_USERNAME`/`ADMIN_PASSWORD`, que é o caminho recomendado:
// com eles, o administrador volta a existir a cada subida, sem intervenção.
// -----------------------------------------------------------------------------

const CODIGO_SAL = 'f9c6b1141261e626b678e873cf131b3e'
const CODIGO_HASH = 'f44e35602fde24013dae31747c31a7efc817e47f68d459ab3194f2adf530705549c2e4c9f7fa0c80a71228bd97150ea469a277c7f2931d8920c6633341d35b84'

const desligada = () => process.env.ADMIN_CLAIM_DISABLED === '1'

const administradoresAtivos = () =>
  get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND COALESCE(status, 'ativo') = 'ativo'")?.n ?? 0

/** A instalação está sem dono e aceita ser adotada? */
export function adocaoDisponivel() {
  return !desligada() && administradoresAtivos() === 0
}

/** O código confere? Comparação em tempo constante, como a de senha. */
export const codigoConfere = (codigo) =>
  senhaConfere(String(codigo || '').trim().toUpperCase(), CODIGO_SAL, CODIGO_HASH)

/**
 * Cria (ou assume) a conta de administrador da instalação.
 *
 * Não confere o código nem a disponibilidade: quem chama faz isso — a rota
 * precisa responder diferente para cada caso.
 *
 * @returns {Promise<object>} a conta, como está no banco
 */
export async function adotarInstalacao({ username, password, emailDerivado }) {
  const { sal, hash } = await hashSenha(password)
  const existente = get('SELECT id FROM users WHERE username = ?', [username])

  if (existente) {
    run(
      `UPDATE users SET password_hash = ?, password_salt = ?, role = 'admin', status = 'ativo',
         sessoes_desde = ? WHERE id = ?`,
      [hash, sal, Date.now(), existente.id],
    )
    return get('SELECT * FROM users WHERE id = ?', [existente.id])
  }

  const info = run(
    `INSERT INTO users (name, username, email, password_hash, password_salt, role, plan, auth_provider)
     VALUES ('Administrador', ?, ?, ?, ?, 'admin', 'institucional', 'local')`,
    [username, emailDerivado(username), hash, sal],
  )
  return get('SELECT * FROM users WHERE id = ?', [info.lastInsertRowid])
}

export default { adocaoDisponivel, codigoConfere, adotarInstalacao }
