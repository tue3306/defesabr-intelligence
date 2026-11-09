// Quem responde pelo site. Usado na página Sobre, na Metodologia e no rodapé.
export const RESPONSAVEL = {
  github: 'tue3306',
  githubUrl: 'https://github.com/tue3306',
  email: 'hoffmann3701@gmail.com',
  repoUrl: 'https://github.com/tue3306/defesabr-intelligence',
  // Endereço público da plataforma, para quem quiser abrir ou repassar.
  //
  // Fica aqui, e não espalhado pelas telas, porque é a mesma informação que o
  // README publica: um lugar só para trocar no dia em que houver domínio
  // próprio. `location.origin` não serviria — quem está lendo pode ter aberto
  // por outro endereço, e o que se quer mostrar é o canônico.
  siteUrl: 'https://defesabr-intelligence-production-889d.up.railway.app',
}

/** O endereço do site sem o `https://`, que é como se escreve para alguém ler. */
export const siteHost = RESPONSAVEL.siteUrl.replace(/^https?:\/\//, '')

/** Link para um arquivo do código-fonte no GitHub. */
export const codigoFonte = (caminho) => `${RESPONSAVEL.repoUrl}/blob/main/${caminho}`
