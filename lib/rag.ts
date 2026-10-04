// Hybrid RAG Engine - استرجاع هجين (BM25 حرفي + Vector دلالي + Reranker)
// أساس قوي ومرن - يعمل Mock حالياً، قابل للتطوير لـ Qdrant + Cohere + OpenAI
import { APPROVED_SOURCES } from './sources'
import verifiedTexts from '../data/verified_texts.json'

export interface RetrievedChunk {
  id: string
  score: number
  bm25_score?: number
  vector_score?: number
  rerank_score?: number
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

// محاكاة BM25 - بحث حرفي ممتاز للآيات والأحاديث
function bm25_search(query: string, docs: any[], topK: number = 10): RetrievedChunk[] {
  const queryTerms = query.split(/\s+/).filter(t => t.length > 1)
  const results: RetrievedChunk[] = []

  for (const doc of docs) {
    let score = 0
    const text = doc.text as string
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()

    // تطابق حرفي كامل - أعلى وزن
    if (lowerText.includes(lowerQuery)) {
      score += 5.0
    }

    // تطابق المصطلحات
    for (const term of queryTerms) {
      if (lowerText.includes(term.toLowerCase())) {
        // وزن أعلى للكلمات المفتاحية الدينية
        const isKeyword = ["الله", "القرآن", "الرسول", "التوحيد", "الكعبة", "الإسلام", "الصلاة", "محمد"].some(k => term.includes(k))
        score += isKeyword ? 1.5 : 0.8
      }
      // تطابق في العنوان
      if (doc.title && doc.title.toLowerCase().includes(term.toLowerCase())) {
        score += 1.0
      }
    }

    // تعزيز للنصوص التي تحتوي زخرفة آية
    if (text.includes("﴿") && query.includes("آية")) score += 2.0
    if (text.includes("ﷺ") && (query.includes("حديث") || query.includes("الرسول"))) score += 2.0

    if (score > 0) {
      results.push({
        id: doc.id,
        score: score,
        bm25_score: score,
        payload: doc
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK)
}

// محاكاة Vector Search - بحث دلالي
function vector_search(query: string, docs: any[], topK: number = 10): RetrievedChunk[] {
  // في الإنتاج: استخدام embeddings من OpenAI / Cohere + Qdrant
  // هنا: محاكاة ذكية بالكلمات المترادفة والمجالات الدلالية
  
  const semanticMap: Record<string, string[]> = {
    "الكعبة": ["قبلة", "المسجد الحرام", "بيت الله", "الطواف", "يعبد", "عبادة"],
    "القرآن": ["كتاب", "وحي", "تنزيل", "مصحف", "سورة", "آية", "تأليف"],
    "السيف": ["انتشار", "جهاد", "قتال", "فتح", "حرب", "إكراه"],
    "التوحيد": ["الله", "رب", "إله", "عبادة", "ألوهية", "ربوبية"],
    "اختلاف": ["خلاف", "فقه", "مذاهب", "رأي", "اجتهاد"],
    "زواج": ["نكاح", "طلاق", "أسرة", "زوج", "فتوى شخصية"]
  }

  const results: RetrievedChunk[] = []
  
  for (const doc of docs) {
    let score = 0
    const text = doc.text.toLowerCase()
    
    // بحث دلالي عبر الخريطة الدلالية
    for (const [key, synonyms] of Object.entries(semanticMap)) {
      if (query.includes(key)) {
        for (const syn of synonyms) {
          if (text.includes(syn)) score += 0.6
        }
      }
    }

    // تشابه عام (كلمات مشتركة)
    const queryWords = query.split(/\s+/)
    const docWords = text.split(/\s+/)
    const common = queryWords.filter((w: string) => docWords.some((dw: string) => dw.includes(w) || w.includes(dw)))
    score += common.length * 0.3

    if (score > 0) {
      results.push({
        id: doc.id,
        score: score * 0.8, // Vector أقل دقة من BM25 للنصوص الشرعية
        vector_score: score,
        payload: doc
      })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topK)
}

// Reranker محاكاة - يعيد ترتيب النتائج حسب الملاءمة والموثوقية
function rerank(query: string, chunks: RetrievedChunk[]): RetrievedChunk[] {
  return chunks.map(chunk => {
    let boost = 0
    
    // تعزيز المستوى A للأسئلة الأصلية
    if (chunk.payload.level === "A" && (query.includes("آية") || query.includes("حديث") || query.includes("ما هو"))) {
      boost += 0.5
    }
    
    // تعزيز الشبهات للمستوى B
    if (chunk.payload.type === "shubha" && (query.includes("لماذا") || query.includes("هل"))) {
      boost += 0.7
    }
    
    // تعزيز المصدر الرسمي
    if (chunk.payload.source_url.includes("quranpedia.net") || chunk.payload.source_url.includes("dorar.net")) {
      boost += 0.3
    }

    return {
      ...chunk,
      rerank_score: chunk.score + boost,
      score: chunk.score + boost
    }
  }).sort((a, b) => b.score - a.score)
}

// الدالة الرئيسية للاسترجاع الهجين
export async function hybrid_retrieve(
  query: string,
  level: "A" | "B" | "C" | "D" | "abstain" = "B",
  topK: number = 5,
  minConfidence: number = 0.82
): Promise<{docs: RetrievedChunk[], confidence: number, source: string}> {
  
  // تحميل النصوص الموثقة
  const allDocs = verifiedTexts as any[]

  // 1. BM25 - بحث حرفي (ممتاز للآيات والأحاديث)
  const bm25Results = bm25_search(query, allDocs, topK * 2)
  
  // 2. Vector - بحث دلالي (ممتاز للشبهات والمفاهيم)
  const vectorResults = vector_search(query, allDocs, topK * 2)
  
  // 3. دمج النتائج وإزالة التكرار
  const merged = new Map<string, RetrievedChunk>()
  
  for (const r of [...bm25Results, ...vectorResults]) {
    const existing = merged.get(r.id)
    if (!existing) {
      merged.set(r.id, r)
    } else {
      // دمج الدرجات: BM25 + Vector
      merged.set(r.id, {
        ...existing,
        score: Math.max(existing.score, r.score) + Math.min(existing.score, r.score) * 0.3,
        bm25_score: existing.bm25_score || r.bm25_score,
        vector_score: existing.vector_score || r.vector_score
      })
    }
  }

  let combined = Array.from(merged.values())

  // 4. Reranking
  combined = rerank(query, combined)

  // 5. تصفية حسب المستوى والثقة
  let filtered = combined.filter(doc => {
    if (level === "D") return false // المستوى D لا يسترجع - يحال
    if (level === "A") return doc.payload.level === "A" || doc.score > 1.5
    if (level === "C") return doc.score > 0.5
    return doc.score > 0.3
  })

  // 6. أخذ أفضل النتائج
  const topDocs = filtered.slice(0, topK)
  
  // 7. حساب الثقة
  const maxScore = topDocs.length > 0 ? Math.max(...topDocs.map(d => d.score)) : 0
  // تحويل الدرجة إلى ثقة 0-1 (BM25 درجاته أعلى)
  const normalizedConfidence = Math.min(maxScore / 5.0, 1.0)

  // 8. تحديد مصدر الاسترجاع
  let retrievalSource = "hybrid_mock"
  if (bm25Results.length > vectorResults.length * 1.5) retrievalSource = "bm25_primary"
  else if (vectorResults.length > bm25Results.length * 1.5) retrievalSource = "vector_primary"

  // 9. في الإنتاج: استبدل هذا بـ Qdrant + Cohere
  // const qdrantResults = await qdrantClient.search(...)
  // const reranked = await cohere.rerank(...)

  return {
    docs: topDocs,
    confidence: normalizedConfidence,
    source: retrievalSource
  }
}

// دالة مساعدة للحصول على نص موثق حرفي بالـ ID
export function getVerifiedTextById(id: string): any | null {
  const docs = verifiedTexts as any[]
  return docs.find(d => d.id === id) || null
}

// دالة للحصول على كل النصوص حسب النوع
export function getTextsByType(type: string): any[] {
  const docs = verifiedTexts as any[]
  return docs.filter(d => d.type === type)
}
