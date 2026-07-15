# 🤝 Guia de contribuição — DefesaBR Intelligence

Obrigado pelo interesse em contribuir! Este é um projeto **demonstrativo** (proof of concept),
100% front-end. As contribuições devem preservar esse caráter e **não** alterar a lógica que já
funciona sem necessidade.

## 📋 Índice

- [Código de conduta](#código-de-conduta)
- [Como reportar bugs](#como-reportar-bugs)
- [Como sugerir melhorias](#como-sugerir-melhorias)
- [Ambiente de desenvolvimento](#ambiente-de-desenvolvimento)
- [Padrões de código](#padrões-de-código)
- [Convenção de commits](#convenção-de-commits)
- [Processo de Pull Request](#processo-de-pull-request)

## Código de conduta

Ao participar, você concorda em seguir o nosso [Código de Conduta](CODE_OF_CONDUCT.md).

## Como reportar bugs

Abra uma [issue de bug](https://github.com/tue3306/defesabr-intelligence/issues/new?template=bug_report.yml)
incluindo:

- Passos para reproduzir
- Comportamento esperado × comportamento observado
- Navegador / sistema operacional
- Captura de tela ou log do console, se possível

## Como sugerir melhorias

Abra uma [issue de melhoria](https://github.com/tue3306/defesabr-intelligence/issues/new?template=feature_request.yml)
descrevendo o problema que a sugestão resolve e o comportamento desejado.

## Ambiente de desenvolvimento

Pré-requisito: **Node.js 18+**.

```bash
git clone https://github.com/tue3306/defesabr-intelligence.git
cd defesabr-intelligence
npm install
npm run dev      # http://localhost:5173
```

Antes de abrir um PR, **sempre** garanta que o projeto compila:

```bash
npm run build
```

## Padrões de código

- **React 18 + Vite** com componentes funcionais e hooks.
- Mantenha o **design system** existente (tokens do `tailwind.config.js` e `src/index.css`).
- Organize por domínio, seguindo a estrutura de `src/` descrita em [ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Degradação graciosa:** toda integração externa deve ter `timeout`, `retry` e **fallback mockado**.
- Evite introduzir dependências pesadas sem necessidade.
- Não commite segredos. `.env` está no `.gitignore` — use `.env.example` como referência.

## Convenção de commits

Utilize [Conventional Commits](https://www.conventionalcommits.org/):

| Tipo | Uso |
|------|-----|
| `feat:` | nova funcionalidade |
| `fix:` | correção de bug |
| `docs:` | apenas documentação |
| `style:` | formatação, sem mudança de lógica |
| `refactor:` | refatoração sem mudança de comportamento |
| `chore:` | build, dependências, tooling |

Exemplo: `docs: adiciona seção de troubleshooting no README`

## Processo de Pull Request

1. Faça um fork e crie uma branch descritiva: `git checkout -b feat/minha-melhoria`
2. Faça commits pequenos e semânticos.
3. Rode `npm run build` e confirme que compila sem erros.
4. Atualize a documentação afetada (README, CHANGELOG, etc.).
5. Abra o PR preenchendo o [template](.github/PULL_REQUEST_TEMPLATE.md) e vinculando a issue.

Obrigado por ajudar a melhorar o projeto! 🛡️
