# Publicar DefesaBR Intelligence no GitHub Pages

## 📋 Pré-requisitos
- Conta no GitHub (gratuita em https://github.com)
- Git instalado (https://git-scm.com/download/win para Windows)

## ✅ Checklist de Arquivos (já configurados)

- ✓ `vite.config.js` → `base: '/defesabr-intelligence/'` (para o caminho certo no Pages)
- ✓ `src/main.jsx` → `HashRouter` (compatível com Pages sem servidor)
- ✓ `.github/workflows/deploy.yml` → Deploy automático ao fazer push
- ✓ `.gitignore` → Protege `.env` e `node_modules`
- ✓ `package.json` → Scripts `build` e `deploy` configurados

---

## 🚀 Passo 1: Criar Repositório no GitHub

1. Vá a https://github.com/new
2. **Repository name**: `defesabr-intelligence` (ou outro nome)
3. **Visibility**: `Public` (necessário para GitHub Pages grátis)
4. Clique **Create repository**

Exemplo: `https://github.com/seuuser/defesabr-intelligence`

---

## 🔧 Passo 2: Colocar Código no GitHub (Windows PowerShell)

Abra PowerShell **na pasta raiz do projeto** (`c:\Users\hoffm\Desktop\defesabr-intelligence`) e rode:

```powershell
# Inicializar git local (se ainda não tiver)
git init

# Adicionar repositório remoto (substitua seuuser pelo seu usuário GitHub)
git remote add origin https://github.com/seuuser/defesabr-intelligence.git

# Verificar que está tudo em ordem
git status

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "Initial commit: DefesaBR Intelligence"

# Enviar para GitHub (PowerShell pode pedir seu usuário/token)
git branch -M main
git push -u origin main
```

### ⚠️ Autenticação GitHub no Windows
Na primeira vez que fizer `git push`, o Windows pode abrir uma janela de login. Use:
- **User**: seu usuário GitHub
- **Password**: **gere um Personal Access Token** em https://github.com/settings/tokens (escopo `repo`, `workflow`)

---

## 🌐 Passo 3: Ativar GitHub Pages

1. Vá a `https://github.com/seuuser/defesabr-intelligence/settings`
2. No menu esquerdo, clique em **Pages**
3. **Source** → selecione `Deploy from a branch`
4. **Branch** → selecione `main` e pasta `/(root)`
5. Clique **Save**

*Nota: o GitHub Actions workflow (`.github/workflows/deploy.yml`) já está configurado para fazer build automático.*

---

## ⏳ Passo 4: Aguardar Deploy

1. Vá a https://github.com/seuuser/defesabr-intelligence/actions
2. Veja o workflow `Deploy to GitHub Pages` rodar
3. Quando ✓ completa, seu site está ao vivo em:
   ```
   https://seuuser.github.io/defesabr-intelligence
   ```

---

## 🔑 Variáveis de Ambiente (Opcional)

Se quiser **ativar a chave da Anthropic** (análise inteligente):

1. Vá a https://github.com/seuuser/defesabr-intelligence/settings/secrets/actions
2. Clique **New repository secret**
3. **Name**: `VITE_ANTHROPIC_API_KEY`
4. **Value**: sua chave (`sk-ant-...`)
5. No workflow (`.github/workflows/deploy.yml`), adicione ao `build` job:
   ```yaml
   env:
     VITE_ANTHROPIC_API_KEY: ${{ secrets.VITE_ANTHROPIC_API_KEY }}
   ```

---

## 🐛 Troubleshooting

### Site mostra 404 ou branco
- Verifique em **Actions** se o build passou (✓ green)
- Verifique em **Pages settings** que a source está certa
- Aguarde 2–5 minutos após fazer push

### Gráficos não aparecem
- Normalmente é modo demo (sem acesso às APIs externas) — isso é **esperado**
- Verifique console do navegador (F12 → Console) por erros

### Git push falha com autenticação
- Gere token em https://github.com/settings/tokens (✓ repo, ✓ workflow)
- Use token como "password" no PowerShell

---

## 📦 Estrutura que Será Enviada

```
.github/workflows/deploy.yml          ← Automação
src/                                   ← Código React
public/                                ← Assets estáticos
vite.config.js                         ← Config Vite
package.json, package-lock.json        ← Dependências
index.html                             ← Entry point
.gitignore                             ← Proteção de .env
```

---

## ✨ Depois do Deploy

- **URL ao vivo**: `https://seuuser.github.io/defesabr-intelligence`
- **Atualizações**: faça mudanças locais, `git push`, e o GitHub Actions automaticamente faz build + deploy (1–2 min)

Pronto! 🎉
