"use client"
import { AnimatePresence, motion } from "framer-motion"
import { Plus, Check } from "lucide-react"
import { KnowledgeOption, getKnowledgeIcon } from "../lib/knowledge"

interface Props {
  open: boolean
  onClose: () => void
  selectedId: string
  presets: KnowledgeOption[]
  customOptions: KnowledgeOption[]
  onSelect: (k: KnowledgeOption) => void
  onAddCustom: () => void
}

/**
 * قائمة «معرفة خلفية السائل» — تظهر عند النقر على زر المصباح.
 * كل معرفة لها أيقونتها، وفي الأسفل خيار «معرفة مخصصة».
 */
export default function KnowledgePicker({ open, onClose, selectedId, presets, customOptions, onSelect, onAddCustom }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* طبقة شفافة لالتقاط النقر خارج القائمة */}
          <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />

          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            role="menu"
            aria-label="اختيار معرفة خلفية السائل"
            className="absolute top-full mt-2 end-0 z-50 w-[300px] sm:w-[340px] rounded-3xl bg-white/97 backdrop-blur-xl border border-[#C9DFE1]/80 shadow-[0_18px_50px_rgba(10,42,51,0.16)] p-2.5 sm:p-3 overflow-hidden"
          >
            <div className="px-2 pb-2 pt-1">
              <div className="text-[14px] sm:text-[15px] font-extrabold text-[#0A2A33]">معرفة خلفية السائل</div>
              <div className="text-[11px] sm:text-[12px] text-[#4B6A72]">يُكيّف تِبْيَان خطابه وإجابته وفق الخلفية المختارة</div>
            </div>

            <div className="max-h-[46vh] overflow-y-auto tb-scroll flex flex-col gap-1">
              {customOptions.length > 0 && (
                <div className="px-2 pt-1 text-[10.5px] font-bold text-[#8FB0B6]">المحفوظة لديك</div>
              )}
              {customOptions.map((k) => (
                <PickerRow key={k.id} k={k} active={k.id === selectedId} onPick={() => onSelect(k)} />
              ))}

              <div className="px-2 pt-1 text-[10.5px] font-bold text-[#8FB0B6]">المحددة مسبقاً</div>
              {presets.map((k) => (
                <PickerRow key={k.id} k={k} active={k.id === selectedId} onPick={() => onSelect(k)} />
              ))}
            </div>

            <button
              type="button"
              onClick={onAddCustom}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13px] sm:text-[14px] font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#19D6C4 0%,#0A8F94 55%,#05495A 100%)" }}
            >
              <Plus size={17} strokeWidth={2.6} />
              معرفة مخصصة
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function PickerRow({ k, active, onPick }: { k: KnowledgeOption; active: boolean; onPick: () => void }) {
  const Icon = getKnowledgeIcon(k.icon)
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onPick}
      className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors ${
        active ? "bg-[#0A8F94]/10" : "hover:bg-[#EEF6F6]"
      }`}
    >
      <span
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white"
        style={{ background: active ? "linear-gradient(135deg,#19D6C4,#0A8F94)" : "linear-gradient(135deg,#0A8F94,#14529E)" }}
      >
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13.5px] sm:text-[14.5px] font-bold text-[#0A2A33] truncate">{k.label}</span>
        {k.hint && <span className="block text-[10.5px] sm:text-[11.5px] text-[#4B6A72] truncate">{k.hint}</span>}
        {k.kind === "custom" && k.background && (
          <span className="block text-[10.5px] sm:text-[11.5px] text-[#0A8F94] truncate">{k.background}</span>
        )}
      </span>
      {active && (
        <span className="shrink-0 w-6 h-6 rounded-full bg-[#0A8F94] text-white flex items-center justify-center">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
