# 🏗️ Arquitetura — DefesaBR Intelligence

Um processo Node (Express + `node:sqlite`) serve a API em `/api` e a interface compilada
(React 18 + Vite 5) na mesma porta. O servidor coleta, filtra, correlaciona e guarda; a interface
lê por uma camada de serviços única e não tem dado local de reserva.

> Este documento descrevia uma SPA estática sem backend, com modo de dados "mock", latência
> simulada, serviço de fila do analista e dois eixos de permissão (papel × plano). Nada disso
> existe mais, e o texto foi reescrito para descrever o que existe.

---

## 🎯 Princípios

1. **O servidor protege; a interface só desenha.** Toda rota sensível passa por `exigirPapel()`.
   O menu esconder um item é conveniência.
2. **Uma única fronteira de dados.** Toda leitura passa por `src/services/`, que fala com a API e
   mais nada. Se a API não responde, a tela mostra erro — nunca um número plausível.
3. **Quatro estados sempre tratados.** Carregando · erro (com nova tentativa) · vazio · conteúdo,
   padronizados em `<DataState>`.
4. **Falha isolada.** `ErrorBoundary` por rota: um módulo quebrado não derruba a aplicação.
5. **Nada escrito por máquina sem marca.** Texto de modelo aparece rotulado; números nunca vêm de
   modelo.

---

## 🔐 Acesso

| Quem | Como | Alcança |
|------|------|---------|
| **Visitante** | sem sessão | página inicial, centro educacional, sobre |
| **Usuário** | papel `user` — toda conta do cadastro | leitura do acervo, pasta, assistente por IA com a própria chave |
| **Administrador** | papel `admin` | tudo, mais governança, método e coleta, disponibilidade das fontes |

**No servidor** (`server/src/lib/auth.js`): senha em scrypt com sal; token HMAC-SHA256 que só
**identifica**. `lerConta` lê papel, situação e `sessoes_desde` do banco a cada requisição — por isso
suspender, remover ou rebaixar vale na hora, e trocar a senha ou "encerrar as outras sessões" invalida
os tokens emitidos antes.

**Na interface** (`src/auth/permissions.js`): capacidades por papel, consultadas por `useCan()`,
`<Can>` e `<ProtectedRoute capability>`. Um 401 recebido com token enviado dispara
`defesabr:sessao-perdida`, e o `authStore` desfaz a sessão local e avisa.

**Governança** (`/api/users/:id`): duas travas no servidor — ninguém altera a própria conta, e a
instalação nunca fica sem administrador ativo. Cada ato vai para `audit_log`.

**Conta compartilhada**: `usuario123` com a senha documentada não troca nome, senha ou sessões e não
guarda chave de IA (`contaCompartilhada()` em `server/src/routes/auth.js`).

---

## 🗂️ Estrutura

```
server/src/
├── collectors/     rss · camara · indicators · bcb · comex · ransomware · atores · correlacoes · agendador
├── lib/            auth · auditoria · relevance · correlacao · entidades · chaveIa · segredoGuardado · guia
├── services/       status (capacidades derivadas do banco) · ia (chamadas ao modelo)
├── routes/         auth · news · data · intel · ia · system
└── db/             schema.sql + colunas incrementais (migração idempotente)

src/
├── services/       client.js (request) · apiBridge.js (endpoint da tela → rota da API) · domínio
├── auth/           permissions.js · useCan · <Can>
├── store/          authStore · newsStore (pasta, avisos, clippings arquivados) · settingsStore
├── hooks/          useResource · useNews · useIa · useDadosReais · useLiveNotifications
├── components/     layout · ui · charts · clipping · correlacoes · ia · guia · auth · system
└── pages/          uma tela por rota
```

---

## 🔀 Fluxo de dados

```
Componente
   │ useResource(() => adminService.users(), [])
   ▼
services/client.js  request('GET /users')
   ├─ endpoint mapeado em apiBridge ─► fetch('/api/<rota>') + transformação da resposta
   └─ endpoint direto               ─► fetch('/api/<rota>') com corpo e timeout
   ▼
{ data, meta }   ou   ApiError { status, code, userMessage }
```

`useResource` entrega `{ data, loading, error, refetch, meta }` e descarta respostas obsoletas.
Erros chegam como `ApiError`, com mensagem distinta para 401 (sessão terminou), 403 (sem permissão)
e a mensagem do próprio servidor quando houver.

---

## 🤖 Assistente por IA

Chave por conta (ou da instalação, como reserva), cifrada com AES-256-GCM e nunca devolvida ao
navegador. O servidor monta o contexto a partir do acervo, chama a API da Anthropic e confere a
resposta: entidades brasileiras citadas fora da lista detectada nas matérias são removidas e
contadas. O guia da plataforma (`lib/guia.js`) é a única fonte que o modelo pode usar para explicar
as telas.

---

## 🎨 Apresentação

- **Roteamento:** `HashRouter` (`/#/rota`) — nenhuma rota depende de o servidor reescrever caminhos.
- **Tema:** classe `dark` no `<html>`; superfícies escuras no tema claro usam `.on-dark`.
- **Acento:** ouro (`#caa733`); verde/vermelho reservados a estado.

---

## 📦 Build & Deploy

`vite build` separa `vendor-react`, `vendor-motion`, `vendor-maps` e `vendor-icons`; `jspdf` e
`html2canvas` carregam sob demanda. `npm start` serve API e `dist/` num processo só — é o que roda
no Railway. `AUTH_SECRET` deve estar definido no ambiente para as sessões sobreviverem a deploys.

---

## ⚠️ Limitações conscientes

| Recurso | Situação |
|---------|----------|
| Recuperação de senha e confirmação de e-mail | não existem — dependem de envio de e-mail |
| Entrada com conta Google | não implementada; colunas `username` e `auth_provider` já existem |
| Avisos fora do navegador | não existem; os avisos aparecem na própria tela |
| Disco no Railway sem volume | efêmero: o acervo é recoletado a cada deploy |
