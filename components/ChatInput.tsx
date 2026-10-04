"use client"
import { useState } from "react"
import { motion } from "framer-motion"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled = false, placeholder }: ChatInputProps) {
  const [input, setInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput("")
    }
  }

  const suggestions = [
    "ما معنى التوحيد؟",
    "لماذا يعبد المسلمون الكعبة؟",
    "هل القرآن من تأليف محمد ﷺ؟",
    "ما هي أركان الإسلام؟"
  ]

  return (
    <div className="w-full">
      {/* Suggestions */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            onClick={() => !disabled && onSend(s)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-white border border-[#C9DFE1] text-[#4B6A72] hover:border-[#0A8F94]/30 hover:bg-[#EEF6F6] hover:text-[#0A8F94] transition-all disabled:opacity-50"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {s}
          </motion.button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative glass rounded-[16px] p-2 flex items-end gap-2 border border-[#0A8F94]/10 focus-within:border-[#0A8F94]/25 focus-within:shadow-[0_0_0_3px_rgba(10,143,148,0.08)] transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder={placeholder || "اسأل تِبْيَان... مثال: ما معنى التوحيد؟ أو لماذا يعبد المسلمون الكعبة؟"}
            disabled={disabled}
            rows={1}
            className="flex-1 min-h-[44px] max-h-[120px] p-3 bg-transparent border-none outline-none resize-none text-[14px] leading-relaxed placeholder:text-slate-400"
            style={{ fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}
          />

          <motion.button
            type="submit"
            disabled={disabled || !input.trim()}
            className="shrink-0 w-11 h-11 rounded-[12px] flex items-center justify-center text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(10,143,148,0.25)]"
            style={{ background: "linear-gradient(135deg, #19D6C4 0%, #0A8F94 50%, #05495A)" }}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
          >
            {disabled ? (
              <motion.div
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9L15 3L9 9L15 15L3 9Z" fill="white" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            )}
          </motion.button>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14529E]" />
              موثق 100%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A8F94]" />
              مصادر معتمدة
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E0B450] rotate-45" />
              نور المعرفة
            </span>
          </div>
          <span>Enter للإرسال • Shift+Enter لسطر جديد</span>
        </div>
      </form>
    </div>
  )
}
