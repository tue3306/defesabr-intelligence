# 🔐 Política de Segurança

## Contexto do projeto

O **DefesaBR Intelligence** é um projeto **demonstrativo (proof of concept), 100% front-end**. Ele
**não possui backend**, não armazena dados de usuários em servidor e não processa informações
sensíveis reais. A autenticação é **simulada** e todos os dados são **ilustrativos**.

Ainda assim, levamos a segurança a sério e agradecemos relatos responsáveis.

## Versões suportadas

| Versão | Suportada |
|--------|-----------|
| 1.x    | ✅        |

## Como reportar uma vulnerabilidade

**Por favor, não abra uma issue pública para vulnerabilidades de segurança.**

1. Use o canal privado do GitHub em **Security → Report a vulnerability**
   ([Private Vulnerability Reporting](https://github.com/tue3306/defesabr-intelligence/security/advisories/new)), ou
2. Entre em contato de forma privada com o mantenedor.

Inclua, sempre que possível:

- Descrição da vulnerabilidade e do impacto
- Passos para reproduzir
- Versão / commit afetado
- Sugestão de correção (opcional)

Faremos o possível para responder em tempo razoável e manter você informado sobre a correção.

## Boas práticas de chaves de API

Este projeto pode usar chaves de API (ex.: Anthropic, Alpha Vantage) de forma **opcional**:

- 🔑 **Nunca** commite chaves. O arquivo `.env` já está no `.gitignore`; use `.env.example` como modelo.
- 🌐 Em demonstração, a chamada de IA é feita **direto do navegador** — o que **expõe a chave**.
  Em produção real, **nunca** exponha chaves no front-end: encaminhe as chamadas por um **backend/proxy**.
- 💳 Utilize apenas **chaves descartáveis** e com **limite de gasto** configurado.
- 🧹 Revogue imediatamente qualquer chave que tenha sido exposta acidentalmente.

## Escopo

Por ser um front-end estático com dados mockados, o modelo de ameaça é limitado. Relatos mais úteis
envolvem: XSS via conteúdo renderizado, vazamento de chaves configuradas pelo usuário, dependências
com vulnerabilidades conhecidas e problemas de configuração de deploy.


## Dependências: o que `npm audit` acusa, e por quê continua aqui

Rodar `npm audit --omit=dev` na raiz devolve **2 vulnerabilidades moderadas**, as
duas no `react-router`. Elas continuam no projeto por decisão, e a decisão está
escrita aqui para poder ser contestada — um aviso de segurança sem análise de
alcance é só um número vermelho que ninguém sabe interpretar.

O servidor (`server/`) devolve **zero**.

### O que foi corrigido

**`d3-color` — ReDoS, severidade alta.** Vinha por transitividade dupla:
`react-simple-maps → d3-zoom → d3-interpolate@2` e `recharts → victory-vendor →
d3-interpolate@3`. A correção existe em `d3-color@3.1.0`, mas a primeira cadeia
declara `"1 - 2"` e não aceitaria a versão corrigida sozinha.

Resolvido com `overrides` no `package.json` — a mesma técnica já usada para o
`qs` no servidor. Como isso põe uma versão fora da faixa declarada sob
`d3-interpolate@2`, o resultado foi **verificado no navegador** em vez de
assumido: o mapa renderiza as cinco cores da rampa com o Brasil em verde-marca,
e os gráficos desenham 3 superfícies com 14 formas. Nada quebrou.

### O que permanece, e por quê

As duas moderadas restantes exigem **react-router 7.18.3**. O projeto usa
`react-router-dom@6.30.6`, e não existe correção na linha 6 — o único caminho é
uma troca de MAJOR, que muda API e é exatamente o tipo de mudança que quebra uma
aplicação funcionando. Antes de pagar esse preço, o que importa é se as falhas
são **alcançáveis aqui**:

| Aviso | Alcançável neste projeto? |
|---|---|
| Open redirect via barra invertida em `<Link>` / `useNavigate` | **Não.** Exige caminho controlado por quem ataca chegando ao roteador. Todo `to=` vem de catálogo interno (`Sidebar`, `PublicLayout`, `App`); nenhum valor de usuário, de query string ou de feed vira rota. A aplicação ainda usa `HashRouter`. |
| Injeção de construtor em `deserializeErrors()` na hidratação SSR | **Não.** Não há SSR. `renderToString`, `hydrateRoot` e `StaticRouter` não aparecem em lugar nenhum do código — a aplicação é 100% cliente. |

A migração para o react-router 7 está no roadmap como manutenção, não como
correção urgente. Se você encontrar um caminho que torne qualquer uma das duas
alcançável, é exatamente o tipo de coisa que vale reportar.

### Como conferir

```bash
npm audit --omit=dev              # raiz: 2 moderadas, ambas react-router
npm --prefix server audit --omit=dev   # servidor: 0
```
