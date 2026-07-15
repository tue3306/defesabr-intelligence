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
| **Inteligência & Análise** | Clipping diário (resumo por IA), Análise Semanal de cenários, Dossiês "Em Foco", Monitor de Narrativas (FIMI), Calendário estratégico, Arquivo + "Minha Pasta" (favoritos) |
| **Brasil Estratégico** | Programas Estratégicos (PROSUB, FX-2, Tamandaré…), Amazônia Azul, Fronteiras & Amazônia, Balança Militar Sul-Americana, Base Industrial de Defesa |
| **Dados & Economia** | Mapa de risco interativo, gastos de defesa (R$ e % do PIB), câmbio ao vivo, índice de alerta, indicadores macro |
| **Apoio à decisão** | Assistente "Pergunte ao Analista", nível de tensão por região, confiabilidade de fontes |
| **Educação** | Centro Educacional: trilhas, vídeo-aulas, glossário pesquisável, biblioteca (PND/END/LBDN), quiz |
| **Plataforma** | 4 perfis de acesso demo, 3 planos com paywall, tema claro/escuro, busca global (Ctrl+K), tour guiado, exportação em PDF |

## 🧩 Perfis de acesso (demonstrativo)

| Perfil | Escopo |
|--------|--------|
| **Visitante** | Páginas públicas, notícias e planos; análises completas no paywall |
| **Usuário** | Consulta & leitura: painel e módulos; análise por área conforme o plano |
| **Analista** | Gera/exporta com IA, define nível de tensão, ferramentas de fontes e narrativas |
| **Administrador** | Acesso total: configurações, usuários, analytics e diagnóstico |

> A autenticação é **simulada** (sem servidor). Troque de perfil no menu do usuário ou em Configurações.
> **Login demo:** `admin@defesabr.com` · senha `defesa2025` — ou use os botões de perfil no modal de login.

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
├── api/            # Integrações externas (câmbio, World Bank, IA) com fallback mockado
├── components/
│   ├── layout/     # Sidebar, Navbar, Footer, Ticker, layouts público/app
│   ├── charts/     # Gráficos e mapas (Recharts, react-simple-maps)
│   ├── ui/         # Design system: Card, Badge, Modal, MetricCard, Logo…
│   ├── auth/       # Rota protegida + modal de login (simulado)
│   ├── tension/    # Painel/editor de nível de tensão
│   └── learn/      # Quiz do Centro Educacional
├── pages/          # Telas (Landing, Painel, Clipping, Dossiês, Programas…)
├── store/          # Zustand: auth, settings, news, subscription, tension
├── data/           # Dados mockados realistas (notícias, programas, indicadores…)
├── hooks/          # useNews, useClaudeAI, useTheme…
└── utils/          # datas, texto, exportação PDF, busca semântica
```

Princípios: **componentização**, tokens de design centralizados (`tailwind.config.js` + `index.css`),
estado isolado por domínio e **degradação graciosa** (todo recurso que dependeria de backend tem
versão demonstrativa). Toda chamada externa tem **timeout, retry e fallback** — o app nunca mostra
tela de erro vazia.

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
