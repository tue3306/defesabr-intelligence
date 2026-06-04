// Wrapper da Claude API (Anthropic). Chamada direta do browser para fins
// de DEMONSTRAÇÃO. Em produção real, a chave NÃO deve ficar no front-end —
// use um backend/proxy. Aqui usamos o header oficial de "direct browser access".
import { mockDailyClipping, mockWeeklyAnalysis } from '../data/mockData'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

// Resolve a chave: override local (Configurações) tem prioridade sobre o .env
export function getAnthropicKey() {
  let override = ''
  try {
    const raw = localStorage.getItem('defesabr-settings')
    if (raw) override = JSON.parse(raw)?.state?.apiKeyOverride || ''
  } catch {
    /* ignore */
  }
  return override || import.meta.env.VITE_ANTHROPIC_API_KEY || ''
}

export function isApiConfigured() {
  const key = getAnthropicKey()
  return !!key && key.startsWith('sk-ant') && !key.includes('sua-chave')
}

// Extrai JSON mesmo se vier cercado por markdown ou texto
function parseJSON(text) {
  if (!text) throw new Error('Resposta vazia da IA')
  let clean = text.trim()
  const fence = clean.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) clean = fence[1].trim()
  const first = clean.indexOf('{')
  const last = clean.lastIndexOf('}')
  if (first !== -1 && last !== -1) clean = clean.slice(first, last + 1)
  return JSON.parse(clean)
}

async function callClaude({ system, user, maxTokens = 4000 }) {
  const key = getAnthropicKey()
  if (!isApiConfigured()) {
    const e = new Error('Chave de API da Anthropic não configurada')
    e.code = 'NO_API_KEY'
    throw e
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Claude API ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  return data?.content?.[0]?.text || ''
}

// ---------------------------------------------------------------------------
// CLIPPING DIÁRIO
// ---------------------------------------------------------------------------
export async function generateDailyClipping(rawNews) {
  const system = `Você é um analista sênior especializado em Segurança e Defesa brasileira,
com formação em relações internacionais e ciência política.
Você trabalha para uma plataforma de inteligência estratégica.
Sempre responda em JSON válido, sem markdown ao redor.`

  const user = `Analise as seguintes notícias brutas sobre segurança e defesa:

${JSON.stringify(rawNews)}

Retorne um JSON com esta estrutura exata (mantenha os valores de enum exatamente como abaixo, sem acento):
{
  "date": "DD/MM/YYYY",
  "summary_executive": "Resumo executivo do dia em 2-3 parágrafos",
  "news": [
    {
      "id": 1,
      "title": "Título editado e claro",
      "source": "Fonte original",
      "url": "URL original",
      "category": "uma das categorias válidas",
      "urgency": "CRITICO|ALTO|MEDIO|BAIXO",
      "summary": "Resumo em 3-4 frases claras e objetivas",
      "key_points": ["ponto 1", "ponto 2", "ponto 3"],
      "impact_br": "Como isso impacta diretamente o Brasil",
      "actors": ["ator 1", "ator 2"],
      "region": "região geográfica envolvida"
    }
  ],
  "trends": ["tendência identificada 1", "tendência identificada 2"],
  "alert_level": "NORMAL|ATENCAO|ALERTA|CRITICO",
  "editor_note": "Nota do analista sobre o contexto geral do dia"
}`

  const text = await callClaude({ system, user, maxTokens: 4000 })
  const parsed = parseJSON(text)
  return { ...parsed, source: 'ai', generatedAt: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// ANÁLISE SEMANAL
// ---------------------------------------------------------------------------
const FOCUS_SYSTEM = {
  academico:
    'Você é um analista acadêmico do IPEA, com rigor metodológico e visão de longo prazo sobre políticas de defesa.',
  investimento:
    'Você é um analista de risco de uma gestora de investimentos, focado em impacto econômico e oportunidades de mercado no setor de defesa.',
  comercial:
    'Você é um consultor de comércio exterior especializado em produtos de defesa e cadeias industriais.',
  empresarial:
    'Você é um analista de inteligência competitiva para empresas do setor de defesa e segurança.',
  diplomatico:
    'Você é um especialista em relações exteriores do Itamaraty, focado em geopolítica e cooperação regional.',
}

export async function generateWeeklyAnalysis(weeklyNews, focusArea = 'empresarial') {
  const system = `${FOCUS_SYSTEM[focusArea] || FOCUS_SYSTEM.empresarial}
Sempre responda em JSON válido, sem markdown ao redor.`

  const user = `Com base nos eventos da semana sobre segurança e defesa do Brasil:

${JSON.stringify(weeklyNews)}

Gere uma análise de cenários sob a perspectiva "${focusArea}". Retorne JSON com esta estrutura exata (mantenha os valores de enum — type, status e impact — exatamente como abaixo, sem acento):
{
  "focus": "${focusArea}",
  "week": "Semana de DD a DD de Mês de AAAA",
  "context": { "events_monitored": 0, "active_regions": ["..."], "tension_level": 0 },
  "scenarios": [
    { "type": "BASE", "probability": 60, "title": "...", "description": "...", "factors": ["..."], "monitor": ["..."] },
    { "type": "OTIMISTA", "probability": 25, "title": "...", "description": "...", "factors": ["..."], "monitor": ["..."] },
    { "type": "ADVERSO", "probability": 15, "title": "...", "description": "...", "factors": ["..."], "monitor": ["..."] }
  ],
  "opportunities": [{ "title": "...", "probability": "Alta|Média|Baixa", "impact": "Alto|Médio|Baixo" }],
  "risks": [{ "title": "...", "probability": "Alta|Média|Baixa", "impact": "Alto|Médio|Baixo" }],
  "recommendations": {
    "Gestores públicos": "...", "Empresas do setor": "...", "Pesquisadores": "...", "Investidores": "..."
  },
  "indicators": [{ "name": "...", "value": "...", "target": "...", "status": "NORMAL|ATENCAO|ALERTA|CRITICO" }],
  "timeline": [{ "date": "DD/MM", "title": "...", "category": "...", "impact": "CRITICO|ALTO|MEDIO|BAIXO" }],
  "topics": [{ "text": "...", "weight": 1 }]
}`

  const text = await callClaude({ system, user, maxTokens: 4000 })
  const parsed = parseJSON(text)
  return { ...parsed, source: 'ai' }
}

// ---------------------------------------------------------------------------
// BUSCA SEMÂNTICA
// ---------------------------------------------------------------------------
export async function semanticSearch(query, articles) {
  const system = `Você é um motor de busca semântica para uma base de notícias de defesa.
Retorne apenas JSON válido.`
  const user = `Consulta do usuário: "${query}"

Base de artigos:
${JSON.stringify(articles.map((a) => ({ id: a.id, title: a.title, summary: a.summary, category: a.category })))}

Retorne os artigos mais relevantes à consulta no formato:
{ "results": [ { "id": 1, "relevance": 0.0, "snippet": "trecho relevante destacando o porquê" } ] }`

  const text = await callClaude({ system, user, maxTokens: 1500 })
  return parseJSON(text)
}

// Fallbacks expostos para os hooks
export const fallbacks = { mockDailyClipping, mockWeeklyAnalysis }
