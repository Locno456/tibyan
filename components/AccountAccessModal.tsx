"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X, UserRound } from "lucide-react"
import AccountAuthForm from "./AccountAuthForm"

export default function AccountAccessModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-6" dir="rtl">
          <motion.button
            type="button"
            aria-label="إغلاق نافذة الحساب"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#061F27]/55 backdrop-blur-[5px]"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-access-title"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-10 max-h-[min(92dvh,850px)] w-full max-w-[560px] overflow-y-auto rounded-[26px] border border-white/75 bg-[#FBFDFD] p-5 shadow-[0_28px_90px_rgba(4,30,37,0.33)] sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F7F5] text-[#0A8F94]">
                  <UserRound size={20} />
                </span>
                <div>
                  <h2 id="account-access-title" className="text-[19px] font-extrabold text-[#0A2A33]">حساب تِبْيَان</h2>
                  <p className="mt-0.5 text-[11.5px] text-[#718B90]">ادخل أو أنشئ حساباً للمزامنة الاختيارية</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D6E5E6] text-[#668187] transition hover:bg-[#EEF6F6]">
                <X size={17} />
              </button>
            </div>
            <AccountAuthForm compact onAuthenticated={onClose} />
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
