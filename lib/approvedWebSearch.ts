import type { RetrievedChunk } from "./rag"

// Only reviewed, public search endpoints from the competition's source list.
// Adding a site means reviewing its URL template, terms of use and citation quality.
const SEARCH_ENDPOINTS = [
  { id: "dorar_hadith", label: "الدرر السنية — بحث الحديث", origin: "https://dorar.net", path: "/hadith/search", parameter: "q" },
  { id: "dorar_tafsir", label: "الدرر السنية — بحث التفسير", origin: "https://dorar.net", path: "/tafseer", parameter: "q" },
] as const
const MAX_BYTES = 100_000
const MAX_QUERY = 160

function plainText(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&(?:quot|#34);/gi, '"').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ").trim()
}

function queryTerms(question: string): string[] {
  return question.replace(/[\u064B-\u065F\u0640]/g, "").replace(/[أإآ]/g, "ا")
    .split(/[^\u0621-\u064A\w]+/).filter((term) => term.length >= 4).slice(0, 8)
}

/** Direct server-to-site search; never accepts a user-supplied URL or follows redirects. */
export async function searchApprovedWeb(question: string, fetchImpl: typeof fetch = fetch): Promise<RetrievedChunk[]> {
  const query = question.trim().slice(0, MAX_QUERY)
  const terms = queryTerms(query)
  if (!terms.length) return []
  const results = await Promise.all(SEARCH_ENDPOINTS.map(async (site): Promise<RetrievedChunk | null> => {
    const url = new URL(site.path, site.origin)
    url.searchParams.set(site.parameter, query)
    try {
      const response = await fetchImpl(url.toString(), {
        method: "GET", redirect: "manual", cache: "no-store",
        signal: AbortSignal.timeout(3500),
        headers: { Accept: "text/html", "User-Agent": "Tibyan/1.0 (read-only source search)" },
      })
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) return null
      if (Number(response.headers.get("content-length") || 0) > MAX_BYTES) return null
      const reader = response.body?.getReader()
      if (!reader) return null
      const chunks: Uint8Array[] = []
      let total = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (!value) continue
          total += value.length
          if (total > MAX_BYTES) { await reader.cancel(); return null }
          chunks.push(value)
        }
      } finally { reader.releaseLock() }
      const bytes = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      const html = new TextDecoder().decode(bytes)
      // Search forms, menus and filter lists are NOT results. Fail closed if a
      // site's result markup changes instead of presenting navigation as proof.
      const resultBlocks = Array.from(html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>|<(?:div|section)\b[^>]*class=["'][^"']*\b(?:hadith-item|result-item)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section)>/gi))
        .slice(0, 12).map((match) => match[0])
      // Match the excerpt and citation URL INSIDE the same result block. Never
      // attach an unrelated result's link (or a search-form navigation link).
      for (const block of resultBlocks) {
        const text = plainText(block)
        if (text.length < 60) continue
        const normalized = text.replace(/[\u064B-\u065F\u0640]/g, "").replace(/[أإآ]/g, "ا")
        const hit = terms.find((term) => normalized.includes(term))
        if (!hit) continue
        const first = normalized.indexOf(hit)
        const excerpt = text.slice(Math.max(0, first - 100), first + 800).trim()
        if (excerpt.length < 60) continue
        const directHref = site.id === "dorar_hadith"
          ? block.match(/href\s*=\s*["'](?:https:\/\/dorar\.net)?(\/h\/[a-zA-Z0-9]{4,30})(?:\?[^"']*)?["']/i)?.[1]
          : undefined
        return {
          id: `web-${site.id}`, score: 1.5, relevance: 0.3,
          payload: {
            id: `web-${site.id}`, type: "concept", level: "B", text: excerpt,
            source: `${site.label} — مقتطف بحث مباشر؛ لم يتحقق تِبْيَان من صحة النسبة أو الإسناد${directHref ? "" : "؛ الرابط يعرض نتائج البحث وليس الدليل المحدد"}`,
            source_url: directHref ? `https://dorar.net${directHref}` : url.toString(),
          },
        } as RetrievedChunk
      }
      return null
    } catch { return null }
  }))
  return results.filter((item): item is RetrievedChunk => item !== null)
}
