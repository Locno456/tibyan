"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowUp } from "lucide-react"
import { createMessageId } from "../lib/chatHistory"

interface SplashScreenProps {
  onFinish: () => void
  onAsk: (question: string, sendAnimationId: string) => void | Promise<void>
}

type SplashPhase = "intro" | "ready" | "sending"

export default function SplashScreen({ onFinish, onAsk }: SplashScreenProps) {
  const [phase, setPhase] = useState<SplashPhase>("intro")
  const [question, setQuestion] = useState("")
  const [sentQuestion, setSentQuestion] = useState("")
  const [sendAnimationId, setSendAnimationId] = useState("")
  const didSendRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) {
      setPhase("ready")
      return
    }
    const timer = window.setTimeout(() => setPhase("ready"), 5400)
    return () => window.clearTimeout(timer)
  }, [reduceMotion])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`
  }, [question, phase])

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clean = question.trim()
    if (!clean || phase !== "ready") return

    const messageId = createMessageId()
    setSentQuestion(clean)
    setSendAnimationId(messageId)
    setQuestion("")
    setPhase("sending")
  }

  const finishSending = () => {
    if (didSendRef.current || !sentQuestion || !sendAnimationId) return
    didSendRef.current = true
    void onAsk(sentQuestion, sendAnimationId)
    onFinish()
  }

  return (
    <motion.section
        key="tibyan-splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, filter: "blur(9px)" }}
        transition={{ duration: reduceMotion ? 0.14 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[9999] overflow-hidden"
        aria-label="بداية تِبْيَان"
        style={{
          background: "radial-gradient(ellipse at 50% 38%, rgba(25,214,196,0.13) 0%, rgba(238,246,246,0.08) 34%, transparent 64%), linear-gradient(180deg, #F3FAF9 0%, #FFFFFF 54%, #EEF6F6 100%)",
        }}
      >
        {/* عنصر زخرفي واحد من زخارف دليل الهوية */}
        <motion.img
          src="/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[14%] left-[4%] w-[74px] opacity-[0.09] sm:bottom-[16%] sm:left-[8%] sm:w-[100px]"
          initial={{ opacity: 0, rotate: -5, scale: 0.94 }}
          animate={{ opacity: phase === "sending" ? 0.04 : 0.1, rotate: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* هالة ناعمة خلف الشعار؛ تبقى شفافة بلا إطار أو صندوق */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[40%] h-[240px] w-[240px] rounded-full blur-[52px] sm:h-[320px] sm:w-[320px]"
          style={{ background: "radial-gradient(circle, rgba(25,214,196,0.16) 0%, rgba(20,82,158,0.06) 42%, transparent 72%)" }}
          animate={{ x: "-50%", opacity: phase === "sending" ? 0.18 : [0.55, 0.8, 0.55], scale: phase === "sending" ? 0.84 : [0.96, 1.04, 0.96] }}
          transition={{ duration: reduceMotion ? 0.2 : 4.2, repeat: phase === "intro" ? Infinity : 0, ease: "easeInOut" }}
        />

        {/* علامة تِبْيَان: يبدأ رسم الصح ثم يكتمل إلى الشعار الرسمي */}
        <motion.div
          className="absolute left-1/2 top-[40%] z-10 h-[172px] w-[172px] sm:h-[228px] sm:w-[228px]"
          animate={{
            x: "-50%",
            top: phase === "intro" ? "40%" : phase === "ready" ? "7%" : "2%",
            scale: phase === "intro" ? 1 : phase === "ready" ? 0.88 : 0.72,
            opacity: phase === "sending" ? 0.38 : 1,
          }}
          transition={{ duration: reduceMotion ? 0.18 : 0.92, ease: [0.22, 1, 0.36, 1] }}
        >
          {!reduceMotion && (
            <motion.img
              src="/tibyan-intro-color.svg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_18px_26px_rgba(10,143,148,0.13)]"
              animate={{ opacity: phase === "intro" ? 1 : 0 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
            />
          )}
          <motion.img
            src="/tibyan-logo-color.svg"
            alt="تِبْيَان"
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_18px_26px_rgba(10,143,148,0.13)]"
            animate={{ opacity: reduceMotion || phase !== "intro" ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: "easeOut" }}
          />
        </motion.div>

        {/* حقل السؤال يدخل بعد اكتمال حركة الشعار */}
        <AnimatePresence mode="wait">
          {phase === "ready" && (
            <motion.form
              key="splash-question"
              onSubmit={submitQuestion}
              initial={{ opacity: 0, x: "-50%", y: 34, scale: 0.96, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: "-50%", y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: "-50%", y: -10, scale: 0.97, filter: "blur(4px)" }}
              transition={{ duration: reduceMotion ? 0.18 : 0.8, delay: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-1/2 top-[63%] z-20 w-[min(90vw,720px)]"
              dir="rtl"
            >
              <div className="relative flex items-end gap-2 rounded-[28px] border border-white/90 bg-white/85 p-2.5 shadow-[0_18px_60px_rgba(10,42,51,0.13),0_2px_12px_rgba(10,143,148,0.1)] backdrop-blur-2xl sm:rounded-[34px] sm:p-3">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[#C9DFE1]/60" />
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  rows={1}
                  maxLength={500}
                  placeholder="اسأل تِبْيَان…"
                  aria-label="اكتب سؤالك لتِبْيَان"
                  autoComplete="off"
                  className="body-font relative z-[1] max-h-[144px] min-h-[54px] flex-1 resize-none bg-transparent px-4 py-3.5 text-[15px] leading-[1.8] text-[#0A2A33] outline-none placeholder:text-[#8FB0B6] focus-visible:outline-none sm:min-h-[60px] sm:px-5 sm:text-[16px]"
                />
                <motion.button
                  type="submit"
                  disabled={!question.trim()}
                  whileHover={{ scale: question.trim() ? 1.06 : 1 }}
                  whileTap={{ scale: 0.93 }}
                  aria-label="إرسال السؤال"
                  className="relative z-[1] flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#19D6C4] via-[#0A8F94] to-[#05495A] text-white shadow-[0_7px_18px_rgba(10,143,148,0.25)] transition-shadow disabled:cursor-not-allowed disabled:opacity-40 sm:h-[52px] sm:w-[52px]"
                >
                  <ArrowUp size={21} strokeWidth={2.2} />
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* حركة خروج السؤال من الحقل باتجاه موضعه في المحادثة */}
        <AnimatePresence>
          {phase === "sending" && sentQuestion && (
            <motion.div
              key="question-flight"
              initial={{ opacity: 1, x: "-50%", y: 0, scale: 1, filter: "blur(0px)" }}
              animate={{ opacity: [1, 1, 0.12], x: "-50%", y: "-50vh", scale: 0.94, filter: "blur(0px)" }}
              transition={{ duration: reduceMotion ? 0.22 : 0.52, ease: [0.18, 0.82, 0.25, 1] }}
              onAnimationComplete={finishSending}
              className="pointer-events-none absolute left-1/2 top-[63%] z-30 w-[min(90vw,720px)]"
              dir="rtl"
            >
              <div className="flex justify-start">
                <motion.div
                  layoutId={sendAnimationId ? `sent-question-${sendAnimationId}` : undefined}
                  className="max-w-[86%] rounded-[18px] rounded-br-[6px] bg-[#0A2A33] px-4 py-3 text-[14px] font-medium leading-relaxed text-white shadow-[0_10px_28px_rgba(10,42,51,0.2)] sm:px-5 sm:text-[15px]"
                >
                  {sentQuestion}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* عبارة الهوية مثبتة أسفل الشاشة في المنتصف */}
        <motion.p
          initial={{ opacity: 0, x: "-50%", y: 12 }}
          animate={{ opacity: phase === "sending" ? 0 : 1, x: "-50%", y: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.7, delay: reduceMotion ? 0 : 0.7, ease: "easeOut" }}
          className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-10 whitespace-nowrap px-4 text-center text-[13px] font-bold tracking-[0.02em] text-[#4B6A72] sm:bottom-8 sm:text-[15px]"
          dir="rtl"
        >
          <span className="bg-gradient-to-l from-[#14529E] via-[#0A8F94] to-[#14529E] bg-clip-text text-transparent">
            نص يعتمد لدليل يستند
          </span>
        </motion.p>
    </motion.section>
  )
}
