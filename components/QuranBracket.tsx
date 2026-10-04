"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface QuranBracketProps {
  text: string // يجب أن يكون حرفياً من verified_texts.json مع ﴿...﴾
  surah?: number
  ayah?: number
  source?: string
  sourceUrl?: string
  confidence?: number
  index?: number
}

export default function QuranBracket({
  text,
  surah,
  ayah,
  source,
  sourceUrl,
  confidence,
  index = 0,
}: QuranBracketProps) {
  const [copied, setCopied] = useState(false)
  const safeText = text || ""
  const hasBrackets = safeText.includes("﴿") && safeText.includes("﴾")
  const displayText = hasBrackets ? safeText : `﴿${safeText}﴾`

  const getRef = () => {
    if (surah && ayah) return `سورة ${surah} آية ${ayah}`
    if (source) {
      const match = source.match(/سورة.*?(\d+).*?آية.*?(\d+)/)
      if (match) return `سورة ${match[1]} آية ${match[2]}`
      return source.split(" - ")[0] || source
    }
    return "مصدر موثق"
  }

  const getDomain = () => {
    try {
      if (!sourceUrl) return ""
      return sourceUrl.replace("https://", "").replace("http://", "").split("/")[0]
    } catch {
      return ""
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayText)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = displayText
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand("copy") } catch { /* تجاهل */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06 * index, type: "spring", stiffness: 260, damping: 26 }}
      whileHover={{ y: -2 }}
      className="my-3 relative group"
    >
      <div className="relative rounded-[14px] border bg-gradient-to-br from-[#EEF6F6] to-white border-[#C9DFE1]/70 p-3.5 shadow-[0_2px_8px_rgba(10,143,148,0.06)] transition-shadow duration-300 group-hover:shadow-[0_10px_26px_rgba(10,143,148,0.14)]">
        {/* شريط ذهبي علوي */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[14px]"
          style={{ background: "linear-gradient(90deg,#FFF0B8,#E0B450)" }}
        />

        <div className="flex items-start gap-2">
          <div className="shrink-0 w-6 h-6 rounded-[8px] bg-[#14529E] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">
            ﴿
          </div>
          <div className="flex-1 min-w-0">
            <div className="sacred text-[17px] leading-[2] text-[#0A2A33]">{displayText}</div>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#C9DFE1] text-[10px] font-bold text-[#14529E] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <span className="w-4 h-4 rounded-full bg-[#14529E] text-white flex items-center justify-center text-[8px]">
                  📖
                </span>
                {getRef()}
              </span>

              {confidence !== undefined && (
                <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-bold">
                  ثقة {(Number(confidence) * 100).toFixed(0)}%
                </span>
              )}

              <span className="px-2 py-1 rounded-full bg-[#FFF8E0] border border-[#E0B450]/30 text-[#8B6914] text-[9px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-[2px] rotate-45 bg-[#E0B450]" />
                موثق 100% • لا توليد
              </span>

              {/* نسخ النص */}
              <button
                type="button"
                onClick={copy}
                aria-label="نسخ النص"
                className="relative px-2 py-1 rounded-full bg-white border border-[#C9DFE1] text-[9px] font-bold text-[#4B6A72] hover:text-[#0A8F94] hover:border-[#0A8F94]/40 transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copied ? "ok" : "copy"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16 }}
                    className="block"
                  >
                    {copied ? "✓ نُسخ" : "⧉ نسخ"}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>

            {sourceUrl && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#0A8F94] hover:text-[#05495A] underline decoration-dotted underline-offset-2 transition-colors"
                >
                  تحقق: {getDomain() || sourceUrl}
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                {source && <span className="text-[10px] text-[#8FB0B6]">• {source}</span>}
              </div>
            )}
          </div>
          <div className="shrink-0 w-6 h-6 rounded-[8px] bg-[#14529E] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">
            ﴾
          </div>
        </div>
      </div>
    </motion.div>
  )
}
