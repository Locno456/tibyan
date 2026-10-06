"use client"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { motion } from "framer-motion"
import { createPortal } from "react-dom"
import { BookOpenText, Check, ChevronUp, Globe2, Network, SlidersHorizontal } from "lucide-react"
import type { SourceMode } from "../lib/sourcePreferences"

interface ChatComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
  initialValue?: string
  sourceModes?: SourceMode[]
  onSourceModesChange?: (value: SourceMode[]) => void
  mcpModelCapable?: boolean | null
}

const MAX = 500

/**
 * مُدخل المحادثة — ينمو ذاتياً، يرسل بـ Enter، سطر جديد بـ Shift+Enter.
 * يحل محل الوصول المباشر إلى DOM في النسخة السابقة.
 */
const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  function ChatComposer({ onSend, disabled = false, placeholder, initialValue, sourceModes = ["local", "mcp"], onSourceModesChange, mcpModelCapable }, ref) {
    const inner = useRef<HTMLTextAreaElement | null>(null)
    const [value, setValue] = useState(initialValue || "")
    const [focused, setFocused] = useState(false)
    const [sourcesOpen, setSourcesOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    useEffect(() => {
      if (!sourcesOpen) return
      const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSourcesOpen(false) }
      window.addEventListener("keydown", onKey)
      return () => window.removeEventListener("keydown", onKey)
    }, [sourcesOpen])

    useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement)

    useEffect(() => {
      if (initialValue !== undefined) setValue(initialValue)
    }, [initialValue])

    // نمو ذاتي بالارتفاع
    useEffect(() => {
      const el = inner.current
      if (!el) return
      el.style.height = "0px"
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }, [value])

    const submit = () => {
      const text = value.trim()
      if (!text || disabled) return
      onSend(text)
      setValue("")
    }

    const nearLimit = value.length > MAX * 0.85

    return (
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative"
      >
        {/* هالة تظهر عند التركيز */}
        <motion.div
          aria-hidden
          className="absolute -inset-[3px] rounded-[34px] sm:rounded-[38px] pointer-events-none"
          style={{
            background:
              "linear-gradient(120deg, rgba(25,214,196,.55), rgba(20,82,158,.45), rgba(224,180,80,.45), rgba(25,214,196,.55))",
            backgroundSize: "220% 100%",
            filter: "blur(9px)",
          }}
          animate={{
            opacity: focused ? 0.55 : 0,
            backgroundPosition: focused ? ["0% 50%", "200% 50%"] : "0% 50%",
          }}
          transition={{
            opacity: { duration: 0.25 },
            backgroundPosition: { duration: 6, repeat: Infinity, ease: "linear" },
          }}
        />

        <div
          className="relative flex items-end gap-2 sm:gap-2.5 bg-white/95 backdrop-blur-xl border rounded-[30px] sm:rounded-[36px] p-2 sm:p-2.5 transition-colors"
          style={{
            borderColor: focused ? "rgba(10,143,148,0.35)" : "rgba(201,223,225,0.9)",
            // ظل أوضح لأن الحاوية الخلفية أُزيلت — الصندوق يطفو فوق خلفية الصفحة مباشرة
            boxShadow: focused
              ? "0 12px 40px rgba(10,143,148,0.18), 0 2px 8px rgba(10,42,51,0.06)"
              : "0 8px 28px rgba(10,42,51,0.10), 0 1px 4px rgba(10,42,51,0.05)",
          }}
        >
          <textarea
            ref={inner}
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, MAX))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={placeholder ?? "اسأل تِبْيَان… مثال: ما معنى التوحيد؟"}
            aria-label="اكتب سؤالك"
            className="body-font min-w-0 flex-1 min-h-[52px] sm:min-h-[56px] max-h-[180px] px-2 sm:px-5 py-3.5 bg-transparent border-none outline-none focus-visible:outline-none resize-none text-[15.5px] sm:text-[17px] leading-[1.75] text-[#0A2A33] placeholder:text-[#8FB0B6] disabled:opacity-60 tb-scroll"
          />

          {/* عدّاد الأحرف */}
          {value.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="shrink-0 self-end mb-4 sm:mb-[18px] text-[11.5px] font-bold tabular-nums"
              style={{ color: nearLimit ? "#E11D48" : "#8FB0B6" }}
            >
              {value.length}
            </motion.span>
          )}

          {onSourceModesChange && (
            <div className="relative shrink-0 self-center">
              <button type="button" aria-label="اختيار مصادر البحث" aria-expanded={sourcesOpen}
                onClick={() => setSourcesOpen(!sourcesOpen)}
                className="flex min-h-10 items-center gap-1.5 rounded-full border border-[#91BEC2] bg-[#EFF9F7] px-3 py-2 text-xs font-bold text-[#064C50] shadow-sm transition-colors hover:bg-[#DDF3F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F94]">
                <SlidersHorizontal size={15} aria-hidden="true" /> <span className="hidden sm:inline">المصادر</span>
                <span className="rounded-full bg-[#0A8F94] px-1.5 text-[10px] text-white">{sourceModes.filter((mode) => mode !== "mcp" || mcpModelCapable !== false).length}</span>
                <ChevronUp size={13} aria-hidden="true" />
              </button>
              {sourcesOpen && (
                <div id="tibyan-source-menu" className="hidden sm:block absolute bottom-full left-0 z-50 mb-3 w-[19rem] max-w-[calc(100vw-2rem)] max-h-[70dvh] overflow-y-auto rounded-2xl border border-[#91BEC2] bg-white p-3 text-right text-[#0A2A33] shadow-[0_18px_50px_rgba(10,42,51,.2)]" dir="rtl">
                  <div className="mb-2 flex items-center gap-2 border-b border-[#C9DFE1] pb-2 text-sm font-extrabold text-[#0A2A33]"><SlidersHorizontal size={16} /> مصادر الإجابة</div>
                  {([ ["local", "البيانات المحلية", BookOpenText, "النصوص المحفوظة داخل تِبْيَان"], ["mcp", "أدوات MCP", Network, "بحث مباشر في الخدمات المتصلة"], ["web", "مواقع موثوقة", Globe2, "مقتطفات بحث الدرر؛ ليست توثيقاً"] ] as const).map(([id, label, Icon, description]) => {
                    const unavailable = id === "mcp" && mcpModelCapable === false
                    const selected = sourceModes.includes(id) && !unavailable
                    return (
                      <label key={id} className={`mb-1 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${unavailable ? "cursor-not-allowed border-[#D7E1E1] bg-[#F4F6F5] text-[#4B666B]" : selected ? "cursor-pointer border-[#0A8F94] bg-[#EFF9F7] text-[#0A2A33]" : "cursor-pointer border-[#D7E1E1] bg-white text-[#0A2A33] hover:bg-[#F6FAF9]"}`}>
                        <input type="checkbox" className="sr-only" disabled={unavailable} checked={selected}
                          onChange={() => onSourceModesChange?.(sourceModes.includes(id) ? sourceModes.filter((item) => item !== id) : [...sourceModes, id])} />
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#087A7F]"><Icon size={17} aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{label}</span><span className="block text-[11px] leading-relaxed text-[#35545B]">{description}</span></span>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? "border-[#0A8F94] bg-[#0A8F94] text-white" : "border-[#779DA2] bg-white"}`}>{selected && <Check size={14} />}</span>
                      </label>
                    )
                  })}
                  {mcpModelCapable === false && <p className="rounded-lg bg-[#FFF7E5] p-2 text-[11px] font-medium text-[#6B4B0C]">النموذج الحالي لا يدعم الأدوات؛ اختر نموذجاً يدعمها لتفعيل MCP.</p>}
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#35545B]">يمكن الجمع بين المصادر. مواقع الباحث المخصصة قيد التطوير.</p>
                  <button type="button" onClick={() => setSourcesOpen(false)} className="mt-2 w-full rounded-lg bg-[#0A2A33] py-2 text-xs font-bold text-white">تم</button>
                </div>
              )}
            </div>
          )}
          {sourcesOpen && mounted && createPortal(
            <div className="fixed inset-0 z-[190] flex min-w-0 items-center justify-center overflow-y-auto p-3 sm:hidden" dir="rtl">
              <button type="button" aria-label="إغلاق قائمة المصادر" onClick={() => setSourcesOpen(false)} className="absolute inset-0 bg-[#071F27]/55" />
                <div id="tibyan-source-menu-mobile" className="relative z-[1] mx-auto my-auto w-full max-w-md max-h-[min(75dvh,32rem)] overflow-y-auto overscroll-contain rounded-2xl border border-[#91BEC2] bg-white p-3 text-right text-[#0A2A33] shadow-[0_18px_50px_rgba(10,42,51,.2)]" dir="rtl">
                  <div className="mb-2 flex items-center gap-2 border-b border-[#C9DFE1] pb-2 text-sm font-extrabold text-[#0A2A33]"><SlidersHorizontal size={16} /> مصادر الإجابة</div>
                  {([ ["local", "البيانات المحلية", BookOpenText, "النصوص المحفوظة داخل تِبْيَان"], ["mcp", "أدوات MCP", Network, "بحث مباشر في الخدمات المتصلة"], ["web", "مواقع موثوقة", Globe2, "مقتطفات بحث الدرر؛ ليست توثيقاً"] ] as const).map(([id, label, Icon, description]) => {
                    const unavailable = id === "mcp" && mcpModelCapable === false
                    const selected = sourceModes.includes(id) && !unavailable
                    return (
                      <label key={id} className={`mb-1 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${unavailable ? "cursor-not-allowed border-[#D7E1E1] bg-[#F4F6F5] text-[#4B666B]" : selected ? "cursor-pointer border-[#0A8F94] bg-[#EFF9F7] text-[#0A2A33]" : "cursor-pointer border-[#D7E1E1] bg-white text-[#0A2A33] hover:bg-[#F6FAF9]"}`}>
                        <input type="checkbox" className="sr-only" disabled={unavailable} checked={selected}
                          onChange={() => onSourceModesChange?.(sourceModes.includes(id) ? sourceModes.filter((item) => item !== id) : [...sourceModes, id])} />
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#087A7F]"><Icon size={17} aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{label}</span><span className="block text-[11px] leading-relaxed text-[#35545B]">{description}</span></span>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? "border-[#0A8F94] bg-[#0A8F94] text-white" : "border-[#779DA2] bg-white"}`}>{selected && <Check size={14} />}</span>
                      </label>
                    )
                  })}
                  {mcpModelCapable === false && <p className="rounded-lg bg-[#FFF7E5] p-2 text-[11px] font-medium text-[#6B4B0C]">النموذج الحالي لا يدعم الأدوات؛ اختر نموذجاً يدعمها لتفعيل MCP.</p>}
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-[#35545B]">يمكن الجمع بين المصادر. مواقع الباحث المخصصة قيد التطوير.</p>
                  <button type="button" onClick={() => setSourcesOpen(false)} className="mt-2 w-full rounded-lg bg-[#0A2A33] py-2 text-xs font-bold text-white">تم</button>
                </div>
            </div>, document.body
          )}
          <motion.button
            type="button"
            onClick={submit}
            disabled={disabled || value.trim().length === 0}
            whileHover={{ scale: value.trim() ? 1.06 : 1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="إرسال السؤال"
            className="shrink-0 w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full text-white flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed transition-shadow relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg,#19D6C4 0%,#0A8F94 55%,#05495A 100%)",
              boxShadow: value.trim() && !disabled ? "0 6px 18px rgba(10,143,148,0.32)" : "none",
            }}
          >
            {disabled ? (
              <motion.span
                className="w-[18px] h-[18px] sm:w-5 sm:h-5 border-2 border-white/35 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden className="sm:scale-110">
                <path
                  d="M3 9L15 3L9 9L15 15L3 9Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </motion.button>
        </div>

        <div className="hidden items-center justify-between gap-2 px-2 text-[11.5px] text-[#8FB0B6] xl:flex xl:mt-3 xl:px-3 xl:text-[13px]">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[7px] bg-white/90 border border-[#C9DFE1] text-[10.5px] sm:text-xs font-bold text-[#4B6A72]">
              Enter
            </kbd>
            إرسال
            <span className="w-px h-3 bg-[#C9DFE1]" />
            <kbd className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[7px] bg-white/90 border border-[#C9DFE1] text-[10.5px] sm:text-xs font-bold text-[#4B6A72]">
              Shift+Enter
            </kbd>
            سطر جديد
          </span>
          <span className="hidden sm:inline">أداة مدعومة بالذكاء الاصطناعي — ليست بديلاً عن أهل العلم</span>
        </div>
      </motion.div>
    )
  }
)

export default ChatComposer
