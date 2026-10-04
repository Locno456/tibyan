"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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

/* ---------------------------------------------------------
   كشف تدريجي للنص — يعطي إحساس الكتابة الحيّة
   --------------------------------------------------------- */
function useReveal(text: string, enabled = true) {
  const words = useMemo(() => text.split(/(\s+)/), [text])
  const total = words.length
  const [shown, setShown] = useState(enabled ? 0 : total)

  useEffect(() => {
    if (!enabled) {
      setShown(total)
      return
    }
    setShown(0)
    let i = 0
    // سرعات مختلفة: النصوص الطويلة تُكشف أسرع
    const per = total > 220 ? 7 : total > 90 ? 4 : 2
    const id = setInterval(() => {
      i += per
      setShown(i)
      if (i >= total) clearInterval(id)
    }, 26)
    return () => clearInterval(id)
  }, [text, total, enabled])

  return { out: words.slice(0, shown).join(""), done: shown >= total }
}

function prefersReduced() {
  if (typeof window === "undefined") return false
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

export default function ChatMessage({
  question,
  level,
  levelInfo,
  blueCards,
  purpleCards,
  confidence,
  metrics,
  status,
}: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false)
  const [copiedNote, setCopiedNote] = useState(false)
  const [reduce, setReduce] = useState(false)

  useEffect(() => setReduce(prefersReduced()), [])

  const safeBlueCards = Array.isArray(blueCards) ? blueCards.filter((c) => c) : []
  const safePurpleCards = Array.isArray(purpleCards) ? purpleCards.filter((c) => c) : []
  const safeConfidence = Number(confidence) || 0
  const safeQuestion = question || ""
  const mainExplanation = safePurpleCards[0]?.explanation || ""
  const safeMetrics = metrics || {}
  const safeLevel = level || "abstain"
  const safeLevelInfo = levelInfo || { name: "عام" }

  const { out, done } = useReveal(mainExplanation, !reduce)

  const quranCards = safeBlueCards.filter((c) => c.type === "quran")
  const hadithCards = safeBlueCards.filter((c) => c.type === "hadith")
  const otherCards = safeBlueCards.filter((c) => c.type !== "quran" && c.type !== "hadith")

  const statusMeta =
    status === "ok"
      ? { badge: "✓ موثق", tone: "#059669", bg: "#ECFDF5", line: "linear-gradient(90deg,#19D6C4 0%,#0A8F94 50%,#14529E 100%)" }
      : status === "abstain"
      ? { badge: "⊘ امتناع", tone: "#B45309", bg: "#FFFBEB", line: "linear-gradient(90deg,#E0B450,#B45309)" }
      : { badge: "⛔ حجب", tone: "#BE123C", bg: "#FFF1F2", line: "linear-gradient(90deg,#E0B450,#E11D48)" }

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(mainExplanation)
    } catch {
      /* تجاهل */
    }
    setCopiedNote(true)
    setTimeout(() => setCopiedNote(false), 1800)
  }

  return (
    <>
      <div className="w-full max-w-[800px] mx-auto">
        {/* فقاعة المستخدم */}
        <div className="flex justify-start mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="max-w-[85%] bg-[#0A2A33] text-white rounded-[18px] rounded-br-[6px] px-4 py-3 shadow-[0_6px_18px_rgba(10,42,51,0.18)]"
          >
            <div className="text-[15px] font-medium leading-relaxed">{safeQuestion}</div>
            <div className="text-[11.5px] opacity-60 mt-2 flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                مستوى {safeLevel} • {safeLevelInfo.name || ""}
              </span>
              {safeMetrics.responseTime !== undefined && <span className="tabular-nums">{safeMetrics.responseTime}ms</span>}
            </div>
          </motion.div>
        </div>

        {/* فقاعة تِبْيَان */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.06, type: "spring", stiffness: 240, damping: 26 }}
          className="bg-white rounded-[18px] rounded-bl-[6px] border border-[#C9DFE1]/60 shadow-[0_10px_30px_rgba(10,42,51,0.07)] overflow-hidden"
        >
          <div className="h-[3px] w-full" style={{ background: statusMeta.line }} />

          <div className="p-5">
            {/* ترويسة */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="relative w-8 h-8 shrink-0">
                <motion.span
                  className="absolute inset-0 rounded-[10px]"
                  style={{ background: "linear-gradient(135deg,#19D6C4,#0A8F94)" }}
                  animate={reduce ? {} : { opacity: [0.35, 0.7, 0.35], scale: [1, 1.12, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <div
                  className="absolute inset-0 rounded-[10px] flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#19D6C4,#0A8F94)" }}
                >
                  <img src="/tibyan-logo-white.svg" alt="" className="w-5 h-5 object-contain" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-extrabold text-[#0A2A33]">تِبْيَان</div>
                <div className="text-[11.5px] text-[#4B6A72] flex items-center gap-1.5">
                  {!done && !reduce ? (
                    <span className="inline-flex gap-[3px] items-end h-2.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="tb-dot w-[3px] h-[3px] rounded-full bg-[#0A8F94]"
                          style={{ animationDelay: `${i * 0.16}s` }}
                        />
                      ))}
                    </span>
                  ) : (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: statusMeta.tone }}
                    />
                  )}
                  {status === "ok"
                    ? "إجابة موثقة • صفر اختلاق"
                    : status === "abstain"
                    ? "امتناع — لا توجد مرجعية كافية"
                    : "محجوب — حارس صفر اختلاق"}
                </div>
              </div>
              <motion.span
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="hidden sm:inline-flex px-2 py-1 rounded-full text-[11.5px] font-bold border"
                style={{ background: statusMeta.bg, color: statusMeta.tone, borderColor: `${statusMeta.tone}33` }}
              >
                {statusMeta.badge}
              </motion.span>
            </div>

            {/* الشرح — يُكشف تدريجياً */}
            {mainExplanation && (
              <div className="relative mb-4">
                <div
                  className="body-font text-[15px] leading-[1.9] text-[#0A2A33]"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {out}
                  {!done && !reduce && <span className="tb-caret" aria-hidden />}
                </div>

                <AnimatePresence>
                  {done && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 mt-2.5"
                    >
                      <button
                        type="button"
                        onClick={copyNote}
                        className="px-2 py-1 rounded-full bg-[#EEF6F6] border border-[#C9DFE1] text-[11.5px] font-bold text-[#4B6A72] hover:text-[#0A8F94] hover:border-[#0A8F94]/40 transition-colors"
                      >
                        {copiedNote ? "✓ نُسخ الشرح" : "⧉ نسخ الشرح"}
                      </button>
                      <span className="text-[11px] text-[#8FB0B6]">
                        {safePurpleCards[0]?.llm ? String(safePurpleCards[0].llm).slice(0, 34) : "شرح منظَّم من المصادر"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* الآيات */}
            {quranCards.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-4"
              >
                <div className="text-[12.5px] font-bold text-[#14529E] mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-[6px] bg-[#14529E] text-white flex items-center justify-center text-[11.5px]">﴿</span>
                  آيات قرآنية موثقة
                  <span className="text-[10.5px] font-bold text-[#8FB0B6]">({quranCards.length})</span>
                </div>
                {quranCards.map((card, i) => (
                  <QuranBracket key={card.id || i} {...card} index={i} />
                ))}
              </motion.section>
            )}

            {/* الأحاديث */}
            {hadithCards.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="mb-4"
              >
                <div className="text-[12.5px] font-bold text-[#0A8F94] mb-2 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-[6px] bg-[#0A8F94] text-white flex items-center justify-center text-[11.5px]">ﷺ</span>
                  أحاديث شريفة موثقة
                  <span className="text-[10.5px] font-bold text-[#8FB0B6]">({hadithCards.length})</span>
                </div>
                {hadithCards.map((card, i) => (
                  <QuranBracket key={card.id || i} {...card} index={i} />
                ))}
              </motion.section>
            )}

            {/* مصادر إضافية */}
            {otherCards.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="mb-4 p-3 rounded-[12px] bg-[#EEF6F6]/60 border border-[#C9DFE1]/40"
              >
                <div className="text-[12.5px] font-bold text-[#0A2A33] mb-2">📚 مصادر إضافية موثقة</div>
                {otherCards.map((card, i) => (
                  <motion.div
                    key={card.id || i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 + i * 0.05 }}
                    className="body-font text-[14px] leading-[1.75] text-[#0A2A33] mb-2 p-2.5 rounded-[8px] bg-white border border-[#C9DFE1]/30"
                  >
                    {card.text || ""}
                    <div className="text-[11.5px] text-[#8FB0B6] mt-1">{card.source || ""}</div>
                  </motion.div>
                ))}
              </motion.section>
            )}

            {/* التذييل */}
            <div className="mt-5 pt-4 border-t border-[#C9DFE1]/40 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                <motion.button
                  type="button"
                  onClick={() => setShowSources(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0A2A33] text-white text-[13px] font-bold hover:bg-black hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)] transition-all group"
                >
                  <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-[12.5px] group-hover:bg-white/25">
                    📚
                  </span>
                  عرض المصادر ({safeBlueCards.length})
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className="opacity-60 group-hover:opacity-100 transition-all group-hover:-translate-x-0.5"
                    aria-hidden
                  >
                    <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>

                <div className="hidden md:flex items-center gap-1.5 text-[11.5px] text-[#8FB0B6]">
                  <span className="w-px h-4 bg-[#C9DFE1]" />
                  <span className="font-mono">{safeMetrics.retrievalSource || "hybrid"}</span>
                  <span>•</span>
                  <span className="tabular-nums">{safeBlueCards.length} مصادر</span>
                </div>
              </div>

              <CircularProgress value={safeConfidence * 100} size={48} />
            </div>

            {/* مفتاح الألوان */}
            <div className="mt-4 flex items-center justify-center gap-3 text-[10.5px] text-[#8FB0B6] flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#14529E]" />أزرق = نص حرفي 100%</span>
              <span className="w-px h-3 bg-[#C9DFE1]" />
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7B4FD6]" />بنفسجي = شرح AI</span>
              <span className="w-px h-3 bg-[#C9DFE1]" />
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] rotate-45 bg-[#E0B450]" />ذهبي = نور المعرفة</span>
            </div>
          </div>
        </motion.div>
      </div>

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
