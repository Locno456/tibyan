"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import QuranBracket from "./QuranBracket"
import CircularProgress from "./CircularProgress"
import SourcesModal from "./SourcesModal"
import { Level } from "../lib/levelRouter"

interface ChatMessageProps {
  question: string
  level: Level
  levelInfo: any
  blueCards: any[]
  purpleCards: any[]
  confidence: number
  metrics: any
  status: "ok" | "abstain" | "blocked"
}

export default function ChatMessage({ question, level, levelInfo, blueCards, purpleCards, confidence, metrics, status }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false)
  
  const safeBlueCards = Array.isArray(blueCards) ? blueCards.filter(c => c) : []
  const safePurpleCards = Array.isArray(purpleCards) ? purpleCards.filter(c => c) : []
  const safeConfidence = Number(confidence) || 0
  const safeQuestion = question || ""
  const mainExplanation = safePurpleCards[0]?.explanation || ""
  const safeMetrics = metrics || {}
  const safeLevel = level || "abstain"
  const safeLevelInfo = levelInfo || { name: "عام" }

  // فصل الآيات عن المفاهيم لعرضها داخل الأقواس
  const quranCards = safeBlueCards.filter(c => c.type === "quran")
  const hadithCards = safeBlueCards.filter(c => c.type === "hadith")
  const otherCards = safeBlueCards.filter(c => c.type !== "quran" && c.type !== "hadith")

  return (
    <>
      <div className="w-full max-w-[800px] mx-auto">
        {/* User bubble */}
        <div className="flex justify-end mb-4">
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-w-[85%] bg-[#0A2A33] text-white rounded-[18px] rounded-br-[6px] px-4 py-3 shadow-[0_4px_12px_rgba(10,42,51,0.15)]"
          >
            <div className="text-[14px] font-medium leading-relaxed">{safeQuestion}</div>
            <div className="text-[10px] opacity-60 mt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">مستوى {safeLevel} • {safeLevelInfo.name || ""}</span>
              {safeMetrics.responseTime && <span>{safeMetrics.responseTime}ms</span>}
            </div>
          </motion.div>
        </div>

        {/* AI bubble - ChatGPT style with integrated Quran brackets */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[18px] rounded-bl-[6px] border border-[#C9DFE1]/60 shadow-[0_8px_24px_rgba(10,42,51,0.06)] overflow-hidden"
        >
          {/* Top accent - true brand */}
          <div className="h-[3px] w-full" style={{ background: status === 'ok' ? "linear-gradient(90deg, #19D6C4 0%, #0A8F94 50%, #14529E 100%)" : "linear-gradient(90deg, #E0B450, #E11D48)" }} />

          <div className="p-5">
            {/* AI header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#19D6C4] to-[#0A8F94] flex items-center justify-center shadow-[0_2px_8px_rgba(10,143,148,0.2)]">
                <img src="/tibyan-logo-white.svg" alt="" className="w-5 h-5 object-contain" />
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-extrabold text-[#0A2A33]" style={{ fontFamily: 'Tajawal, sans-serif' }}>تِبْيَان</div>
                <div className="text-[10px] text-[#4B6A72] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {status === 'ok' ? 'إجابة موثقة • صفر اختلاق' : status === 'abstain' ? 'امتناع - لا يوجد مرجعية كافية' : 'محجوب - حارس صفر اختلاق'}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${status === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                  {status === 'ok' ? '✓ موثق' : '⊘ امتناع'}
                </span>
              </div>
            </div>

            {/* Main explanation */}
            {mainExplanation && (
              <div
                className="text-[14px] leading-[1.85] text-[#0A2A33] mb-4"
                style={{ fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif', whiteSpace: 'pre-wrap' }}
              >
                {mainExplanation}
              </div>
            )}

            {/* Quran brackets inside message - like Mushaf */}
            {quranCards.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[#14529E] mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-[6px] bg-[#14529E] text-white flex items-center justify-center text-[10px]">﴿</span>
                  آيات قرآنية موثقة
                </div>
                {quranCards.map((card, i) => (
                  <QuranBracket key={card.id || i} {...card} />
                ))}
              </div>
            )}

            {/* Hadith brackets */}
            {hadithCards.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[#0A8F94] mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-[6px] bg-[#0A8F94] text-white flex items-center justify-center text-[10px]">ﷺ</span>
                  أحاديث شريفة موثقة
                </div>
                {hadithCards.map((card, i) => (
                  <QuranBracket key={card.id || i} {...card} />
                ))}
              </div>
            )}

            {/* Other sources inline */}
            {otherCards.length > 0 && (
              <div className="mb-4 p-3 rounded-[12px] bg-[#EEF6F6]/60 border border-[#C9DFE1]/40">
                <div className="text-[11px] font-bold text-[#0A2A33] mb-2">📚 مصادر إضافية موثقة:</div>
                {otherCards.map((card, i) => (
                  <div key={card.id || i} className="text-[13px] leading-[1.7] text-[#0A2A33] mb-2 p-2.5 rounded-[8px] bg-white border border-[#C9DFE1]/30" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                    {card.text || ""}
                    <div className="text-[10px] text-[#8FB0B6] mt-1">{card.source || ""}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer with sources button + circular progress - like ChatGPT */}
            <div className="mt-5 pt-4 border-t border-[#C9DFE1]/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowSources(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0A2A33] text-white text-[12px] font-bold hover:bg-black hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all group"
                >
                  <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-[11px] group-hover:bg-white/25">📚</span>
                  عرض المصادر ({safeBlueCards.length})
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-60 group-hover:opacity-100 group-hover:translate-x-[-2px] transition-all">
                    <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#8FB0B6]">
                  <span className="w-px h-4 bg-[#C9DFE1]" />
                  <span>• {safeMetrics.retrievalSource || "hybrid"} • {safeBlueCards.length} مصادر • {safeMetrics.llm ? safeMetrics.llm.toString().slice(0, 20) : "موثق"}</span>
                </div>
              </div>

              <CircularProgress value={safeConfidence * 100} size={48} />
            </div>

            {/* Visual separation hint inside bubble */}
            <div className="mt-4 flex items-center justify-center gap-3 text-[9px] text-[#8FB0B6] flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#14529E]" />أزرق = نص حرفي 100%</span>
              <span className="w-px h-3 bg-[#C9DFE1]" />
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7B4FD6]" />بنفسجي = شرح AI</span>
              <span className="w-px h-3 bg-[#C9DFE1]" />
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] rotate-45 bg-[#E0B450]" />ذهبي = نور المعرفة</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sources Modal */}
      <SourcesModal
        isOpen={showSources}
        onClose={() => setShowSources(false)}
        sources={safeBlueCards}
        question={safeQuestion}
        confidence={safeConfidence}
      />
    </>
  )
}
