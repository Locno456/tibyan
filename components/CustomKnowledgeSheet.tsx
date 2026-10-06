"use client"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Save, X, Wand2 } from "lucide-react"
import {
  KnowledgeOption, getKnowledgeIcon, ICON_CHOICES, keywordToIcon, suggestLabel,
} from "../lib/knowledge"

interface Props {
  open: boolean
  onClose: () => void
  onSave: (k: KnowledgeOption) => void
}

/**
 * «معرفة مخصصة» — يصف المستخدم خلفيته، يحللها النموذج ويختار أيقونة تلقائياً.
 * شاشات كبيرة: Modal في المنتصف · شاشات صغيرة: Bottom sheet ينزلق من الأسفل.
 * تُحفظ النتيجة في localStorage فلا يُعاد إدخالها.
 */
export default function CustomKnowledgeSheet({ open, onClose, onSave }: Props) {
  const [text, setText] = useState("")
  const [icon, setIcon] = useState("Lightbulb")
  const [analyzing, setAnalyzing] = useState(false)
  const [source, setSource] = useState<"gemini" | "heuristic" | null>(null)
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // تحليل تلقائي بعد توقّف الكتابة (debounce) — يعمل حتى دون مفتاح (استدلال محلي)
  useEffect(() => {
    if (!open) return
    if (!text.trim()) {
      setIcon("Lightbulb")
      setSource(null)
      return
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      setAnalyzing(true)
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const res = await fetch("/api/suggest-icon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
          signal: ctrl.signal,
        })
        const j = await res.json()
        if (j.icon) {
          setIcon(j.icon)
          setSource(String(j.source || "").startsWith("gemini") ? "gemini" : "heuristic")
        }
      } catch {
        // فشل الشبكة — استدلال محلي فوري
        setIcon(keywordToIcon(text))
        setSource("heuristic")
      } finally {
        setAnalyzing(false)
      }
    }, 600)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [text, open])

  const PreviewIcon = getKnowledgeIcon(icon)

  const save = () => {
    const t = text.trim()
    if (!t) return
    onSave({
      id: `custom_${Date.now()}`,
      kind: "custom",
      label: suggestLabel(t),
      icon,
      background: t,
      persona: "custom",
    })
    setText("")
    setSource(null)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
        >
          {/* خلفية معتمة */}
          <div className="absolute inset-0 bg-[#0A2A33]/45 backdrop-blur-[3px]" onClick={onClose} aria-hidden />

          {/* البطاقة: bottom sheet على الجوال، modal في المنتصف على الشاشات الكبيرة */}
          <motion.div
            initial={{ y: 64, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 64, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label="إضافة معرفة مخصصة"
            className="relative w-full sm:max-w-md bg-white sm:rounded-[28px] rounded-t-[28px] border border-[#C9DFE1]/70 shadow-[0_-10px_60px_rgba(10,42,51,0.25)] p-5 sm:p-6 max-h-[86vh] overflow-y-auto tb-scroll"
          >
            {/* مقبض السحب للجوال */}
            <div className="sm:hidden mx-auto mb-4 w-12 h-1.5 rounded-full bg-[#C9DFE1]" aria-hidden />

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[17px] sm:text-[19px] font-extrabold text-[#0A2A33]">معرفة مخصصة</div>
                <div className="text-[12px] sm:text-[13px] text-[#4B6A72] mt-0.5">
                  صِف خلفية السائل وسيفهمها النموذج ويختار لها أيقونة تلقائياً
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="shrink-0 w-9 h-9 rounded-full bg-[#EEF6F6] text-[#4B6A72] flex items-center justify-center hover:bg-[#C9DFE1]/60 transition-colors"
              >
                <X size={17} strokeWidth={2.5} />
              </button>
            </div>

            {/* حقل الوصف */}
            <label className="block mt-5">
              <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#0A2A33]">خلفية السائل</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder="مثال: طبيب أسنان، طالب ثانوي، مبرمج، أم لثلاثة أطفال…"
                className="mt-2 w-full rounded-2xl border border-[#C9DFE1] bg-[#F7FBFB] px-4 py-3 text-[15px] sm:text-[16px] leading-[1.7] text-[#0A2A33] placeholder:text-[#8FB0B6] outline-none focus-visible:outline-none focus:border-[#0A8F94]/60 focus:bg-white transition-colors resize-none"
              />
            </label>

            {/* معاينة الأيقونة المختارة */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#EEF6F6]/70 border border-[#C9DFE1]/60 p-3">
              <span
                className="relative shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg,#19D6C4 0%,#0A8F94 55%,#05495A 100%)" }}
              >
                {analyzing ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <motion.span key={icon} initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                    <PreviewIcon size={26} strokeWidth={2.1} />
                  </motion.span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] sm:text-[14px] font-extrabold text-[#0A2A33]">
                  <Wand2 size={14} className="text-[#0A8F94]" />
                  الأيقونة المقترحة
                </div>
                <div className="text-[11px] sm:text-[12px] text-[#4B6A72] mt-0.5">
                  {analyzing
                    ? "يحلل النموذج الوصف…"
                    : source === "gemini"
                      ? "اختارها النموذج اللغوي تلقائياً"
                      : source === "heuristic"
                        ? "مطابقة ذكية محلية (تعمل دون اتصال)"
                        : "اكتب وصفاً ليتم الاقتراح"}
                </div>
              </div>
            </div>

            {/* تجاوز يدوي اختياري */}
            <div className="mt-3">
              <div className="text-[11px] font-bold text-[#8FB0B6] mb-1.5">أو اختر أيقونة يدوياً</div>
              <div className="flex gap-1.5 overflow-x-auto tb-scroll pb-1">
                {ICON_CHOICES.slice(0, 16).map((name) => {
                  const Ic = getKnowledgeIcon(name)
                  const active = icon === name
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setIcon(name); setSource(null) }}
                      title={name}
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                        active ? "bg-[#0A8F94] text-white border-[#0A8F94] scale-105" : "bg-white text-[#4B6A72] border-[#C9DFE1] hover:border-[#0A8F94]/50"
                      }`}
                    >
                      <Ic size={18} strokeWidth={2.2} />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* حفظ */}
            <button
              type="button"
              onClick={save}
              disabled={!text.trim()}
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-extrabold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg,#19D6C4 0%,#0A8F94 55%,#05495A 100%)" }}
            >
              <Save size={18} strokeWidth={2.4} />
              حفظ المعرفة واستخدامها
            </button>
            <p className="mt-2.5 text-center text-[10.5px] sm:text-[11.5px] text-[#8FB0B6]">
              تُحفظ المعرفة والأيقونة في متصفحك فقط — لن تحتاج لإعادة إدخالها
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
