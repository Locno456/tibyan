"use client"
import { useEffect } from "react"
import { animate, motion, useMotionValue, useTransform } from "framer-motion"

interface CircularProgressProps {
  value: number // 0-100
  size?: number
  showLabel?: boolean
}

/**
 * دائرة الموثوقية — تعدّ تصاعدياً عند الظهور بدل القفز إلى القيمة.
 */
export default function CircularProgress({ value, size = 44, showLabel = true }: CircularProgressProps) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius

  const mv = useMotionValue(0)
  const label = useTransform(mv, (v) => `${v.toFixed(0)}%`)
  const dash = useTransform(mv, (v) => circumference - (v / 100) * circumference)

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      mv.set(safeValue)
      return
    }
    const controls = animate(mv, safeValue, {
      duration: 1.05,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [safeValue, mv])

  const getColor = () => {
    if (safeValue >= 90) return "#059669"
    if (safeValue >= 70) return "#0A8F94"
    if (safeValue >= 50) return "#E0B450"
    return "#E11D48"
  }

  const getLabel = () => {
    if (safeValue >= 90) return "ممتاز"
    if (safeValue >= 70) return "جيد"
    if (safeValue >= 50) return "متوسط"
    return "منخفض"
  }

  const color = getColor()

  return (
    <div
      className="relative flex items-center gap-2"
      title={`الموثوقية: ${safeValue.toFixed(0)}% - ${getLabel()}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EEF6F6" strokeWidth="4" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dash, transition: "stroke .3s" }}
          />
        </svg>
        {/* توهج خفيف خلف الحلقة */}
        <div
          className="absolute inset-0 rounded-full blur-[6px] opacity-30"
          style={{ background: color }}
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span className="text-[11px] font-extrabold leading-none tabular-nums" style={{ color }}>
            {label}
          </motion.span>
          {showLabel && <span className="text-[7px] text-[#8FB0B6] leading-none mt-0.5">موثوقية</span>}
        </div>
      </div>
      {showLabel && (
        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] font-bold" style={{ color }}>
            {getLabel()}
          </span>
          <span className="text-[8px] text-[#8FB0B6]">من المصادر المعتمدة</span>
        </div>
      )}
    </div>
  )
}
