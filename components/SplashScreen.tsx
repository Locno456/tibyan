"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SplashScreenProps {
  onFinish: () => void
  duration?: number // ms - brand kit animation is ~5.5s, but we use 2.8s for MVP
}

export default function SplashScreen({ onFinish, duration = 2800 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [useReducedMotion, setUseReducedMotion] = useState(false)

  useEffect(() => {
    // Check prefers-reduced-motion - brand kit requirement
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setUseReducedMotion(mediaQuery.matches)
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + Math.random() * 18 + 4
      })
    }, 120)

    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => {
        onFinish()
      }, 600)
    }, duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [onFinish, duration])

  return (
    <AnimatePresence>
      {!isExiting ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: `
              radial-gradient(700px 500px at 10% 10%, rgba(25,214,196,0.12) 0%, transparent 60%),
              radial-gradient(600px 500px at 90% 90%, rgba(10,143,148,0.14) 0%, transparent 60%),
              radial-gradient(500px 400px at 80% 20%, rgba(123,79,214,0.10) 0%, transparent 60%),
              linear-gradient(180deg, #EEF6F6 0%, #FFFFFF 50%, #EEF6F6 100%)
            `
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(12px)" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Mesh orbs background - true brand colors */}
          <motion.div
            className="absolute w-[420px] h-[420px] rounded-full blur-[60px] opacity-30 pointer-events-none"
            style={{ background: "linear-gradient(135deg, #19D6C4, #0A8F94)", top: "10%", left: "15%" }}
            animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[360px] h-[360px] rounded-full blur-[60px] opacity-25 pointer-events-none"
            style={{ background: "linear-gradient(135deg, #14529E, #0A8F94)", bottom: "15%", right: "10%" }}
            animate={{ scale: [1, 1.15, 1], x: [0, -25, 0], y: [0, 15, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />

          {/* Motif accent - true brand kit motif chain-3 */}
          <motion.img
            src="/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg"
            alt=""
            className="absolute top-[12%] right-[8%] w-[120px] h-auto opacity-[0.12] pointer-events-none hidden lg:block"
            initial={{ opacity: 0, rotate: -10 }}
            animate={{ opacity: 0.12, rotate: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          />
          <motion.img
            src="/tibyan-brand-kit/motif/shapes/tibyan-shape-05-hub.svg"
            alt=""
            className="absolute bottom-[15%] left-[10%] w-[100px] h-auto opacity-[0.10] pointer-events-none hidden lg:block"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.10, scale: 1 }}
            transition={{ delay: 1, duration: 1 }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* True brand animated intro */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 15, delay: 0.1 }}
              className="relative"
            >
              {useReducedMotion ? (
                // Fallback for prefers-reduced-motion - brand kit requirement
                <img 
                  src="/tibyan-logo-color.svg" 
                  alt="تِبْيَان" 
                  className="w-[160px] h-[160px] object-contain bg-white rounded-[22%] p-4 shadow-[0_12px_36px_rgba(10,143,148,0.18)]"
                />
              ) : (
                // True brand animated intro - CSS animation inside SVG, no JS
                <div className="w-[180px] h-[180px] bg-white rounded-[22%] p-3 shadow-[0_12px_36px_rgba(10,143,148,0.18)] flex items-center justify-center">
                  <img 
                    src="/tibyan-intro-color.svg" 
                    alt="تِبْيَان - intro animation" 
                    className="w-full h-full object-contain"
                    // Replay by re-creating element or ?v=n - brand kit technique
                    key={Date.now()}
                  />
                </div>
              )}

              {/* Gold dots glow */}
              <motion.div
                className="absolute -top-2 -right-2 w-6 h-6 rounded-[6px] rotate-45"
                style={{ background: "linear-gradient(180deg, #FFF0B8 0%, #E0B450 100%)", boxShadow: "0 0 20px rgba(224,180,80,0.5)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            </motion.div>

            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <h1 className="text-[36px] font-extrabold tracking-tight" style={{ fontFamily: 'Tajawal, sans-serif', color: '#0A2A33' }}>
                تِبْيَان
              </h1>
              <motion.p
                className="text-[14px] tracking-[0.22em] font-bold mt-1"
                style={{ color: '#4B6A72' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                TIBYAN
              </motion.p>

              <motion.div
                className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-[13px] font-bold"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(10,143,148,0.12)" }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <span className="w-2 h-2 rounded-full bg-[#0A8F94] animate-pulse" />
                <span style={{ color: '#0A8F94' }}>الحوار المعرفي الموثق</span>
                <span className="w-px h-3 bg-[#C9DFE1] mx-1" />
                <span style={{ color: '#14529E' }}>✓ موثق • كتاب مفتوح</span>
              </motion.div>

              <motion.p
                className="mt-4 text-[14px] leading-relaxed max-w-[360px] mx-auto"
                style={{ color: '#4B6A72', fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
              >
                محرك الحوار المعرفي والاستدلال الشرعي الموثق<br />
                <span className="text-[12.5px] text-[#8FB0B6]">تحدي باذل 2026 • المسار الأول • علامة الصح + كتاب + نقطتا التاء</span>
              </motion.p>
            </motion.div>

            {/* Progress bar - true brand gradient */}
            <motion.div
              className="mt-10 w-[220px] h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(10,143,148,0.08)", border: "1px solid rgba(10,143,148,0.06)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #19D6C4 0%, #0A8F94 50%, #05495A 100%)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </motion.div>

            <motion.div
              className="mt-3 flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex gap-1">
                <motion.span className="w-1.5 h-1.5 rounded-full bg-[#0A8F94]" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                <motion.span className="w-1.5 h-1.5 rounded-full bg-[#19D6C4]" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                <motion.span className="w-1.5 h-1.5 rounded-full bg-[#E0B450]" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
              </div>
              <span className="text-[11.5px] text-[#8FB0B6] mr-2 font-medium">جاري تهيئة المصادر الموثقة...</span>
            </motion.div>

            {/* Footer identity colors - true brand */}
            <motion.div
              className="mt-12 flex items-center gap-3 flex-wrap justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#0A8F94] shadow-[0_0_12px_rgba(10,143,148,0.4)]" />
                <span className="text-[11.5px] font-bold text-[#4B6A72]">#0A8F94 إسلام</span>
              </div>
              <span className="w-px h-3 bg-[#C9DFE1]" />
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#14529E] shadow-[0_0_12px_rgba(20,82,158,0.4)]" />
                <span className="text-[11.5px] font-bold text-[#4B6A72]">#14529E موثوقية</span>
              </div>
              <span className="w-px h-3 bg-[#C9DFE1]" />
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E0B450] shadow-[0_0_12px_rgba(224,180,80,0.4)] rotate-45" />
                <span className="text-[11.5px] font-bold text-[#4B6A72]">#E0B450 نور المعرفة</span>
              </div>
              <span className="w-px h-3 bg-[#C9DFE1] hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#7B4FD6] shadow-[0_0_12px_rgba(123,79,214,0.4)]" />
                <span className="text-[11.5px] font-bold text-[#4B6A72]">#7B4FD6 ذكاء (اختياري)</span>
              </div>
            </motion.div>

            {/* Brand story */}
            <motion.div
              className="mt-6 px-4 py-2 rounded-full bg-[#EEF6F6] border border-[#C9DFE1]/50 text-[11.5px] text-[#4B6A72] max-w-[420px] text-center leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              ✓ علامة صح = موثوقية • كتاب مفتوح = القرآن • نقطتان ذهبيتان = تاء تِبْيَان ونور المعرفة
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
