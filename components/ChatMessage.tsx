"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  BookOpen,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Copy,
  ExternalLink,
  Quote,
  Sparkles,
  Music2,
} from "lucide-react"
import VerifiedTextCard from "./VerifiedTextCard"
import CircularProgress from "./CircularProgress"
import SourcesModal from "./SourcesModal"
import QuranAudioPlayer from "./QuranAudioPlayer"
import QuranAudioRequestCard from "./QuranAudioRequestCard"
import { Level } from "../lib/levelRouter"

interface ChatMessageProps {
  question: string
  level: Level
  levelInfo: any
  blueCards: any[]
  purpleCards: any[]
  audioCard?: any
  audioRequest?: any
  confidence: number
  metrics: any
  status: "ok" | "abstain" | "blocked"
  interactionType?: "conversation" | "quran_audio" | "quran_text" | "verification" | "answer" | "referral"
  verificationStatus?: "confirmed" | "near_match" | "not_found" | "needs_quote"
}

/* كشف تدريجي للشرح مع احترام إعداد تقليل الحركة في الجهاز. */
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
    let index = 0
    const step = total > 220 ? 7 : total > 90 ? 4 : 2
    const timer = window.setInterval(() => {
      index += step
      setShown(index)
      if (index >= total) window.clearInterval(timer)
    }, 26)

    return () => window.clearInterval(timer)
  }, [text, total, enabled])

  return { out: words.slice(0, shown).join(""), done: shown >= total }
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

function EvidenceHeading({
  title,
  count,
  tone,
  icon: Icon,
}: {
  title: string
  count: number
  tone: "blue" | "green" | "neutral"
  icon: typeof BookOpen
}) {
  const colors = tone === "blue"
    ? { ink: "#14529E", tint: "#EEF5FF", line: "#D8E4F4" }
    : tone === "green"
      ? { ink: "#18794E", tint: "#F1F9F3", line: "#D6E8DA" }
      : { ink: "#0A2A33", tint: "#EEF6F6", line: "#C9DFE1" }

  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ color: colors.ink, backgroundColor: colors.tint }}
        >
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <h4 className="truncate text-[13px] font-extrabold" style={{ color: colors.ink }}>
          {title}
        </h4>
      </div>
      {count > 1 && (
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold tabular-nums"
          style={{ color: colors.ink, borderColor: colors.line, backgroundColor: colors.tint }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

function copyText(value: string) {
  return navigator.clipboard.writeText(value)
}

export default function ChatMessage({
  question,
  level,
  levelInfo,
  blueCards,
  purpleCards,
  audioCard,
  audioRequest,
  confidence,
  status,
  interactionType,
  verificationStatus,
}: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false)
  const [copiedNote, setCopiedNote] = useState(false)
  const [reduce, setReduce] = useState(false)

  useEffect(() => setReduce(prefersReducedMotion()), [])

  const safeBlueCards = Array.isArray(blueCards) ? blueCards.filter(Boolean) : []
  const safePurpleCards = Array.isArray(purpleCards) ? purpleCards.filter(Boolean) : []
  const safeConfidence = Math.max(0, Math.min(1, Number(confidence) || 0))
  const safeQuestion = question || ""
  const mainExplanation = typeof safePurpleCards[0]?.explanation === "string"
    ? safePurpleCards[0].explanation
    : ""
  const safeLevel = level || "abstain"
  const safeLevelName = levelInfo?.name || "عام"
  const isAudioInteraction = !!audioCard || !!audioRequest || interactionType === "quran_audio"
  const isConversational = interactionType === "conversation"
  const showEvidenceFooter = !isAudioInteraction && !isConversational && (safeBlueCards.length > 0 || safeConfidence > 0)
  const { out, done } = useReveal(mainExplanation, !reduce)

  const quranCards = safeBlueCards.filter((card) => card.type === "quran")
  const hadithCards = safeBlueCards.filter((card) => card.type === "hadith")
  const otherCards = safeBlueCards.filter((card) => card.type !== "quran" && card.type !== "hadith")

  const statusMeta = verificationStatus === "confirmed"
    ? {
        label: "تطابق حرفي",
        detail: "وُجد النص في مصدر محلي مفهرس",
        tone: "#087A5B",
        background: "#ECF8F2",
        border: "#CFE9DD",
        Icon: CircleCheck,
      }
    : verificationStatus === "near_match"
      ? {
          label: "صياغة قريبة",
          detail: "ليست مطابقة حرفية؛ النسبة غير مؤكدة",
          tone: "#9A6700",
          background: "#FFF8E6",
          border: "#F0E0B9",
          Icon: CircleAlert,
        }
      : verificationStatus === "not_found"
        ? {
            label: "لم يُعثر على تطابق",
            detail: "عدم العثور لا يثبت بطلان النسبة",
            tone: "#9A6700",
            background: "#FFF8E6",
            border: "#F0E0B9",
            Icon: CircleAlert,
          }
        : verificationStatus === "needs_quote"
          ? {
              label: "أرسل نص الاقتباس",
              detail: "يلزم نص محدد للتحقق",
              tone: "#9A6700",
              background: "#FFF8E6",
              border: "#F0E0B9",
              Icon: CircleAlert,
            }
    : isConversational
    ? {
        label: "محادثة",
        detail: "تبادل حواري بلا استشهادات",
        tone: "#0A8F94",
        background: "#EAF7F5",
        border: "#C9DFE1",
        Icon: Sparkles,
      }
    : isAudioInteraction
    ? {
        label: "تلاوة قرآنية",
        detail: "تشغيل المقطع أو تنزيل آياته",
        tone: "#0A8F94",
        background: "#EAF7F5",
        border: "#C9DFE1",
        Icon: Music2,
      }
    : status === "ok"
    ? {
        label: "إجابة موثّقة",
        detail: "شرح مدعوم بمصادر معتمدة",
        tone: "#087A5B",
        background: "#ECF8F2",
        border: "#CFE9DD",
        Icon: CircleCheck,
      }
    : status === "abstain"
      ? {
          label: "امتناع",
          detail: "لا تتوفر مرجعية كافية للإجابة",
          tone: "#9A6700",
          background: "#FFF8E6",
          border: "#F0E0B9",
          Icon: CircleAlert,
        }
      : {
          label: "تعذّر التحقق",
          detail: "حُجبت الإجابة لعدم كفاية التحقق",
          tone: "#B4233F",
          background: "#FFF1F2",
          border: "#F4CDD4",
        Icon: CircleX,
      }

  const StatusIcon = statusMeta.Icon

  const copyExplanation = async () => {
    try {
      await copyText(mainExplanation)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = mainExplanation
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand("copy")
      } catch {
        // تجاهل فشل النسخ في المتصفحات التي تمنعه.
      }
      document.body.removeChild(textarea)
    }
    setCopiedNote(true)
    window.setTimeout(() => setCopiedNote(false), 1800)
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[800px]">
        <motion.article
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          className="overflow-hidden rounded-2xl border border-[#DCE7E8] bg-white shadow-[0_8px_28px_rgba(10,42,51,0.055)]"
        >
          <div
            className="h-[3px] w-full"
            style={{
              background: status === "ok"
                ? "linear-gradient(90deg,#19D6C4 0%,#0A8F94 48%,#14529E 100%)"
                : status === "abstain"
                  ? "linear-gradient(90deg,#FFF0B8 0%,#E0B450 100%)"
                  : "linear-gradient(90deg,#F4CDD4 0%,#B4233F 100%)",
            }}
          />

          <div className="p-4 sm:p-5">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#19D6C4] to-[#0A8F94] p-2 shadow-sm">
                  <img src="/tibyan-logo-white.svg" alt="" aria-hidden="true" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-extrabold leading-tight text-[#0A2A33]">تِبْيَان</h3>
                  <p className="mt-1 truncate text-[11.5px] text-[#647C83]">{statusMeta.detail}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11.5px] font-bold"
                  style={{ color: statusMeta.tone, backgroundColor: statusMeta.background, borderColor: statusMeta.border }}
                >
                  <StatusIcon size={14} strokeWidth={2.2} aria-hidden="true" />
                  {statusMeta.label}
                </span>
                {!isConversational && (
                  <span
                    title={safeLevelName}
                    className="inline-flex items-center gap-1 rounded-full border border-[#DCE7E8] bg-[#F8FAFA] px-2.5 py-1.5 text-[11px] font-semibold text-[#536B73]"
                  >
                    مستوى {safeLevel} · {safeLevelName}
                  </span>
                )}
              </div>
            </header>

            {mainExplanation && (
              <motion.section
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04, duration: 0.28 }}
                className="mt-5 overflow-hidden rounded-2xl border border-[#E5DAFA] bg-[#FCFAFF]"
                aria-label="شرح الإجابة"
              >
                <div className="flex items-center gap-2 border-b border-[#EAE2F8] px-3.5 py-2.5 sm:px-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F1EAFC] text-[#7B4FD6]">
                    <Sparkles size={15} aria-hidden="true" />
                  </span>
                  <h4 className="text-[12.5px] font-extrabold text-[#6840B5]">الشرح</h4>
                </div>

                <div className="px-3.5 py-3 sm:px-4 sm:py-3.5">
                  <p
                    dir="auto"
                    aria-live="polite"
                    className="body-font whitespace-pre-wrap text-[14.5px] leading-[1.9] text-[#302847] sm:text-[15px]"
                  >
                    {out}
                    {!done && !reduce && <span className="tb-caret" aria-hidden="true" />}
                  </p>

                  {done && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={copyExplanation}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E5DAFA] bg-white px-2.5 text-[11.5px] font-semibold text-[#6840B5] transition-colors hover:border-[#7B4FD6]/50 hover:bg-[#F8F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B4FD6]/30"
                      >
                        {copiedNote ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                        {copiedNote ? "نُسخ الشرح" : "نسخ الشرح"}
                      </button>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {audioCard && <QuranAudioPlayer card={audioCard} />}
            {audioRequest && !audioCard && <QuranAudioRequestCard initialRequest={audioRequest} />}

            {quranCards.length > 0 && (
              <motion.section
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.3 }}
                className="mt-5"
                aria-label="آيات من القرآن الكريم"
              >
                <EvidenceHeading title="القرآن الكريم" count={quranCards.length} tone="blue" icon={BookOpen} />
                <div className="space-y-2.5">
                  {quranCards.map((card, index) => (
                    <VerifiedTextCard
                      key={card.id || index}
                      kind="quran"
                      text={card.text || ""}
                      source={card.source || ""}
                      sourceUrl={card.source_url || card.sourceUrl}
                      surah={card.surah}
                      ayah={card.ayah}
                      index={index}
                      ornament={index === 0}
                    />
                  ))}
                </div>
              </motion.section>
            )}

            {hadithCards.length > 0 && (
              <motion.section
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.3 }}
                className="mt-5"
                aria-label="أحاديث نبوية"
              >
                <EvidenceHeading title="أحاديث نبوية" count={hadithCards.length} tone="green" icon={Quote} />
                <div className="space-y-2.5">
                  {hadithCards.map((card, index) => (
                    <VerifiedTextCard
                      key={card.id || index}
                      kind="hadith"
                      text={card.text || ""}
                      source={card.source || ""}
                      sourceUrl={card.source_url || card.sourceUrl}
                      grade={card.grade}
                      index={index}
                    />
                  ))}
                </div>
              </motion.section>
            )}

            {otherCards.length > 0 && (
              <motion.section
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.3 }}
                className="mt-5"
                aria-label="مراجع إضافية"
              >
                <EvidenceHeading title="مراجع أخرى" count={otherCards.length} tone="neutral" icon={BookOpen} />
                <div className="space-y-2">
                  {otherCards.map((card, index) => (
                    <article
                      key={card.id || index}
                      className="rounded-xl border border-[#E1E9E9] bg-[#FAFCFC] px-3.5 py-3"
                    >
                      <p dir="auto" className="body-font whitespace-pre-wrap text-[13.5px] leading-[1.8] text-[#263D43]">
                        {card.text || ""}
                      </p>
                      {(card.source || card.source_url || card.sourceUrl) && (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E6EEEE] pt-2">
                          {card.source && <span className="text-[11px] text-[#647C83]">{card.source}</span>}
                          {(card.source_url || card.sourceUrl) && (
                            <a
                              href={card.source_url || card.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0A8F94] hover:underline hover:underline-offset-4"
                            >
                              تحقق من المصدر <ExternalLink size={12} aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </motion.section>
            )}

            {showEvidenceFooter && (
              <footer className="mt-5 flex items-center justify-between gap-3 border-t border-[#E6EEEE] pt-4">
                {safeBlueCards.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowSources(true)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0A2A33] px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#05495A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A8F94]/40 focus-visible:ring-offset-2"
                  >
                    <BookOpen size={15} aria-hidden="true" />
                    تفاصيل المصادر
                    <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10.5px] tabular-nums">
                      {safeBlueCards.length}
                    </span>
                  </button>
                ) : <span />}
                {safeConfidence > 0 && (
                  <div className="shrink-0">
                    <CircularProgress value={safeConfidence * 100} size={50} />
                  </div>
                )}
              </footer>
            )}
          </div>
        </motion.article>
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
