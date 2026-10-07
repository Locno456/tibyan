// Hybrid RAG Engine — محرك استرجاع هجين موثّق
// الطبقات: BM25 حرفي (مع IDF) + بحث دلالي + دمج RRF + إعادة ترتيب.
// المرجعية: أفضل ممارسات RAG 2026 (هجين + RRF + rerank + تطبيع الاستعلام + استشهادات).
//
// المصادر المُفهرسة:
//  1) المصحف الكامل (6236 آية، الرسم العثماني) من data/quran_full.json — نص حرفي موثّق.
//  2) النصوص المنتقاة (حديث/تفسير/عقيدة/فقه/سيرة/شبهات/مفاهيم) من data/verified_texts.json.
// كل نتيجة تحمل رابطاً عميقاً حقيقياً لموضعها (quran.com/{سورة}:{آية} أو بحث الدرر).

import verifiedTexts from '../data/verified_texts.json'
import quranFull from '../data/quran_full.json'
import hadithSahihayn from '../data/hadith_sahihayn.json'
import { buildSourceUrl } from './sourceLinks'

export interface RetrievedChunk {
  id: string
  score: number
  bm25_score?: number
  vector_score?: number
  rerank_score?: number
  relevance?: number
  payload: {
    id: string
    type: "quran" | "hadith" | "tafsir" | "shubha" | "concept" | "fiqh" | "sira"
    text: string
    source: string
    source_url: string
    grade?: string
    surah?: number
    ayah?: number
    title?: string
    author?: string
    level: "A" | "B" | "C" | "D"
  }
}

interface IndexedDoc {
  payload: RetrievedChunk["payload"]
  norm: string                 // النص بعد التطبيع
  terms: string[]              // الكلمات المطبّعة بترتيبها (للمطابقة التقريبية)
  freq: Record<string, number> // تكرار كل كلمة
  dl: number                   // طول المستند (كلمات)
}

/* ----------------------------- تطبيع اللغة العربية ----------------------------- */
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g

/** يزيل التشكيل وعلامات الرسم العثماني ويوحّد الأحرف (أ/إ/آ/ٱ→ا، ى→ي، ة→ه، ؤ→و، ئ→ي). */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, "ا")
    .replace(/[\u0624]/g, "و")
    .replace(/[\u0626]/g, "ي")
    .replace(/[\u0621]/g, "")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(DIACRITICS, "")
    .replace(/[^\u0621-\u064A\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(norm: string): string[] {
  return norm.split(" ").filter((t) => t.length > 1)
}

// كلمات لا نُجري عليها تجذيراً (حروف/أسماء شائعة)
const STEM_STOP = new Set([
  "الله", "اله", "هذا", "هذه", "التي", "الذي", "ذلك", "هنا", "علي", "الي",
  "ما", "لا", "ان", "في", "من", "عن", "هل", "قد", "ثم", "او", "كم", "كيف", "ماذا",
])
const SUFFIXES = ["ها", "هم", "هن", "كم", "كن", "نا", "ون", "ين", "ات", "يه", "ية", "ان", "ه", "ي"]

/** تجذير عربي خفيف: إزالة «ال» ولواحق الجمع/الضمير لتطابق الصيغ المختلفة. */
function stem(word: string): string {
  if (word.length < 4 || STEM_STOP.has(word)) return word
  let w = word
  if (w.startsWith("ال") && w.length - 2 >= 3) w = w.slice(2)
  for (let i = 0; i < 2; i++) {
    for (const s of SUFFIXES) {
      if (w.endsWith(s) && w.length - s.length >= 3) {
        w = w.slice(0, w.length - s.length)
        break
      }
    }
  }
  return w
}

/** تطبيع + تقطيع + تجذير — تُستخدم للمستندات والاستعلام معاً. */
function analyze(norm: string): string[] {
  return tokenize(norm).map(stem).filter((t) => t.length > 1)
}


/* ----------------------------- بناء الفهرس الموحّد ----------------------------- */
function buildIndex(): { docs: IndexedDoc[]; idf: Record<string, number>; avgdl: number } {
  const docs: IndexedDoc[] = []
  const seenAyah = new Set<string>()

  // 1) المصحف الكامل — نص حرفي موثّق، المستوى A
  for (const a of quranFull as Array<{ s: number; n: string; a: number; t: string }>) {
    const key = `${a.s}:${a.a}`
    seenAyah.add(key)
    const payload: RetrievedChunk["payload"] = {
      id: `quran-${a.s}-${a.a}`,
      type: "quran",
      level: "A",
      text: a.t,
      source: `القرآن الكريم - سورة ${a.n} - الآية ${a.a}`,
      source_url: `https://quran.com/${a.s}:${a.a}`,
      surah: a.s,
      ayah: a.a,
      grade: "متواتر",
    }
    const norm = normalizeArabic(a.t)
    const terms = analyze(norm)
    const freq: Record<string, number> = {}
    for (const t of terms) freq[t] = (freq[t] || 0) + 1
    docs.push({ payload, norm, terms, freq, dl: terms.length || 1 })
  }

  // 2) الصحيحان (البخاري + مسلم) — المتن حرفي، المستوى A، مع الحكم والترقيم للتوثيق
  for (const h of hadithSahihayn as any[]) {
    const payload: RetrievedChunk["payload"] = {
      id: `hadith-${h.id}`,
      type: "hadith",
      level: "A",
      text: h.t,
      source: `${h.col} - ${h.bk} - حديث ${h.num}`,
      source_url: buildSourceUrl({ type: "hadith", text: h.t }),
      grade: h.g || "صحيح",
      title: h.bk,
    }
    const norm = normalizeArabic(h.t)
    const terms = analyze(norm)
    const freq: Record<string, number> = {}
    for (const t of terms) freq[t] = (freq[t] || 0) + 1
    docs.push({ payload, norm, terms, freq, dl: terms.length || 1 })
  }

  // 3) النصوص المنتقاة (نتجاوز آيات القرآن المكررة لأن المصحف الكامل هو المرجع)
  for (const d of verifiedTexts as any[]) {
    if (d.type === "quran" && d.surah && d.ayah && seenAyah.has(`${d.surah}:${d.ayah}`)) continue
    const payload: RetrievedChunk["payload"] = {
      id: d.id,
      type: d.type,
      level: d.level,
      text: d.text,
      source: d.source,
      source_url: buildSourceUrl(d),
      grade: d.grade,
      surah: d.surah,
      ayah: d.ayah,
      title: d.title,
      author: d.author,
    }
    const norm = normalizeArabic(d.text + " " + (d.title || ""))
    const terms = analyze(norm)
    const freq: Record<string, number> = {}
    for (const t of terms) freq[t] = (freq[t] || 0) + 1
    docs.push({ payload, norm, terms, freq, dl: terms.length || 1 })
  }

  // حساب IDF ومتوسط الطول
  const df: Record<string, number> = {}
  let totalLen = 0
  for (const doc of docs) {
    for (const term of Object.keys(doc.freq)) df[term] = (df[term] || 0) + 1
    totalLen += doc.dl
  }
  const N = docs.length
  const idf: Record<string, number> = {}
  for (const [term, n] of Object.entries(df)) {
    idf[term] = Math.log((N - n + 0.5) / (n + 0.5) + 1)
  }
  return { docs, idf, avgdl: totalLen / N }
}

const INDEX = buildIndex()

// خريطة دلالية للمجالات الشرعية (تساعد الأسئلة المفاهيمية)
const SEMANTIC_MAP: Record<string, string[]> = {
  الكعبه: ["قبله", "المسجد الحرام", "بيت الله", "الطواف", "عباره"],
  القران: ["كتاب", "وحي", "تنزيل", "مصحف", "سوره", "ايه"],
  السيف: ["انتشار", "جهاد", "قتال", "فتح", "حرب", "اكراه"],
  التوحيد: ["الله", "رب", "اله", "عباره", "الوهيه", "ربوبيه"],
  الاسلام: ["ايمان", "arkan", "خمس", "شهاده", "صلاه", "زكاه", "صوم", "حج", "جبريل"],
  اختلاف: ["خلاف", "فقه", "مذاهب", "راي", "اجتهاد"],
  زواج: ["نكاح", "طلاق", "اسره", "زوج"],
}

/* ----------------------------- البحث الحرفي BM25 ----------------------------- */
const K1 = 1.5
const B = 0.75

function bm25Search(queryTerms: string[], topK: number): Array<{ doc: IndexedDoc; score: number }> {
  const { docs, idf, avgdl } = INDEX
  const out: Array<{ doc: IndexedDoc; score: number }> = []
  for (const doc of docs) {
    let score = 0
    for (const term of queryTerms) {
      const tf = doc.freq[term]
      if (!tf) continue
      const idfTerm = idf[term] || 0
      score += idfTerm * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.dl) / avgdl)))
    }
    if (score > 0) out.push({ doc, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, topK)
}

/* ----------------------------- البحث الدلالي ----------------------------- */
function semanticSearch(queryNorm: string, queryTerms: string[], topK: number): Array<{ doc: IndexedDoc; score: number }> {
  const out: Array<{ doc: IndexedDoc; score: number }> = []
  for (const doc of INDEX.docs) {
    let score = 0
    // المجالات الدلالية
    for (const [key, syns] of Object.entries(SEMANTIC_MAP)) {
      if (queryNorm.includes(key)) {
        for (const s of syns) if (doc.norm.includes(s)) score += 0.6
      }
    }
    // تداخل الكلمات
    let overlap = 0
    for (const t of queryTerms) if (doc.norm.includes(t)) overlap++
    score += overlap * 0.4
    if (score > 0) out.push({ doc, score })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, topK)
}

/* ----------------------------- إعادة الترتيب (معامل ضربي صغير) ----------------------------- */
// نُطبّق التعزيزات كعامل ضربي حتى تبقى الملاءمة (RRF) هي الأساس ولا يطغى التعزيز عليها.
function rerankMultiplier(queryNorm: string, doc: IndexedDoc): number {
  let m = 1
  const p = doc.payload
  if (p.level === "A" && (queryNorm.includes("ايه") || queryNorm.includes("حديث") || queryNorm.includes("ما هو"))) m += 0.15
  if (p.type === "shubha" && (queryNorm.includes("لماذا") || queryNorm.includes("هل"))) m += 0.2
  if (p.type === "quran") m += 0.1 // القرآن أعلى حجية
  return m
}

/* ----------------------------- دمج RRF ----------------------------- */
function rrfFuse(
  bm25: Array<{ doc: IndexedDoc; score: number }>,
  semantic: Array<{ doc: IndexedDoc; score: number }>,
  k = 60
): Map<IndexedDoc, { fused: number; bm25: number; vector: number }> {
  const map = new Map<IndexedDoc, { fused: number; bm25: number; vector: number }>()
  const add = (list: Array<{ doc: IndexedDoc; score: number }>, field: "bm25" | "vector") => {
    list.forEach((item, rank) => {
      const cur = map.get(item.doc) || { fused: 0, bm25: 0, vector: 0 }
      cur.fused += 1 / (k + rank + 1)
      cur[field] = Math.max(cur[field], item.score)
      map.set(item.doc, cur)
    })
  }
  add(bm25, "bm25")
  add(semantic, "vector")
  return map
}

/* ----------------------------- الدالة الرئيسية ----------------------------- */
export async function hybrid_retrieve(
  query: string,
  level: "A" | "B" | "C" | "D" | "abstain" = "B",
  topK: number = 5,
  minConfidence: number = 0.82
): Promise<{ docs: RetrievedChunk[]; confidence: number; source: string }> {
  const queryNorm = normalizeArabic(query)
  // ملاحظة: لا نحذف كلمات الحشو من الاستعلام — فكثير منها جزء من نصوص شرعية مشهورة
  // (مثل «قل هو الله أحد»)، وحذفها يُضعف المطابقة الدقيقة.
  const queryTerms = Array.from(new Set(analyze(queryNorm)))

  if (level === "D" || queryTerms.length === 0) {
    return { docs: [], confidence: 0, source: "abstain" }
  }

  const cand = topK * 10
  const bm25 = bm25Search(queryTerms, cand)
  const semantic = semanticSearch(queryNorm, queryTerms, cand)
  const fused = rrfFuse(bm25, semantic)

  // ترتيب حسب RRF ثم إعادة الترتيب بالتعزيزات
  let ranked = Array.from(fused.entries())
    .map(([doc, s]) => ({ doc, ...s, final: s.fused * rerankMultiplier(queryNorm, doc) }))
    .sort((a, b) => b.final - a.final)

  // تصفية حسب المستوى
  ranked = ranked.filter((r) => {
    if (level === "A") return r.doc.payload.level === "A" || r.bm25 > 3
    if (level === "C") return r.bm25 > 0.5 || r.vector > 0.5
    return true
  })

  // RRF intentionally produces small rank scores. Apply a separate relevance gate so
  // a merely non-empty candidate list can never be mistaken for evidence.
  const uniqueQueryTerms = Array.from(new Set(queryTerms))
  const { idf } = INDEX
  const relevanceFloor = Math.max(0.2, Math.min(0.4, minConfidence * 0.33))
  const evaluated = ranked.map((item) => {
    let matchedTerms = 0
    let matchedIdf = 0
    let totalIdf = 0
    for (const term of uniqueQueryTerms) {
      const weight = idf[term] || 0
      totalIdf += weight
      if (item.doc.freq[term]) {
        matchedTerms += 1
        matchedIdf += weight
      }
    }
    const tokenCoverage = uniqueQueryTerms.length ? matchedTerms / uniqueQueryTerms.length : 0
    const idfCoverage = totalIdf > 0 ? matchedIdf / totalIdf : 0
    const lexicalRelevance = item.bm25 > 0
      ? 0.6 * tokenCoverage + 0.4 * Math.min(1, item.bm25 / 2)
      : 0
    const semanticRelevance = Math.min(1, item.vector / 2.2)
    const relevance = Math.max(lexicalRelevance, semanticRelevance)
    const hasLexicalEvidence = item.bm25 >= 0.45 && tokenCoverage >= 0.2
    const hasMappedSemanticEvidence = item.vector >= 1.0
    return { ...item, relevance, idfCoverage, hasLexicalEvidence, hasMappedSemanticEvidence }
  })
  const top = evaluated
    .filter((item) => item.relevance >= relevanceFloor && (item.hasLexicalEvidence || item.hasMappedSemanticEvidence))
    .slice(0, topK)

  // Confidence is derived from term coverage and independent semantic support;
  // an empty/weak candidate no longer receives an artificial 25% confidence floor.
  const best = top[0]
  const confidence = best
    ? Math.min(0.99, Math.max(0, 0.12 + 0.55 * best.idfCoverage + 0.3 * best.relevance + (best.doc.norm.includes(queryNorm) ? 0.1 : 0)))
    : 0

  const docs: RetrievedChunk[] = top.map((item) => ({
    id: item.doc.payload.id,
    // Keep the existing 0–5 scale consumed by the source cards and guard.
    score: item.relevance * 5,
    bm25_score: item.bm25,
    vector_score: item.vector,
    rerank_score: item.final,
    relevance: item.relevance,
    payload: item.doc.payload,
  }))

  const source = bm25.length >= semantic.length ? "hybrid_bm25_rrf" : "hybrid_rrf_vector"
  return { docs, confidence, source }
}

/* ----------------------------- دوال مساعدة ----------------------------- */
export function getVerifiedTextById(id: string): any | null {
  const docs = verifiedTexts as any[]
  return docs.find((d) => d.id === id) || null
}

export function getTextsByType(type: string): any[] {
  const docs = verifiedTexts as any[]
  return docs.filter((d) => d.type === type)
}

/** عدد النصوص المفهرسة (لأغراض التشخيص/الصحة). */
export function getIndexStats(): { total: number; quran: number; hadith: number; curated: number } {
  let quran = 0
  let hadith = 0
  for (const d of INDEX.docs) {
    if (d.payload.type === "quran") quran++
    else if (d.payload.type === "hadith") hadith++
  }
  return { total: INDEX.docs.length, quran, hadith, curated: INDEX.docs.length - quran - hadith }
}

export type VerifiedTextMatchKind = "exact" | "near"

export interface VerifiedTextMatch {
  kind: VerifiedTextMatchKind
  similarity: number
  doc: RetrievedChunk
}

/**
 * Compares a user-supplied quotation with the literal, locally indexed corpus.
 * Exact means a normalized substring (diacritics/punctuation ignored); near is
 * only a candidate and must never be described as an exact attribution.
 */
export function compareQuoteToText(quote: string, sourceText: string): { kind: VerifiedTextMatchKind; similarity: number } | null {
  const normalizedQuote = normalizeArabic(quote)
  const normalizedSource = normalizeArabic(sourceText)
  if (normalizedQuote.length < 8 || normalizedSource.length < 8) return null

  // Exact attribution requires the complete submitted quotation to occur inside
  // the source. A longer user quote containing only a short known fragment is not exact.
  if (normalizedSource.includes(normalizedQuote)) {
    return { kind: "exact", similarity: 1 }
  }

  const quoteTerms = analyze(normalizedQuote)
  const uniqueTerms = Array.from(new Set(quoteTerms))
  if (uniqueTerms.length < 4 || quoteTerms.length > 100) return null

  const sourceTerms = analyze(normalizedSource)
  if (!sourceTerms.length || uniqueTerms.length > sourceTerms.length * 1.5) return null

  const sourceSet = new Set(sourceTerms)
  const overlap = uniqueTerms.filter((term) => sourceSet.has(term)).length
  const coverage = overlap / uniqueTerms.length
  if (coverage < 0.72) return null

  // Keep word order in the score: shared topic words alone are not a quotation match.
  let cursor = 0
  let ordered = 0
  for (const term of quoteTerms) {
    const foundAt = sourceTerms.indexOf(term, cursor)
    if (foundAt >= 0) {
      ordered += 1
      cursor = foundAt + 1
    }
  }
  const orderedCoverage = ordered / quoteTerms.length
  const similarity = 0.65 * coverage + 0.35 * orderedCoverage
  return similarity >= 0.72 ? { kind: "near", similarity } : null
}

/** Exact/near quotation lookup over the existing Quran, Sahihayn, and curated indexes. */
export function findVerifiedTextMatches(quote: string, limit = 3): VerifiedTextMatch[] {
  const normalizedQuote = normalizeArabic(quote)
  if (normalizedQuote.length < 8) return []

  const matches: VerifiedTextMatch[] = []
  for (const indexed of INDEX.docs) {
    const compared = compareQuoteToText(normalizedQuote, indexed.norm)
    if (!compared) continue
    matches.push({
      kind: compared.kind,
      similarity: compared.similarity,
      doc: {
        id: indexed.payload.id,
        score: compared.similarity * 5,
        relevance: compared.similarity,
        payload: indexed.payload,
      },
    })
  }

  const deduped = new Map<string, VerifiedTextMatch>()
  for (const match of matches) {
    const prior = deduped.get(match.doc.payload.id)
    if (!prior || (match.kind === "exact" && prior.kind !== "exact") || match.similarity > prior.similarity) {
      deduped.set(match.doc.payload.id, match)
    }
  }
  return Array.from(deduped.values())
    .sort((a, b) => Number(b.kind === "exact") - Number(a.kind === "exact") || b.similarity - a.similarity)
    .slice(0, Math.max(1, Math.min(limit, 10)))
}
