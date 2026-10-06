"use client"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"

interface ThinkingStagesProps {
  question: string
}

/** Neutral loading state. It deliberately does not claim which backend stages ran. */
export default function ThinkingStages({ question }: ThinkingStagesProps) {
  const [elapsed, setElapsed] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    setElapsed(0)
    const tick = window.setInterval(() => setElapsed((value) => value + 100), 100)
    return () => window.clearInterval(tick)
  }, [question])

  return (
    <div className="mx-auto w-full max-w-[800px]" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-[18px] border border-[#C9DFE1]/70 bg-white/92 p-4 shadow-[0_10px_32px_rgba(10,42,51,0.08)] backdrop-blur-xl">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#19D6C4] to-[#0A8F94]">
          {!reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-[#19D6C4]"
              animate={{ scale: [0.9, 1.7], opacity: [0.55, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <img src="/tibyan-logo-white.svg" alt="" className="relative h-5 w-5 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#0A2A33]">
            جارٍ إعداد الرد
            {!reduceMotion && <span aria-hidden="true" className="tb-dot h-1 w-1 rounded-full bg-[#0A8F94]" />}
          </div>
          <div className="truncate text-[12.5px] text-[#4B6A72]">{question}</div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#71858A]">
            ظهور مؤشر الانتظار لا يعني اتصالاً بمصدر أو مزود حي؛ ستُعرض المصادر عند توفرها في الرد.
          </p>
        </div>
        <span className="shrink-0 font-mono text-[12px] font-bold tabular-nums text-[#0A8F94]">
          {(elapsed / 1000).toFixed(1)}ث
        </span>
      </div>
    </div>
  )
}
