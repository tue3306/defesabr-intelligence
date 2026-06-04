# ✅ GitHub Pages — Checklist Técnica

## Configuração Vite
- ✓ `vite.config.js` tem `base: '/defesabr-intelligence/'` para build
- ✓ Build output: `dist/` (padrão Vite)
- ✓ Chunk size warning limit: `1200` (evita alertas)

## Roteamento
- ✓ `main.jsx` usa `HashRouter` (✓ compatível com Pages, sem servidor)
- ✓ Rotas usam `#` (ex: `/#/apresentacao`, `/#/dados`)
- ✓ Redirecionamento de 404 não necessário (rotas client-side)

## Build & Deploy
- ✓ `npm run build` compila sem erros (✓ verificado)
- ✓ `.github/workflows/deploy.yml` executa build automático ao push
- ✓ Workflow faz `npm install` → `npm run build` → publica `dist/`

## Segurança & Gitignore
- ✓ `.gitignore` protege:
  - `node_modules/`
  - `dist/`
  - `.env` (senhas não são commitadas)
- ✓ `.env.example` documenta variáveis necessárias
- ✓ App funciona em modo **demo** sem `.env` (dados mockados)

## APIs & CORS
- ✓ Todas as APIs externas têm CORS habilitado ou endpoint público:
  - World Bank (público, sem restrição)
  - AwesomeAPI (público, sem restrição)
  - Alpha Vantage (chave `demo` funciona)
  - Anthropic (requer chave, mas é opcional)
- ✓ Fallback: se API falhar, app usa dados mockados

## Assets & Recursos
- ✓ `index.html` carrega via Vite (não precisa ajuste)
- ✓ Imagens/fontes: servidas pelo Vite em build
- ✓ CSS: Tailwind compilado (sem extra imports)

## Performance & Compatibilidade
- ✓ React 18.3.1 (estável)
- ✓ React Router v6 (suporta HashRouter)
- ✓ Framer Motion (sem problemas de CORS)
- ✓ Recharts & Chart.js (gráficos client-side, sem APIs)

## Teste Local Antes de Fazer Push (Opcional)
```bash
npm run build
npx vite preview  # Serve o dist/ localmente em http://localhost:4173
```
Se tudo aparecer certo, você está pronto para GitHub.

---

## 🎯 Resumo: O Que Vai Acontecer Quando Você Fizer Push

1. Você faz `git push` para `https://github.com/seuuser/defesabr-intelligence`
2. GitHub Actions detecta push na branch `main`
3. Workflow `.github/workflows/deploy.yml` é acionado:
   - Node 20 é instalado
   - `npm install` instala dependências
   - `npm run build` compila (gera `dist/`)
   - Artifacts são enviados para GitHub Pages
4. Seu site fica online em `https://seuuser.github.io/defesabr-intelligence` (2–5 min)
5. **Pronto!** 🎉

---

## ⚠️ Armadilhas Comuns (Já Prevenidas)

| Problema | Solução | Status |
|----------|---------|--------|
| "Rotas retornam 404" | HashRouter (não precisa de servidor) | ✓ Configurado |
| "Base path errado" | `base: '/defesabr-intelligence/'` no vite.config.js | ✓ Configurado |
| "Código não faz build" | Todos os imports/deps corretos | ✓ Verificado (build passou) |
| "Chaves secretas vazadas" | `.gitignore` protege `.env` | ✓ Configurado |
| "GitHub Pages não publica" | Workflow automático configurado | ✓ Configurado |

---

## 📞 Se Algo Quebrar

1. Vá a **Actions** no seu repo GitHub
2. Veja o log do workflow (procure por ❌ red)
3. Mensagem comum: "npm not found" → significa que `npm install` falhou (raro, mas reinicia o workflow)

**Tudo mais vai funcionar.** ✨
