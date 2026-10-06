// فحوص مطابقة محدودة للاقتباسات الشرعية المنسقة؛ لا تكشف كل الأحاديث النثرية
// ولا تضمن خلو الإجابة كلها من الأخطاء أو صحة الاستدلال.

export interface RetrievedDoc {
  id: string
  score: number
  payload: {
    id: string
    type: "quran" | "hadith" | "tafsir" | "shubha" | "concept" | "fiqh"
    text: string
    source: string
    source_url: string
    grade?: string
    surah?: number
    ayah?: number
  }
}

const SACRED_PATTERNS = [
  /﴿[^﴾]{10,}﴾/g, // آية بزخرفة طويلة فقط - تجنب false positive
]

export function isClaimedSacred(text: string): boolean {
  return SACRED_PATTERNS.some(pattern => pattern.test(text))
}

export function extractClaimedSacred(text: string): string[] {
  const claimed: string[] = []
  for (const pattern of SACRED_PATTERNS) {
    const matches = text.match(pattern)
    if (matches) claimed.push(...matches)
  }
  return claimed
}

export interface GuardResult {
  status: "ok" | "blocked" | "low_confidence"
  message?: string
  action?: "abstain" | "refer" | "proceed"
  blockedTexts?: string[]
  confidence?: number
}

export function zeroHallucinationGuard(
  llmOutput: string,
  retrievedDocs: RetrievedDoc[],
  minConfidence: number = 0.82
): GuardResult {
  // 1. تحقق من الثقة
  const maxScore = Math.max(...retrievedDocs.map(d => d.score), 0)
  if (retrievedDocs.length === 0 || maxScore < minConfidence) {
    return {
      status: "low_confidence",
      message: "لم أجد مصدراً كافياً في المصادر المعتمدة (ثقة أقل من 82%).",
      action: "abstain",
      confidence: maxScore
    }
  }

  // The explanatory model is not the source of hadith text. Literal hadiths
  // belong in separately attributed evidence cards, not in generated prose.
  // Block even a potentially genuine attribution here: verifying free-form
  // paraphrases by regex is unsafe and previously let fabricated ones pass.
  const literallyCopiedEvidence = llmOutput.trim() === retrievedDocs.map((doc) => doc.payload.text).join(" ").trim()
  if (!literallyCopiedEvidence && /(?:قال\s+(?:رسول\s+الله|النبي)|عن\s+(?:رسول\s+الله|النبي)|رواه\s+(?:البخاري|مسلم)|حديث\s+(?:صحيح|حسن))/.test(llmOutput)) {
    return { status: "blocked", action: "abstain", message: "لا أعرض حديثاً من صياغة النموذج؛ راجع بطاقة النص المسترجع ومصدره.", confidence: maxScore }
  }

  // 2. استخرج كل نص يدعي أنه آية/حديث من إخراج LLM
  const claimedTexts = extractClaimedSacred(llmOutput)
  
  if (claimedTexts.length === 0) {
    // لا يوجد ادعاء نص شرعي — آمن
    return { status: "ok", action: "proceed", confidence: maxScore }
  }

  // 3. تحقق هل كل نص مدعى موجود حرفياً في النصوص المسترجعة؟
  const blocked: string[] = []
  for (const claimed of claimedTexts) {
    let found = false
    for (const doc of retrievedDocs) {
      // تحقق حرفي: النص المدعى يجب أن يكون جزء من النص الموثق أو العكس
      const normalizedClaimed = claimed.replace(/[﴿﴾]/g, "").trim()
      const normalizedDoc = doc.payload.text.replace(/[﴿﴾]/g, "").trim()
      
      if (
        normalizedDoc.includes(normalizedClaimed) ||
        normalizedClaimed.includes(normalizedDoc) ||
        doc.payload.text.includes(claimed)
      ) {
        found = true
        break
      }
    }
    
    if (!found) {
      blocked.push(claimed)
    }
  }

  if (blocked.length > 0) {
    return {
      status: "blocked",
      message: `تم منع ${blocked.length} نص شرعي غير موجود في المصادر المعتمدة. أرفض توليد نص شرعي غير موثق.`,
      action: "abstain",
      blockedTexts: blocked,
      confidence: maxScore
    }
  }

  // 4. كل شيء موجود وموثق — اسمح
  return { status: "ok", action: "proceed", confidence: maxScore }
}

// Level D Guard — فتوى شخصية
export function personalFatwaGuard(level: string): GuardResult | null {
  if (level === "D") {
    return {
      status: "blocked",
      message: "هذا السؤال يندرج تحت المستوى (د) فتوى أو حالة شخصية. لا أستطيع إعطاء حكم مستقل — أقدم معلومة عامة وأحيلك لجهة مؤهلة.",
      action: "refer"
    }
  }
  return null
}

// دمج كل الحراس
export function fullGuard(
  llmOutput: string,
  retrievedDocs: RetrievedDoc[],
  level: string,
  minConfidence: number = 0.82
): GuardResult {
  // أولاً: فحص المستوى D
  const fatwaGuard = personalFatwaGuard(level)
  if (fatwaGuard) return fatwaGuard

  // ثانياً: فحص الثقة والهلوسة
  return zeroHallucinationGuard(llmOutput, retrievedDocs, minConfidence)
}
