// -----------------------------------------------------------------------------
// GOVERNANÇA — só taxonomia de estados.
//
// Este arquivo já declarou a saúde de oito serviços, um log de auditoria com
// entradas assinadas por pessoas que não existem, 128 contas no plano Explorar
// e um catálogo de integrações escrito à mão — com "SSO institucional
// (SAML/OIDC)" e um modelo de linguagem "planejado" quando o assistente por IA
// já funcionava. Tudo isso passou a vir de `/api/system/status`, que deriva
// cada estado do banco. Sobrou o que é vocabulário: rótulo e cor de cada estado.
// -----------------------------------------------------------------------------

export const HEALTH_STATUS = {
  operational: { label: 'Operacional', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-400' },
  degraded: { label: 'Degradado', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', dot: 'bg-amber-400' },
  // Recurso que depende de uma chave que ninguém configurou. Não é falha.
  optional: { label: 'Não configurado', classes: 'bg-gray-500/15 text-gray-600 dark:text-gray-300', dot: 'bg-gray-400' },
  planned: { label: 'Não implementado', classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300', dot: 'bg-brand-400' },
}

export const USER_STATUS = {
  ativo: { label: 'Ativa', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-400' },
  suspenso: { label: 'Suspensa', classes: 'bg-red-500/15 text-red-700 dark:text-red-300', dot: 'bg-red-400' },
}

export const AUDIT_LEVEL = {
  info: { label: 'info', classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300' },
  warn: { label: 'atenção', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  error: { label: 'erro', classes: 'bg-red-500/15 text-red-700 dark:text-red-300' },
}

// Estado de cada fonte, como a ponte o deriva da última coleta (`paraFonte`).
export const SOURCE_STATUS = {
  ativa: { label: 'no ar', classes: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-400', desc: 'Entregou itens na última execução do coletor.' },
  configurada: { label: 'sem coleta ainda', classes: 'bg-brand-500/15 text-brand-600 dark:text-brand-300', dot: 'bg-brand-400', desc: 'Cadastrada; o coletor ainda não a visitou.' },
  indisponivel: { label: 'com falha', classes: 'bg-red-500/15 text-red-800 dark:text-red-300', dot: 'bg-red-400', desc: 'A última tentativa retornou erro; o motivo fica registrado na fonte.' },
  // Era "pendentes — prevista, ainda não cadastrada", para fonte DESLIGADA.
  pausada: { label: 'pausada', classes: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', dot: 'bg-amber-400', desc: 'Coleta desligada no Console de Governança.' },
}
