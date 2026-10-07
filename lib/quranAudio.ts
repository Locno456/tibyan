import quranCorpus from "../data/quran_full.json"

export interface SurahMetadata {
  number: number
  name: string
  ayahCount: number
}

export interface AudioReciterOption {
  id: string
  name: string
  englishName: string
  imageUrl?: string | null
  source?: string
}

export interface ParsedAudioRequest {
  surahNumber?: number
  fromAyah?: number
  toAyah?: number
  reciterQuery?: string
}

const verses = quranCorpus as Array<{ s: number; n: string; a: number; t: string }>
const surahMap = new Map<number, SurahMetadata>()

for (const verse of verses) {
  if (!surahMap.has(verse.s)) {
    surahMap.set(verse.s, { number: verse.s, name: verse.n, ayahCount: 0 })
  }
  const meta = surahMap.get(verse.s)!
  meta.ayahCount = Math.max(meta.ayahCount, verse.a)
}

export const QURAN_SURAHS: SurahMetadata[] = Array.from(surahMap.values()).sort((a, b) => a.number - b.number)

export function normalizeArabic(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^a-z0-9\u0621-\u064A\u0660-\u0669\u0671\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function matchSurahNumber(question: string): number | undefined {
  const numericMatch = question.match(/(?:سوره|السوره)\s*(\d{1,3})/)
  if (numericMatch) {
    const number = Number(numericMatch[1])
    if (surahMap.has(number)) return number
  }

  const normalizedQuestion = ` ${normalizeArabic(question)} `
  const candidates = QURAN_SURAHS
    .map((surah) => ({ surah, name: normalizeArabic(surah.name) }))
    .sort((a, b) => b.name.length - a.name.length)

  for (const candidate of candidates) {
    if (candidate.name && normalizedQuestion.includes(` ${candidate.name} `)) return candidate.surah.number
  }
  return undefined
}

function parseAyahRange(question: string): { fromAyah?: number; toAyah?: number } {
  const range = question.match(
    /(?:من\s*)?(?:(?:ال)?ا(?:يه|يات?)\s*(?:رقم\s*)?)?(\d{1,3})\s*(?:إلى|الى|الي|حتى|to|[-–])\s*(?:(?:ال)?ا(?:يه|يات?)\s*(?:رقم\s*)?)?(\d{1,3})/i
  )
  if (range) return { fromAyah: Number(range[1]), toAyah: Number(range[2]) }

  const single = question.match(/(?:ال)?ا(?:يه|يات?)\s*(?:رقم\s*)?(\d{1,3})/)
  if (single) return { fromAyah: Number(single[1]), toAyah: Number(single[1]) }
  return {}
}

function parseReciterQuery(question: string): string | undefined {
  const normalized = normalizeArabic(question)
  const match = normalized.match(/(?:بصوت|للقارئ|القارئ|قارئ)\s+(.+?)(?=\s+(?:من|الى|للسوره|سوره|الايات)(?:\s|$)|$)/)
  if (!match) return undefined
  const ignored = new Set(["الشيخ", "القارئ", "قارئ", "محدد", "المحدد", "معين", "المعين", "اختاره", "المفضل", "المفضله"])
  const candidate = match[1].split(/\s+/).filter((word) => !ignored.has(word)).join(" ").trim()
  return candidate.length >= 2 ? candidate.slice(0, 80) : undefined
}

export function detectQuranAudioRequest(question: string): ParsedAudioRequest | null {
  const normalized = normalizeArabic(question)
  const audioTerms = [
    "تلاوه",
    "صوتي",
    "مقطع صوت",
    "استمع",
    "اسمع",
    "شغل",
    "تشغيل",
    "القارئ",
    "قارئ",
    "بصوت",
    "اقراها بصوت",
    "audio",
    "recitation",
    "listen to",
  ]
  if (!audioTerms.some((term) => normalized.includes(normalizeArabic(term)))) return null

  const range = parseAyahRange(normalized)
  return {
    surahNumber: matchSurahNumber(normalized),
    ...range,
    reciterQuery: parseReciterQuery(normalized),
  }
}

export function getSurahMetadata(number: number): SurahMetadata | undefined {
  return surahMap.get(number)
}

export function getVerifiedAyah(surah: number, ayah: number): { surah: number; surahName: string; ayah: number; text: string; globalNumber: number } | undefined {
  const verse = verses.find((item) => item.s === surah && item.a === ayah)
  if (!verse) return undefined
  const globalNumber = verses.findIndex((item) => item.s === surah && item.a === ayah) + 1
  if (globalNumber < 1) return undefined
  return { surah, surahName: verse.n, ayah, text: verse.t, globalNumber }
}

export function matchAudioReciter(reciters: AudioReciterOption[], query?: string): AudioReciterOption | undefined {
  if (!query?.trim()) return undefined
  const target = normalizeArabic(query)
  const byId = reciters.find((reciter) => reciter.id.toLowerCase() === query.toLowerCase())
  if (byId) return byId

  const scored = reciters.map((reciter) => {
    const names = [reciter.name, reciter.englishName, reciter.id.replace(/[.-]/g, " ")]
      .map(normalizeArabic)
      .filter(Boolean)
    let score = 0
    for (const name of names) {
      if (name === target) score = Math.max(score, 1)
      else if (name.includes(target) || target.includes(name)) score = Math.max(score, 0.85)
      else {
        const words = target.split(" ").filter((word) => word.length > 1)
        const matches = words.filter((word) => name.includes(word)).length
        score = Math.max(score, words.length ? matches / words.length : 0)
      }
    }
    return { reciter, score }
  }).sort((a, b) => b.score - a.score)

  return scored[0]?.score >= 0.5 ? scored[0].reciter : undefined
}
