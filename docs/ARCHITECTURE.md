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
5. **Nada inventado.** Todo número vem do banco, e toda afirmação da tela aponta para o dado que a
   sustenta. Onde falta capacidade, a interface diz.

---

## 🔐 Acesso

| Quem | Como | Alcança |
|------|------|---------|
| **Visitante** | sem sessão | página inicial, centro educacional, sobre |
| **Usuário** | papel `user` — toda conta do cadastro | leitura do acervo, pasta pessoal, notificações |
| **Administrador** | papel `admin` | tudo, mais governança, método e coleta, disponibilidade das fontes |

**No servidor** (`server/src/lib/auth.js`): senha em scrypt com sal; token HMAC-SHA256 que só
**identifica**. `lerConta` lê papel, situação e `sessoes_desde` do banco a cada requisição — por isso
suspender, remover ou rebaixar vale na hora, e trocar a senha invalida os tokens emitidos antes.

**Na interface** (`src/auth/permissions.js`): capacidades por papel, consultadas por `useCan()`,
`<Can>` e `<ProtectedRoute capability>`. Um 401 recebido com token enviado dispara
`defesabr:sessao-perdida`, e o `authStore` desfaz a sessão local e avisa.

**Governança** (`/api/users/:id`): duas travas no servidor — ninguém altera a própria conta, e a
instalação nunca fica sem administrador ativo. Cada ato vai para `audit_log`.

**Contas**: o cadastro pede usuário e senha e cria papel `user`. A conta de administrador vem de
`ADMIN_USERNAME` / `ADMIN_PASSWORD` na primeira subida (`semearContas()` em
`server/src/routes/auth.js`), que também remove as contas públicas de versões anteriores.

---

## 🗂️ Estrutura

```
server/src/
├── collectors/     rss · camara · indicators · bcb · comex · ransomware · atores · correlacoes · agendador
├── lib/            auth · auditoria · relevance · correlacao · entidades · proposicoes · notificacoes · guia
├── services/       status (capacidades derivadas do banco)
├── routes/         auth · news · data · intel · notificacoes · guia · system
└── db/             schema.sql + colunas incrementais (migração idempotente)

src/
├── services/       client.js (request) · apiBridge.js (endpoint da tela → rota da API) · domínio
├── auth/           permissions.js · useCan · <Can>
├── store/          authStore · notificationStore · newsStore (pasta, clippings) · settingsStore
├── hooks/          useResource · useNews · useDadosReais · useLiveNotifications
├── components/     layout · ui · charts · clipping · guia · auth
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

## 🔔 Notificações

Geradas pelo servidor ao fim de cada ciclo de coleta (`lib/notificacoes.js`): matéria relevante de
urgência alta ou crítica e organização brasileira com incidente crítico nas últimas 48 h; falha
inteira de coletor, só para administradores. O evento é gravado uma vez (`notifications.ref_key` é
único) e o estado de leitura é por conta (`notification_state`), então o que foi lido num navegador
aparece lido em outro. A interface consulta a cada minuto enquanto está aberta.

## 🧭 Coleta

Um ciclo a cada 15 minutos, encadeado (o próximo é agendado quando o anterior termina), com
cadência mínima por coletor em `collectors/index.js` — notícias a cada ciclo, Câmara e Banco Central
a cada hora, Comex a cada 12 h, World Bank a cada 24 h.

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
| Entrada por provedor externo | não implementada; colunas `username` e `auth_provider` já existem |
| Avisos fora da plataforma (e-mail, push) | não existem; os avisos ficam na central de notificações |
| Disco no Railway sem volume | efêmero: o acervo é recoletado a cada deploy |
