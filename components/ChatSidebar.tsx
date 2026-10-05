"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  X, Plus, Settings, MessageSquare, PanelRightClose, PanelRightOpen,
} from "lucide-react"
import type { ChatSession } from "../lib/chatHistory"

interface ChatSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string
  collapsed: boolean
  mobileOpen: boolean
  disabled?: boolean
  storageWarning?: boolean
  onToggleCollapsed: () => void
  onCloseMobile: () => void
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onOpenSettings: () => void
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return new Intl.DateTimeFormat("ar-SA", sameDay
    ? { hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric" }
  ).format(date)
}

function SidebarContents({
  sessions,
  activeSessionId,
  collapsed,
  disabled,
  storageWarning = false,
  mobile = false,
  onToggleCollapsed,
  onCloseMobile,
  onNewChat,
  onSelectSession,
  onOpenSettings,
}: ChatSidebarProps & { mobile?: boolean }) {
  const closeAfter = (action: () => void) => {
    action()
    if (mobile) onCloseMobile()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`shrink-0 ${collapsed && !mobile ? "px-3 pt-4 pb-3" : "px-4 pt-4 pb-3"}`}>
        <div className={`flex items-center ${collapsed && !mobile ? "justify-center" : "justify-between"}`}>
          <div className={`flex min-w-0 items-center ${collapsed && !mobile ? "justify-center" : "gap-2.5"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <img src="/tibyan-logo-color.svg" alt="شعار تِبْيَان" className="h-full w-full object-contain" />
            </div>
            {(!collapsed || mobile) && (
              <div className="min-w-0">
                <div className="text-[16px] font-extrabold leading-tight text-[#0A2A33]">تِبْيَان</div>
                <div className="mt-0.5 truncate text-[11px] text-[#6D8A90]">الحوار المعرفي الموثّق</div>
              </div>
            )}
          </div>

          {mobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="إغلاق القائمة الجانبية"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C9DFE1] bg-white text-[#4B6A72] transition-colors hover:bg-[#EEF6F6]"
            >
              <X size={18} />
            </button>
          ) : (
            !collapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="طي القائمة الجانبية"
                title="طي القائمة الجانبية"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#6D8A90] transition-colors hover:bg-[#EEF6F6] hover:text-[#0A8F94]"
              >
                <PanelRightClose size={18} />
              </button>
            )
          )}
        </div>

        {!mobile && collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="توسيع القائمة الجانبية"
            title="توسيع القائمة الجانبية"
            className="mt-3 flex h-9 w-full items-center justify-center rounded-xl text-[#6D8A90] transition-colors hover:bg-[#EEF6F6] hover:text-[#0A8F94]"
          >
            <PanelRightOpen size={18} />
          </button>
        )}
      </div>

      <div className={`shrink-0 ${collapsed && !mobile ? "px-3" : "px-4"}`}>
        <button
          type="button"
          onClick={() => closeAfter(onNewChat)}
          disabled={disabled}
          title={collapsed && !mobile ? "محادثة جديدة" : undefined}
          aria-label="إنشاء محادثة جديدة"
          className={`flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#0A8F94]/15 bg-gradient-to-l from-[#0A8F94] to-[#0B737C] font-bold text-white shadow-[0_5px_14px_rgba(10,143,148,0.16)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${collapsed && !mobile ? "h-11 px-0" : "h-11 px-3"}`}
        >
          <Plus size={18} strokeWidth={2.6} />
          {(!collapsed || mobile) && <span className="text-[13.5px]">محادثة جديدة</span>}
        </button>
      </div>

      <div className={`mb-2 mt-5 flex shrink-0 items-center ${collapsed && !mobile ? "justify-center px-3" : "justify-between px-4"}`}>
        {(!collapsed || mobile) && (
          <>
            <h2 className="text-[12px] font-extrabold text-[#4B6A72]">سجل المحادثات</h2>
            <span className="min-w-6 rounded-full border border-[#C9DFE1]/70 bg-white/80 px-1.5 py-0.5 text-center text-[10.5px] font-bold tabular-nums text-[#6D8A90]">
              {sessions.filter((session) => session.messages.length > 0).length}
            </span>
          </>
        )}
        {collapsed && !mobile && <MessageSquare size={16} className="text-[#8FB0B6]" aria-label="سجل المحادثات" />}
      </div>

      <nav aria-label="المحادثات المحفوظة" className={`tb-scroll min-h-0 flex-1 overflow-y-auto pb-3 ${collapsed && !mobile ? "px-2" : "px-3"}`}>
        {sessions.length === 0 ? (
          (!collapsed || mobile) && (
            <div className="rounded-xl border border-dashed border-[#C9DFE1] px-3 py-4 text-center text-[12px] leading-relaxed text-[#8AA6AB]">
              ستظهر محادثاتك هنا بعد بدء أول سؤال.
            </div>
          )
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => {
              const active = session.id === activeSessionId
              const latestQuestion = [...session.messages].reverse().find((message) => message.role === "user")
              const title = session.title || (latestQuestion?.role === "user" ? latestQuestion.question : "محادثة جديدة")
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => closeAfter(() => onSelectSession(session.id))}
                  aria-label={title}
                  aria-current={active ? "page" : undefined}
                  title={collapsed && !mobile ? title : undefined}
                  className={`group flex w-full items-center gap-2.5 rounded-[12px] border text-right transition-colors ${
                    collapsed && !mobile ? "justify-center px-0 py-2.5" : "px-2.5 py-2"
                  } ${active
                    ? "border-[#0A8F94]/15 bg-[#EAF6F5] text-[#0A2A33]"
                    : "border-transparent text-[#4B6A72] hover:border-[#C9DFE1]/70 hover:bg-white/80"
                  }`}
                >
                  <MessageSquare size={16} className={`shrink-0 ${active ? "text-[#0A8F94]" : "text-[#8FB0B6] group-hover:text-[#0A8F94]"}`} />
                  {(!collapsed || mobile) && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold">{title}</span>
                      <span className="mt-0.5 flex items-center justify-between gap-2 text-[10.5px] text-[#8AA6AB]">
                        <span>{session.messages.length === 0 ? "فارغة" : `${Math.ceil(session.messages.length / 2)} جولات`}</span>
                        <span className="shrink-0 tabular-nums">{formatUpdatedAt(session.updatedAt)}</span>
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </nav>

      <div className={`shrink-0 border-t border-[#C9DFE1]/60 py-3 ${collapsed && !mobile ? "px-2" : "px-3"}`}>
        {(!collapsed || mobile) && (
          <div className={`mb-2 flex items-start gap-2 rounded-xl px-2.5 py-2 text-[10.5px] leading-relaxed ${storageWarning ? "bg-rose-50 text-rose-700" : "bg-[#F4FAF9] text-[#6D8A90]"}`}>
            <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${storageWarning ? "bg-rose-500" : "bg-[#0A8F94]"}`} />
            {storageWarning ? "تعذّر حفظ السجل؛ صدّر محادثاتك احتياطياً." : "محفوظة على هذا الجهاز فقط"}
          </div>
        )}
        <button
          type="button"
          onClick={() => closeAfter(onOpenSettings)}
          title={collapsed && !mobile ? "الإعدادات والتصدير" : undefined}
          aria-label="الإعدادات وتصدير سجل المحادثات"
          className={`flex w-full items-center gap-2.5 rounded-[12px] border border-transparent py-2.5 text-[#4B6A72] transition-colors hover:border-[#C9DFE1]/70 hover:bg-white/80 hover:text-[#0A8F94] ${collapsed && !mobile ? "justify-center px-0" : "px-2.5"}`}
        >
          <Settings size={17} className="shrink-0" />
          {(!collapsed || mobile) && <span className="text-[12.5px] font-bold">الإعدادات</span>}
        </button>
      </div>
    </div>
  )
}

export default function ChatSidebar(props: ChatSidebarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!props.mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onCloseMobile()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [props.mobileOpen, props.onCloseMobile])

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: props.collapsed ? 78 : 282 }}
        transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative z-30 hidden h-full shrink-0 flex-col border-l border-[#C9DFE1]/70 bg-white shadow-[0_0_24px_rgba(10,42,51,0.035)] md:flex"
        aria-label="القائمة الجانبية"
      >
        <SidebarContents {...props} />
      </motion.aside>

      {mounted && createPortal(
        <AnimatePresence>
          {props.mobileOpen && (
            <div className="fixed inset-0 z-[120] md:hidden" dir="rtl">
              <motion.button
                type="button"
                aria-label="إغلاق القائمة الجانبية"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={props.onCloseMobile}
                className="absolute inset-0 bg-[#071F27]/35 backdrop-blur-[2px]"
              />
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="absolute inset-y-0 right-0 flex w-[min(86vw,310px)] max-w-[310px] flex-col border-l border-[#C9DFE1]/70 bg-white shadow-[0_18px_55px_rgba(10,42,51,0.2)]"
                aria-label="القائمة الجانبية للمحادثات"
              >
                <SidebarContents {...props} collapsed={false} mobile />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
