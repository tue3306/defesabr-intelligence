<div align="center">

# 🛡️ DefesaBR Intelligence

**Plataforma demonstrativa de inteligência estratégica, análise de riscos e apoio à decisão**
no contexto brasileiro de Segurança e Defesa.

[![Build](https://img.shields.io/badge/build-passing-2e7d46)](#)
[![Stack](https://img.shields.io/badge/React_18-Vite_5-393d44)](#)
[![Styling](https://img.shields.io/badge/Tailwind_CSS-3-393d44)](#)
[![Deploy](https://img.shields.io/badge/GitHub_Pages-100%25_front--end-caa733)](#)
[![License](https://img.shields.io/badge/license-MIT-5c616a)](LICENSE)

</div>

> ⚠️ **Aviso importante** — Projeto **demonstrativo (proof of concept)**, 100% front-end.
> Todos os dados, indicadores, alertas e cenários são **ILUSTRATIVOS**. Não há vínculo, homologação
> ou uso oficial. Referências a normas (ISO, NIST, MITRE ATT&CK, CIS, OWASP) e a órgãos públicos são
> apenas inspiração conceitual. As análises por IA **não substituem avaliação profissional**.

---

## 📌 Objetivo

Simular, com a aparência e a robustez de um **software corporativo enterprise**, uma central de
inteligência estratégica: monitoramento de notícias, análise de cenários, gestão de riscos,
acompanhamento de ativos/programas estratégicos e apoio à decisão — tudo rodando de forma **estática**
no GitHub Pages, sem backend, com **dados mockados realistas**.

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

Aplicação **SPA estática**, organizada por domínio:

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
npm install        # instalar dependências
npm run dev        # desenvolvimento → http://localhost:5173
npm run build      # build de produção
npm run preview    # pré-visualizar o build
```

### (Opcional) IA real

A geração por IA é **opcional**. Configure a chave da Anthropic em `.env`:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-sua-chave
```
…ou pela interface em **Configurações → Chave da API** (salva apenas no `localStorage`).
Sem chave, a plataforma opera em **modo demonstração** com dados realistas.

> 🔒 **Segurança:** em demonstração, a chamada é feita direto do navegador. Em produção real,
> **nunca** exponha a chave no front-end — encaminhe por um **backend/proxy**. Use apenas chaves
> descartáveis e com limite de gasto.

### APIs externas (todas gratuitas, com fallback)

| API | Uso | Chave |
|-----|-----|-------|
| World Bank | Gastos militares (histórico e % do PIB) | Não |
| AwesomeAPI | Cotações de câmbio BRL | Não |
| rss2json | Leitura de feeds RSS de defesa | Não |
| Alpha Vantage | Ações do setor defesa | `demo`/gratuita |
| Anthropic Claude | Resumo e análise por IA | Própria (opcional) |

## 🌐 Deploy (GitHub Pages)

O `base` já está configurado em `vite.config.js` como `/defesabr-intelligence/`.

```bash
npm run deploy   # build + publish na branch gh-pages
```

Em **Settings → Pages**, defina a fonte como a branch `gh-pages`. A SPA usa **HashRouter**
(`/#/rota`), então links profundos funcionam sem configuração de servidor. O projeto inclui
`404.html`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest` e social preview (`og-image.svg`).

## 🗺️ Roadmap

- [ ] Service Worker / modo offline (PWA completo)
- [ ] Exportação de dashboards em CSV/PNG
- [ ] Painel de auditoria e trilha de eventos (estilo SIEM, demonstrativo)
- [ ] Integração opcional com feeds RSS reais via proxy
- [ ] Testes automatizados (Vitest + Testing Library)

## 🤝 Como contribuir

1. Faça um fork e crie uma branch: `git checkout -b feat/minha-melhoria`
2. Mantenha o padrão visual e de código existente (sem alterar lógica que já funciona)
3. Rode `npm run build` para garantir que compila
4. Abra um Pull Request descrevendo a mudança

## 📄 Licença

Distribuído sob a licença **MIT** — veja [LICENSE](LICENSE).

<div align="center">
<sub>Feito com foco em clareza, acessibilidade e desempenho — 100% front-end.</sub>
</div>
