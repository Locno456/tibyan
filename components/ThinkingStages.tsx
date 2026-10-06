"use client"
import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, Sparkles } from "lucide-react"
import type { AnswerStage } from "../lib/answerProgress"

const LABELS: Record<AnswerStage, string> = {
  classify: "تحديد نوع السؤال",
  retrieve: "فحص البيانات المحلية المختارة",
  web: "قراءة صفحات البحث المسموح بها",
  mcp: "اكتشاف أدوات MCP المتاحة",
  generate: "طلب صياغة الرد من النموذج",
  verify: "فحص النصوص والمصادر قبل العرض",
}
const MOTIFS = [
  "/tibyan-brand-kit/motif/shapes/tibyan-shape-05-hub.svg",
  "/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg",
  "/tibyan-brand-kit/motif/shapes/tibyan-shape-08-ta-dots.svg",
]

interface ThinkingStagesProps {
  question: string
  stages?: AnswerStage[]
}

/** Only server-reported milestones are named; elapsed time and motif are decorative. */
export default function ThinkingStages({ question, stages = [] }: ThinkingStagesProps) {
  const [elapsed, setElapsed] = useState(0)
  const [motifIndex, setMotifIndex] = useState(0)
  const reduceMotion = useReducedMotion()
  const active = stages[stages.length - 1]

  useEffect(() => {
    setElapsed(0)
    const tick = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(tick)
  }, [question])

  return (
    <div className="mx-auto w-full max-w-[800px]" dir="rtl" aria-label="حالة إعداد الرد">
      <div className="relative overflow-hidden rounded-[22px] border border-[#A9D6D6] bg-[#FAFEFD] p-4 shadow-[0_12px_34px_rgba(10,42,51,0.1)] sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full bg-[#19D6C4]/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <button type="button" onClick={() => setMotifIndex((index) => (index + 1) % MOTIFS.length)}
            aria-label="تغيير زخرفة تِبْيَان أثناء الانتظار"
            title="المس الزخرفة لتغيير شكلها؛ لا يغيّر ذلك البحث"
            className="group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] border border-[#A9D6D6] bg-gradient-to-br from-[#E8F8F5] to-white shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087A7F] sm:h-24 sm:w-24">
            {!reduceMotion && <motion.span aria-hidden="true" className="absolute inset-1 rounded-[17px] border border-[#19D6C4]/40"
              animate={{ scale: [0.94, 1.04, 0.94], opacity: [0.45, 0.9, 0.45] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />}
            <AnimatePresence mode="wait">
              <motion.img key={MOTIFS[motifIndex]} src={MOTIFS[motifIndex]} alt="" aria-hidden="true"
                initial={reduceMotion ? false : { opacity: 0, rotate: -18, scale: 0.72 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, rotate: 14, scale: 0.8 }}
                transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
                className="relative h-14 w-14 object-contain transition-transform group-hover:scale-110 sm:h-[70px] sm:w-[70px]" />
            </AnimatePresence>
            <span aria-hidden="true" className="absolute -left-1 top-1 h-2 w-2 rounded-sm rotate-45 bg-[#D5A43B] shadow-[0_0_12px_#D5A43B]" />
            <span aria-hidden="true" className="absolute left-2 -top-1 h-1.5 w-1.5 rounded-sm rotate-45 bg-[#E0B450]" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#0A2A33]">
                <Sparkles size={16} className="text-[#087A7F]" aria-hidden="true" />
                {active ? LABELS[active] : "انتظار بدء المعالجة على الخادم"}
              </span>
              <span aria-hidden="true" className="rounded-full bg-[#E5F5F2] px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-[#075F65]">{elapsed}ث</span>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-[#35545B]" title={question}>{question}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#4B6A72]">اضغط على الزخرفة لتغييرها ✦ الخطوات أدناه تصل من الخادم حين تبدأ فعلاً، ولا تعرض تفكير النموذج الداخلي.</p>
          </div>
        </div>
        {stages.length > 0 && (
          <ol className="relative mt-4 flex flex-wrap gap-2 border-t border-[#D5E8E7] pt-3" aria-label="خطوات التنفيذ الفعلية">
            {stages.slice(-5).map((stage, index, visible) => (
              <li key={`${stage}-${index}`} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${index === visible.length - 1 ? "bg-[#0A8F94] text-white" : "bg-[#EFF6F5] text-[#35545B]"}`}>
                {index === visible.length - 1 ? <Sparkles size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                {LABELS[stage]}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
