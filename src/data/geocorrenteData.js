// -----------------------------------------------------------------------------
// BOLETIM GEOCORRENTE (modelo EGN/Marinha) — DEMONSTRATIVO
// [REQUER BACKEND] Em produção, estes boletins viriam de scraping/feed oficial da
// Escola de Guerra Naval (EGN). Aqui usamos dados simulados realistas.
// -----------------------------------------------------------------------------

export const geocorrenteBulletins = [
  {
    id: 'gc-2026-23',
    edition: 'Ed. 23/2026',
    date: '2026-06-05',
    title: 'Reconfiguração de rotas no Atlântico Sul e impactos para o Brasil',
    region: 'Atlântico Sul',
    theme: 'Geopolítica marítima',
    relevance: 'Alta',
    summary:
      'Aumento do tráfego mercante e exercícios navais de potências extrarregionais elevam a importância da vigilância da Amazônia Azul e da proteção das rotas do pré-sal.',
  },
  {
    id: 'gc-2026-22',
    edition: 'Ed. 22/2026',
    date: '2026-06-03',
    title: 'Tensões na fronteira norte e cooperação amazônica',
    region: 'Fronteira Norte',
    theme: 'Segurança regional',
    relevance: 'Alta',
    summary:
      'Movimentações na divisa com a Venezuela e o fluxo migratório pressionam operações integradas; cooperação com países vizinhos é apontada como prioridade.',
  },
  {
    id: 'gc-2026-21',
    edition: 'Ed. 21/2026',
    date: '2026-05-30',
    title: 'Indústria naval e o programa de submarinos (PROSUB)',
    region: 'Brasil',
    theme: 'Base industrial de defesa',
    relevance: 'Média',
    summary:
      'Avanços no PROSUB e na nacionalização de tecnologia reforçam a autonomia estratégica e a geração de empregos qualificados no setor naval.',
  },
  {
    id: 'gc-2026-20',
    edition: 'Ed. 20/2026',
    date: '2026-05-27',
    title: 'Disputa por recursos no Ártico e reflexos no Sul Global',
    region: 'Global',
    theme: 'Geopolítica de recursos',
    relevance: 'Média',
    summary:
      'A corrida por recursos e rotas no Ártico reorganiza alianças e pode redirecionar investimentos de defesa, com efeitos indiretos sobre o Atlântico Sul.',
  },
  {
    id: 'gc-2026-19',
    edition: 'Ed. 19/2026',
    date: '2026-05-23',
    title: 'Segurança cibernética de infraestruturas críticas marítimas',
    region: 'Brasil',
    theme: 'Cibersegurança',
    relevance: 'Alta',
    summary:
      'Portos e sistemas de navegação tornam-se alvos prioritários; a integração entre Marinha e setor privado é destacada como vetor de resiliência.',
  },
]
