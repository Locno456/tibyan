// مصفوفة المستويات الأربعة - الحزمة العلمية صفحة 2
// تحدد كيف يتعامل النظام مع كل سؤال

export type Level = "A" | "B" | "C" | "D" | "abstain"

export interface LevelDefinition {
  id: Level
  name: string
  nameEn: string
  scope: string
  action: string
  color: string
  colorLight: string
  badge: string
}

export const LEVELS: Record<Level, LevelDefinition> = {
  A: {
    id: "A",
    name: "معلومات أصلية مستقرة",
    nameEn: "Stable Original Information",
    scope: "القرآن، الأحاديث الصحيحة المعتمدة، أركان الإسلام والإيمان، السيرة الأساسية، الأخلاق والقيم، المعلومات التعريفية المستقرة",
    action: "الإجابة المباشرة الموثقة بالمصدر مع رابط تحقق فوري",
    color: "#2563EB",
    colorLight: "#EFF6FF",
    badge: "أزرق موثوقية #2563EB"
  },
  B: {
    id: "B",
    name: "شرح وتعريف واستدلال",
    nameEn: "Explanation and Reasoning",
    scope: "شرح المفاهيم، المقارنات، مقاصد التشريع، الإجابة عن الأسئلة الفكرية والشبهات العامة",
    action: "الإجابة من المادة المعتمدة (بينات) مع إظهار المرجع وتجنب القطع فيما يحتمل الخلاف",
    color: "#06B6D4",
    colorLight: "#ECFEFF",
    badge: "تركواز إسلام #06B6D4"
  },
  C: {
    id: "C",
    name: "مسائل خلافية أو عالية الحساسية",
    nameEn: "Controversial / Sensitive",
    scope: "الخلاف الفقهي، المسائل العقدية التفصيلية، القضايا التاريخية الجدلية، الأسئلة التي تتطلب تحريراً علمياً خاصاً",
    action: "إجابة مقيدة بما هو معتمد أو بيان وجود الخلاف أو الإحالة للمختص",
    color: "#7C3AED",
    colorLight: "#F5F3FF",
    badge: "بنفسجي ذكاء #7C3AED"
  },
  D: {
    id: "D",
    name: "فتوى أو حالة شخصية",
    nameEn: "Personal Fatwa",
    scope: "الحكم على واقعة فردية، صحة عقد أو عبادة لشخص بعينه، نزاع أسري، مسائل قانونية أو طبية ذات أثر شرعي",
    action: "لا يقدم النظام حكماً مستقلاً؛ يوضح المعلومات العامة ويحيل إلى جهة مؤهلة مع نموذج إحالة فوري",
    color: "#E11D48",
    colorLight: "#FFF1F2",
    badge: "مرجاني حوكمة #E11D48"
  },
  abstain: {
    id: "abstain",
    name: "امتناع أو عدم كفاية مرجع",
    nameEn: "Abstention",
    scope: "غياب المرجع الكافي أو انخفاض الثقة <0.82",
    action: "الامتناع أو التحفظ أو الإحالة — لا توليد غير موثق",
    color: "#64748B",
    colorLight: "#F1F5F9",
    badge: "رمادي امتناع"
  }
}

// Intent Detection — تصنيف نية السؤال
export function detectIntent(query: string): {intent: string, level: Level, keywords: string[]} {
  const q = query.toLowerCase()
  
  // Level D — فتوى شخصية (أعلى أولوية — يجب كشفه أولاً)
  const personalKeywords = ["أنا في", "زوجي", "زوجتي", "هل يجوز لي", "حكمي", "طلقت", "زواجي", "في دولتي", "حالة شخصية", "أنا متزوج", "أعيش في"]
  if (personalKeywords.some(k => query.includes(k))) {
    return {intent: "personal_fatwa", level: "D", keywords: personalKeywords.filter(k => query.includes(k))}
  }
  
  // Level A — معلومات أصلية (أولوية عالية)
  const quranKeywords = ["آية", "سورة", "﴿", "قرآن", "ما معنى قوله تعالى", "ما معنى التوحيد", "ما هو التوحيد", "تعريف التوحيد", "معنى التوحيد"]
  const hadithKeywords = ["حديث", "قال رسول الله", "صحيح البخاري", "صحيح مسلم"]
  const arkanKeywords = ["أركان الإسلام", "أركان الإيمان", "ما هي الصلاة", "أركان"]
  
  if (quranKeywords.some(k => query.includes(k)) || hadithKeywords.some(k => query.includes(k)) || arkanKeywords.some(k => query.includes(k))) {
    return {intent: "original_info", level: "A", keywords: [...quranKeywords, ...hadithKeywords, ...arkanKeywords].filter(k => query.includes(k))}
  }
  
  // Level B — شبهات وشرح
  const shubhaKeywords = ["لماذا يعبد", "هل القرآن من تأليف", "انتشر بالسيف", "شبهة", "لماذا يمنع الإسلام", "يعبد المسلمون الكعبة"]
  const conceptKeywords = ["ما معنى", "ما هو", "شرح", "تعريف", "مقارنة", "مقاصد"]
  
  if (shubhaKeywords.some(k => query.includes(k)) || conceptKeywords.some(k => query.includes(k))) {
    return {intent: "shubha_or_concept", level: "B", keywords: [...shubhaKeywords, ...conceptKeywords].filter(k => query.includes(k))}
  }
  
  // Level C — خلافية. Include common inflections, not only one exact phrase.
  const khilafKeywords = ["اختلاف العلماء", "خلاف فقهي", "هل كل المسلمين يتفقون", "مسألة خلافية", "عقيدة تفصيلية", "تاريخ جدلي", "بين العلماء", "المذاهب"]
  if (
    khilafKeywords.some(k => query.includes(k)) ||
    /(?:احكام|اراء|اقوال)\s+(?:مختلفه|متباينه)|(?:لماذا|سبب)\s+.{0,20}(?:مختلف|اختلاف).{0,24}(?:العلماء|الاحكام|المذاهب)|(?:اختلاف|خلاف)\s+.{0,24}(?:العلماء|المذاهب)/i.test(q)
  ) {
    return {intent: "khilaf", level: "C", keywords: khilafKeywords.filter(k => query.includes(k))}
  }
  
  // Default — B
  return {intent: "general_explain", level: "B", keywords: []}
}

export function getLevelColor(level: Level): string {
  return LEVELS[level]?.color || "#64748B"
}

export function getLevelLightColor(level: Level): string {
  return LEVELS[level]?.colorLight || "#F1F5F9"
}
