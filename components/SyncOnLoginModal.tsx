"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Cloud, Database, LockKeyhole, MessageSquare, X } from "lucide-react"
import type { TibyanAccountData } from "../lib/accountData"
import type { ChatSession } from "../lib/chatHistory"

export interface SyncDecisionData {
  localData: TibyanAccountData
  cloudData: TibyanAccountData
}

export default function SyncOnLoginModal({
  open,
  data,
  initialLocalOnlyIds,
  busy,
  error,
  onSyncAll,
  onSyncSelected,
  onDefer,
}: {
  open: boolean
  data: SyncDecisionData | null
  initialLocalOnlyIds: string[]
  busy: boolean
  error: string | null
  onSyncAll: () => void
  onSyncSelected: (localOnlyIds: string[]) => void
  onDefer: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [localOnlyIds, setLocalOnlyIds] = useState<string[]>([])
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) {
      setSelectionMode(initialLocalOnlyIds.length > 0)
      setLocalOnlyIds(initialLocalOnlyIds)
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => { document.body.style.overflow = previousOverflow }
    }
  }, [open, data?.localData.sessions.length, initialLocalOnlyIds])

  const localSessions = data?.localData.sessions || []
  const toggleLocalOnly = (id: string) => {
    setLocalOnlyIds((previous) => previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id])
  }

  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && data && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-3 sm:p-6" dir="rtl">
          <motion.button
            type="button"
            aria-label="متابعة دون مزامنة الآن"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onDefer}
            disabled={busy}
            className="absolute inset-0 bg-[#061F27]/60 backdrop-blur-[5px] disabled:cursor-wait"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-decision-title"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 29 }}
            className="relative z-10 max-h-[min(94dvh,880px)] w-full max-w-[620px] overflow-y-auto rounded-[28px] border border-white/80 bg-[#FBFDFD] p-5 shadow-[0_30px_100px_rgba(4,30,37,0.38)] sm:p-7"
          >
            <button type="button" onClick={onDefer} disabled={busy} aria-label="تأجيل المزامنة" className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-[#D7E5E6] bg-white text-[#718B90] transition hover:bg-[#EEF6F6] disabled:opacity-40 sm:left-5 sm:top-5">
              <X size={17} />
            </button>

            <div className="mx-auto mb-2 flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[#EAF8F6]">
              <motion.svg width="72" height="72" viewBox="0 0 72 72" fill="none" role="img" aria-label="رسم متحرك لمزامنة البيانات">
                <motion.path
                  d="M18.5 45.5h34.1a10.4 10.4 0 0 0 .8-20.8A17.2 17.2 0 0 0 21 28.1a8.8 8.8 0 0 0-2.5 17.4Z"
                  stroke="#0A8F94" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0.15, opacity: 0.35 }}
                  animate={{ pathLength: [0.15, 1, 0.15], opacity: [0.35, 1, 0.5] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.path
                  d="M27 36.5h18M36 28v17"
                  stroke="#19D6C4" strokeWidth="3" strokeLinecap="round"
                  animate={{ scale: [0.72, 1, 0.72], opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: "36px 36px" }}
                />
                <motion.circle cx="53" cy="19" r="4" fill="#E0B450" animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
              </motion.svg>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#CFE7E4] bg-white px-3 py-1 text-[10.5px] font-extrabold text-[#0A8F94]">
                <LockKeyhole size={12} /> القرار لك قبل أي رفع
              </div>
              <h2 id="sync-decision-title" className="text-[21px] font-extrabold leading-tight text-[#0A2A33] sm:text-[24px]">هل تريد مزامنة بياناتك؟</h2>
              <p className="mx-auto mt-2 max-w-[480px] text-[12px] leading-6 text-[#6F888D]">
                وجدنا بيانات على هذا الجهاز و/أو في حسابك. سنجمع النسختين دون حذف البيانات السحابية بصمت؛ اختر ما تريد إبقاءه محلياً قبل المتابعة.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-[#D9E8E8] bg-white p-3.5">
                <div className="flex items-center gap-2 text-[#0A8F94]"><MessageSquare size={16} /><span className="text-[11px] font-extrabold">هذا الجهاز</span></div>
                <p className="mt-2 text-[17px] font-extrabold tabular-nums text-[#183F47]">{localSessions.length} <span className="text-[11px] font-bold text-[#789095]">محادثة</span></p>
                <p className="mt-1 text-[10px] text-[#82999D]">{data.localData.customKnowledge.length} معرفة مخصصة</p>
              </div>
              <div className="rounded-2xl border border-[#D9E8E8] bg-white p-3.5">
                <div className="flex items-center gap-2 text-[#14529E]"><Database size={16} /><span className="text-[11px] font-extrabold">الحساب</span></div>
                <p className="mt-2 text-[17px] font-extrabold tabular-nums text-[#183F47]">{data.cloudData.sessions.length} <span className="text-[11px] font-bold text-[#789095]">محادثة</span></p>
                <p className="mt-1 text-[10px] text-[#82999D]">{data.cloudData.customKnowledge.length} معرفة مخصصة</p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                onClick={onSyncAll}
                disabled={busy}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#08737A] to-[#05495A] px-4 py-3 text-[13px] font-extrabold text-white shadow-[0_7px_18px_rgba(10,143,148,0.17)] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-55"
              >
                {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <Cloud size={17} />}
                {busy ? "جارٍ دمج البيانات بأمان…" : "مزامنة كل البيانات ودمج النسختين"}
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode((value) => !value)}
                disabled={busy}
                aria-expanded={selectionMode}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#C9DFE1] bg-white px-4 py-2.5 text-right text-[12px] font-extrabold text-[#35575E] transition hover:border-[#0A8F94]/45 hover:bg-[#F7FBFA] disabled:opacity-55"
              >
                <span>{selectionMode ? "إخفاء اختيار المحادثات" : "تحديد ما يبقى على هذا الجهاز"}</span>
                <span className="text-[10px] font-bold text-[#0A8F94]">اختياري</span>
              </button>

              <AnimatePresence initial={false}>
                {selectionMode && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="rounded-2xl border border-[#D9E8E8] bg-[#F7FAFA] p-3">
                      <p className="mb-2 text-[10.5px] leading-5 text-[#718B90]">ضع علامة على المحادثات التي لا تريد رفعها. تبقى على هذا الجهاز فقط، بينما تُدمج بقية المحادثات والمعرفة والإعدادات.</p>
                      <div className="tb-scroll max-h-44 space-y-1 overflow-y-auto pe-1">
                        {localSessions.length ? localSessions.map((session: ChatSession) => {
                          const checked = localOnlyIds.includes(session.id)
                          return (
                            <label key={session.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition ${checked ? "border-[#E0B450]/55 bg-[#FFF9E9]" : "border-transparent bg-white hover:border-[#C9DFE1]"}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleLocalOnly(session.id)} disabled={busy} className="h-4 w-4 accent-[#0A8F94]" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[11.5px] font-bold text-[#35575E]">{session.title || "محادثة جديدة"}</span>
                                <span className="mt-0.5 block text-[9.5px] text-[#8AA1A5]">{session.messages.length} رسالة · {session.messages.length ? "تُرفع إن لم تحددها" : "فارغة"}</span>
                              </span>
                              {checked && <span className="rounded-full bg-[#FFF0C6] px-2 py-0.5 text-[9px] font-extrabold text-[#7A6122]">محلية</span>}
                            </label>
                          )
                        }) : (
                          <p className="rounded-xl bg-white px-3 py-3 text-[11px] text-[#82999D]">لا توجد محادثات محلية للاختيار. ستُزامن المعرفة والإعدادات فقط.</p>
                        )}
                      </div>
                      <button type="button" onClick={() => onSyncSelected(localOnlyIds)} disabled={busy} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#0A8F94]/25 bg-[#EAF8F6] px-4 py-2 text-[12px] font-extrabold text-[#08787D] transition hover:bg-[#DEF3F0] disabled:opacity-55">
                        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A8F94]/30 border-t-[#0A8F94]" /> : <Check size={16} />}
                        مزامنة البقية مع إبقاء المحدد محلياً
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[11.5px] leading-5 text-rose-700">{error}</p>}

            <div className="mt-4 flex flex-col-reverse items-center justify-between gap-3 border-t border-[#E1EBEB] pt-4 sm:flex-row">
              <button type="button" onClick={onDefer} disabled={busy} className="text-[11.5px] font-bold text-[#70888D] transition hover:text-[#0A8F94] disabled:opacity-40">
                ليس الآن؛ واصل على هذا الجهاز
              </button>
              <span className="text-center text-[9.5px] leading-4 text-[#8BA0A4]">التأجيل لا يرفع أو يحذف أي شيء. يمكنك استئناف المزامنة لاحقاً.</span>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
