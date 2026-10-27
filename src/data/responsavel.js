// Quem responde pelo site. Usado na página Sobre, na Metodologia e no rodapé.
export const RESPONSAVEL = {
  github: 'tue3306',
  githubUrl: 'https://github.com/tue3306',
  email: 'hoffmann3701@gmail.com',
  repoUrl: 'https://github.com/tue3306/defesabr-intelligence',
}

/** Link para um arquivo do código-fonte no GitHub. */
export const codigoFonte = (caminho) => `${RESPONSAVEL.repoUrl}/blob/main/${caminho}`
