import { normalizeArabic } from "./rag"

const QUESTION_TRAILERS = /(?:\s+في\s+(?:الإسلام|الشريعة)|\s+شرعاً?|\s+بشكل\s+عام)+\s*$/i
const PUNCTUATION = /[؟?!.,،؛:]+/g
const RULING_OUTCOMES = /\s+(?:حلال|حرام|جائز|مكروه|واجب|مستحب|مباح)\s*$/i

const RULING_FRAMES = [
  /^(?:ما|ايش|وش)\s+(?:هو\s+)?الحكم(?:\s+الشرعي)?(?:\s+(?:في|عن|حول))?\s*/i,
  /^(?:ما|ايش|وش)\s+(?:هو\s+)?حكم(?:\s+الشرعي)?(?:\s+(?:في|عن|حول))?\s*/i,
  /^هل\s+(?:يجوز|يحل|يحرم|يصح|تجب|يجب|يلزم)\s*/i,
  /^هل\s+(?:هذا|هذه|هو|هي)\s+(?:حلال|حرام|جائز)\s*/i,
  /^حكم\s+(?:شرعي\s+)?/i,
  /^ما\s+مدى\s+مشروعية\s+/i,
  /^مشروعية\s+/i,
  /^ما\s+(?:أقوال|اقوال|قول|رأي|راي|آراء|اراء)\s+(?:العلماء|الفقهاء)\s+(?:في|حول)?\s*/i,
  /^القول\s+الراجح\s+(?:في|بشأن)?\s*/i,
  /^فتوى\s+عامة\s+(?:في|حول)?\s*/i,
  /^هل\s+/i,
]

/** Removes the question frame while keeping the actual issue for evidence search. */
export function extractRulingTopic(question: string): string {
  let topic = String(question || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim()

  for (const frame of RULING_FRAMES) {
    if (frame.test(topic)) {
      topic = topic.replace(frame, "")
      break
    }
  }

  topic = topic.replace(QUESTION_TRAILERS, "").replace(RULING_OUTCOMES, "").replace(/\s+/g, " ").trim()
  return topic.slice(0, 180)
}

/**
 * Builds a small, topic-preserving evidence plan for general rulings.
 * The extra queries seek Quran, hadith, and scholarly material without changing
 * the user's issue or treating query expansion itself as evidence.
 */
export function buildGeneralRulingQueries(question: string): string[] {
  const topic = extractRulingTopic(question)
  if (!topic) return []
  return Array.from(new Set([
    topic,
    `${topic} دليل القرآن والسنة`,
    `${topic} أقوال العلماء والفقهاء`,
  ].map((query) => query.trim()).filter(Boolean)))
}

const TOPIC_STOP_WORDS = new Set([
  "ما", "هل", "هو", "هي", "في", "من", "على", "عن", "الى", "الي", "هذا", "هذه", "ذلك", "تلك",
  "يجوز", "حكم", "شرعي", "الشرعي", "دليل", "ادله", "القران", "سنه", "حديث", "اقوال", "العلماء", "الفقهاء",
])
const RIBA_CONTEXT_TERMS = ["مال", "اموال", "امول", "بيع", "ذهب", "فضه", "دين", "قرض", "نسيئه", "اتقوا", "صدقات", "ليربوا"]

/** Rejects lexical false positives while preserving the existing hybrid RAG corpus. */
export function isRulingEvidenceRelevant(topic: string, candidateText: string): boolean {
  const topicTerms = Array.from(new Set(normalizeArabic(topic)
    .split(" ")
    .map((term) => term.replace(/^ال(?=.{3,})/, ""))
    .filter((term) => term.length > 2 && !TOPIC_STOP_WORDS.has(term))))
  if (!topicTerms.length) return false

  const normalizedText = normalizeArabic(candidateText)
  const overlap = topicTerms.filter((term) => normalizedText.includes(term) || (term === "ربا" && normalizedText.includes("ربو"))).length
  const coverage = overlap / topicTerms.length
  const minimumCoverage = topicTerms.length <= 2 ? 0.5 : 0.34
  if (coverage < minimumCoverage) return false

  // ربا can also be the unconnected form of "a Lord"; require financial context.
  if (topicTerms.length === 1 && topicTerms[0] === "ربا") {
    return RIBA_CONTEXT_TERMS.some((term) => normalizedText.includes(term))
  }
  return true
}
