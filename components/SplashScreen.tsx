"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowUp } from "lucide-react"

interface SplashScreenProps {
  onFinish: (draft?: string) => void
  onAsk: (question: string) => void | Promise<void>
}

type SplashPhase = "intro" | "lifting" | "ready" | "sending"

const LIFT_START_MS = 2850
const LIFT_DURATION_MS = 700
const INTRO_FINISH_MS = 7800
const REDUCED_MOTION_FINISH_MS = 3000
const SVG_TIMING_OVERRIDES = `
  .cl { animation-duration: 1.25s !important; animation-delay: .22s !important; }
  .sw, .fl, .fi { animation-duration: 1.2s !important; animation-delay: 1.65s !important; }
  .cg { animation-duration: 1.25s !important; animation-delay: 3.65s !important; }
  .cm { animation-duration: 1.1s !important; animation-delay: 5.1s !important; }
  .dp { animation-duration: .8s !important; }
  .dp.d1 { animation-delay: 6.55s !important; }
  .dp.d2 { animation-delay: 6.75s !important; }
`

export default function SplashScreen({ onFinish, onAsk }: SplashScreenProps) {
  const [phase, setPhase] = useState<SplashPhase>("intro")
  const [question, setQuestion] = useState("")
  const [sentQuestion, setSentQuestion] = useState("")
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const reduceMotion = useReducedMotion()

  const logoObjectRef = useRef<HTMLObjectElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const questionDraftRef = useRef("")
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const didSendRef = useRef(false)
  const pendingFinishRef = useRef(false)
  const didFinishRef = useRef(false)
  const timerIdsRef = useRef<number[]>([])
  const onFinishRef = useRef(onFinish)

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  const clearTimelineTimers = useCallback(() => {
    timerIdsRef.current.forEach((timer) => window.clearTimeout(timer))
    timerIdsRef.current = []
  }, [])

  const finishSplash = useCallback((draft?: string) => {
    if (didFinishRef.current) return
    if (phaseRef.current === "sending" && !didSendRef.current) {
      pendingFinishRef.current = true
      return
    }
    didFinishRef.current = true
    clearTimelineTimers()
    const cleanDraft = draft?.trim()
    onFinishRef.current(cleanDraft || undefined)
  }, [clearTimelineTimers])

  const handleAnimatedLogoLoad = () => {
    try {
      const svgDocument = logoObjectRef.current?.contentDocument
      if (svgDocument && !svgDocument.querySelector("style[data-tibyan-splash-timing]")) {
        const timingStyle = svgDocument.createElementNS("http://www.w3.org/2000/svg", "style")
        timingStyle.setAttribute("data-tibyan-splash-timing", "true")
        timingStyle.textContent = SVG_TIMING_OVERRIDES
        svgDocument.documentElement.appendChild(timingStyle)
      }
    } catch {
      // إن تعذّر الوصول إلى وثيقة SVG، تستمر الحركة الأصلية للملف كما هي.
    }
    setLogoLoaded(true)
  }

  useEffect(() => {
    if (!logoLoaded || reduceMotion === null) return
    clearTimelineTimers()

    if (reduceMotion || logoFailed) {
      setPhase("ready")
      timerIdsRef.current = [
        window.setTimeout(() => finishSplash(questionDraftRef.current), REDUCED_MOTION_FINISH_MS),
      ]
    } else {
      timerIdsRef.current = [
        window.setTimeout(() => setPhase("lifting"), LIFT_START_MS),
        window.setTimeout(() => setPhase("ready"), LIFT_START_MS + LIFT_DURATION_MS),
        window.setTimeout(() => finishSplash(questionDraftRef.current), INTRO_FINISH_MS),
      ]
    }

    return clearTimelineTimers
  }, [logoLoaded, logoFailed, reduceMotion, clearTimelineTimers, finishSplash])

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

    setSentQuestion(clean)
    setQuestion("")
    questionDraftRef.current = ""
    setPhase("sending")
  }

  const finishSending = () => {
    if (didSendRef.current || !sentQuestion) return
    didSendRef.current = true
    void onAsk(sentQuestion)
    if (pendingFinishRef.current) finishSplash()
  }

  const updateQuestion = (value: string) => {
    const next = value.slice(0, 500)
    setQuestion(next)
    questionDraftRef.current = next
  }

  const showStaticLogo = reduceMotion === true || logoFailed

  return (
    <motion.section
      key="tibyan-splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(7px)", scale: 1.01 }}
      transition={{ duration: reduceMotion ? 0.18 : 0.72, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] overflow-hidden"
      aria-label="بداية تِبْيَان"
      style={{ backgroundColor: "#F8FCFB" }}
    >
      {/* العلامة وحدها تماماً في افتتاح الشاشة */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 h-[min(64vw,280px)] w-[min(64vw,280px)]"
        animate={{
          x: "-50%",
          y: "-50%",
          top: phase === "intro" ? "50%" : phase === "lifting" ? "20%" : phase === "sending" ? "17%" : "20%",
          scale: phase === "intro" ? 1 : phase === "sending" ? 0.84 : 0.9,
          opacity: phase === "sending" ? 0.62 : 1,
        }}
        transition={{
          x: { duration: 0 },
          y: { duration: 0 },
          top: { duration: reduceMotion ? 0 : LIFT_DURATION_MS / 1000, ease: [0.2, 0.75, 0.2, 1] },
          scale: { duration: reduceMotion ? 0 : 0.72, ease: [0.2, 0.75, 0.2, 1] },
          opacity: { duration: reduceMotion ? 0.12 : 0.5 },
        }}
      >
        {showStaticLogo ? (
          <img
            src="/tibyan-logo-color.svg"
            alt=""
            aria-hidden="true"
            onLoad={() => setLogoLoaded(true)}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <object
            ref={logoObjectRef}
            data="/tibyan-brand-kit/animation/tibyan-intro-color.svg"
            type="image/svg+xml"
            aria-hidden="true"
            tabIndex={-1}
            onLoad={handleAnimatedLogoLoad}
            onError={() => {
              setLogoFailed(true)
              setLogoLoaded(true)
            }}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        )}
      </motion.div>

      {/* زخرفة واحدة من دليل الهوية لا تدخل إلا بعد صعود الشعار */}
      {phase === "ready" && (
        <motion.img
          src="/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg"
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0, rotate: -4, scale: 0.94 }}
          animate={{ opacity: 0.075, rotate: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0.2 : 1.1, ease: "easeOut" }}
          className="pointer-events-none absolute bottom-[17%] left-[5%] z-0 w-[72px] sm:bottom-[16%] sm:left-[8%] sm:w-[100px]"
        />
      )}

      {/* يظهر حقل السؤال بعد أن يستقر الشعار في موضعه المرتفع */}
      <AnimatePresence mode="wait">
        {phase === "ready" && (
          <motion.form
            key="splash-question"
            onSubmit={submitQuestion}
            initial={{ opacity: 0, x: "-50%", y: 30, scale: 0.96, filter: "blur(7px)" }}
            animate={{ opacity: 1, x: "-50%", y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: "-50%", y: -12, scale: 0.97, filter: "blur(3px)" }}
            transition={{ duration: reduceMotion ? 0.2 : 0.88, delay: reduceMotion ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-[63%] z-20 w-[min(90vw,720px)]"
            dir="rtl"
          >
            <div className="relative flex items-end gap-2 rounded-[28px] border border-white/90 bg-white/88 p-2.5 shadow-[0_18px_60px_rgba(10,42,51,0.13),0_2px_12px_rgba(10,143,148,0.1)] backdrop-blur-2xl sm:rounded-[34px] sm:p-3">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[#C9DFE1]/60" />
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(event) => updateQuestion(event.target.value)}
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

      {/* خروج السؤال بانطلاقة وتوهج ومسار صاعد قبل دخوله المحادثة */}
      <AnimatePresence>
        {phase === "sending" && sentQuestion && (
          <>
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, x: "-50%", y: "0vh", scale: 0.62 }}
              animate={{
                opacity: reduceMotion ? [0, 0.18, 0] : [0, 0.5, 0],
                x: "-50%",
                y: reduceMotion ? "-50vh" : ["0vh", "-2vh", "-50vh"],
                scale: reduceMotion ? [0.8, 1.15, 1.35] : [0.62, 1.12, 1.55],
              }}
              transition={{ duration: reduceMotion ? 0.22 : 0.74, times: [0, 0.18, 1], ease: [0.18, 0.82, 0.25, 1] }}
              className="pointer-events-none absolute left-1/2 top-[63%] z-20 w-[min(90vw,720px)]"
              dir="rtl"
            >
              <div className="flex justify-start">
                <div className="h-12 w-[62%] rounded-full bg-gradient-to-l from-[#19D6C4]/45 via-[#14529E]/20 to-transparent blur-[24px] sm:h-16" />
              </div>
            </motion.div>
            <motion.div
              key="question-flight"
              initial={{ opacity: 1, x: "-50%", y: "0vh", scale: 1, rotate: 0, filter: "blur(0px)" }}
              animate={{
                opacity: [1, 1, 0],
                x: "-50%",
                y: reduceMotion ? "-50vh" : ["0vh", "-2vh", "-50vh"],
                scale: reduceMotion ? 0.94 : [1, 1.07, 0.9],
                rotate: reduceMotion ? 0 : [0, -1.2, 0],
                filter: reduceMotion ? "blur(0px)" : ["blur(0px)", "blur(0px)", "blur(1px)"],
              }}
              transition={{ duration: reduceMotion ? 0.24 : 0.74, times: [0, 0.18, 1], ease: [0.18, 0.82, 0.25, 1] }}
              onAnimationComplete={finishSending}
              className="pointer-events-none absolute left-1/2 top-[63%] z-30 w-[min(90vw,720px)]"
              dir="rtl"
            >
              <div className="flex justify-start">
                <div className="max-w-[86%] rounded-[18px] rounded-br-[6px] bg-[#0A2A33] px-4 py-3 text-[14px] font-medium leading-relaxed text-white shadow-[0_10px_28px_rgba(10,42,51,0.2)] sm:px-5 sm:text-[15px]">
                  {sentQuestion}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* آية الهوية مع الأقواس القرآنية والزخرفة */}
      <AnimatePresence>
        {phase === "ready" && (
          <motion.div
            key="splash-verse"
            initial={{ opacity: 0, x: "-50%", y: 22, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: "-50%", y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, filter: "blur(3px)" }}
            transition={{ duration: reduceMotion ? 0.2 : 0.95, delay: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 z-10 w-[min(94vw,1120px)] px-2 text-center sm:bottom-7 sm:px-4"
            dir="rtl"
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.5, rotate: -35 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.16, rotate: 12 }}
                transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.35 }}
                className="shrink-0 text-[13px] text-[#E0B450] sm:text-lg"
              >۞</motion.span>
              <p className="body-font max-w-full text-[11.5px] font-bold leading-[1.9] text-[#14529E] sm:text-[14px] lg:text-[16px]">
                <span className="px-1 text-[1.2em] text-[#E0B450]">﴿</span>
                وَنَزَّلۡنَا عَلَيۡكَ ٱلۡكِتَٰبَ تِبۡيَٰنٗا لِّكُلِّ شَيۡءٖ وَهُدٗى وَرَحۡمَةٗ وَبُشۡرَىٰ لِلۡمُسۡلِمِينَ
                <span className="px-1 text-[1.2em] text-[#E0B450]">﴾</span>
              </p>
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.5, rotate: 35 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.16, rotate: -12 }}
                transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.35 }}
                className="shrink-0 text-[13px] text-[#E0B450] sm:text-lg"
              >۞</motion.span>
            </div>
            <p className="mt-0.5 text-[9.5px] font-semibold tracking-wide text-[#6D8A90] sm:text-[10.5px]">
              سورة النحل · الآية ٨٩
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
