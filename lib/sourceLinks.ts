// بناء روابط مصادر حقيقية تعمل فعلاً (بدل الروابط المُختلَقة التي كانت تعطي 404).
// المبدأ: لا نخمّن معرّفات غير موجودة. نبني الرابط من حقول موثوقة:
//  - القرآن/التفسير المرتبط بسورة (وآية): رابط عميق دقيق يصل للموضع حرفياً.
//  - الحديث: بحث في «الدرر السنية» بنص الحديث (يهبط على نتائج البحث، لا 404).
//  - باقي الأنواع: صفحة القسم المعتمدة (لا 404 أبداً).
//
// الأنماط أدناه تم التحقق منها فعلياً:
//  - https://quran.com/{سورة}:{آية}  → يفتح الآية المطلوبة (تم التحقق: 2:255).
//  - https://dorar.net/hadith/search?s={نص} → بحث الأحاديث (تم التحقق).
//  - https://dorar.net/tafseer/{سورة} → تفسير السورة (تم التحقق).

export interface SourceLinkable {
  type?: string
  surah?: number
  ayah?: number
  text?: string
  title?: string
}

/** اقتطاع أول كلمات النص لبناء استعلام بحث نظيف. */
function searchSnippet(text?: string, title?: string, words = 8): string {
  const raw = (text || title || "")
    .replace(/[﴿﴾ﷲﷺﷻ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return encodeURIComponent(raw.split(" ").slice(0, words).join(" "))
}

/**
 * يبني رابط المصدر الحقيقي من الحمولة. يعيد دائماً رابطاً صالحاً
 * (رابط عميق دقيق عند توفّر سورة/آية، وإلا بحث/صفحة قسم لا تعطي 404).
 */
export function buildSourceUrl(payload: SourceLinkable | null | undefined): string {
  if (!payload) return "https://dorar.net"
  const { type, surah, ayah } = payload
  const hasSurah = typeof surah === "number" && surah > 0
  const hasAyah = typeof ayah === "number" && ayah > 0

  // التفسير: إن توفّرت سورة نفتح تفسيرها مباشرة، والآية عبر quran.com
  if (type === "tafsir") {
    if (hasSurah && hasAyah) return `https://quran.com/${surah}:${ayah}/tafsirs`
    if (hasSurah) return `https://dorar.net/tafseer/${surah}`
    return `https://dorar.net/tafseer?s=${searchSnippet(payload.text, payload.title)}`
  }

  // أي نص مرتبط بآية محددة (قرآن/مفهوم/...) → رابط الآية الدقيق
  if (hasSurah && hasAyah) return `https://quran.com/${surah}:${ayah}`
  if (hasSurah) return `https://quran.com/${surah}`

  const snippet = searchSnippet(payload.text, payload.title)

  switch (type) {
    case "hadith":
      return `https://dorar.net/hadith/search?s=${snippet}`
    case "fiqh":
      return `https://dorar.net/feqhia`
    case "sira":
      return `https://dorar.net/history`
    case "shubha":
      return "https://dawa.center"
    case "concept":
      // المفاهيم: إن وُجد نص نبحث عنه في الأحاديث، وإلا صفحة الدليل
      return snippet ? `https://dorar.net/hadith/search?s=${snippet}` : "https://dorar.net"
    default:
      return snippet ? `https://dorar.net/hadith/search?s=${snippet}` : "https://dorar.net"
  }
}

/** اسم النطاق للعرض تحت المصدر. */
export function sourceDomain(url: string): string {
  try {
    return url.replace(/^https?:\/\//, "").split("/")[0]
  } catch {
    return ""
  }
}
