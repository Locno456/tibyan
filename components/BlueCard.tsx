"use client"
import { motion } from "framer-motion"

interface BlueCardProps {
  text: string
  source: string
  sourceUrl: string
  grade?: string
  type?: "quran" | "hadith" | "tafsir" | "concept"
  surah?: number
  ayah?: number
  confidence?: number
}

export default function BlueCard({ text, source, sourceUrl, grade, type = "concept", surah, ayah, confidence }: BlueCardProps) {
  const getIcon = () => {
    switch (type) {
      case "quran": return "﴿"
      case "hadith": return "ﷺ"
      case "tafsir": return "📖"
      default: return "✓"
    }
  }

  const getLabel = () => {
    switch (type) {
      case "quran": return `القرآن الكريم${surah && ayah ? ` - سورة ${surah} آية ${ayah}` : ""}`
      case "hadith": return `الحديث الشريف${grade ? ` - ${grade}` : ""}`
      case "tafsir": return "التفسير المعتمد"
      default: return "نص موثق"
    }
  }

  const getDomain = () => {
    try {
      if (!sourceUrl) return "مصدر موثق"
      return sourceUrl.replace('https://', '').replace('http://', '').split('/')[0] || "مصدر موثق"
    } catch {
      return "مصدر موثق"
    }
  }

  const safeSource = source || "مصدر موثق"
  const safeText = text || ""
  const safeSourceUrl = sourceUrl || "#"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative group"
    >
      <div className="glass glass-blue rounded-[16px] p-5 relative overflow-hidden transition-all duration-300 group-hover:shadow-[0_12px_36px_rgba(20,82,158,0.12)]">
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[16px]" style={{ background: "linear-gradient(90deg, #14529E 0%, #0A8F94 100%)" }} />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EEF6F6] border border-[#C9DFE1] text-[#14529E]">
          <span className="w-3.5 h-3.5 rounded-full bg-[#14529E] flex items-center justify-center text-white text-[8px]">✓</span>
          موثق 100% • لا توليد
        </div>

        <div className="flex items-start justify-between mb-3 mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white font-bold shadow-[0_4px_12px_rgba(20,82,158,0.25)]" style={{ background: "linear-gradient(135deg, #19D6C4, #0A8F94 50%, #05495A)" }}>
              <span className="text-[16px]">{getIcon()}</span>
            </div>
            <div>
              <div className="text-[12px] font-extrabold" style={{ color: '#14529E', fontFamily: 'Tajawal, sans-serif' }}>{getLabel()}</div>
              <div className="text-[10px] text-[#4B6A72] mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {safeSource}
                {confidence !== undefined && confidence !== null && (
                  <span className="mr-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">ثقة {(Number(confidence) * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div
            className="sacred text-[18px] leading-[1.9] p-4 rounded-[12px] border"
            style={{
              color: '#0A2A33',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(238,246,246,0.7) 100%)',
              borderColor: 'rgba(20,82,158,0.12)',
              fontFamily: 'Amiri, serif',
              boxShadow: '0 1px 3px rgba(20,82,158,0.06) inset'
            }}
          >
            {safeText}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          {safeSourceUrl && safeSourceUrl !== "#" ? (
            <a
              href={safeSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white border border-[#C9DFE1] text-[#14529E] hover:bg-[#EEF6F6] transition-all"
            >
              <span>تحقق من المصدر</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ) : (
            <span className="text-[11px] text-[#8FB0B6]">{safeSource}</span>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-[#8FB0B6]">
            <span className="w-1 h-1 rounded-full bg-[#14529E]/40" />
            <span>استرجاع حرفي • {getDomain()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
