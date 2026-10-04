"use client"
import { motion } from "framer-motion"

export type Persona = "general" | "new_muslim" | "non_muslim" | "teen" | "researcher"

interface PersonaOption {
  id: Persona
  label: string
  icon: string
  desc: string
  color: string
  bg: string
}

const PERSONAS: PersonaOption[] = [
  { id: "general", label: "عام", icon: "👤", desc: "إجابة متوازنة للجميع", color: "#0A8F94", bg: "#EEF6F6" },
  { id: "new_muslim", label: "مسلم جديد", icon: "🌱", desc: "شرح مبسط مع لطف وتدرج", color: "#059669", bg: "#ECFDF5" },
  { id: "non_muslim", label: "غير مسلم", icon: "🌍", desc: "تعريف بالإسلام بلغة محايدة", color: "#14529E", bg: "#EEF6F6" },
  { id: "teen", label: "ناشئة", icon: "✨", desc: "لغة قريبة وأمثلة معاصرة", color: "#7B4FD6", bg: "#F5F3FF" },
  { id: "researcher", label: "باحث", icon: "🔬", desc: "تفصيل مع مصادر ودرجات", color: "#0A2A33", bg: "#EEF6F6" },
]

interface PersonaSelectorProps {
  selected: Persona
  onSelect: (persona: Persona) => void
}

export default function PersonaSelector({ selected, onSelect }: PersonaSelectorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#19D6C4] to-[#0A8F94] flex items-center justify-center text-white text-[11px]">👥</div>
        <span className="text-[12px] font-bold text-[#0A2A33]" style={{ fontFamily: 'Tajawal, sans-serif' }}>خلفية السائل</span>
        <span className="text-[10px] text-[#8FB0B6] mr-1">لملاءمة الإجابة • ابتكار 15%</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {PERSONAS.map((persona) => {
          const isSelected = selected === persona.id
          return (
            <motion.button
              key={persona.id}
              onClick={() => onSelect(persona.id)}
              className={`relative p-3 rounded-[14px] border text-right transition-all duration-200 text-[11px] group`}
              style={{
                background: isSelected ? `linear-gradient(135deg, ${persona.bg} 0%, white 100%)` : 'rgba(255,255,255,0.7)',
                borderColor: isSelected ? `${persona.color}30` : 'rgba(37,99,235,0.08)',
                borderWidth: isSelected ? '1.5px' : '1px',
                boxShadow: isSelected ? `0 4px 16px ${persona.color}18` : '0 1px 3px rgba(0,0,0,0.04)'
              }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSelected && (
                <motion.div
                  layoutId="persona-selected"
                  className="absolute inset-0 rounded-[14px] pointer-events-none"
                  style={{ border: `2px solid ${persona.color}`, background: `${persona.color}06` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] shrink-0"
                  style={{ background: persona.bg, border: `1px solid ${persona.color}15` }}
                >
                  {persona.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[11px] leading-tight" style={{ color: isSelected ? persona.color : '#334155' }}>
                    {persona.label}
                  </div>
                  <div className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                    {persona.desc}
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] shrink-0"
                    style={{ background: persona.color }}
                  >
                    ✓
                  </motion.div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export { PERSONAS }
