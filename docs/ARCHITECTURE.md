# 🏗️ Arquitetura — DefesaBR Intelligence

Este documento descreve a arquitetura do **DefesaBR Intelligence**, uma aplicação **SPA estática**
(Single Page Application) construída com **React 18 + Vite 5**, sem backend.

## 🎯 Princípios de projeto

1. **100% front-end** — roda inteiramente no navegador; publicável em GitHub Pages.
2. **Degradação graciosa** — toda integração externa possui `timeout`, `retry` e **fallback mockado**;
   a interface nunca fica em branco por falha de rede.
3. **Organização por domínio** — código agrupado por área funcional, não por tipo de arquivo.
4. **Design system centralizado** — tokens em `tailwind.config.js` e `src/index.css`.
5. **Estado isolado** — cada domínio tem sua própria store Zustand, persistida em `localStorage`.

## 🗂️ Estrutura de diretórios

```
src/
├── api/            # Integrações externas + camada http com fallback
│   ├── http.js         # cliente base (timeout, retry)
│   ├── anthropic.js    # IA opcional (Claude)
│   ├── worldbank.js    # gastos militares / % do PIB
│   ├── awesomeapi.js   # câmbio BRL
│   ├── alphavantage.js # ações do setor defesa
│   ├── gdelt.js / rss.js # notícias / feeds
├── components/
│   ├── layout/     # Sidebar, Navbar, Footer, Ticker, PublicLayout, Layout
│   ├── charts/     # Recharts + react-simple-maps (mapas, gauges, sparklines)
│   ├── ui/         # Design system: Card, Badge, Modal, MetricCard, SearchBar, Logo…
│   ├── auth/       # ProtectedRoute + LoginModal (simulado)
│   ├── tension/    # Painel/editor de nível de tensão
│   └── learn/      # Quiz do Centro Educacional
├── pages/          # Uma tela por rota (Landing, Home, DailyClipping, Dossiers…)
├── store/          # Zustand: authStore, newsStore, settingsStore, subscriptionStore, tensionStore
├── data/           # Datasets mockados realistas (notícias, programas, indicadores…)
├── hooks/          # useNews, useClaudeAI, useTheme, useLiveNotifications
└── utils/          # dateUtils, textUtils, exportUtils (PDF), semanticSearch, analystKnowledge
```

## 🔀 Fluxo de dados

```
Componente (page/ui)
   │  usa
   ▼
Hook (ex.: useNews)  ──►  Store Zustand (persistência localStorage)
   │  solicita
   ▼
Camada api/ (http.js: timeout + retry)
   │
   ├─ sucesso ─►  dados reais da API pública
   └─ falha  ──►  fallback em data/ (mock realista)
```

- **Roteamento:** `react-router-dom` com **HashRouter** (`/#/rota`) — necessário para GitHub Pages,
  pois evita a necessidade de reescrita de URL no servidor.
- **Autenticação:** simulada em `authStore`. Não há servidor; perfis (visitante, usuário, analista,
  administrador) são trocados no cliente.
- **IA:** `useClaudeAI` chama `api/anthropic.js` **apenas** quando há chave configurada; caso
  contrário, retorna conteúdo demonstrativo.

## 🎨 Camada de apresentação

- **Tailwind CSS 3** com tokens de tema (claro/escuro) definidos em `tailwind.config.js`.
- **Framer Motion** para microinterações e transições.
- **lucide-react** para ícones.
- **Recharts** e **react-simple-maps** para gráficos e mapas.
- Exportação de relatórios em PDF via **jsPDF** + **html2canvas** (`utils/exportUtils.js`).

## 📦 Build & Deploy

- **Vite** gera um bundle estático em `dist/`. O `base` é `/defesabr-intelligence/` no build
  (e `/` em desenvolvimento) — ver `vite.config.js`.
- **Deploy** por GitHub Actions (`.github/workflows/deploy.yml`) ou manualmente via `npm run deploy`
  (branch `gh-pages`). Ver a seção *Deploy* no [README](../README.md).

## ⚠️ Limitações conscientes

- Sem backend ⇒ sem persistência entre dispositivos, sem multiusuário real, sem RBAC de verdade.
- Chaves de API configuradas no cliente ficam expostas — uso apenas demonstrativo (ver [SECURITY.md](../SECURITY.md)).
- Todos os dados são **ilustrativos** e não representam informação oficial.
