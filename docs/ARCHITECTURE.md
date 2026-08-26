# 🏗️ Arquitetura — DefesaBR Intelligence

Aplicação **SPA estática** (React 18 + Vite 5), sem backend, desenhada para que a ausência do
servidor seja uma **etapa** e não uma **restrição de projeto**: a fronteira onde o backend entrará
já existe e está isolada.

---

## 🎯 Princípios

1. **Autorização centralizada.** Nenhum componente verifica papel ou plano diretamente. Todo
   controle de acesso passa por **capacidades** declarativas resolvidas em `src/auth/permissions.js`.
2. **Uma única fronteira de dados.** Toda leitura passa por `src/services/`. A interface não sabe —
   e não deve saber — se o dado veio de um repositório local ou de uma API.
3. **Quatro estados sempre tratados.** Carregando · erro (com nova tentativa) · vazio · conteúdo.
   Padronizados em `<DataState>`, para que nenhuma tela invente (ou esqueça) o seu próprio.
4. **Falha isolada.** `ErrorBoundary` por rota e em blocos de risco: um gráfico quebrado não derruba
   a página, e a página não derruba a aplicação.
5. **Honestidade.** Dado demonstrativo é rotulado como tal. Bloqueio explica o motivo e o caminho.
   Serviço que depende de backend aparece como *planejado*, nunca como pronto.
6. **Design system centralizado.** Tokens em `tailwind.config.js` + `src/index.css`, tema claro/escuro
   real (não apenas inversão de cores).

---

## 🔐 Modelo de acesso — dois eixos, quatro perfis

O perfil efetivo nasce do cruzamento de dois eixos **independentes**:

| Eixo | Onde vive | Valores | Responde a |
|------|-----------|---------|------------|
| **PAPEL** | `authStore` | `user` · `analyst` · `admin` | O que a pessoa pode **fazer** |
| **PLANO** | `subscriptionStore` | `explorar` · `profissional` · `institucional` | O quanto pode **ver** |

```
caps(perfil) = capsDoPapel(role) ∪ capsDoPlano(plan)
```

Disso saem os quatro perfis do produto:

| Perfil | Origem | Casa |
|--------|--------|------|
| **Visitante** | não autenticado (estado, não papel) | `/` |
| **Usuário** | papel `user` — consome inteligência | `/painel` |
| **Analista** | papel `analyst` — **produz** inteligência | `/mesa` |
| **Administrador** | papel `admin` — governa a plataforma | `/admin` |

O Analista recebe a camada analítica junto com o papel: não faz sentido exigir assinatura de quem
escreve a análise para que ele possa lê-la.

### API de autorização

```jsx
const can = useCan();  can('ai.generate')       // boolean
const gate = useGate('reports.export')          // { allowed, reason, requiredPlan, requiredRole }
useProfile()      // 'visitor' | 'user' | 'analyst' | 'admin'
useCapabilities() // lista completa de capacidades ativas

<Can do="tension.edit">…</Can>
<Can not do="analysis.full"><Upsell /></Can>
<ProtectedRoute capability="admin.access">…</ProtectedRoute>
```

Quando algo é negado, `denialReason` distingue **`auth`** (precisa entrar), **`plan`** (precisa de
plano superior) e **`role`** (precisa de outro papel) — e a interface mostra o muro correspondente.

---

## 🗂️ Estrutura de diretórios

```
src/
├── services/       ★ CAMADA DE DADOS — a fronteira com a origem do dado
│   ├── config.js         # DATA_MODE, URL base, latência simulada, REFERENCE_DATE
│   ├── client.js         # request() → { data, meta }; ApiError normalizado
│   ├── newsService.js    # notícias, clipping, arquivo, análise semanal, notificações
│   ├── intelligenceService.js # narrativas, dossiês, fontes, riscos, programas, agenda
│   ├── taskingService.js # mesa do analista: fila, RFIs, plano de coleta
│   ├── adminService.js   # contas, fontes, auditoria, saúde, diagnóstico
│   ├── reportsService.js # modelos, histórico e composição de relatórios
│   └── searchService.js  # índice global de busca (todos os domínios)
├── auth/           # permissions.js (fonte de verdade), useCan, <Can>
├── api/            # Integrações externas diretas, com timeout/retry/fallback
├── components/
│   ├── layout/     # Sidebar, Navbar, Footer, Ticker, layouts público/app
│   ├── charts/     # Recharts + react-simple-maps
│   ├── ui/         # PageHeader, EmptyState, DataState, Pagination, ConfirmDialog…
│   ├── system/     # ErrorBoundary
│   ├── auth/       # ProtectedRoute, LoginModal
│   ├── tension/    # Painel/editor de nível de tensão
│   └── learn/      # Quiz do Centro Educacional
├── pages/          # Uma tela por rota
├── store/          # Zustand: auth, news, settings, subscription, tension
├── data/           # Repositórios locais realistas
├── hooks/          # useResource/useAction, useNews, useClaudeAI, useTheme
└── utils/          # datas, texto, exportação (PDF/CSV/JSON), busca semântica
```

---

## 🔀 Fluxo de dados

```
Componente
   │ useResource(() => intelligenceService.risks({ severity }), [severity])
   ▼
Serviço de domínio          ← declara o endpoint: 'GET /intel/risks'
   ▼
services/client.js  request()
   │
   ├─ DATA_MODE='mock' ─► resolvedor local (src/data) + latência simulada
   └─ DATA_MODE='api'  ─► fetch(API_BASE_URL) com timeout e credenciais
   │
   ▼
{ data, meta: { source, endpoint, fetchedAt, latency } }
```

`useResource` entrega sempre `{ data, loading, error, refetch, meta }` e **cancela respostas
obsoletas**: se os parâmetros mudarem no meio do caminho, a resposta antiga é descartada em vez de
sobrescrever a nova.

### Ligar um backend real

```bash
VITE_DATA_MODE=api
VITE_API_BASE_URL=https://sua-api.exemplo.br/v1
```

Nenhum componente muda. Os contratos (`GET /intel/risks`, `POST /reports/compose`, …) estão
declarados no topo de cada serviço e listados em **Configurações › Camada de dados**.

### Por que latência simulada

Sem ela, os estados de carregamento nunca aparecem em desenvolvimento — e defeitos de _loading_
só seriam descobertos em produção. Desligável com `VITE_MOCK_LATENCY=0`.

### Data de referência

O acervo demonstrativo é coerente em torno de `REFERENCE_DATE` (`services/config.js`): prazos da
fila de produção, agenda, marcos de programas e auditoria se relacionam a ela. Usar `new Date()`
faria a demonstração envelhecer sozinha — prazos venceriam e a agenda esvaziaria.

---

## 🔎 Busca global

`searchService` normaliza **todos** os domínios num índice único de registros
`{ id, type, title, subtitle, snippet, to, capability, fields[] }`. A pontuação usa
`utils/semanticSearch`, que expande sinônimos do domínio — buscar *submarino* também encontra
*PROSUB* e conteúdo naval.

Cada resultado declara a capacidade necessária para abri-lo. Itens fora do alcance do perfil
aparecem **marcados como bloqueados**, com o caminho de desbloqueio: a busca informa que a
informação existe em vez de fingir que não.

---

## 🎨 Camada de apresentação

- **Roteamento:** `HashRouter` (`/#/rota`) — necessário no GitHub Pages, que não reescreve URLs.
- **Tema:** classe `dark` no `<html>`. Superfícies escuras dentro do tema claro usam `.on-dark`.
- **Acento:** ouro (`#caa733`); base grafite; verde/vermelho reservados a estado, não a decoração.
- **Ritmo:** `PageHeader` → KPIs → filtros → conteúdo → nota. Espaçamento `space-y-6`.

---

## 📦 Build & Deploy

`vite build` com separação manual de vendors:

| Chunk | Conteúdo | Por quê |
|-------|----------|---------|
| `vendor-react` | react, react-dom, router | muda raramente; cacheia entre deploys |
| `vendor-motion` | framer-motion | unidade coesa, usada em quase toda página |
| `vendor-maps` | react-simple-maps, d3-geo | só o mapa de risco depende |
| `vendor-icons` | lucide-react | conjunto grande e estável |
| `index` | código da aplicação | o único que realmente muda a cada versão |

`jspdf` e `html2canvas` (~590 kB somados) são carregados **sob demanda**, dentro das funções que
geram PDF — quem exporta apenas CSV não paga por eles.

Deploy: `npm run deploy` (gh-pages). `base` = `/defesabr-intelligence/` no build.

---

## ⚠️ Limitações conscientes

O que **exige** backend e por isso aparece como *planejado* na interface, nunca como pronto:

| Recurso | Situação | O que falta |
|---------|----------|-------------|
| Coleta ao vivo de fontes | desligada por padrão | proxy servidor-side (CORS/limites) |
| IA (Claude) | fallback demonstrativo | endpoint próprio que guarde a chave |
| Persistência | `localStorage` | banco de dados e sessão real |
| Envio de e-mail/alertas | registrado, não enviado | serviço de entrega |
| SSO institucional | roadmap | provedor SAML/OIDC |
| Auditoria | dados de exemplo | serviço de trilha append-only |

A chave da Anthropic pode ser informada em Configurações **apenas para demonstração**: ela fica em
texto puro no navegador e é enviada da máquina de quem usa. O desenho correto — chave no servidor,
front chamando endpoint próprio — está descrito na própria tela.
