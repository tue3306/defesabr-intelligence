<div align="center">

<img src="public/favicon.svg" width="88" alt="DefesaBR Intelligence" />

# 🛡️ DefesaBR Intelligence

**Plataforma demonstrativa de inteligência estratégica, análise de riscos e apoio à decisão**
no contexto brasileiro de Segurança e Defesa.


[![Build](https://github.com/tue3306/defesabr-intelligence/actions/workflows/ci.yml/badge.svg)](https://github.com/tue3306/defesabr-intelligence/actions/workflows/ci.yml)
[![Deploy](https://github.com/tue3306/defesabr-intelligence/actions/workflows/deploy.yml/badge.svg)](https://github.com/tue3306/defesabr-intelligence/actions/workflows/deploy.yml)
[![React 18](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Vite 5](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS 3](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-5c616a)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-2e7d46)](CONTRIBUTING.md)

[**🌐 Demo ao vivo**](https://tue3306.github.io/defesabr-intelligence/) ·
[**📖 Documentação**](#-tabela-de-conteúdo) ·
[**🐛 Reportar bug**](https://github.com/tue3306/defesabr-intelligence/issues/new?template=bug_report.yml) ·
[**💡 Sugerir ideia**](https://github.com/tue3306/defesabr-intelligence/issues/new?template=feature_request.yml)

</div>

> [!WARNING]
> **Projeto demonstrativo (proof of concept), 100% front-end.**
> Todos os dados, indicadores, alertas e cenários são **ILUSTRATIVOS**. Não há vínculo, homologação
> ou uso oficial. Referências a normas (ISO, NIST, MITRE ATT&CK, CIS, OWASP) e a órgãos públicos são
> apenas inspiração conceitual. As análises por IA **não substituem avaliação profissional**.

---

## 📑 Tabela de conteúdo

- [📌 Objetivo](#-objetivo)
- [🖼️ Capturas de tela](#️-capturas-de-tela)
- [✨ Funcionalidades](#-funcionalidades)
- [🧩 Perfis de acesso](#-perfis-de-acesso-demonstrativo)
- [🛠️ Tecnologias](#️-tecnologias)
- [🏗️ Arquitetura](#️-arquitetura)
- [🚀 Como executar](#-como-executar)
- [🌐 Deploy (GitHub Pages)](#-deploy-github-pages)
- [🗺️ Roadmap](#️-roadmap)
- [❓ FAQ](#-faq)
- [🩺 Troubleshooting](#-troubleshooting)
- [🤝 Como contribuir](#-como-contribuir)
- [🔐 Segurança](#-segurança)
- [📄 Licença](#-licença)
- [🙌 Créditos e agradecimentos](#-créditos-e-agradecimentos)
- [🔗 Links úteis](#-links-úteis)

---

## 📌 Objetivo

Simular, com a aparência e a robustez de um **software corporativo enterprise**, uma central de
inteligência estratégica: monitoramento de notícias, análise de cenários, gestão de riscos,
acompanhamento de ativos/programas estratégicos e apoio à decisão — tudo rodando de forma **estática**
no GitHub Pages, sem backend, com **dados mockados realistas**.

## 🖼️ Capturas de tela

> 📸 *As imagens abaixo são placeholders. Substitua os arquivos em `docs/screenshots/` por capturas
> reais da aplicação (veja instruções em [`docs/screenshots/README.md`](docs/screenshots/README.md)).*

| Painel principal | Mapa de risco |
|:---:|:---:|
| ![Painel principal](docs/screenshots/dashboard.png) | ![Mapa de risco](docs/screenshots/risk-map.png) |

| Clipping diário (IA) | Programas estratégicos |
|:---:|:---:|
| ![Clipping diário](docs/screenshots/clipping.png) | ![Programas estratégicos](docs/screenshots/programs.png) |

## ✨ Funcionalidades

| Área | Recursos |
|------|----------|
| **Inteligência & Análise** | Clipping diário (resumo por IA), Análise Semanal de cenários, Dossiês "Em Foco", Monitor de Narrativas (FIMI), **Matriz de Riscos** (probabilidade × impacto), Calendário estratégico, Arquivo + "Minha Pasta" |
| **Brasil Estratégico** | Programas Estratégicos (PROSUB, FX-2, Tamandaré…), Amazônia Azul, Fronteiras & Amazônia, Balança Militar Sul-Americana, Base Industrial de Defesa |
| **Dados & Economia** | Mapa de risco interativo, gastos de defesa (R$ e % do PIB), câmbio ao vivo, índice de alerta, indicadores macro |
| **Apoio à decisão** | Assistente "Pergunte ao Analista", nível de tensão por região, confiabilidade de fontes |
| **Educação** | Centro Educacional: trilhas, vídeo-aulas, glossário pesquisável, biblioteca (PND/END/LBDN), quiz |
| **Produção (Analista)** | **Mesa de trabalho**: fila editorial (kanban), requisitos de informação (RFI) e plano de coleta (PIR/EEI) com lacunas; classificação de narrativas e reavaliação de fontes |
| **Relatórios** | **Central de Relatórios**: construtor com pré-visualização fiel, histórico e entregas programadas; exportação em PDF, CSV e JSON |
| **Governança (Admin)** | Console com contas e papéis, fontes de coleta, integrações, trilha de auditoria e saúde do sistema |
| **Plataforma** | 4 perfis de acesso, 3 planos com paywall honesto, tema claro/escuro, busca global (Ctrl+K), tour guiado, modo apresentação |

## 🧩 Perfis de acesso

A plataforma tem **quatro perfis**, resolvidos a partir de **dois eixos independentes**:

- **PAPEL** (`user` · `analyst` · `admin`) — o que a pessoa pode **fazer**.
- **PLANO** (`explorar` · `profissional` · `institucional`) — o quanto ela pode **ver**.

A capacidade efetiva é a **união** dos dois: `caps = capsDoPapel ∪ capsDoPlano`.

| Perfil | Quem é | O que faz | Casa |
|--------|--------|-----------|------|
| **Visitante** | Não autenticado | Conteúdo público, prévias de análise, Centro Educacional e planos | `/` |
| **Usuário** | Consome inteligência | Painel de situação, clipping, dossiês, módulos estratégicos, pasta pessoal. A profundidade vem do plano | `/painel` |
| **Analista** | **Produz** inteligência | Gera com IA, avalia nível de tensão, classifica fontes e narrativas, conduz a fila de produção, RFIs e o plano de coleta | `/mesa` |
| **Administrador** | Governa a plataforma | Contas e papéis, fontes de coleta, integrações, auditoria, saúde do sistema | `/admin` |

> A autorização é **centralizada** em [`src/auth/permissions.js`](src/auth/permissions.js): nenhum
> componente verifica `role === 'admin'` — tudo passa por **capacidades** declarativas
> (`can('ai.generate')`, `<Can do="tension.edit">`, `<ProtectedRoute capability="admin.access">`).
> Quando algo é bloqueado, a interface explica **se é por plano ou por papel** e oferece o caminho.

**Demonstração:** a autenticação é simulada (sem servidor). Troque de perfil no menu do usuário,
no muro de acesso de qualquer área restrita, ou pela seção "Uma plataforma, quatro experiências"
na página inicial. Nenhuma credencial é publicada na interface.

## 🛠️ Tecnologias

- **React 18** + **Vite 5** (build e dev server)
- **React Router 6** (HashRouter — compatível com GitHub Pages, sem reescrita de servidor)
- **Tailwind CSS 3** (design system com tokens, sombras e animações)
- **Zustand** (estado global + `persist` em `localStorage`)
- **Recharts** + **react-simple-maps** (visualizações e mapas)
- **Framer Motion** (microinterações), **lucide-react** (ícones)
- **jsPDF** + **html2canvas** (exportação de relatórios)
- **Anthropic Claude** (opcional) — clipping/análise reais quando há chave; caso contrário, dados demonstrativos

## 🏗️ Arquitetura

Aplicação **SPA estática**, organizada por domínio. Detalhes completos em
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```
src/
├── services/       # ★ CAMADA DE DADOS — única fronteira com a origem do dado
│   ├── config.js         # DATA_MODE ('mock' | 'api'), URL base, latência simulada
│   ├── client.js         # request() com contrato { data, meta } e ApiError normalizado
│   ├── newsService.js    # notícias, clipping, arquivo, análise semanal, notificações
│   ├── intelligenceService.js  # narrativas, dossiês, fontes, riscos, programas, agenda
│   ├── taskingService.js # mesa do analista: fila, RFIs, plano de coleta
│   ├── adminService.js   # contas, fontes, auditoria, saúde, diagnóstico
│   └── reportsService.js # modelos, histórico e composição de relatórios
├── auth/           # permissions.js (fonte de verdade), useCan, <Can>
├── api/            # Integrações externas diretas (câmbio, World Bank, IA) com fallback
├── components/
│   ├── layout/     # Sidebar, Navbar, Footer, Ticker, layouts público/app
│   ├── charts/     # Gráficos e mapas (Recharts, react-simple-maps)
│   ├── ui/         # PageHeader, EmptyState, DataState, Pagination, ConfirmDialog, Modal…
│   ├── system/     # ErrorBoundary (por rota e por bloco)
│   ├── auth/       # ProtectedRoute + modal de login (simulado)
│   ├── tension/    # Painel/editor de nível de tensão
│   └── learn/      # Quiz do Centro Educacional
├── pages/          # Telas (Landing, Painel, Mesa, Riscos, Relatórios, Admin…)
├── store/          # Zustand: auth, settings, news, subscription, tension
├── data/           # Repositórios locais realistas (notícias, riscos, produção, relatórios…)
├── hooks/          # useResource/useAction, useNews, useClaudeAI, useTheme…
└── utils/          # datas, texto, exportação (PDF/CSV/JSON), busca semântica
```

### Preparado para backend

Toda leitura passa por `src/services`. O contrato de retorno é idêntico nos dois modos:

```js
const { data, loading, error, refetch, meta } =
  useResource(() => intelligenceService.risks({ severity: 'critico' }), ['critico'])
```

Ligar um backend real é definir **duas variáveis de ambiente** — nenhuma tela muda:

```bash
VITE_DATA_MODE=api
VITE_API_BASE_URL=https://sua-api.exemplo.br/v1
```

Em modo `mock`, os resolvedores locais respondem com **latência simulada**, para que os estados de
carregamento sejam reais e os defeitos de _loading_ apareçam em desenvolvimento.


**Princípios**

- **Autorização centralizada** — capacidades declarativas, nunca `if (role === …)` espalhado.
- **Uma fronteira de dados** — a interface não sabe se o dado veio de mock ou de API.
- **Quatro estados sempre tratados** — carregando, erro (com nova tentativa), vazio e conteúdo,
  padronizados em `<DataState>`.
- **Falha isolada** — `ErrorBoundary` por rota e em blocos de risco: um gráfico quebrado não
  derruba a página, e a página não derruba a aplicação.
- **Honestidade** — dado demonstrativo é rotulado como tal; bloqueio explica o motivo e o caminho;
  serviço que exige backend aparece como *planejado*, não como pronto.
- **Tokens de design centralizados** (`tailwind.config.js` + `index.css`), tema claro/escuro real.

## 🚀 Como executar

Pré-requisito: **Node.js 18+**.

```bash
# 1. Clonar o repositório
git clone https://github.com/tue3306/defesabr-intelligence.git
cd defesabr-intelligence

# 2. Instalar dependências
npm install

# 3. Ambiente de desenvolvimento → http://localhost:5173
npm run dev
```

Outros scripts:

```bash
npm run build      # build de produção (saída em dist/)
npm run preview    # pré-visualizar o build localmente
```

### (Opcional) IA real

A geração por IA é **opcional**. Copie `.env.example` para `.env` e configure a chave da Anthropic:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-sua-chave
```

…ou pela interface em **Configurações → Chave da API** (salva apenas no `localStorage`).
Sem chave, a plataforma opera em **modo demonstração** com dados realistas.

> [!CAUTION]
> Em demonstração, a chamada de IA é feita direto do navegador. Em produção real,
> **nunca** exponha a chave no front-end — encaminhe por um **backend/proxy**. Use apenas chaves
> descartáveis e com limite de gasto. Consulte [`SECURITY.md`](SECURITY.md).

### APIs externas (todas gratuitas, com fallback)

| API | Uso | Chave |
|-----|-----|-------|
| World Bank | Gastos militares (histórico e % do PIB) | Não |
| AwesomeAPI | Cotações de câmbio BRL | Não |
| rss2json | Leitura de feeds RSS de defesa | Não |
| Alpha Vantage | Ações do setor defesa | `demo`/gratuita |
| Anthropic Claude | Resumo e análise por IA | Própria (opcional) |

## 🌐 Deploy (GitHub Pages)

O `base` já está configurado em `vite.config.js` como `/defesabr-intelligence/`, e a SPA usa
**HashRouter** (`/#/rota`), então links profundos funcionam sem configuração de servidor. O projeto
inclui `404.html`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest` e social preview (`og-image.svg`).

Há **duas** formas de publicar — escolha **apenas uma** e ajuste **Settings → Pages → Source** de acordo:

**A) Automático via GitHub Actions (recomendado)**
Já existe o workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Cada `push` na
branch `main` faz o build e publica. Basta definir **Settings → Pages → Source: _GitHub Actions_**.

**B) Manual via branch `gh-pages`**

```bash
npm run deploy   # build + publish na branch gh-pages
```

Nesse caso, defina **Settings → Pages → Source: branch `gh-pages`**.

## 🗺️ Roadmap

Veja o histórico de versões em [`CHANGELOG.md`](CHANGELOG.md).

- [ ] Service Worker / modo offline (PWA completo)
- [ ] Exportação de dashboards em CSV/PNG
- [ ] Painel de auditoria e trilha de eventos (estilo SIEM, demonstrativo)
- [ ] Integração opcional com feeds RSS reais via proxy
- [ ] Testes automatizados (Vitest + Testing Library)

## ❓ FAQ

<details>
<summary><b>Preciso de uma chave de API para usar o projeto?</b></summary>

Não. Sem chave, a plataforma roda em **modo demonstração** com dados mockados realistas. A chave da
Anthropic é opcional e habilita apenas o clipping/análise por IA reais.
</details>

<details>
<summary><b>Os dados são reais?</b></summary>

Não. Todos os indicadores, alertas e cenários são **ilustrativos**. Este é um proof of concept
front-end sem vínculo, homologação ou uso oficial.
</details>

<details>
<summary><b>Existe backend ou banco de dados?</b></summary>

Não. Toda a aplicação roda no navegador. O estado é mantido em `localStorage` via Zustand, e a
autenticação é **simulada**.
</details>

<details>
<summary><b>Como faço login na demo?</b></summary>

Use `admin@defesabr.com` / `defesa2025`, ou os botões de perfil no modal de login.
</details>

<details>
<summary><b>Posso usar este projeto como base para o meu?</b></summary>

Sim, sob a licença [MIT](LICENSE). Mantenha o aviso de que os dados são ilustrativos.
</details>

## 🩺 Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Página em branco no GitHub Pages | `base` do Vite diferente do nome do repositório | Confirme `base: '/defesabr-intelligence/'` em `vite.config.js` |
| `npm install` falha | Versão do Node antiga | Use **Node.js 18+** (`node -v`) |
| IA não responde | Chave ausente/ inválida | Confira `VITE_ANTHROPIC_API_KEY`; sem chave o app usa modo demonstração |
| Rotas retornam 404 ao recarregar | Servidor sem suporte a SPA | O projeto usa **HashRouter** — verifique se o `404.html` está no build |
| Gráficos vazios | API externa indisponível | Esperado: o app cai no **fallback mockado** automaticamente |

## 🤝 Como contribuir

Contribuições são bem-vindas! Leia o guia completo em [`CONTRIBUTING.md`](CONTRIBUTING.md) e o
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

1. Faça um fork e crie uma branch: `git checkout -b feat/minha-melhoria`
2. Mantenha o padrão visual e de código existente (sem alterar lógica que já funciona)
3. Rode `npm run build` para garantir que compila
4. Abra um Pull Request descrevendo a mudança

## 🔐 Segurança

Encontrou uma vulnerabilidade? **Não abra uma issue pública.** Siga o processo descrito em
[`SECURITY.md`](SECURITY.md). Lembre-se: chaves de API **nunca** devem ser commitadas nem expostas
no front-end em produção.

## 📄 Licença

Distribuído sob a licença **MIT** — veja [LICENSE](LICENSE).

## 🙌 Créditos e agradecimentos

- **Dados públicos:** [World Bank Open Data](https://data.worldbank.org/), [AwesomeAPI](https://docs.awesomeapi.com.br/), [Alpha Vantage](https://www.alphavantage.co/)
- **IA:** [Anthropic Claude](https://www.anthropic.com/)
- **Ecossistema:** [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Zustand](https://zustand-demo.pmnd.rs/), [Recharts](https://recharts.org/), [react-simple-maps](https://www.react-simple-maps.io/), [Framer Motion](https://www.framer.com/motion/), [lucide-react](https://lucide.dev/)
- **Ícones de stack:** [skillicons.dev](https://skillicons.dev/) · **Badges:** [Shields.io](https://shields.io/)

## 🔗 Links úteis

- 🌐 **Demo:** <https://tue3306.github.io/defesabr-intelligence/>
- 🐛 **Issues:** <https://github.com/tue3306/defesabr-intelligence/issues>
- 📈 **Roadmap / Changelog:** [CHANGELOG.md](CHANGELOG.md)
- 🏗️ **Arquitetura:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

<div align="center">
<sub>Feito com foco em clareza, acessibilidade e desempenho — 100% front-end.</sub>
</div>
