"use client"
import { motion } from "framer-motion"

interface PurpleCardProps {
  explanation: string
  persona?: string
  level?: "A" | "B" | "C" | "D" | "abstain"
  references?: string[]
}

export default function PurpleCard({ explanation, persona = "general", level = "B", references }: PurpleCardProps) {
  const getLevelInfo = () => {
    switch (level) {
      case "A": return { label: "معلومات أصلية", color: "#14529E", bg: "#EEF6F6" }
      case "B": return { label: "شرح وتعريف", color: "#0A8F94", bg: "#EEF6F6" }
      case "C": return { label: "مسألة خلافية", color: "#7B4FD6", bg: "#F5F3FF" }
      case "D": return { label: "فتوى شخصية", color: "#E11D48", bg: "#FFF1F2" }
      default: return { label: "شرح AI", color: "#7B4FD6", bg: "#F5F3FF" }
    }
  }

  const levelInfo = getLevelInfo()
  const safeExplanation = explanation || ""
  const safeReferences = references || []

  const getPersonaLabel = () => {
    switch (persona) {
      case "new_muslim": return "للمسلم الجديد"
      case "non_muslim": return "لغير المسلم"
      case "teen": return "للناشئة"
      case "researcher": return "للباحث"
      default: return "عام"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      className="relative group"
    >
      <div className="glass glass-purple rounded-[16px] p-5 relative overflow-hidden transition-all duration-300 group-hover:shadow-[0_12px_36px_rgba(123,79,214,0.12)]">
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[16px]" style={{ background: "linear-gradient(90deg, #7B4FD6 0%, #14529E 50%, #19D6C4 100%)" }} />

        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-[#F5F3FF] border border-[#DDD6FE] text-[#7B4FD6]">
            <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#7B4FD6] to-[#A78BFA] flex items-center justify-center text-white text-[8px]">AI</span>
            مولد بالذكاء • منظم ومبين
          </div>
        </div>

        <div className="flex items-start justify-between mb-3 mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white font-bold shadow-[0_4px_12px_rgba(123,79,214,0.25)]" style={{ background: "linear-gradient(135deg, #7B4FD6, #14529E)" }}>
              <span className="text-[15px]">✦</span>
            </div>
            <div>
              <div className="text-[13px] font-extrabold flex items-center gap-2" style={{ color: '#7B4FD6', fontFamily: 'Tajawal, sans-serif' }}>
                <span>الشرح والتنظيم</span>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold border" style={{ background: levelInfo.bg, color: levelInfo.color, borderColor: `${levelInfo.color}20` }}>
                  {level} • {levelInfo.label}
                </span>
              </div>
              <div className="text-[11.5px] text-[#4B6A72] mt-0.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7B4FD6] animate-pulse" />
                  {getPersonaLabel()}
                </span>
                <span className="w-px h-3 bg-[#C9DFE1]" />
                <span>ليس المصدر بل المنظم</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div
            className="body-font text-[15px] leading-[1.85] p-4 rounded-[12px] border"
            style={{
              color: '#0A2A33',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,243,255,0.7) 100%)',
              borderColor: 'rgba(123,79,214,0.12)',
              fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif',
              whiteSpace: 'pre-wrap'
            }}
          >
            {safeExplanation}
          </div>
        </div>

        {safeReferences.length > 0 && (
          <div className="mt-3 p-2.5 rounded-[12px] bg-[#F5F3FF]/60 border border-[#7B4FD6]/10">
            <div className="text-[11.5px] font-bold text-[#7B4FD6] mb-1.5">📚 مراجع:</div>
            <div className="flex flex-wrap gap-1.5">
              {safeReferences.map((ref, i) => (
                <span key={i} className="px-2 py-1 rounded-full text-[11.5px] bg-white border border-[#DDD6FE] text-[#4B6A72]">
                  {ref || ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
