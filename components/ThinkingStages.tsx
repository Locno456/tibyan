"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

/**
 * تصوّر حيّ لخط المعالجة الفعلي في app/api/ask/route.ts:
 *   detectIntent → hybrid_retrieve → generateWithGemini → fullGuard
 * المراحل تتقدّم زمنياً لتعطي إحساساً بالحركة وتشرح التقنية للجنة.
 */

const STAGES = [
  { key: "route", label: "توجيه المستوى", hint: "lib/levelRouter — أ / ب / ج / د", color: "#14529E" },
  { key: "rag", label: "استرجاع هجين", hint: "BM25 حرفي + دلالي + إعادة ترتيب", color: "#0A8F94" },
  { key: "llm", label: "توليد شرح مؤسَّس", hint: "Gemini Flash Lite أو مرآة محلية", color: "#7B4FD6" },
  { key: "guard", label: "حارس صفر اختلاق", hint: "مطابقة حرفية مع المصادر المعتمدة", color: "#E0B450" },
]

interface ThinkingStagesProps {
  question: string
}

export default function ThinkingStages({ question }: ThinkingStagesProps) {
  const [active, setActive] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    setActive(0)
    setElapsed(0)
    const step = setInterval(() => setActive((a) => (a < STAGES.length - 1 ? a + 1 : a)), 420)
    const tick = setInterval(() => setElapsed((e) => e + 100), 100)
    return () => {
      clearInterval(step)
      clearInterval(tick)
    }
  }, [question])

  return (
    <div className="w-full max-w-[800px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="tb-live-edge rounded-[18px] bg-white/92 backdrop-blur-xl border border-[#C9DFE1]/70 shadow-[0_10px_32px_rgba(10,42,51,0.08)] p-5"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="relative w-9 h-9 shrink-0">
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-[#19D6C4]"
              animate={{ scale: [0.85, 1.9], opacity: [0.8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#19D6C4,#0A8F94)" }}
            >
              <img src="/tibyan-logo-white.svg" alt="" className="w-5 h-5 object-contain" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-extrabold text-[#0A2A33] flex items-center gap-2">
              تِبْيَان يعالج سؤالك
              <span className="inline-flex gap-[3px] items-end h-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="tb-dot w-[4px] h-[4px] rounded-full bg-[#0A8F94]"
                    style={{ animationDelay: `${i * 0.16}s` }}
                  />
                ))}
              </span>
            </div>
            <div className="text-[11px] text-[#4B6A72] truncate">{question}</div>
          </div>
          <div className="shrink-0 text-[11px] font-bold tabular-nums text-[#0A8F94]">
            {(elapsed / 1000).toFixed(1)}ث
          </div>
        </div>

        <ol className="relative space-y-3.5">
          {/* الخط الرأسي المتقدّم */}
          <div className="absolute inset-y-1 start-[13px] w-[2px] bg-[#C9DFE1]/70 rounded-full" />
          <motion.div
            className="absolute start-[13px] w-[2px] rounded-full"
            style={{ background: "linear-gradient(180deg,#19D6C4,#0A8F94)" }}
            initial={{ top: 4, height: 0 }}
            animate={{ height: `${(active / (STAGES.length - 1)) * 100}%` }}
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          />

          {STAGES.map((s, i) => {
            const done = i < active
            const isNow = i === active
            return (
              <li key={s.key} className="relative flex items-start gap-3 ps-0">
                <span className="relative z-10 shrink-0 w-[28px] h-[28px] rounded-full border-2 bg-white flex items-center justify-center transition-colors duration-300"
                  style={{ borderColor: done || isNow ? s.color : "#C9DFE1" }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {done ? (
                      <motion.svg
                        key="ok"
                        width="13" height="13" viewBox="0 0 14 14" fill="none"
                        initial={{ scale: 0, rotate: -40 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 18 }}
                      >
                        <path d="M2.5 7.4L5.6 10.5L11.5 3.8" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    ) : isNow ? (
                      <motion.span
                        key="spin"
                        className="w-[13px] h-[13px] rounded-full border-2"
                        style={{ borderColor: `${s.color}33`, borderTopColor: s.color }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <motion.span key="dot" className="w-[6px] h-[6px] rounded-full bg-[#C9DFE1]" />
                    )}
                  </AnimatePresence>
                </span>

                <div className="flex-1 pt-1 min-w-0">
                  <div
                    className="text-[12.5px] font-bold transition-colors duration-300"
                    style={{ color: done || isNow ? "#0A2A33" : "#8FB0B6" }}
                  >
                    {s.label}
                  </div>
                  <div className="text-[10.5px] text-[#8FB0B6] font-mono truncate">{s.hint}</div>
                </div>

                {isNow && (
                  <motion.span
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="shrink-0 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: `${s.color}14`, color: s.color }}
                  >
                    جارٍ
                  </motion.span>
                )}
              </li>
            )
          })}
        </ol>

        <div className="mt-4 pt-3 border-t border-[#C9DFE1]/50 flex items-center justify-between text-[10px] text-[#8FB0B6]">
          <span>يُمتنع تلقائياً عند غياب المرجعية الكافية</span>
          <span className="font-mono">min confidence 0.82</span>
        </div>
      </motion.div>
    </div>
  )
}
