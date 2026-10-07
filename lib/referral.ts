export type ReferralReason = "personal_fatwa" | "inheritance" | "conversion" | "specialist_request" | null

/** Explicit requests are referrals, not religious questions requiring retrieval. */
export function explicitSpecialistRequest(question: string): boolean {
  return /(?:أريد|اريد|أحتاج|احتاج|أبغى|ابغى|أرغب|ارغب|هل يمكنك|ممكن|كيف|وصلني|حولني|حولوني|دلني|أحِلني|احلني|ارجو|أطلب|اطلب|طلب)\s+.{0,65}(?:مختص|متخصص|خبير|عالم|مفتي|شيخ|إحالتي|احالتي|تحويل|الإحالة|الاحالة)|(?:أحال|احال|حوّل|حول)\w*\s*.{0,40}(?:مختص|متخصص|عالم|مفتي|شيخ)|(?:connect|refer|speak|talk)\s+.{0,40}(?:specialist|scholar|imam)/i.test(question)
}

/** High recall safety fallback; model may broaden these cases but cannot cancel a confirmed referral. */
export function referralFallback(question: string, audience: string, personal: boolean): ReferralReason {
  if (audience !== "new_muslim" && audience !== "non_muslim") return null
  if (/(?:ميراث|مواريث|تركة|ورث|تقسيم\s+(?:الإرث|الميراث)|inheritance|estate division)/i.test(question) &&
      /(?:لي|لنا|أبي|أمي|زوج|أخت|أخ|عائلت|توفي|مات|حالت|my |our |father|mother|husband|wife)/i.test(question)) return "inheritance"
  if (/(?:أريد|أرغب|قررت|كيف|مستعد|أود|نفسي|اريد|ابغى)\s+.{0,45}(?:أدخل\s+(?:في\s+)?الإسلام|أسلم|اعتنق\s+الإسلام|أصبح\s+مسلماً|ادخل\s+الاسلام)|(?:i want to|how (?:do|can) i|ready to)\s+.{0,35}(?:convert to islam|become (?:a )?muslim)/i.test(question)) return "conversion"
  return personal ? "personal_fatwa" : null
}

export function parseReferralClassification(text: string): ReferralReason {
  const match = text.trim().match(/^\{\s*"reason"\s*:\s*"(personal_fatwa|inheritance|conversion|specialist_request|none)"\s*\}$/)
  return match && match[1] !== "none" ? match[1] as ReferralReason : null
}

export function referralExplanation(reason: Exclude<ReferralReason, null>, complete: boolean): string {
  const why = reason === "specialist_request"
    ? "طلبت التحدث إلى مختص؛ يمكنني مساعدتك في تجهيز طلب إحالة دون إيراد أدلة لا تتعلق بسؤالك. توفر المختص يعتمد على جهة الاتصال المضبوطة."
    : reason === "conversion"
    ? "يبدو أنك ترغب فعلاً في الدخول في الإسلام وتحتاج إرشاداً شخصياً؛ يمكنك نطق الشهادتين دون انتظار أي مختص، والتواصل معه اختياري للمساعدة في الخطوات التالية."
    : reason === "inheritance"
      ? "تقسيم الميراث في واقعة محددة يحتاج مراجعة جميع الورثة والديون والوصايا لدى مختص مؤهل، ولا يمكنني تحديد أنصبة حالتك هنا."
      : "هذه حالة شخصية تحتاج تفاصيلها إلى مختص مؤهل، ولا أستطيع إصدار فتوى خاصة بها."
  return `${why}\n\n${complete ? "يمكنك فتح طلب الإحالة إلى مختص من الزر أدناه؛ لن تُرسل بياناتك أو المحادثة دون موافقتك." : "إذا رغبت في الإحالة، يمكنك إضافة اسمك ووسيلة اتصال (هاتف مع مفتاح الدولة أو بريد إلكتروني) وبلدك ولغتك اختيارياً عبر زر الإحالة أدناه. لن تُرسل بياناتك أو محادثتك دون موافقتك."}`
}
