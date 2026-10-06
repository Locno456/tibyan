// ============================================================
//  تِبْيَان — نظام «معرفة خلفية السائل»
//  • معرفات محددة مسبقاً (لكلٍّ أيقونة lucide خاصة)
//  • معرفة مخصصة: يصف المستخدم خلفيته، يحللها النموذج ويختار أيقونة تلقائياً
//  • تُحفظ المعرفات المخصصة والمعرفة المختارة في localStorage فلا يُعاد إدخالها
// ============================================================
import {
  Users, Sprout, Globe, GraduationCap, BookOpen, Lightbulb, Stethoscope,
  Code2, Scale, Baby, Dumbbell, Utensils, Plane, Landmark, Palette, Leaf,
  Brain, HeartHandshake, Microscope, PenTool, Music, Car, Home, Moon, Star,
  Shield, FlaskConical, PawPrint, Briefcase, Megaphone, Languages, Heart,
  Sparkles, User, Rocket, Feather, Gem, Syringe, Activity, Wheat,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type KnowledgeOption = {
  id: string              // "general" … أو "custom_<timestamp>"
  kind: "preset" | "custom"
  label: string
  hint?: string
  icon: string            // اسم أيقونة lucide
  background?: string     // للمعرفة المخصصة: نص وصف الخلفية
  persona: string         // ما يُرسل إلى /api/ask (معرّف preset أو "custom")
}

// الأيقونات المتاحة للاختيار الآلي/اليدوي
export const KNOWLEDGE_ICONS: Record<string, LucideIcon> = {
  Users, Sprout, Globe, GraduationCap, BookOpen, Lightbulb, Stethoscope,
  Code2, Scale, Baby, Dumbbell, Utensils, Plane, Landmark, Palette, Leaf,
  Brain, HeartHandshake, Microscope, PenTool, Music, Car, Home, Moon, Star,
  Shield, FlaskConical, PawPrint, Briefcase, Megaphone, Languages, Heart,
  Sparkles, User, Rocket, Feather, Gem, Syringe, Activity, Wheat,
}

export const ICON_CHOICES = Object.keys(KNOWLEDGE_ICONS)

export function getKnowledgeIcon(name: string): LucideIcon {
  return KNOWLEDGE_ICONS[name] || Lightbulb
}

// المعرفات المحددة مسبقاً — لكلٍّ أيقونته
export const PRESET_KNOWLEDGE: KnowledgeOption[] = [
  { id: "general",     kind: "preset", label: "عام",          hint: "خطاب متوازن للجميع",   icon: "Users",         persona: "general" },
  { id: "new_muslim",  kind: "preset", label: "حديث الإسلام", hint: "تدرّج ولطف",            icon: "Sprout",        persona: "new_muslim" },
  { id: "non_muslim",  kind: "preset", label: "غير مسلم",     hint: "تعريف أولي محايد",      icon: "Globe",         persona: "non_muslim" },
  { id: "teen",        kind: "preset", label: "ناشئة",        hint: "لغة قريبة ومعاصرة",     icon: "GraduationCap", persona: "teen" },
  { id: "researcher",  kind: "preset", label: "باحث",         hint: "تحرير علمي مفصّل",      icon: "BookOpen",      persona: "researcher" },
]

// مطابقة كلمات مفتاحية → أيقونة (تعمل دون اتصال — Fallback عند غياب النموذج)
const KEYWORD_ICON: [RegExp, string][] = [
  [/طبيب|اسنان|أسنان|ممرض|صيدل|طب|جراح/i, "Stethoscope"],
  [/مهندس|مبرمج|برمج|كود|مطور|تقنيه|تقنية|حاسوب|ذكاء/i, "Code2"],
  [/محام|قاضي|قانون|شرط|حقوقي/i, "Scale"],
  [/طفل|رضيع|ابن|ابنه|أم|اب|تربي|حامل/i, "Baby"],
  [/رياض|مدرب|لياقه|لياقة|جيم|كرة/i, "Dumbbell"],
  [/شيف|طهي|طعام|مطعم|حلوان|خبز/i, "Utensils"],
  [/طيار|سفر|سياح|مضيف/i, "Plane"],
  [/محاسب|بنك|استثمار|مال|اقتصاد|تجار/i, "Landmark"],
  [/فنان|رسام|تصميم|مصمم|خطاط|نحت/i, "Palette"],
  [/مزارع|زراع|نبات|بستنه/i, "Leaf"],
  [/نفسي|معالج|ارشاد|اجتماعي/i, "Brain"],
  [/معلم|استاذ|أستاذ|طالب|تعليم|مدرس|جامعه|جامعة/i, "GraduationCap"],
  [/باحث|علم|مختبر|كيمياء|فيزياء|احياء/i, "Microscope"],
  [/كاتب|صحفي|اديب|شاعر|محرر/i, "PenTool"],
  [/موسيقي|منشد|صوت|انشاد/i, "Music"],
  [/سائق|سيارات|شاحن|نقل/i, "Car"],
  [/معمار|بناء|عقار|منزل/i, "Home"],
  [/فلك|نجوم|فضاء|قمر/i, "Moon"],
  [/امن|حمايه|حماية|عسكر|جيش/i, "Shield"],
  [/صيدل|دواء|عقاقير/i, "Syringe"],
  [/حيوان|بيطري|قط|كلب/i, "PawPrint"],
  [/مدير|اعمال|أعمال|تسويق|موظف|شركه|شركة/i, "Briefcase"],
  [/اعلام|مذيع|يوتيو|مؤثر|نشر/i, "Megaphone"],
  [/مترجم|لغات|ترجمه|ترجمة/i, "Languages"],
  [/ممرض|تمريض|اسعاف|طوارئ/i, "Activity"],
  [/خباز|قمح|طحين|مخبز/i, "Wheat"],
]

export function keywordToIcon(text: string): string {
  for (const [re, icon] of KEYWORD_ICON) if (re.test(text)) return icon
  return "Lightbulb"
}

// اقتراح تسمية قصيرة من النص (للمعرفة المخصصة)
export function suggestLabel(text: string): string {
  const t = text.trim().replace(/\s+/g, " ")
  return t.length <= 22 ? t : t.slice(0, 22).trim() + "…"
}

// ---------- التخزين في المتصفح ----------
const KEY_CUSTOM = "tibyan.knowledge.custom.v1"
const KEY_SELECTED = "tibyan.knowledge.selected.v1"

const hasWindow = typeof window !== "undefined"

export function loadCustomKnowledge(): KnowledgeOption[] {
  if (!hasWindow) return []
  try {
    const raw = window.localStorage.getItem(KEY_CUSTOM)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveCustomKnowledge(list: KnowledgeOption[]) {
  if (!hasWindow) return
  try {
    window.localStorage.setItem(KEY_CUSTOM, JSON.stringify(list))
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

export function loadSelectedKnowledgeId(): string | null {
  if (!hasWindow) return null
  try {
    return window.localStorage.getItem(KEY_SELECTED)
  } catch {
    return null
  }
}

export function saveSelectedKnowledgeId(id: string | null) {
  if (!hasWindow) return
  try {
    if (id) window.localStorage.setItem(KEY_SELECTED, id)
    else window.localStorage.removeItem(KEY_SELECTED)
  } catch {
    /* ignore */
  }
}
