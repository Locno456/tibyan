"use client"

interface CircularProgressProps {
  value: number // 0-100
  size?: number
  showLabel?: boolean
}

export default function CircularProgress({ value, size = 44, showLabel = true }: CircularProgressProps) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeValue / 100) * circumference
  
  const getColor = () => {
    if (safeValue >= 90) return "#059669" // emerald - ممتاز
    if (safeValue >= 70) return "#0A8F94" // turquoise - جيد
    if (safeValue >= 50) return "#E0B450" // gold - متوسط
    return "#E11D48" // red - منخفض
  }

  const getLabel = () => {
    if (safeValue >= 90) return "ممتاز"
    if (safeValue >= 70) return "جيد"
    if (safeValue >= 50) return "متوسط"
    return "منخفض"
  }

  return (
    <div className="relative flex items-center gap-2" title={`الموثوقية: ${safeValue.toFixed(0)}% - ${getLabel()}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#EEF6F6" strokeWidth="4" />
          <circle
            cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={getColor()} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circumference} 
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-extrabold leading-none" style={{ color: getColor() }}>{safeValue.toFixed(0)}%</span>
          {showLabel && <span className="text-[7px] text-[#8FB0B6] leading-none mt-0.5">موثوقية</span>}
        </div>
      </div>
      {showLabel && (
        <div className="hidden sm:flex flex-col">
          <span className="text-[10px] font-bold" style={{ color: getColor() }}>{getLabel()}</span>
          <span className="text-[8px] text-[#8FB0B6]">من المصادر المعتمدة</span>
        </div>
      )}
    </div>
  )
}
