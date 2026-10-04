"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import SplashScreen from "../components/SplashScreen"
import AnimatedLogo from "../components/AnimatedLogo"
import ChatMessage from "../components/ChatMessage"
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

const QUICK_QUESTIONS = [
  "ما معنى التوحيد؟",
  "لماذا يعبد المسلمون الكعبة؟",
  "هل القرآن من تأليف محمد ﷺ؟",
  "ما هي أركان الإسلام؟",
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

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true)
  const [persona, setPersona] = useState<Persona>("general")
  const [response, setResponse] = useState<AskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showTests, setShowTests] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2800)
    return () => clearTimeout(timer)
  }, [])

  const handleAsk = async (q: string) => {
    const question = (q || "").trim()
    if (!question) return
    
    setLoading(true)
    setResponse(null)

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, persona })
      })
      const data = await res.json()
      if (data) {
        setResponse(data)
      }
    } catch (e) {
      console.error("Ask error:", e)
      setResponse({
        question,
        level: "abstain",
        levelInfo: LEVELS?.abstain || { name: "امتناع" },
        intent: "error",
        status: "abstain",
        action: "abstain",
        blueCards: [],
        purpleCards: [{ explanation: "حدث خطأ في الاتصال. حاول مرة أخرى.", persona, level: "abstain" }],
        confidence: 0,
        guard: { status: "error" },
        metrics: { responseTime: 0 }
      } as any)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} duration={2800} />}

      <main className="min-h-screen flex flex-col mesh-bg relative">
        {/* Motif accents - one per view rule - true brand */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img src="/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg" alt="" className="absolute top-[8%] right-[2%] w-[120px] opacity-[0.05] hidden xl:block" />
          <img src="/tibyan-brand-kit/motif/shapes/tibyan-shape-05-hub.svg" alt="" className="absolute bottom-[20%] left-[3%] w-[100px] opacity-[0.04] hidden xl:block" />
        </div>

        {/* Header - minimal */}
        <header className="shrink-0 z-30 backdrop-blur-[12px] border-b" style={{ background: "rgba(255,255,255,0.9)", borderColor: "rgba(10,143,148,0.1)" }}>
          <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-white shadow-[0_2px_8px_rgba(10,143,148,0.15)] p-1 flex items-center justify-center">
                <img src="/tibyan-logo-color.svg" alt="تِبْيَان" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="font-extrabold text-[14px]" style={{ fontFamily: 'Tajawal, sans-serif', color: '#0A2A33' }}>تِبْيَان</div>
                <div className="text-[9px] text-[#4B6A72] hidden sm:block">الحوار المعرفي الموثق • صفر اختلاق</div>
              </div>
              <div className="hidden md:flex items-center gap-1 ml-3 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-700">Gemini Flash Lite مجاني</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1">
                {(["general", "new_muslim", "non_muslim", "teen"] as Persona[]).map(p => {
                  const labels: Record<string, string> = { general: "عام", new_muslim: "جديد", non_muslim: "غير مسلم", teen: "ناشئة" }
                  const isActive = persona === p
                  return (
                    <button
                      key={p}
                      onClick={() => setPersona(p)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${isActive ? 'bg-[#0A8F94] text-white border-[#0A8F94]' : 'bg-white text-[#4B6A72] border-[#C9DFE1] hover:border-[#0A8F94]/30'}`}
                    >
                      {labels[p]}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setShowTests(!showTests)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EEF6F6] border border-[#C9DFE1] text-[#0A8F94] hover:bg-[#0A8F94] hover:text-white transition-colors"
              >
                {showTests ? "إخفاء" : "12 اختبار"}
              </button>
            </div>
          </div>
        </header>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col max-w-[900px] w-full mx-auto px-4 py-6">
          {/* Empty state - ChatGPT style */}
          {!response && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center py-12"
            >
              <div className="mb-6">
                <AnimatedLogo size={96} animated={true} showText={false} variant="color" />
              </div>
              
              <h1 className="text-[28px] font-extrabold mb-2" style={{ fontFamily: 'Tajawal, sans-serif', color: '#0A2A33' }}>
                مرحباً في تِبْيَان
              </h1>
              <p className="text-[14px] text-[#4B6A72] max-w-[480px] leading-relaxed mb-1" style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                محرك الحوار المعرفي الموثق • صفر اختلاق نصي • رسالة مثل ChatGPT
              </p>
              <p className="text-[11px] text-[#8FB0B6] max-w-[480px] mb-2">
                ✓ علامة صح = موثوقية • كتاب مفتوح = قرآن • نقطتان ذهبيتان = تاء تِبْيَان
              </p>
              <p className="text-[11px] text-[#0A8F94] font-bold mb-8 px-3 py-1 rounded-full bg-[#EEF6F6] border border-[#C9DFE1]">
                جديد: آيات داخل ﴿...﴾ مع سورة ورقم + زر مصادر + دائرة موثوقية
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-[520px] mb-8">
                {QUICK_QUESTIONS.map((q, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleAsk(q)}
                    className="p-3.5 rounded-[12px] bg-white border border-[#C9DFE1]/60 text-right hover:border-[#0A8F94]/30 hover:shadow-[0_4px_12px_rgba(10,143,148,0.08)] transition-all group text-[13px]"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="font-bold text-[#0A2A33] group-hover:text-[#0A8F94]">{q}</div>
                    <div className="text-[10px] text-[#8FB0B6] mt-1">اضغط للسؤال → آيات ﴿...﴾ + مصادر + موثوقية</div>
                  </motion.button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[10px] text-[#8FB0B6] flex-wrap justify-center">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#14529E]" />أزرق = نص موثق ﴿...﴾</span>
                <span className="w-px h-3 bg-[#C9DFE1]" />
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7B4FD6]" />بنفسجي = شرح AI</span>
                <span className="w-px h-3 bg-[#C9DFE1]" />
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] rotate-45 bg-[#E0B450]" />ذهبي = نور</span>
                <span className="w-px h-3 bg-[#C9DFE1]" />
                <span>◯ دائرة = موثوقية</span>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center py-16"
            >
              <div className="flex gap-1.5 mb-4">
                <motion.span className="w-2.5 h-2.5 rounded-full bg-[#0A8F94]" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity }} />
                <motion.span className="w-2.5 h-2.5 rounded-full bg-[#19D6C4]" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
                <motion.span className="w-2.5 h-2.5 rounded-[3px] rotate-45 bg-[#E0B450]" animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
              </div>
              <div className="text-[13px] font-bold text-[#0A2A33]">جاري البحث في المصادر الموثقة...</div>
              <div className="text-[11px] text-[#4B6A72] mt-1">Hybrid RAG + Gemini Flash Lite + Guard</div>
            </motion.div>
          )}

          {/* Response - new ChatMessage with Quran brackets + Circular Progress + Sources button */}
          {response && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 pb-6"
            >
              <ChatMessage
                question={response.question}
                level={response.level}
                levelInfo={response.levelInfo}
                blueCards={response.blueCards}
                purpleCards={response.purpleCards}
                confidence={response.confidence}
                metrics={response.metrics}
                status={response.status}
              />

              <div className="flex justify-center pt-6">
                <button
                  onClick={() => setResponse(null)}
                  className="px-4 py-2 rounded-full bg-white border border-[#C9DFE1] text-[12px] font-bold text-[#0A8F94] hover:bg-[#EEF6F6] transition-colors flex items-center gap-2"
                >
                  <span>✦</span> سؤال جديد
                </button>
              </div>
            </motion.div>
          )}

          {/* Test cases - collapsible */}
          <AnimatePresence>
            {showTests && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 border-t border-[#C9DFE1]/50 pt-6 overflow-hidden"
              >
                <div className="text-[12px] font-bold text-[#0A2A33] mb-3">🧪 12 حالة معيارية - مع آيات ﴿...﴾ + دائرة موثوقية + مصادر</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_TESTS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleAsk(q)}
                      className="text-right p-2.5 rounded-[10px] bg-white border border-[#C9DFE1]/50 hover:border-[#0A8F94]/30 text-[11px] transition-colors"
                    >
                      <span className="font-bold text-[#0A2A33]">{String(i+1).padStart(2, '0')}. {q.slice(0, 55)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat input - fixed bottom */}
        <div className="shrink-0 sticky bottom-0 z-20 backdrop-blur-[16px] border-t" style={{ background: "rgba(255,255,255,0.92)", borderColor: "rgba(10,143,148,0.1)" }}>
          <div className="max-w-[900px] mx-auto px-4 py-3">
            <div className="relative flex items-end gap-2 bg-white border border-[#C9DFE1] rounded-[16px] p-2 focus-within:border-[#0A8F94]/30 focus-within:shadow-[0_0_0_3px_rgba(10,143,148,0.08)] transition-all">
              <textarea
                id="main-chat-input"
                placeholder="اسأل تِبْيَان... مثال: ما معنى التوحيد؟"
                className="flex-1 min-h-[44px] max-h-[120px] p-3 bg-transparent border-none outline-none resize-none text-[14px] leading-relaxed placeholder:text-[#8FB0B6]"
                style={{ fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    const target = e.target as HTMLTextAreaElement
                    const val = target.value?.trim()
                    if (val) {
                      handleAsk(val)
                      target.value = ""
                    }
                  }
                }}
                rows={1}
              />
              <button
                onClick={() => {
                  const el = document.getElementById('main-chat-input') as HTMLTextAreaElement
                  const val = el?.value?.trim()
                  if (val) {
                    handleAsk(val)
                    if (el) el.value = ""
                  }
                }}
                disabled={loading}
                className="shrink-0 w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#19D6C4] to-[#0A8F94] text-white flex items-center justify-center hover:shadow-[0_4px_12px_rgba(10,143,148,0.25)] disabled:opacity-40 transition-all"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9L15 3L9 9L15 15L3 9Z" fill="white" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-[9px] text-[#8FB0B6] flex-wrap">
              <span>✓ صفر اختلاق</span>
              <span className="w-px h-3 bg-[#C9DFE1]" />
              <span>آيات ﴿...﴾ [سورة:آية] + مصادر + ◯ موثوقية</span>
              <span className="w-px h-3 bg-[#C9DFE1]" />
              <span>Gemini Flash Lite مجاني</span>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
