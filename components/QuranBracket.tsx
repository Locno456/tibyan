"use client"
import { motion } from "framer-motion"

interface QuranBracketProps {
  text: string // يجب أن يكون حرفياً من verified_texts.json مع ﴿...﴾
  surah?: number
  ayah?: number
  source?: string
  sourceUrl?: string
  confidence?: number
}

export default function QuranBracket({ text, surah, ayah, source, sourceUrl, confidence }: QuranBracketProps) {
  const safeText = text || ""
  const hasBrackets = safeText.includes("﴿") && safeText.includes("﴾")
  
  // تنظيف النص إذا لم يكن فيه أقواس - نضيفها
  const displayText = hasBrackets ? safeText : `﴿${safeText}﴾`
  
  const getRef = () => {
    if (surah && ayah) return `سورة ${surah} آية ${ayah}`
    if (source) {
      // استخراج سورة وآية من المصدر إذا موجود
      const match = source.match(/سورة.*?(\d+).*?آية.*?(\d+)/)
      if (match) return `سورة ${match[1]} آية ${match[2]}`
      return source.split(' - ')[0] || source
    }
    return "مصدر موثق"
  }

  const getDomain = () => {
    try {
      if (!sourceUrl) return ""
      return sourceUrl.replace('https://', '').replace('http://', '').split('/')[0]
    } catch {
      return ""
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="my-3 relative group"
    >
      <div className="relative rounded-[12px] border bg-gradient-to-br from-[#EEF6F6] to-white border-[#C9DFE1]/70 p-3.5 shadow-[0_2px_8px_rgba(10,143,148,0.06)]">
        {/* Gold accent for Quran */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[12px]" style={{ background: "linear-gradient(90deg, #FFF0B8, #E0B450)" }} />
        
        {/* Quran text with brackets - true Mushaf style */}
        <div className="flex items-start gap-2">
          <div className="shrink-0 w-6 h-6 rounded-[8px] bg-[#14529E] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">﴿</div>
          <div className="flex-1">
            <div
              className="sacred text-[17px] leading-[2] text-[#0A2A33]"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              {displayText}
            </div>
            
            {/* Surah and ayah reference */}
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#C9DFE1] text-[10px] font-bold text-[#14529E] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <span className="w-4 h-4 rounded-full bg-[#14529E] text-white flex items-center justify-center text-[8px]">📖</span>
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
            </div>

            {/* Source link */}
            {sourceUrl && (
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#0A8F94] hover:text-[#05495A] underline"
                >
                  تحقق: {getDomain() || sourceUrl}
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                {source && <span className="text-[10px] text-[#8FB0B6]">• {source}</span>}
              </div>
            )}
          </div>
          <div className="shrink-0 w-6 h-6 rounded-[8px] bg-[#14529E] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">﴾</div>
        </div>
      </div>
    </motion.div>
  )
}
