"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Download, FileJson, HardDrive, ShieldCheck, X } from "lucide-react"
import type { ChatSession } from "../lib/chatHistory"
import { downloadChatHistory } from "../lib/chatHistory"

interface ChatSettingsModalProps {
  open: boolean
  sessions: ChatSession[]
  onClose: () => void
}

export default function ChatSettingsModal({ open, sessions, onClose }: ChatSettingsModalProps) {
  const [mounted, setMounted] = useState(false)
  const [exportState, setExportState] = useState<"idle" | "done" | "error">("idle")

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) {
      setExportState("idle")
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  const completedSessions = useMemo(() => sessions.filter((session) => session.messages.length > 0), [sessions])
  const messageCount = useMemo(
    () => completedSessions.reduce((total, session) => total + session.messages.length, 0),
    [completedSessions]
  )

  const exportHistory = () => {
    setExportState(downloadChatHistory(sessions) ? "done" : "error")
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-4" dir="rtl">
          <motion.button
            type="button"
            aria-label="إغلاق نافذة الإعدادات"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#071F27]/40 backdrop-blur-[3px]"
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-settings-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-[1] w-full max-w-[520px] overflow-hidden rounded-t-[22px] border border-[#C9DFE1]/80 bg-[#FBFEFD] shadow-[0_24px_70px_rgba(10,42,51,0.22)] sm:rounded-[20px]"
          >
            <div className="h-1 w-full bg-gradient-to-l from-[#19D6C4] via-[#0A8F94] to-[#14529E]" />
            <div className="flex items-start justify-between gap-4 border-b border-[#C9DFE1]/60 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#EAF6F5] text-[#0A8F94]">
                  <HardDrive size={19} />
                </div>
                <div>
                  <h2 id="chat-settings-title" className="text-[17px] font-extrabold text-[#0A2A33]">الإعدادات</h2>
                  <p className="mt-0.5 text-[12px] text-[#6D8A90]">إدارة سجلّك المحلي وتصديره</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C9DFE1] bg-white text-[#4B6A72] transition-colors hover:bg-[#EEF6F6]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start gap-3 rounded-[14px] border border-[#0A8F94]/15 bg-[#EFF9F7] p-3.5">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#0A8F94]" />
                <div>
                  <div className="text-[13px] font-bold text-[#0A2A33]">خصوصيتك أولاً</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#54747A]">
                    المحادثات محفوظة في هذا المتصفح على جهازك فقط، ولا تُزامَن بين الأجهزة. سيُضاف الحساب والمزامنة لاحقاً.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#C9DFE1]/70 bg-white px-4 py-3">
                <div>
                  <div className="text-[13px] font-bold text-[#0A2A33]">السجل المحفوظ</div>
                  <div className="mt-1 text-[11.5px] text-[#7B969B]">كل المحادثات غير الفارغة على هذا الجهاز</div>
                </div>
                <div className="shrink-0 text-left">
                  <div className="text-[19px] font-extrabold tabular-nums text-[#0A8F94]">{completedSessions.length}</div>
                  <div className="text-[10.5px] text-[#8AA6AB]">محادثات • {messageCount} رسالة</div>
                </div>
              </div>

              <div className="rounded-[14px] border border-[#C9DFE1]/70 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EEF6F6] text-[#14529E]">
                    <FileJson size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-[#0A2A33]">تصدير سجل المحادثات كاملاً</div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#6D8A90]">
                      نزّل نسخة JSON تشمل عناوين المحادثات والأسئلة والإجابات والمصادر، للاحتفاظ بها أو نقلها لاحقاً.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={exportHistory}
                  disabled={completedSessions.length === 0}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#0A2A33] px-4 py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#0A8F94] disabled:cursor-not-allowed disabled:bg-[#A9BEC1]"
                >
                  <Download size={16} />
                  {exportState === "done" ? "تم تنزيل السجل" : "تنزيل جميع المحادثات (.json)"}
                </button>
                {exportState === "done" && (
                  <p role="status" className="mt-2 text-center text-[11.5px] font-bold text-emerald-700">
                    اكتمل التنزيل. الملف بقي على جهازك ولم يُرسل إلى أي خادم.
                  </p>
                )}
                {exportState === "error" && (
                  <p role="alert" className="mt-2 text-center text-[11.5px] font-bold text-rose-700">
                    تعذّر إنشاء الملف. تحقّق من إعدادات التنزيل في المتصفح ثم أعد المحاولة.
                  </p>
                )}
                {completedSessions.length === 0 && (
                  <p className="mt-2 text-center text-[11px] text-[#8AA6AB]">ابدأ محادثة أولاً ليصبح سجلّها متاحاً للتصدير.</p>
                )}
              </div>

              <p className="text-center text-[10.5px] leading-relaxed text-[#8AA6AB]">
                يُحذف هذا السجل إذا مُسحت بيانات الموقع من المتصفح؛ احتفظ بنسخة مصدّرة عند الحاجة.
              </p>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
