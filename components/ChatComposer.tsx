"use client"
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { motion } from "framer-motion"

interface ChatComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

const MAX = 500

/**
 * مُدخل المحادثة — ينمو ذاتياً، يرسل بـ Enter، سطر جديد بـ Shift+Enter.
 * يحل محل الوصول المباشر إلى DOM في النسخة السابقة.
 */
const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  function ChatComposer({ onSend, disabled = false, placeholder }, ref) {
    const inner = useRef<HTMLTextAreaElement | null>(null)
    const [value, setValue] = useState("")
    const [focused, setFocused] = useState(false)

    useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement)

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
          className="absolute -inset-[3px] rounded-[20px] pointer-events-none"
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
          className="relative flex items-end gap-2 bg-white/95 backdrop-blur-xl border rounded-[18px] p-2 transition-colors"
          style={{
            borderColor: focused ? "rgba(10,143,148,0.35)" : "rgba(201,223,225,0.9)",
            boxShadow: focused
              ? "0 10px 34px rgba(10,143,148,0.14)"
              : "0 4px 18px rgba(10,42,51,0.06)",
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
            className="body-font flex-1 min-h-[44px] max-h-[160px] px-3 py-3 bg-transparent border-none outline-none resize-none text-[14.5px] leading-[1.75] text-[#0A2A33] placeholder:text-[#8FB0B6] disabled:opacity-60 tb-scroll"
          />

          {/* عدّاد الأحرف */}
          {value.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="shrink-0 self-end mb-3 text-[10px] font-bold tabular-nums"
              style={{ color: nearLimit ? "#E11D48" : "#8FB0B6" }}
            >
              {value.length}
            </motion.span>
          )}

          <motion.button
            type="button"
            onClick={submit}
            disabled={disabled || value.trim().length === 0}
            whileHover={{ scale: value.trim() ? 1.06 : 1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="إرسال السؤال"
            className="shrink-0 w-11 h-11 rounded-[14px] text-white flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed transition-shadow relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg,#19D6C4 0%,#0A8F94 55%,#05495A 100%)",
              boxShadow: value.trim() && !disabled ? "0 6px 18px rgba(10,143,148,0.32)" : "none",
            }}
          >
            {disabled ? (
              <motion.span
                className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <svg width="19" height="19" viewBox="0 0 18 18" fill="none" aria-hidden>
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

        <div className="flex items-center justify-between gap-2 mt-2 px-1 text-[10px] text-[#8FB0B6]">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded-[5px] bg-white border border-[#C9DFE1] text-[9px] font-bold text-[#4B6A72]">
              Enter
            </kbd>
            إرسال
            <span className="w-px h-3 bg-[#C9DFE1]" />
            <kbd className="px-1.5 py-0.5 rounded-[5px] bg-white border border-[#C9DFE1] text-[9px] font-bold text-[#4B6A72]">
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
