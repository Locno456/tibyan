// بناء روابط مصادر حقيقية تعمل فعلاً (بدل الروابط المُختلَقة التي كانت تعطي 404).
// المبدأ: لا نخمّن معرّفات غير موجودة. نبني الرابط من حقول موثوقة:
//  - القرآن/التفسير المرتبط بسورة (وآية): رابط عميق دقيق يصل للموضع حرفياً.
//  - الحديث المحلي: بحث في «الدرر السنية» بنص الحديث (ليس رابط سجل الحديث المباشر).
//  - باقي الأنواع: صفحة القسم أو نتائج بحث؛ لا ندّعي أنها رابط مباشر للدليل.
//
// الأنماط أدناه تم التحقق منها فعلياً:
//  - https://quran.com/{سورة}:{آية}  → يفتح الآية المطلوبة (تم التحقق: 2:255).
//  - https://dorar.net/hadith/search?q={نص} → بحث الأحاديث (تم التحقق).
//  - https://dorar.net/tafseer/{سورة} → تفسير السورة (تم التحقق).

/** Fix older saved Dorar search links; label search results honestly, not as a specific citation. */
export function normalizeSourceUrl(value: string): string {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.hostname !== "dorar.net") return value
    if (!/^\/(?:hadith\/search|tafseer)$/.test(url.pathname) || !url.searchParams.has("s") || url.searchParams.has("q")) return value
    url.searchParams.set("q", url.searchParams.get("s") || "")
    url.searchParams.delete("s")
    return url.toString()
  } catch { return value }
}

export function isDorarSearchUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.hostname === "dorar.net" && /^\/(?:hadith\/search|tafseer)$/.test(url.pathname) && (url.searchParams.has("q") || url.searchParams.has("s"))
  } catch { return false }
}

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
    return `https://dorar.net/tafseer?q=${searchSnippet(payload.text, payload.title)}`
  }

  // أي نص مرتبط بآية محددة (قرآن/مفهوم/...) → رابط الآية الدقيق
  if (hasSurah && hasAyah) return `https://quran.com/${surah}:${ayah}`
  if (hasSurah) return `https://quran.com/${surah}`

  const snippet = searchSnippet(payload.text, payload.title)

  switch (type) {
    case "hadith":
      return `https://dorar.net/hadith/search?q=${snippet}`
    case "fiqh":
      return `https://dorar.net/feqhia`
    case "sira":
      return `https://dorar.net/history`
    case "shubha":
      return "https://dawa.center"
    case "concept":
      // المفاهيم: إن وُجد نص نبحث عنه في الأحاديث، وإلا صفحة الدليل
      return snippet ? `https://dorar.net/hadith/search?q=${snippet}` : "https://dorar.net"
    default:
      return snippet ? `https://dorar.net/hadith/search?q=${snippet}` : "https://dorar.net"
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
