"use client"
import { motion } from "framer-motion"

interface AnimatedLogoProps {
  size?: number
  animated?: boolean
  showText?: boolean
  variant?: "color" | "white" | "app-icon"
}

export default function AnimatedLogo({ size = 140, animated = true, showText = false, variant = "color" }: AnimatedLogoProps) {
  // True brand kit logos
  const logoSrc = variant === "white" 
    ? "/tibyan-logo-white.svg" 
    : variant === "app-icon" 
      ? "/tibyan-app-icon.svg"
      : "/tibyan-logo-color.svg"

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        animate={animated ? {
          y: [0, -8, 0],
        } : {}}
        transition={animated ? {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
      >
        {/* Glow background - true brand gradient */}
        <motion.div
          className="absolute inset-0 rounded-[22%] blur-[18px] opacity-60"
          style={{
            background: "linear-gradient(135deg, #19D6C4 0%, #0A8F94 50%, #05495A 100%)",
          }}
          animate={animated ? {
            scale: [1, 1.08, 1],
            opacity: [0.4, 0.7, 0.4]
          } : {}}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Main logo - true brand kit */}
        <motion.div
          className="relative z-10 w-full h-full rounded-[22%] overflow-hidden shadow-[0_12px_28px_rgba(10,143,148,0.18)] bg-white flex items-center justify-center"
          initial={animated ? { scale: 0.8, rotate: -10 } : { scale: 1 }}
          animate={animated ? { scale: 1, rotate: 0 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 12 }}
        >
          <img 
            src={logoSrc} 
            alt="تِبْيَان" 
            className="w-[75%] h-[75%] object-contain"
          />

          {/* Shine sweep - brand kit light sweep */}
          {animated && (
            <motion.div
              className="absolute inset-0 rounded-[22%] overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="absolute top-[-50%] left-[-50%] w-[50%] h-[200%] rotate-[-16deg]"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)"
                }}
                animate={{
                  x: ["-100%", "300%"],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Gold dots glow - from brand kit */}
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-[6px] rotate-45 blur-[1px]"
          style={{ background: "linear-gradient(180deg, #FFF0B8 0%, #E0B450 100%)" }}
          animate={animated ? { scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {showText && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <h1 className="text-[28px] font-extrabold tracking-tight" style={{ fontFamily: 'Tajawal, sans-serif', color: '#0A2A33' }}>
            تِبْيَان
          </h1>
          <p className="text-[11px] tracking-[0.18em] text-[#4B6A72] font-bold mt-0.5">TIBYAN • الحوار المعرفي الموثق</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-[#0A8F94] animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-[#19D6C4] animate-pulse" style={{ animationDelay: '0.3s' }} />
            <span className="w-2 h-2 rounded-full bg-[#E0B450] animate-pulse" style={{ animationDelay: '0.6s' }} />
          </div>
          <div className="mt-2 text-[10px] text-[#4B6A72]">✓ موثق • كتاب مفتوح • نقطتا التاء</div>
        </motion.div>
      )}
    </div>
  )
}
