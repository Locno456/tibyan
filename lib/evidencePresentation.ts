/**
 * Returns a short display-only excerpt for long hadith cards.
 * The original source text stays unchanged and should be retained separately
 * for the source-details view and copy actions.
 */
export function shortenHadithForChat(text: string, maxChars = 220): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  const limit = Math.max(40, Math.floor(maxChars))
  if (normalized.length <= limit) return text

  const head = normalized.slice(0, limit)
  const boundary = head.lastIndexOf(" ")
  const end = boundary >= Math.floor(limit * 0.65) ? boundary : limit
  return `${normalized.slice(0, end).trimEnd()}…`
}
