import { getSurahMetadata, getVerifiedAyah, normalizeArabic, QURAN_SURAHS } from "./quranAudio"

export interface ParsedQuranTextRequest {
  kind: "reference" | "surah" | "topic" | "generic" | "ambiguous"
  surahNumber?: number
  fromAyah?: number
  toAyah?: number
  topic?: string
  wantsExplanation: boolean
}

const VERIFICATION_PHRASES = /(?:هل\s+(?:هذه|هذي|هذا|الآية|الايه|الحديث|الاقتباس)|ما\s+صحة|صحة\s+(?:الحديث|الآية|الايه|الاقتباس)|هل\s+(?:ورد|ثبت)|تحقق\s+من|تأكد\s+من\s+(?:صحة|نسبة))/i
const REQUEST_PHRASES = /(?:اعطني|هات|اذكر|اكتب|اقرا|ما نص|نص الايه|نص الايات|اريد(?:\s+ان)?\s+(?:اقرا|اكتب|اعرف)|اعرض|اقتبس|ايه من القران|ايات من القران)/i
const EXPLANATION_PHRASES = /(?:فسر|تفسير|اشرح|معنى|ما المقصود|دلاله)/i

function parseSurahNumber(question: string): number | undefined {
  const normalized = ` ${normalizeArabic(question)} `
  const numeric = normalized.match(/\s(?:سوره|السوره)\s*(\d{1,3})\s/)
  if (numeric) {
    const number = Number(numeric[1])
    if (getSurahMetadata(number)) return number
  }
  const candidates = [...QURAN_SURAHS]
    .map((surah) => ({ surah, name: normalizeArabic(surah.name) }))
    .sort((a, b) => b.name.length - a.name.length)
  for (const { surah, name } of candidates) {
    if (name && normalized.includes(` ${name} `)) return surah.number
  }
  return undefined
}

function parseVerseRange(question: string): { fromAyah?: number; toAyah?: number } {
  const colon = question.match(/(?:سورة\s*)?(\d{1,3})\s*[:/]\s*(\d{1,3})/)
  if (colon) return { fromAyah: Number(colon[2]), toAyah: Number(colon[2]), _surah: Number(colon[1]) } as any

  const normalized = normalizeArabic(question)
  const range = normalized.match(/(?:من\s*)?(?:(?:ال)?ا(?:يه|يات)\s*(?:رقم\s*)?)?(\d{1,3})\s*(?:الى|الي|حتى|to|[-–])\s*(?:(?:ال)?ا(?:يه|يات)\s*(?:رقم\s*)?)?(\d{1,3})/i)
  if (range) return { fromAyah: Number(range[1]), toAyah: Number(range[2]) }

  const single = normalized.match(/(?:ال)?ا(?:يه|يات)\s*(?:رقم\s*)?(\d{1,3})/)
  if (single) return { fromAyah: Number(single[1]), toAyah: Number(single[1]) }

  const afterSurah = normalized.match(/سوره\s+\S+\s+(\d{1,3})\s*$/)
  if (afterSurah) return { fromAyah: Number(afterSurah[1]), toAyah: Number(afterSurah[1]) }
  return {}
}

function extractTopic(question: string): string | undefined {
  const match = question.match(/(?:عن|حول|بشأن|في موضوع)\s+([^؟?.!،؛]+?)(?:\s+(?:في القرآن|بالقرآن|من القرآن|من القران))?\s*[؟?.!،؛]*$/i)
  if (!match) return undefined
  const topic = match[1].replace(/^(?:آية|الاية|الآية|اية|آيات|ايات)\s+/i, "").trim()
  return topic.length >= 2 ? topic.slice(0, 160) : undefined
}

/**
 * Detects explicit requests for Quran text. The returned reference is resolved
 * only against the local verified corpus; the LLM is never asked to compose an ayah.
 */
export function parseQuranTextRequest(question: string): ParsedQuranTextRequest | null {
  if (VERIFICATION_PHRASES.test(question)) return null
  const normalized = normalizeArabic(question)
  const hasNamedVerse = /(?:ايه الكرسي|اية الكرسي)/.test(normalized)
  const range = parseVerseRange(question) as { fromAyah?: number; toAyah?: number; _surah?: number }
  const surahNumber = range._surah || parseSurahNumber(question)
  const hasReference = !!range.fromAyah || hasNamedVerse
  const explicitRequest = REQUEST_PHRASES.test(normalized) || /(?:ما هي|اين)\s+(?:نص\s+)?(?:ال)?(?:ايه|ايات)/.test(normalized)
  const hasQuranCue = /(?:قران|سوره|ايه|ايات)/.test(normalized) || question.includes("﴿")
  if (!explicitRequest && !hasReference && !hasQuranCue) return null
  if (!explicitRequest && !hasNamedVerse && !range.fromAyah) return null

  if (hasNamedVerse) {
    return { kind: "reference", surahNumber: 2, fromAyah: 255, toAyah: 255, wantsExplanation: EXPLANATION_PHRASES.test(question) }
  }

  if (range.fromAyah) {
    if (surahNumber) {
      return {
        kind: "reference",
        surahNumber,
        fromAyah: range.fromAyah,
        toAyah: range.toAyah || range.fromAyah,
        wantsExplanation: EXPLANATION_PHRASES.test(question),
      }
    }
    return { kind: "ambiguous", fromAyah: range.fromAyah, toAyah: range.toAyah, wantsExplanation: EXPLANATION_PHRASES.test(question) }
  }

  if (surahNumber) {
    if (/(?:آية|ايه|آيات|ايات)/.test(question)) {
      return { kind: "reference", surahNumber, fromAyah: 1, toAyah: 1, wantsExplanation: EXPLANATION_PHRASES.test(question) }
    }
    return { kind: "surah", surahNumber, wantsExplanation: EXPLANATION_PHRASES.test(question) }
  }

  const topic = extractTopic(question)
  if (topic) return { kind: "topic", topic, wantsExplanation: EXPLANATION_PHRASES.test(question) }
  return { kind: "generic", wantsExplanation: EXPLANATION_PHRASES.test(question) }
}

export function getDirectQuranVerses(surahNumber: number, fromAyah: number, toAyah = fromAyah) {
  const surah = getSurahMetadata(surahNumber)
  if (!surah) return { error: "رقم السورة غير موجود في المصحف الموثق" as const }
  if (!Number.isInteger(fromAyah) || !Number.isInteger(toAyah) || fromAyah < 1 || toAyah < fromAyah || toAyah > surah.ayahCount) {
    return { error: `رقم الآية يجب أن يكون بين 1 و${surah.ayahCount} في سورة ${surah.name}` as const }
  }
  const verses = []
  for (let ayah = fromAyah; ayah <= toAyah; ayah += 1) {
    const verse = getVerifiedAyah(surahNumber, ayah)
    if (!verse) return { error: `تعذر العثور على الآية ${ayah} في ملف القرآن المحلي` as const }
    verses.push(verse)
  }
  return { surah, verses }
}
