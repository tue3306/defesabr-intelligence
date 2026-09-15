# 📓 Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Versão de demonstração: sem IA, com contas de verdade

**Removido**

- **Todo o assistente por IA** — rotas `/api/ia/*`, chamada ao provedor, chave
  por conta e da instalação, resumo do período, resumão da semana, perguntas ao
  acervo, análise assistida e leitura de correlação. Saíram a tela, a API, o
  cache, as colunas `users.ia_api_key`, `users.ia_modelo` e
  `correlations.leitura_ia` (removidas na migração), a suíte `check:ia` e as
  variáveis `ANTHROPIC_*`. A plataforma não depende de nenhum serviço de IA.
- **As contas públicas `admin123` e `usuario123`.** Eram semeadas com a senha
  igual ao nome de usuário e oferecidas com um clique na tela de entrada. Ao
  subir, o servidor remove as duas — ou renomeia a de administrador para o
  `ADMIN_USERNAME` configurado, preservando a trilha de auditoria.
- Senha temporária gerada pelo administrador, "encerrar as outras sessões" e a
  rota `GET /auth/contas`.
- O e-mail do cadastro: criar conta pede **usuário e senha**, e nada mais.

**Adicionado**

- **Conta de administrador por variável de ambiente** (`ADMIN_USERNAME`,
  `ADMIN_PASSWORD`), criada na primeira subida. A senha é trocada depois pela
  própria plataforma, e a variável não a sobrescreve. Nenhuma credencial no
  repositório.
- **Notificações no servidor** (`notifications` + `notification_state`): a
  coleta grava os avisos — matéria de urgência alta ou crítica, organização
  brasileira com incidente crítico, e falha de coletor só para administradores —
  e cada conta guarda o próprio estado de leitura, que vale em qualquer
  navegador. Rotas `/api/notifications*`.
- **Guia da plataforma** em `GET /api/guia`, servido pelo botão de ajuda.

**Corrigido**

- **As notificações não chegavam.** O navegador consultava o acervo a cada cinco
  minutos e só avisava o que aparecesse DEPOIS da primeira consulta; recarregar
  a página zerava a memória, e o que chegava morava no `localStorage` — sair da
  conta apagava e outro navegador não via nada.
- **Coleta a cada 15 minutos** (era 30), com o ciclo encadeado: o próximo é
  agendado quando o anterior termina, então dois nunca se sobrepõem e a
  "próxima coleta" na tela passa a ser a de verdade. Cada coletor ganhou
  cadência mínima própria — Câmara e Banco Central a cada hora, Comex a cada
  12 h, World Bank a cada 24 h —, para o ciclo curto não multiplicar chamadas a
  serviços que não têm nada novo.
- Barra de rolagem minúscula ao lado das abas de Minha conta, Arquivo e Séries.
- README, ROADMAP, SECURITY, ARQUITETURA e a landing descreviam recursos que
  não existem mais.

---

Auditoria de consistência entre o que a interface promete e o que existe.

### Adicionado

- **Governança com efeito real**: promover, rebaixar, suspender, reativar e
  remover contas (`PATCH`/`DELETE /api/users/:id`), com as travas de própria
  conta e último administrador no servidor. Papel e situação são lidos do banco
  a cada requisição — a mudança vale na hora.
- **Trilha de auditoria** de atos de governança (`audit_log`, `GET /api/system/audit`).
- **Minha conta de verdade**: troca de nome e troca de senha com a atual; a
  senha trocada invalida os tokens antigos.
- **Alerta de segurança** no painel do administrador quando `AUTH_SECRET` está
  ausente.
- Interface desconecta ao receber 401 e avisa a pessoa.
- Áreas de interesse passam a ordenar as notícias do painel e a filtrar o clipping.
- Seção "Dados e privacidade" em Sobre.
- **Regra de domínio das proposições** (`server/src/lib/proposicoes.js`): o Radar
  Legislativo só mostra a proposição cuja ementa tem termo de defesa, e cada
  cartão diz qual. `?todas=true` mostra as de fora, marcadas.
- Situação de tramitação com data de consulta (`bills.status_at`), renovada pela
  coleta depois de 7 dias; o administrador consulta uma proposição na hora.

### Corrigido

- Console de governança: suspender, remover, trocar papel/plano, convidar conta e
  pausar/remover fonte alteravam só a memória do navegador e anunciavam sucesso.
- Painel do usuário exibia "ATENÇÃO 42/100" fixo antes de abrir o clipping.
- Página Sobre repetia as seções de ciclo e arquitetura dentro de cada cartão.
- `GET /clipping/latest` ignorava o período pedido (índice "7 dias" era de 30).
- Filtro por tipo da busca não filtrava; o glossário anunciado não era buscado.
- Sair da conta deixava pasta, avisos e clippings para a próxima conta no navegador.
- Guia da plataforma não listava as telas de visão geral, conta e recursos.
- Valores em dólar com ponto decimal inglês ("R$ 5.170", "US$ 1911.7 mi").
- Filtro "Senado" no Radar Legislativo, que a coleta não consulta.
- Eventos consolidados: ao escolher uma categoria, a barra de categorias sumia e
  não havia como voltar ou trocar. As opções passam a vir do período inteiro.
- Busca e clipping: um filtro marcado sem resultado na nova consulta ficava
  preso e invisível; agora volta para "Tudo" ou continua visível para desmarcar.
- Parte dos feeds entregava a matéria inteira como resumo (até 8.930
  caracteres); as respostas passam a trazer um trecho, com link para o original.
- Quiz: recorde guardado por trilha, e não um número só para todas.
- Radar Legislativo: 127 das 176 proposições coletadas não eram de defesa — a
  busca da Câmara trazia "inteligência" artificial, "soberania" econômica e as
  polícias militares dos Estados. As três ordenações não ordenavam (campos que a
  API não tinha), o indicador "Alta relevância" era sempre zero e o detalhe
  exibia uma seção "Impacto para a defesa" vazia.
- Proposição sem situação consultada aparecia "Em comissão · 35%".
- Resultados da busca levavam à tela genérica: a notícia abre no veículo, a
  proposição abre o Radar filtrado nela, o termo abre o glossário no termo e a
  fonte abre a lista filtrada.
- Notificações guardavam o link da matéria e não o usavam; o clique agora abre
  a matéria ou a tela dos incidentes.
- Notificações e arquivo: marcar como lida ou excluir o último item de uma
  página a deixava vazia com itens ainda nas anteriores.

### Removido

- Papel `analyst` e o eixo de planos (`subscriptionStore`), sem conta nem cobrança.
- Capacidade "Análise por IA — não implementada" no status, que era falsa.
- Regras de alerta e botão "Nova regra" sem motor por trás; "Reavaliar fonte" só de sessão.
- Índice de vínculo com o Brasil exibido como número; links de redes sociais
  sem perfil; restos do GitHub Pages (404.html, sitemap, og-image).

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
