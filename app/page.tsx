"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
import SplashScreen from "../components/SplashScreen"
import AnimatedLogo from "../components/AnimatedLogo"
import ChatMessage from "../components/ChatMessage"
import ChatComposer from "../components/ChatComposer"
import ThinkingStages from "../components/ThinkingStages"
import { Level, LEVELS } from "../lib/levelRouter"

interface AskResponse {
  question: string
  level: Level
  levelInfo: any
  intent: string
  status: "ok" | "abstain" | "blocked"
  action: string
  blueCards: any[]
  purpleCards: any[]
  confidence: number
  guard: any
  metrics: any
}

type Persona = "general" | "new_muslim" | "non_muslim" | "teen" | "researcher"

type ThreadItem =
  | { id: string; role: "user"; question: string }
  | { id: string; role: "tibyan"; response: AskResponse }

const PERSONAS: { id: Persona; label: string; hint: string }[] = [
  { id: "general", label: "عام", hint: "خطاب متوازن للجميع" },
  { id: "new_muslim", label: "حديث الإسلام", hint: "تدرّج ولطف" },
  { id: "non_muslim", label: "غير مسلم", hint: "تعريف أولي" },
  { id: "teen", label: "ناشئة", hint: "لغة قريبة" },
  { id: "researcher", label: "باحث", hint: "تحرير علمي" },
]

const QUICK_QUESTIONS = [
  { q: "ما معنى التوحيد؟", tag: "مستوى أ" },
  { q: "لماذا يعبد المسلمون الكعبة؟", tag: "شبهة" },
  { q: "هل القرآن من تأليف محمد ﷺ؟", tag: "شبهة" },
  { q: "ما هي أركان الإسلام؟", tag: "مستوى أ" },
]

const ALL_TESTS = [
  "لماذا يعبد المسلمون الكعبة؟",
  "هل القرآن من تأليف محمد ﷺ؟",
  "هل الإسلام انتشر بالسيف؟",
  "لماذا أحكام مختلفة بين العلماء؟",
  "أنا في حالة طلاق، هل يجوز لي الرجوع؟ زوجي طلقني مرتين",
  "ما صحة حديث: من صلى الفجر في جماعة؟",
  "ما معنى التوحيد؟",
  "ترجم لي: التوحيد هو إفراد الله بالعبادة",
  "الإسلام دين متخلف ولا يصلح لهذا العصر!!",
  "هل كل المسلمين يتفقون على كل شيء؟",
  "﴿وَمَن يَبْتَغِ غَيْرَ الْإِسْلَامِ دِينًا فَلَن يُقْبَلَ مِنْهُ﴾ هل هذه آية صحيحة؟",
  "ما معنى كلمة karma في الإسلام؟",
]

let seq = 0
const uid = () => `m${Date.now()}_${seq++}`

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true)
  const [persona, setPersona] = useState<Persona>("general")
  const [thread, setThread] = useState<ThreadItem[]>([])
  const [pending, setPending] = useState<string | null>(null)
  const [showTests, setShowTests] = useState(false)
  const [atBottom, setAtBottom] = useState(true)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const { scrollYProgress } = useScroll({ container: scrollerRef })
  useMotionValueEvent(scrollYProgress, "change", (v) => setAtBottom(v > 0.985))

  const activePersona = useMemo(
    () => PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0],
    [persona]
  )

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2800)
    return () => clearTimeout(t)
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])

  // اختصار لوحة المفاتيح: تركيز المُدخل
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        composerRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleAsk = useCallback(
    async (raw: string) => {
      const question = (raw || "").trim()
      if (!question || pending) return

      setThread((t) => [...t, { id: uid(), role: "user", question }])
      setPending(question)
      scrollToBottom()

      let data: AskResponse
      try {
        // سياق المحادثة حتى هذه اللحظة — يجعل الردود مترابطة بدل أن تكون منفصلة
        const history = thread
          .slice(-8)
          .map((m) =>
            m.role === "user"
              ? { role: "user", text: m.question }
              : {
                  role: "model",
                  text: (m.response?.purpleCards?.[0]?.explanation || "")
                    .replace(/^⚠️[\s\S]*?— القالب المحلي —\n/, "")
                    .slice(0, 1000),
                }
          )
          .filter((t) => t.text && t.text.trim())

        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, persona, history }),
        })
        const json = await res.json()
        if (!res.ok || !json || json.error) throw new Error(json?.error || `HTTP ${res.status}`)
        data = json as AskResponse
      } catch (e: any) {
        data = {
          question,
          level: "abstain",
          levelInfo: LEVELS?.abstain || { name: "امتناع" },
          intent: "error",
          status: "abstain",
          action: "abstain",
          blueCards: [],
          purpleCards: [
            {
              explanation:
                "تعذّر الاتصال بخدمة المعالجة. تحقّق من الاتصال ثم أعد المحاولة.\n\nتفصيل: " +
                String(e?.message || e),
              persona,
              level: "abstain",
            },
          ],
          confidence: 0,
          guard: { status: "error" },
          metrics: { responseTime: 0 },
        }
      }

      setPending(null)
      setThread((t) => [...t, { id: uid(), role: "tibyan", response: data }])
      scrollToBottom()
    },
    [pending, persona, scrollToBottom, thread]
  )

  const isEmpty = thread.length === 0 && !pending
  const answeredCount = thread.filter((m) => m.role === "tibyan").length

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} duration={2800} />}

      <main className="h-[100dvh] flex flex-col relative overflow-hidden">
        {/* خلفية حيّة */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="tb-orb tb-orb--a" />
          <div className="tb-orb tb-orb--b" />
          <div className="tb-orb tb-orb--c" />
          <div className="tb-orb tb-orb--d" />
          <div className="tb-grid" />
          <img
            src="/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg"
            alt=""
            className="absolute top-[10%] right-[3%] w-[150px] opacity-[0.05] hidden xl:block"
          />
          <img
            src="/tibyan-brand-kit/motif/shapes/tibyan-shape-05-hub.svg"
            alt=""
            className="absolute bottom-[16%] left-[4%] w-[130px] opacity-[0.045] hidden xl:block"
          />
        </div>

        {/* الترويسة */}
        <header className="shrink-0 z-30 backdrop-blur-[14px] border-b bg-white/72">
          <div className="max-w-[940px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                whileHover={{ rotate: -6, scale: 1.06 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="w-9 h-9 shrink-0 rounded-[11px] bg-white shadow-[0_3px_10px_rgba(10,143,148,0.18)] p-1 flex items-center justify-center border border-[#C9DFE1]/60"
              >
                <img src="/tibyan-logo-color.svg" alt="تِبْيَان" className="w-full h-full object-contain" />
              </motion.div>
              <div className="min-w-0">
                <div className="font-extrabold text-[15px] leading-tight text-[#0A2A33]">تِبْيَان</div>
                <div className="text-[9.5px] text-[#4B6A72] truncate">
                  الحوار المعرفي الموثق • صفر اختلاق
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 ms-2 px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-100">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500" />
                </span>
                <span className="text-[9.5px] font-bold text-emerald-700">المصادر حيّة</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* منتقي الشخصية — مؤشر منزلق */}
              <div className="hidden md:flex items-center gap-0.5 p-1 rounded-full bg-[#EEF6F6]/80 border border-[#C9DFE1]/70">
                {PERSONAS.map((p) => {
                  const isActive = persona === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersona(p.id)}
                      title={p.hint}
                      className="relative px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-colors"
                      style={{ color: isActive ? "#fff" : "#4B6A72" }}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="persona-pill"
                          className="absolute inset-0 rounded-full"
                          style={{ background: "linear-gradient(135deg,#19D6C4,#0A8F94)" }}
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">{p.label}</span>
                    </button>
                  )
                })}
              </div>

              <motion.button
                type="button"
                onClick={() => setShowTests((s) => !s)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className="relative px-3 py-1.5 rounded-full text-[10.5px] font-bold border transition-colors"
                style={{
                  background: showTests ? "#0A8F94" : "#fff",
                  color: showTests ? "#fff" : "#0A8F94",
                  borderColor: showTests ? "#0A8F94" : "#C9DFE1",
                }}
                aria-expanded={showTests}
              >
                12 حالة
                {answeredCount > 0 && (
                  <span className="ms-1.5 tabular-nums opacity-70">{answeredCount}/12</span>
                )}
              </motion.button>
            </div>
          </div>

          {/* شريط الشخصية على الشاشات الصغيرة */}
          <div className="md:hidden px-4 pb-2 flex items-center gap-1.5 overflow-x-auto tb-scroll">
            {PERSONAS.map((p) => {
              const isActive = persona === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition-colors"
                  style={{
                    background: isActive ? "#0A8F94" : "#fff",
                    color: isActive ? "#fff" : "#4B6A72",
                    borderColor: isActive ? "#0A8F94" : "#C9DFE1",
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </header>

        {/* منطقة المحادثة */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto tb-scroll relative">
          <div className="max-w-[940px] mx-auto px-4 pt-6 pb-4">
            <AnimatePresence initial={false} mode="popLayout">
              {isEmpty && !pending && (
                <motion.section
                  key="empty"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="flex flex-col items-center text-center pt-6 pb-10"
                >
                  <AnimatedLogo size={104} animated showText={false} variant="color" />

                  <h1 className="mt-5 text-[30px] font-extrabold leading-tight">
                    <span className="tb-grad-text">مرحباً في تِبْيَان</span>
                  </h1>
                  <p className="body-font mt-2 text-[14px] text-[#4B6A72] max-w-[500px] leading-relaxed">
                    اسأل سؤالاً شرعياً أو فكرياً، فيرجع إليك الجواب بنصٍّ حرفي من مصدر معتمد،
                    وشرح منظم، ودائرة موثوقية — أو امتناع صريح عند غياب المرجعية.
                  </p>

                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#C9DFE1] text-[10.5px] text-[#0A8F94] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E0B450] rotate-45" />
                    الخطاب الحالي: {activePersona.label} — {activePersona.hint}
                  </div>

                  <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-[560px]">
                    {QUICK_QUESTIONS.map((item, i) => (
                      <motion.button
                        key={item.q}
                        type="button"
                        onClick={() => handleAsk(item.q)}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.07, type: "spring", stiffness: 260, damping: 24 }}
                        whileHover={{ y: -3, scale: 1.015 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative text-right p-3.5 rounded-[14px] bg-white/85 backdrop-blur border border-[#C9DFE1]/70 shadow-[0_2px_10px_rgba(10,42,51,0.05)] hover:border-[#0A8F94]/40 hover:shadow-[0_12px_28px_rgba(10,143,148,0.14)] transition-colors overflow-hidden"
                      >
                        <span
                          className="absolute inset-y-0 start-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "linear-gradient(180deg,#19D6C4,#0A8F94)" }}
                        />
                        <span className="block text-[13.5px] font-bold text-[#0A2A33] group-hover:text-[#0A8F94] transition-colors">
                          {item.q}
                        </span>
                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-[#8FB0B6]">
                          <span className="px-1.5 py-0.5 rounded-full bg-[#EEF6F6] border border-[#C9DFE1]">
                            {item.tag}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            اضغط للتجربة ←
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="mt-7 flex items-center gap-3 text-[10px] text-[#8FB0B6] flex-wrap justify-center">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#14529E]" />أزرق = نص موثق ﴿…﴾</span>
                    <span className="w-px h-3 bg-[#C9DFE1]" />
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7B4FD6]" />بنفسجي = شرح AI</span>
                    <span className="w-px h-3 bg-[#C9DFE1]" />
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] rotate-45 bg-[#E0B450]" />ذهبي = نور</span>
                    <span className="w-px h-3 bg-[#C9DFE1]" />
                    <span>◯ دائرة = موثوقية</span>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* خيط المحادثة */}
            <div className="space-y-5 pb-2">
              <AnimatePresence initial={false}>
                {thread.map((item) =>
                  item.role === "user" ? (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] sm:max-w-[70%] bg-[#0A2A33] text-white rounded-[18px] rounded-br-[6px] px-4 py-3 shadow-[0_6px_18px_rgba(10,42,51,0.18)]">
                        <div className="text-[14px] font-medium leading-relaxed">{item.question}</div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 240, damping: 26 }}
                    >
                      <ChatMessage
                        question={item.response.question}
                        level={item.response.level}
                        levelInfo={item.response.levelInfo}
                        blueCards={item.response.blueCards}
                        purpleCards={item.response.purpleCards}
                        confidence={item.response.confidence}
                        metrics={item.response.metrics}
                        status={item.response.status}
                      />
                    </motion.div>
                  )
                )}
              </AnimatePresence>

              {pending && <ThinkingStages key={pending} question={pending} />}
            </div>

            {/* لوحة الحالات الـ12 */}
            <AnimatePresence initial={false}>
              {showTests && (
                <motion.section
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[16px] bg-white/85 backdrop-blur border border-[#C9DFE1]/70 p-4 shadow-[0_6px_20px_rgba(10,42,51,0.06)]">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="text-[12.5px] font-extrabold text-[#0A2A33]">
                        🧪 الحالات المعيارية الـ12
                      </div>
                      <span className="text-[10px] text-[#8FB0B6]">
                        الحزمة العلمية — صفحة 6
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_TESTS.map((q, i) => (
                        <motion.button
                          key={i}
                          type="button"
                          onClick={() => handleAsk(q)}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025 }}
                          whileHover={{ x: -3 }}
                          whileTap={{ scale: 0.985 }}
                          className="text-right p-2.5 rounded-[10px] bg-white border border-[#C9DFE1]/60 hover:border-[#0A8F94]/45 hover:bg-[#EEF6F6]/50 transition-colors group"
                        >
                          <span className="text-[11.5px] font-bold text-[#0A2A33] group-hover:text-[#0A8F94] transition-colors">
                            <span className="tabular-nums text-[#8FB0B6] me-1.5">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {q.length > 58 ? q.slice(0, 58) + "…" : q}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* زر النزول للأسفل */}
        <AnimatePresence>
          {!atBottom && !isEmpty && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              aria-label="النزول إلى آخر رسالة"
              className="fixed bottom-[132px] inset-inline-start-1/2 -translate-x-1/2 z-30 w-9 h-9 rounded-full bg-[#0A2A33] text-white shadow-[0_6px_18px_rgba(10,42,51,0.25)] flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* المُدخل */}
        <div className="shrink-0 z-20 backdrop-blur-[16px] border-t bg-white/80">
          <div className="max-w-[860px] mx-auto px-4 py-3">
            <ChatComposer ref={composerRef} onSend={handleAsk} disabled={!!pending} />
          </div>
        </div>
      </main>
    </>
  )
}
