# 🚀 DefesaBR Intelligence — GitHub Pages em 3 Passos

## Passo 1: Criar Repositório
Vá a https://github.com/new
- **Name**: `defesabr-intelligence`
- **Visibility**: Public ✓
- Clique **Create repository**

Você vai receber uma URL como:
```
https://github.com/seuuser/defesabr-intelligence
```

---

## Passo 2: Copiar Código para GitHub

Abra **PowerShell** na pasta do projeto (`c:\Users\hoffm\Desktop\defesabr-intelligence`) e cole:

```powershell
git init
git remote add origin https://github.com/seuuser/defesabr-intelligence.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

*(Substitua `seuuser` pelo seu usuário GitHub)*

**Na primeira vez, o Windows vai pedir autenticação:**
- User: seu usuário GitHub
- Password: Gere token em https://github.com/settings/tokens (✓ repo, ✓ workflow)

---

## Passo 3: Ativar GitHub Pages

1. Vá a `https://github.com/seuuser/defesabr-intelligence/settings/pages`
2. **Source** → `Deploy from a branch`
3. **Branch** → `main` (root)
4. Clique **Save**

**Pronto!** O GitHub Actions vai compilar e publicar automaticamente.

---

## ✨ Seu Site Estará Online em:
```
https://seuuser.github.io/defesabr-intelligence
```

*Leva 1–2 minutos para ficar pronto.*

Veja o progresso em: `https://github.com/seuuser/defesabr-intelligence/actions`

---

## Se Tiver Dúvidas
Veja os guias completos:
- `GITHUB_PAGES_DEPLOY.md` — passo a passo detalhado
- `GITHUB_PAGES_CHECKLIST.md` — verificação técnica
