# 🛡️ DefesaBR Intelligence

Plataforma **demonstrativa** de clipping e análise de notícias sobre **Segurança e Defesa** com foco no cenário brasileiro. Agrega fontes públicas, organiza o clipping diário e gera análises de cenários com apoio de **IA (Claude, da Anthropic)** — com dados ao vivo de gastos militares, câmbio e indicadores setoriais.

> ⚠️ **Site demonstrativo.** As análises são geradas por IA e **não substituem análise especializada humana**. O site funciona **sem chave de API**, operando em *modo demonstração* com dados realistas.

---

## ✨ Funcionalidades

- **Dashboard** com métricas, feed de notícias, câmbio ao vivo, volume de notícias e gastos militares.
- **Clipping Diário** gerado por IA (resumo executivo, notícias com pontos-chave, impacto para o Brasil, tendências e nível de alerta).
- **Análise Semanal** com cenários (base/otimista/adverso), oportunidades, riscos, recomendações por perfil, indicadores, linha do tempo e nuvem de tópicos — em 5 perspectivas (acadêmica, investimentos, comercial, empresarial, diplomática).
- **Dados & Gráficos** ao vivo: treemap global, evolução Brasil (R$ + % PIB), comparação América do Sul, câmbio USD/BRL, radar por categoria, índice de alerta, ações do setor e mapa de calor global.
- **Arquivo** de clippings (persistido em `localStorage`) com busca, filtros e exportação em PDF.
- **Autenticação demo** (Admin / Analista / Visitante) com rotas protegidas.
- **Extras:** notificações, modo apresentação (`/apresentacao`), busca global, exportação PDF/CSV/JSON, widget de status flutuante, ticker em tempo real, tema claro/escuro.

---

## 🧰 Stack

React 18 · Vite · Tailwind CSS v3 · React Router v6 · Recharts · Chart.js · Axios · Lucide React · React Markdown · jsPDF + html2canvas · Framer Motion · React Hot Toast · Zustand · react-simple-maps · gh-pages.

---

## 🚀 Rodando localmente

Pré-requisitos: **Node.js 18+**.

```bash
# 1. Instalar dependências
npm install

# 2. (Opcional) Configurar a chave da Anthropic
cp .env.example .env
#   edite .env e preencha VITE_ANTHROPIC_API_KEY

# 3. Rodar em desenvolvimento
npm run dev
#   abra http://localhost:5173

# 4. Build de produção
npm run build && npm run preview
```

### Login demo
- **E-mail:** `admin@defesabr.com` · **Senha:** `defesa2025`
- Ou use os botões **Admin / Analista / Visitante** no modal de login.

---

## 🔑 Configurando a API da Anthropic (Claude)

A geração por IA é **opcional**. Há duas formas de configurar a chave:

1. **Variável de ambiente** (recomendado em dev): em `.env`
   ```env
   VITE_ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
   ```
2. **Pela interface:** página **Configurações → Chave da API** (salva apenas no `localStorage` do navegador).

Sem chave válida, o app usa dados mockados e exibe o selo **"Modo demonstração"**.

> 🔒 **Aviso de segurança:** este projeto chama a API da Anthropic **direto do navegador** (header `anthropic-dangerous-direct-browser-access`) apenas por ser uma **demonstração**. Em produção real, **nunca** exponha a chave no front-end — encaminhe as chamadas por um **backend/proxy** que guarde a chave no servidor. Como a chave fica acessível no bundle/navegador, use apenas chaves descartáveis e com limite de gasto.

---

## 🌐 APIs gratuitas utilizadas

| API | Uso | Chave |
|-----|-----|-------|
| [GDELT Project](https://www.gdeltproject.org/) | Notícias globais em tempo real | Não |
| [World Bank](https://data.worldbank.org/) | Gastos militares (histórico e % do PIB) | Não |
| [AwesomeAPI](https://docs.awesomeapi.com.br/) | Cotações de câmbio BRL | Não |
| [rss2json](https://rss2json.com/) | Leitura de feeds RSS de defesa | Não (10k/mês) |
| [Alpha Vantage](https://www.alphavantage.co/) | Ações do setor defesa | `demo` ou gratuita |
| [Anthropic Claude](https://www.anthropic.com/) | Compilação, resumo e análise por IA | Própria |

Toda chamada externa tem **timeout de 10s, retry automático e fallback** para dados demonstrativos — o app nunca mostra tela de erro vazia.

---

## 📦 Deploy no GitHub Pages

1. No `package.json`, ajuste o `homepage` com seu usuário:
   ```json
   "homepage": "https://SEU-USUARIO.github.io/defesabr-intelligence"
   ```
   O `base` já está configurado em `vite.config.js` como `/defesabr-intelligence/` (mude se o nome do repositório for outro).

2. Faça deploy:
   ```bash
   npm run deploy
   ```
   Isso roda `predeploy` (build) e publica a pasta `dist/` no branch `gh-pages`.

3. Em **Settings → Pages** do repositório, defina a fonte como o branch `gh-pages`.

> O roteamento usa **HashRouter** (URLs com `/#/`) para funcionar no GitHub Pages sem configuração de servidor.

---

## 📁 Estrutura

```
src/
├── api/         # wrappers das APIs (anthropic, gdelt, worldbank, awesomeapi, rss, alphavantage) com fallback
├── components/  # layout, ui, charts, auth
├── pages/       # Home, DailyClipping, WeeklyAnalysis, DataCharts, Archive, About, Settings, Presentation, NotFound
├── store/       # Zustand (auth, news, settings) persistido em localStorage
├── hooks/       # useClaudeAI, useNews, useTheme
├── utils/       # date, text, export (PDF/CSV/JSON)
└── data/        # mockData.js (dados de demonstração realistas)
```

---

## ⚖️ Disclaimer

Projeto demonstrativo para fins educacionais e de portfólio. Dados podem conter aproximações; confira sempre as fontes originais. As análises por IA não substituem avaliação profissional.
