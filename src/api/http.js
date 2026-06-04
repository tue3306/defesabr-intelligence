// Helper de fetch com timeout + retry automatico.
export async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

export async function fetchJSON(url, options = {}, { timeout = 10000, retries = 2 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options, timeout)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      // pequena espera progressiva antes do retry
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  throw lastErr
}
