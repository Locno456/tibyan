import type { McpCallRecord } from "./mcp"
import { mcpResultForModel } from "./mcp"

const TRUSTED_DOMAINS = [
  "islamic-content.com",
  "islamhouse.com",
  "hadeethenc.com",
  "quranenc.com",
  "islamenc.com",
  "byenah.com",
  "risala.prh.gov.sa",
  "tafsir.net",
  "tafsirmcp.net",
  "quran.com",
]

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function unwrapResult(result: any): any {
  const modelValue = mcpResultForModel(result, 20_000)
  if (typeof modelValue === "string") {
    try { return JSON.parse(modelValue) } catch { return modelValue }
  }
  return modelValue
}

function isNoResultPayload(value: unknown): boolean {
  let text = ""
  if (typeof value === "string") text = value
  else {
    try { text = JSON.stringify(value) } catch { return false }
  }
  return /(?:no\s+(?:matching\s+)?(?:results?|records?|data|content)(?:\s+(?:were\s+)?found)?|not\s+found|0\s+results?|لم\s+(?:يتم\s+)?العثور|لم\s+أجد\s+(?:نتائج|محتوى|بيانات)|لا\s+توجد\s+(?:نتائج|بيانات|محتويات)|لا\s+يوجد\s+(?:نتائج|بيانات|محتوى)|غير\s+موجود)/i.test(text)
}

function isUsableEvidenceValue(value: any, depth = 0): boolean {
  if (depth > 7 || value == null || value === false) return false
  if (typeof value === "string") return !!value.trim() && !isNoResultPayload(value)
  if (typeof value === "number") return Number.isFinite(value)
  if (Array.isArray(value)) return value.some((item) => isUsableEvidenceValue(item, depth + 1))
  if (!isPlainObject(value) || isNoResultPayload(value)) return false
  if (value.error || value.isError || value.status === false || ["error", "failed", "failure"].includes(String(value.status || "").toLowerCase())) return false

  const dataKeys = ["data", "results", "items", "recitations", "content", "result"]
  for (const key of dataKeys) {
    if (key in value) return isUsableEvidenceValue(value[key], depth + 1)
  }

  const metadataKeys = new Set(["meta", "pagination", "status", "message", "success", "requestId"])
  return Object.entries(value).some(([key, item]) => !metadataKeys.has(key) && isUsableEvidenceValue(item, depth + 1))
}

function findTrustedUrl(value: any, depth = 0): string | undefined {
  if (depth > 7) return undefined
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 60)) {
      const found = findTrustedUrl(item, depth + 1)
      if (found) return found
    }
    return undefined
  }
  if (!isPlainObject(value)) return undefined
  for (const [key, item] of Object.entries(value)) {
    if (!/(url|link|source)/i.test(key) || typeof item !== "string") continue
    try {
      const url = new URL(item)
      if (url.protocol !== "https:" || url.username || url.password) continue
      const host = url.hostname.toLowerCase()
      if (TRUSTED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) return url.toString()
    } catch {
      // Non-URL source labels are not clickable links.
    }
  }
  for (const item of Object.values(value).slice(0, 80)) {
    const found = findTrustedUrl(item, depth + 1)
    if (found) return found
  }
  return undefined
}

function findSourceLabel(value: any, fields: Set<string>, depth = 0): string | undefined {
  if (depth > 7) return undefined
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 60)) {
      const label = findSourceLabel(item, fields, depth + 1)
      if (label) return label
    }
    return undefined
  }
  if (!isPlainObject(value)) return undefined
  for (const [key, item] of Object.entries(value)) {
    if (fields.has(key.toLowerCase()) && typeof item === "string" && item.trim().length >= 2 && item.trim().length <= 180) {
      return item.replace(/\s+/g, " ").trim()
    }
  }
  for (const item of Object.values(value).slice(0, 80)) {
    const label = findSourceLabel(item, fields, depth + 1)
    if (label) return label
  }
  return undefined
}

function selectEvidenceExcerpt(value: unknown, query: string): string | undefined {
  const candidates: string[] = []
  collectEvidenceText(value, candidates)
  const terms = queryTerms(query)
  const ranked = candidates
    .map((text) => {
      const normalized = normalizeMcpArabic(text)
      const matched = terms.filter((term) => normalized.includes(term)).length
      const coverage = terms.length ? matched / terms.length : 0
      return { text: text.replace(/\s+/g, " ").trim(), matched, coverage }
    })
    .filter((item) => item.text.length >= 40 && (!terms.length || item.matched > 0))
    .sort((a, b) => b.coverage - a.coverage || Math.min(b.text.length, 1_200) - Math.min(a.text.length, 1_200))
  return ranked[0]?.text.slice(0, 1_200)
}

export function buildMcpSourceCards(calls: McpCallRecord[], query = ""): any[] {
  const cards: any[] = []
  calls.forEach((call, index) => {
    if (call.error || !call.result || call.result.isError) return
    const data = unwrapResult(call.result)
    if (!isUsableEvidenceValue(data)) return

    const providerUrl = call.providerId === "tafsir_center" ? "https://tafsir.net/" : "https://islamic-content.com/"
    const directSourceUrl = findTrustedUrl(data)
    const sourceUrl = directSourceUrl || providerUrl
    const excerpt = selectEvidenceExcerpt(data, query)
    const sourceTitle = findSourceLabel(data, new Set(["title", "book", "book_name", "collection", "reference", "source_name"]))
    const sourceAuthor = findSourceLabel(data, new Set(["author", "scholar", "compiler"]))
    const resultAttribution = [sourceTitle, sourceAuthor ? `بقلم ${sourceAuthor}` : undefined].filter(Boolean).join(" · ")

    cards.push({
      id: `mcp-${call.providerId}-${call.toolName}-${index}`,
      type: "mcp",
      text: excerpt || `نتيجة ذات صلة من أداة القراءة ${call.toolName}؛ افتح الرابط لمراجعة المادة الأصلية.`,
      evidenceExcerpt: !!excerpt,
      source: `${call.providerLabel} · ${call.toolName}${resultAttribution ? ` · ${resultAttribution}` : ""}${directSourceUrl ? "" : " · رابط الجهة العام؛ لم تُرجع الأداة رابطاً مباشراً"}`,
      source_url: sourceUrl,
      sourceUrlIsDirect: !!directSourceUrl,
      provider: call.providerId,
      tool: call.toolName,
    })
  })
  return cards
}

export function hasUsableMcpEvidence(calls: McpCallRecord[]): boolean {
  return calls.some((call) => !call.error && !!call.result && !call.result.isError && isUsableEvidenceValue(unwrapResult(call.result)))
}

const MCP_QUERY_STOP_WORDS = new Set([
  "من", "في", "على", "عن", "الى", "إلى", "ما", "ماذا", "هل", "كيف", "لماذا", "متى", "اين", "أين",
  "هذا", "هذه", "ذلك", "التي", "الذي", "كان", "كانت", "يكون", "تكون", "هو", "هي", "مع", "او", "أو",
  "هل", "ماهو", "ماهي", "اريد", "أريد", "اعطني", "أعطني", "اشرح", "وضح", "معنى", "صحة", "صحيح",
])

function queryTerms(value: string): string[] {
  return Array.from(new Set(normalizeMcpArabic(value)
    .split(" ")
    .map((word) => word.replace(/^ال(?=.{3,})/, "").replace(/(?:ها|هم|ون|ين|ات|ة|ه)$/g, ""))
    .filter((word) => word.length >= 3 && !MCP_QUERY_STOP_WORDS.has(word))))
}

function normalizeMcpArabic(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[^a-z0-9\u0621-\u064A\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function collectEvidenceText(value: any, out: string[], depth = 0): void {
  if (depth > 7 || value == null) return
  if (typeof value === "string") {
    const text = value.trim()
    if (text.length >= 3 && !/^https?:\/\//i.test(text)) out.push(text)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) collectEvidenceText(item, out, depth + 1)
    return
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (/^(?:url|source_url|link|image|audio|id|uuid|timestamp|query|search_query|input|arguments|request|prompt|instructions?)$/i.test(key)) continue
      collectEvidenceText(item, out, depth + 1)
    }
  }
}

/** A source card is shown only when the returned source text overlaps the user's topic. */
export function mcpCallRelevance(call: McpCallRecord, question: string): number {
  if (call.error || !call.result || call.result.isError || !isUsableEvidenceValue(unwrapResult(call.result))) return 0
  const terms = queryTerms(question)
  if (!terms.length) return 0
  const strings: string[] = []
  collectEvidenceText(unwrapResult(call.result), strings)
  const returnedText = normalizeMcpArabic(strings.join(" "))
  if (!returnedText) return 0
  const matched = terms.filter((term) => returnedText.includes(term)).length
  const coverage = matched / terms.length
  return coverage
}

export function filterRelevantMcpCalls(calls: McpCallRecord[], question: string): McpCallRecord[] {
  return calls.filter((call) => mcpCallRelevance(call, question) >= 0.2)
}
