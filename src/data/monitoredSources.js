// -----------------------------------------------------------------------------
// CATÁLOGO DE FONTES MONITORADAS — arquitetura preparada para integração real.
//
// Pipeline conceitual de cada fonte (nenhum atalho no front-end):
//   SOURCE → CONNECTOR → FETCH → NORMALIZAÇÃO → CLASSIFICAÇÃO → STORAGE → ANÁLISE → UI
//
// Nesta fase (demonstração 100% front-end, sem backend), as fontes ficam
// CONFIGURADAS/PREPARADAS: há metadados e conector previsto, mas não há coleta
// ao vivo — um site estático não pode consumir estes veículos diretamente
// (CORS/robots). O `status` reflete isso com honestidade: nada é apresentado
// como "coletando ao vivo" quando não está. Quando existir backend/proxy,
// basta implementar o conector por trás destes mesmos metadados.
//
// Metadados por fonte (id · nome · domínio · categoria · país · tipo ·
// status · confiabilidade · cadência · relevância para o Brasil).
// -----------------------------------------------------------------------------

// Estados possíveis de uma fonte (usados para badges e para os textos de frescor).
export const SOURCE_STATUS = {
  // Os textos diziam "requer backend" e "aguardando backend/proxy". O backend
  // existe e coleta; os rótulos descrevem agora o que o servidor MEDE.
  ativa: { label: 'no ar', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-400', desc: 'Entregou itens na última execução do coletor.' },
  configurada: { label: 'sem coleta ainda', classes: 'bg-brand-500/15 text-brand-300', dot: 'bg-brand-400', desc: 'Cadastrada; o coletor ainda não a visitou.' },
  pendente: { label: 'pendentes', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', dot: 'bg-amber-400', desc: 'Prevista, ainda não cadastrada.' },
  indisponivel: { label: 'com falha', classes: 'bg-red-500/15 text-red-800 dark:text-red-300', dot: 'bg-red-400', desc: 'A última tentativa retornou erro; o motivo fica registrado na fonte.' },
}

// Agrupamento por categoria (mantém a leitura organizada e densa, não "cheia").
export const SOURCE_CATEGORIES = [
  { id: 'tech-br', label: 'Tecnologia & Cibersegurança — Brasil' },
  { id: 'inst-br', label: 'Institucional — Brasil' },
  { id: 'intl-sec', label: 'Tecnologia & Segurança — Internacional' },
]

// Fontes solicitadas para o monitoramento, com foco brasileiro preservado:
// mesmo as internacionais entram pela ótica "qual a relevância para o Brasil?".
// `monitoredSources` vivia aqui: doze veiculos com `status` e `reliability`
// escritos a mao. As fontes de verdade sao as 50 cadastradas no servidor, com
// estado medido a cada coleta (/api/sources/summary). O unico import que
// restava, na Landing, nao usava a variavel.

// Agrega as fontes por categoria, na ordem de SOURCE_CATEGORIES.
// `sourcesByCategory()` saiu junto — agregava o catalogo removido.

// Contagem por status (para um resumo honesto no topo do catálogo).
// `sourceStatusSummary()` saiu junto — agregava o catalogo removido.
