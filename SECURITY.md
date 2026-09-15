# 🔐 Política de Segurança

## Contexto do projeto

O **DefesaBR Intelligence** tem servidor próprio (Node + SQLite) que coleta fontes públicas e guarda
contas: nome de exibição, nome de usuário, senha como hash scrypt, papel, situação, pasta de
favoritos, o estado de leitura das notificações e a trilha de atos de administração. Os dados
coletados são públicos; os de conta, não.

Relatos responsáveis são bem-vindos.

## Versões suportadas

| Versão | Suportada |
|--------|-----------|
| 2.x    | ✅        |
| 1.x    | ❌        |

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

- 🔑 **Nunca** commite chaves nem senhas. O `.env` está no `.gitignore`; use `.env.example` como
  modelo. `AUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` e as chaves de agregador ficam no
  painel de quem hospeda — este repositório é público.
- 🧹 Revogue imediatamente qualquer chave exposta.

## Contas

Não há conta com senha publicada. A conta de administrador da instalação é criada na primeira
subida a partir de `ADMIN_USERNAME` e `ADMIN_PASSWORD`; sem as duas variáveis, nenhuma conta de
administrador existe e o servidor avisa no boot. A senha é trocada depois em *Minha conta →
Segurança*, e a variável não a sobrescreve.

Versões anteriores semeavam `admin123` e `usuario123` com senha igual ao nome de usuário. Ao subir,
o servidor **remove** essas contas — ou renomeia a de administrador para o `ADMIN_USERNAME`
configurado, preservando a trilha de auditoria. Instalação antiga com volume montado não fica com a
porta destrancada depois da atualização.

## Escopo

Relatos mais úteis envolvem: contorno de `exigirPapel()` ou das travas de governança, sessão que
sobrevive a suspensão ou troca de senha, acesso às notificações ou à pasta de outra conta, XSS via
conteúdo coletado de feeds, e dependências vulneráveis.


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
