import { compareQuoteToText, findVerifiedTextMatches, type VerifiedTextMatch } from "./rag"
import type { McpCallRecord } from "./mcp"

export interface ParsedVerificationRequest {
  requested: boolean
  quote?: string
}

export interface ExternalQuoteMatch {
  kind: "exact" | "near"
  similarity: number
  call: McpCallRecord
}

const VERIFICATION_INTENT = /(?:ما\s+صحة|هل\s+(?:هذه|هذي|هذا|الآية|الايه|الحديث|الاقتباس)|صحة\s+(?:الحديث|الآية|الايه|الاقتباس)|هل\s+(?:ورد|ثبت|قال)|تحقق\s+من|تأكد\s+من\s+(?:صحة|نسبة)|منسوب\s+إلى|صحيح\s+أم\s+لا)/i

function cleanQuote(value: string): string {
  return value
    .replace(/^(?:قال\s+تعالى|قال\s+رسول\s+الله(?:\s+صلى\s+الله\s+عليه\s+وسلم)?|ورد\s+في\s+الحديث|الحديث\s+هو|حديث)\s*[:：،-]?\s*/i, "")
    .replace(/\s+(?:هل\s+(?:هو|هذا|هذه)\s+)?(?:صحيح|صحيحة|ثابت|ثابتة|وارد|صواب)\s*\??\s*$/i, "")
    .replace(/^[:：\s«»“”"'﴿]+|[:：\s«»“”"'﴾]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseVerificationRequest(question: string): ParsedVerificationRequest {
  if (!VERIFICATION_INTENT.test(question)) return { requested: false }

  const delimited = question.match(/﴿([^﴾]{6,})﴾|«([^»]{6,})»|“([^”]{6,})”|"([^\"]{6,})"|'([^']{6,})'/)
  if (delimited) {
    const quote = cleanQuote(delimited.slice(1).find((part) => typeof part === "string" && part.trim()) || "")
    return quote ? { requested: true, quote } : { requested: true }
  }

  const afterLabel = question.match(/(?:حديث|آية|ايه|اقتباس|النص|العبارة)\s*[:：]\s*(.+)$/i)
  if (afterLabel) {
    const quote = cleanQuote(afterLabel[1])
    return quote.length >= 8 ? { requested: true, quote } : { requested: true }
  }

  // If the user did not delimit the quotation, remove the verification prompt and
  // use the remaining text only when it is long enough to be a meaningful quote.
  let candidate = question
    .replace(VERIFICATION_INTENT, " ")
    .replace(/(?:هل|هذه|هذي|هذا|الآية|الايه|الحديث|الاقتباس|صحيح|صحيحة|ثابت|ثابتة|وارد|صواب|ما صحة|تحقق من|تأكد من)/gi, " ")
  candidate = cleanQuote(candidate)
  return candidate.length >= 12 ? { requested: true, quote: candidate } : { requested: true }
}

export function findLocalQuoteMatches(quote: string, limit = 3): VerifiedTextMatch[] {
  return findVerifiedTextMatches(quote, limit)
}

function collectStrings(value: unknown, target: string[], depth = 0): void {
  if (depth > 7 || value == null) return
  if (typeof value === "string") {
    const text = value.trim()
    if (text.length >= 16 && text.length <= 24_000 && !/^https?:\/\//i.test(text)) target.push(text)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) collectStrings(item, target, depth + 1)
    return
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    for (const [key, item] of entries) {
      if (/^(?:url|source_url|link|image|audio|id|uuid|timestamp|query|search_query|input|arguments|request|prompt|instructions?)$/i.test(key)) continue
      collectStrings(item, target, depth + 1)
    }
  }
}

export function findMcpQuoteMatches(quote: string, calls: McpCallRecord[]): ExternalQuoteMatch[] {
  const matches: ExternalQuoteMatch[] = []
  for (const call of calls) {
    if (call.error || !call.result || call.result.isError) continue
    const texts: string[] = []
    collectStrings(call.result, texts)
    let best: { kind: "exact" | "near"; similarity: number } | null = null
    for (const text of texts) {
      const match = compareQuoteToText(quote, text)
      if (!match) continue
      if (!best || (match.kind === "exact" && best.kind !== "exact") || match.similarity > best.similarity) best = match
    }
    if (best) matches.push({ ...best, call })
  }
  return matches.sort((a, b) => Number(b.kind === "exact") - Number(a.kind === "exact") || b.similarity - a.similarity)
}
