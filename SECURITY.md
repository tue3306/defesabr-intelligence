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
