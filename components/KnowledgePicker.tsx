"use client"
import { useEffect, useRef, useState, RefObject } from "react"
import { createPortal } from "react-dom"
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
  anchorRef?: RefObject<HTMLElement | null>
}

const PANEL_W = 340

/**
 * قائمة «معرفة خلفية السائل».
 * تُعرض عبر Portal إلى document.body حتى لا تحتجزها الترويسة
 * (backdrop-blur ينشئ containing block يعطّل fixed/absolute داخله).
 * - سطح المكتب (sm+): قائمة منسدلة معتمة مثبّتة قرب زر المصباح.
 * - الجوال: Bottom sheet يغطي العرض وينزلق من الأسفل.
 * الخلفية معتمة تماماً (bg-white) فلا تداخل مع العناصر خلفها.
 */
export default function KnowledgePicker({ open, onClose, selectedId, presets, customOptions, onSelect, onAddCustom, anchorRef }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [isDesktop, setIsDesktop] = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia("(min-width: 640px)")
    const compute = () => {
      const desk = mq.matches
      setIsDesktop(desk)
      if (desk && anchorRef?.current) {
        const r = anchorRef.current.getBoundingClientRect()
        const vw = window.innerWidth
        let left = r.left // محاذاة الحافة اليسرى للزر (end في RTL)
        left = Math.max(8, Math.min(left, vw - PANEL_W - 8))
        setPos({ top: r.bottom + 8, left })
      }
    }
    compute()
    mq.addEventListener?.("change", compute)
    window.addEventListener("resize", compute)
    return () => {
      mq.removeEventListener?.("change", compute)
      window.removeEventListener("resize", compute)
    }
  }, [open, anchorRef])

  if (!mounted) return null // لا نصيّر على الخادم (لا يوجد document)

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* طبقة معتمة لالتقاط النقر خارج القائمة */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-[#0A2A33]/25"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={isDesktop ? { opacity: 0, y: -8, scale: 0.97 } : { y: "100%" }}
            animate={isDesktop ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, y: -8, scale: 0.97 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            role="menu"
            aria-label="اختيار معرفة خلفية السائل"
            style={isDesktop && pos ? { top: pos.top, left: pos.left, width: PANEL_W } : undefined}
            className={[
              "z-[80] bg-white border border-[#C9DFE1] shadow-[0_18px_60px_rgba(10,42,51,0.22)] overflow-hidden",
              // جوال: bottom sheet
              "fixed inset-x-0 bottom-0 rounded-t-[28px] max-h-[78vh]",
              // سطح مكتب: قائمة منسدلة (إلغاء تثبيت الأسفل/الجوانب)
              "sm:inset-x-auto sm:bottom-auto sm:max-h-[70vh] sm:rounded-3xl",
            ].join(" ")}
          >
            {/* مقبض سحب للجوال */}
            <div className="sm:hidden mx-auto mt-3 mb-1 w-12 h-1.5 rounded-full bg-[#C9DFE1]" aria-hidden />

            <div className="px-4 pb-2 pt-3 sm:px-3 sm:pt-2.5">
              <div className="text-[15px] sm:text-[16px] font-extrabold text-[#0A2A33]">معرفة خلفية السائل</div>
              <div className="text-[11.5px] sm:text-[12px] text-[#4B6A72]">يُكيّف تِبْيَان خطابه وإجابته وفق الخلفية المختارة</div>
            </div>

            <div className="overflow-y-auto tb-scroll px-2 pb-2 flex flex-col gap-1" style={{ maxHeight: "inherit" }}>
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

            <div className="p-2.5 sm:p-3 border-t border-[#C9DFE1]/60 bg-white">
              <button
                type="button"
                onClick={onAddCustom}
                className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13.5px] sm:text-[14px] font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#19D6C4 0%,#0A8F94 55%,#05495A 100%)" }}
              >
                <Plus size={17} strokeWidth={2.6} />
                معرفة مخصصة
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
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
