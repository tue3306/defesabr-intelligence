# 📓 Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Documentação de comunidade: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`.
- Guia de arquitetura em `docs/ARCHITECTURE.md`.
- Templates de issues (bug/feature) e de Pull Request em `.github/`.
- Workflow de CI (`ci.yml`) que valida o build a cada push/PR.
- Seções de **Tabela de conteúdo**, **Capturas de tela**, **FAQ**, **Troubleshooting**,
  **Créditos** e **Links úteis** no README.

### Alterado
- README reorganizado com badges dinâmicos e navegação aprimorada.
- Documentação de deploy reconciliada: fluxo por **GitHub Actions** (recomendado) × branch `gh-pages`.

## [1.0.0] — 2026

### Adicionado
- Plataforma demonstrativa de inteligência estratégica (SPA React 18 + Vite 5).
- Módulos de Inteligência & Análise, Brasil Estratégico, Dados & Economia, Apoio à decisão e Educação.
- 4 perfis de acesso demonstrativos, tema claro/escuro, busca global (Ctrl+K) e exportação em PDF.
- Integração opcional com IA (Anthropic Claude) e APIs públicas com fallback mockado.
- Deploy estático para GitHub Pages com `HashRouter`, `404.html`, `sitemap.xml` e social preview.

---

> As datas seguem o formato `AAAA-MM-DD`. Entradas em **[Não lançado]** são consolidadas na próxima
> versão publicada.
