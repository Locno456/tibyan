"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect } from "react"

interface SourceDetail {
  id: string
  text: string
  source: string
  source_url: string
  grade?: string
  type: string
  surah?: number
  ayah?: number
  confidence: number
  bm25_score?: number
  vector_score?: number
}

interface SourcesModalProps {
  isOpen: boolean
  onClose: () => void
  sources: SourceDetail[]
  question: string
  confidence: number
}

export default function SourcesModal({ isOpen, onClose, sources, question, confidence }: SourcesModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  // إغلاق بـ Esc
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const safeSources = Array.isArray(sources) ? sources.filter(s => s) : []
  const safeConfidence = Number(confidence) || 0

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      quran: "القرآن الكريم",
      hadith: "الحديث الشريف",
      tafsir: "التفسير",
      shubha: "رد الشبهات - بينات",
      concept: "مفهوم شرعي",
      fiqh: "فقه",
      sira: "سيرة"
    }
    return map[type] || type || "مصدر"
  }

  const getTypeColor = (type: string) => {
    if (type === "quran") return { bg: "#EEF6F6", border: "#C9DFE1", text: "#14529E", dot: "#14529E" }
    if (type === "hadith") return { bg: "#EEF6F6", border: "#C9DFE1", text: "#0A8F94", dot: "#0A8F94" }
    if (type === "shubha") return { bg: "#F5F3FF", border: "#DDD6FE", text: "#7B4FD6", dot: "#7B4FD6" }
    return { bg: "#EEF6F6", border: "#C9DFE1", text: "#0A2A33", dot: "#0A8F94" }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0A2A33]/40 backdrop-blur-[4px]"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="تفاصيل المصادر الموثقة"
              className="bg-white rounded-t-[20px] sm:rounded-[16px] w-full max-w-[700px] max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(10,42,51,0.2)] border border-[#C9DFE1]/50 overflow-hidden"
            >
              {/* Header */}
              <div className="shrink-0 p-5 border-b border-[#C9DFE1]/50 bg-gradient-to-r from-[#EEF6F6] to-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-[10px] bg-[#0A8F94] text-white flex items-center justify-center text-[14px]">📚</div>
                      <h3 className="text-[16px] font-extrabold text-[#0A2A33]" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                        تفاصيل المصادر الموثقة
                      </h3>
                      <span className="px-2.5 py-1 rounded-full bg-white border border-[#C9DFE1] text-[11px] font-bold text-[#0A8F94]">
                        {safeSources.length} مصادر
                      </span>
                    </div>
                    <p className="text-[12px] text-[#4B6A72] leading-relaxed">
                      السؤال: <span className="font-bold text-[#0A2A33]">{question || ""}</span>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-[#4B6A72]">موثوقية إجمالية:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        safeConfidence >= 0.9 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                        safeConfidence >= 0.7 ? 'bg-[#EEF6F6] border-[#C9DFE1] text-[#0A8F94]' :
                        'bg-amber-50 border-amber-100 text-amber-700'
                      }`}>
                        {(safeConfidence * 100).toFixed(0)}% - {safeConfidence >= 0.9 ? 'ممتاز' : safeConfidence >= 0.7 ? 'جيد' : 'متوسط'}
                      </span>
                      <span className="text-[10px] text-[#8FB0B6]">• صفر اختلاق • استرجاع حرفي</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    aria-label="إغلاق"
                    className="shrink-0 w-8 h-8 rounded-full bg-[#EEF6F6] border border-[#C9DFE1] text-[#4B6A72] hover:bg-[#0A2A33] hover:text-white hover:border-[#0A2A33] flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Sources list */}
              <div className="flex-1 overflow-y-auto tb-scroll p-4 space-y-3">
                {safeSources.length === 0 ? (
                  <div className="text-center py-8 text-[#8FB0B6] text-[13px]">
                    لا يوجد مصادر - تم الامتناع لعدم وجود مرجعية كافية
                  </div>
                ) : (
                  safeSources.map((src, idx) => {
                    if (!src) return null
                    const colors = getTypeColor(src.type || "")
                    const domain = (() => {
                      try {
                        if (!src.source_url) return ""
                        return src.source_url.replace('https://', '').split('/')[0]
                      } catch { return "" }
                    })()

                    return (
                      <motion.div
                        key={src.id || idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-[12px] border p-4 bg-white hover:shadow-[0_4px_12px_rgba(10,143,148,0.08)] transition-all"
                        style={{ borderColor: colors.border, background: `linear-gradient(135deg, white 0%, ${colors.bg} 100%)` }}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-[8px] flex items-center justify-center text-white text-[10px] font-bold" style={{ background: colors.dot }}>
                              {idx + 1}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-white" style={{ borderColor: colors.border, color: colors.text }}>
                              {getTypeLabel(src.type)}
                            </span>
                            {src.grade && (
                              <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-bold">
                                {src.grade}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-2 py-1 rounded-full bg-white border border-[#C9DFE1] text-[#4B6A72]">
                              ثقة {((Number(src.confidence) || 0) * 100).toFixed(0)}%
                            </span>
                            {src.surah && src.ayah && (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-[#14529E] text-white font-bold">
                                {src.surah}:{src.ayah}
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className="text-[15px] leading-[1.8] p-3 rounded-[10px] bg-white border border-[#C9DFE1]/50 mb-2.5"
                          style={{ fontFamily: src.type === 'quran' || src.type === 'hadith' ? 'Amiri, serif' : 'IBM Plex Sans Arabic, sans-serif', color: '#0A2A33' }}
                        >
                          {src.text || ""}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-[#4B6A72] flex-1">
                            <div className="font-bold text-[#0A2A33]">{src.source || ""}</div>
                            {domain && <div className="text-[10px] text-[#8FB0B6] mt-0.5">{domain}</div>}
                          </div>
                          {src.source_url && (
                            <a
                              href={src.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 px-3 py-1.5 rounded-full bg-[#0A8F94] text-white text-[11px] font-bold hover:bg-[#05495A] transition-colors flex items-center gap-1"
                            >
                              تحقق
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path d="M3 9L9 3M9 3H4.5M9 3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </a>
                          )}
                        </div>

                        {(src.bm25_score !== undefined || src.vector_score !== undefined) && (
                          <div className="mt-2 pt-2 border-t border-[#C9DFE1]/30 flex gap-3 text-[9px] text-[#8FB0B6]">
                            {src.bm25_score !== undefined && <span>BM25: {Number(src.bm25_score).toFixed(2)}</span>}
                            {src.vector_score !== undefined && <span>Vector: {Number(src.vector_score).toFixed(2)}</span>}
                            <span>• استرجاع هجين</span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 p-4 border-t border-[#C9DFE1]/50 bg-[#EEF6F6]/50">
                <div className="flex items-center justify-between text-[10px] text-[#8FB0B6]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0A8F94]" />
                    8 مصادر معتمدة: quranpedia.net, dorar.net, shamela.ws, dawa.center, islamic-content.com
                  </span>
                  <span className="hidden sm:inline">صفر اختلاق • Guard فعال</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
