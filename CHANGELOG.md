# 📓 Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [2.0.0] — 2026-09-10

A versão em que a plataforma deixou de ser demonstrativa. A 1.0.0 era uma SPA
com dados de exemplo; esta tem servidor, banco, coleta real de 50 fontes e
autenticação verificada no servidor.

### Adicionado

- **Servidor próprio** (Express + `node:sqlite`, Node 24) servindo `/api` e a
  interface compilada num processo só. Deploy no Railway.
- **Coleta real** de 50 feeds RSS mais as APIs da Câmara, World Bank, Banco
  Central e Comex Stat, a cada 30 minutos, com trilha de execução auditável.
- **Filtro de relevância** determinístico e inspecionável, com o método exposto
  em `GET /api/intel/metodo` e testável ao vivo em `POST /api/system/method/test`.
- **Correlação centrada no Brasil**: oito regras determinísticas que ligam cada
  matéria ao acervo de organizações atacadas, grupos e vulnerabilidades — cada
  ligação com motivo, evidência literal, contexto e impacto possível.
- **Índice de vínculo com o Brasil** por matéria (0–100), que resolve a pergunta
  da notícia estrangeira que importa aqui.
- **Três níveis de leitura** na navegação: estratégico, tático e operacional.
- **Mapa estratégico** em página própria, cruzando cobertura noticiosa e vítimas
  de ransomware pelo código ISO, com o Brasil como âncora fora da escala de cor.
- **Autenticação de verdade**: scrypt com sal por conta, token HMAC-SHA256 e
  `exigirPapel()` por rota. `npm run check:auth` percorre quatro identidades
  contra cada rota protegida, inclusive as que mudam estado.
- **Síntese por IA opcional** — resumo do período e perguntas ao acervo, com a
  chave vivendo apenas no servidor de quem hospeda e todo texto de máquina
  marcado como tal.
- **Alertas de incidente** contra instituições brasileiras, com opção de
  silenciar que de fato silencia.
- **Clipping em PDF** agrupado por categoria, com procedência e endereço de cada
  matéria e paginação.

### Alterado

- **Deploy: Railway em vez de GitHub Pages.** O Pages entrega arquivo e não roda
  Node — a partir do momento em que existiu servidor, a cópia publicada lá abria
  a página e respondia 404 em toda chamada de API. O workflow saiu.
- **CI passou a testar de verdade.** Rodava só `npm run build` no Node 20, que
  nem executa este servidor (`engines: >=24`, `node:sqlite`). Agora sobe a API e
  roda as duas suítes — 30 casos de forma e 60 de autorização.
- **Nível de alerta** deixou de marcar CRÍTICO 100/100 todo dia: era erro de
  população, não de fórmula. Passou a medir a janela inteira e a exibir a
  distribuição que o sustenta.
- **Modelo de acesso** simplificado: não há cobrança, toda conta nasce com o
  nível completo de leitura, e o que separa os perfis é o papel.

### Removido

- **Todo o modo demonstrativo.** Saíram o botão de "gerar clipping com IA" que
  encenava quatro etapas e devolvia texto escrito à mão, as métricas de negócio
  inventadas do painel administrativo, os cenários com probabilidades atrás de
  paywall, os alertas fabricados por temporizador e as telas de dossiê e matriz
  de risco, cujo conteúdo era redigido e não coletado.
- **A simulação de comércio**: preços, planos, faturas e desconto anual, num
  projeto que nunca teve cobrança.
- **A explicação dos perfis na página pública**, que anunciava inclusive a conta
  de administrador.
- **A tabela de CVEs** do centro da tela de grupos — mudou de altitude para o
  perfil de cada grupo, onde responde à pergunta certa.

---

> As datas seguem o formato `AAAA-MM-DD`. Entradas em **[Não lançado]** são consolidadas na próxima
> versão publicada.
