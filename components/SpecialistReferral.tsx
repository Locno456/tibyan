"use client"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import type { ChatSession } from "../lib/chatHistory"
import type { KnowledgeOption } from "../lib/knowledge"
import { conversationMarkdown, conversationSnapshot } from "../lib/conversationExport"

interface Props { session: ChatSession; knowledge: KnowledgeOption; name?: string; email?: string; userId?: string }
type Channel = { channel: "whatsapp" | "telegram" | null; destination: string | null }

export default function SpecialistReferral({ session, knowledge, name: initialName, email: initialEmail, userId }: Props) {
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("")
  const [language, setLanguage] = useState("")
  const [share, setShare] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!open) return
    setName(initialName || ""); setEmail(initialEmail || ""); setShare(false); setConsent(false); setError("")
    if (userId) {
      try {
        const stored = JSON.parse(localStorage.getItem(`tibyan.referral.contact.${userId}`) || "{}")
        setCountry(stored.country || ""); setLanguage(stored.language || ""); setPhone(stored.phone || "")
      } catch { /* optional storage */ }
    }
    fetch("/api/referral/config").then((res) => res.json()).then(setChannel).catch(() => setChannel({ channel: null, destination: null }))
  }, [open, userId, initialName, initialEmail])

  function openDestination() {
    if (!consent || !channel?.channel || !channel.destination) return
    if (phone.trim() && !/^\+\d{7,15}$/.test(phone.trim())) { setError("اكتب رقم الهاتف مع مفتاح الدولة (+ ورقم)، أو اتركه فارغاً."); return }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("تحقق من البريد الإلكتروني، أو اتركه فارغاً."); return }
    if ([name, email, phone, country, language].some((value) => value.length > 160)) { setError("اختصر معلومات التواصل إلى 160 حرفاً لكل حقل."); return }
    let text = `طلب إحالة إلى مختص — تِبْيَان\nالاسم: ${name || "لم يحدد"}\nالهاتف: ${phone || "لم يحدد"}\nالبريد: ${email || "لم يحدد"}\nالدولة: ${country || "لم يحدد"}\nاللغة: ${language || "لم يحدد"}`
    if (share) {
      let link = ""
      if (userId) {
        try { const token = localStorage.getItem(`tibyan.share.${userId}.${session.id}`); if (token && /^[0-9a-f]{64}$/.test(token)) link = `${location.origin}/shared/${token}` } catch { /* no link */ }
      }
      const context = link ? `رابط المحادثة المنشورة: ${link}` : conversationMarkdown(conversationSnapshot(session, knowledge))
      if (context.length > 3500) { setError("السجل طويل. انشر رابط المحادثة من معلومات المحادثة أولاً ثم أعد المحاولة، أو ألغِ تضمين السياق."); return }
      text += `\n\n${context}`
    }
    if (userId) { try { localStorage.setItem(`tibyan.referral.contact.${userId}`, JSON.stringify({ country, language, phone })) } catch { /* optional */ } }
    setError("")
    if (channel.channel === "whatsapp") {
      window.open(`https://wa.me/${channel.destination}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
    } else {
      // Telegram does not support pre-filling a particular user's chat via URL.
      // Explicitly copy the approved text and open the configured account; user must paste and send.
      window.open(`https://t.me/${channel.destination}`, "_blank", "noopener,noreferrer")
      navigator.clipboard.writeText(text).then(() => {
        setError("نُسخ الطلب. الصقه في محادثة تيليجرام ثم أرسله بنفسك.")
      }).catch(() => setError("تعذر نسخ الطلب. اسمح بالنسخ ثم أعد المحاولة."))
    }
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-xl bg-[#0A737C] px-4 py-2 text-sm font-bold text-white">طلب إحالة إلى مختص</button>
    {open && typeof document !== "undefined" && createPortal(<div className="fixed inset-0 z-[170] flex items-center justify-center overflow-y-auto bg-[#071F27]/60 p-3" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="طلب إحالة إلى مختص" dir="rtl" onClick={(event) => event.stopPropagation()} className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 text-[#0A2A33] shadow-xl">
        <div className="flex items-center justify-between"><h2 className="font-bold">إحالة اختيارية إلى مختص</h2><button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">✕</button></div>
        <p className="mt-2 text-xs">هذه ليست فتوى ولا تأكيداً بتوفر مختص. لا تُرسل المعلومات إلا بعد مراجعتك وإرسالك الرسالة في التطبيق الآخر. جميع الحقول التالية اختيارية.</p>
        <div className="mt-3 grid gap-2 text-sm">
          <label>الاسم<input className="mt-1 w-full rounded border p-2" maxLength={160} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>الهاتف مع مفتاح الدولة (مثل +966...)<input className="mt-1 w-full rounded border p-2" dir="ltr" type="tel" maxLength={160} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label>أو البريد الإلكتروني<input className="mt-1 w-full rounded border p-2" dir="ltr" type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>الدولة<input className="mt-1 w-full rounded border p-2" maxLength={160} value={country} onChange={(e) => setCountry(e.target.value)} /></label>
          <label>اللغة<input className="mt-1 w-full rounded border p-2" maxLength={160} value={language} onChange={(e) => setLanguage(e.target.value)} /></label>
        </div>
        <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> تضمين سجل المحادثة أو رابطها العام إن كان منشوراً</label>
        <p className="mt-1 text-xs text-rose-700">الرابط العام يتيح لمن يملكه رؤية المحادثة، وليس للمختص فقط. يمكن إلغاؤه من معلومات المحادثة. لا يتم إنشاء رابط عام تلقائياً.</p>
        <label className="mt-3 flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> أوافق على فتح تطبيق خارجي لنقل البيانات المحددة أعلاه بعد مراجعتها</label>
        <button type="button" disabled={!consent || !channel?.channel} onClick={openDestination} className="mt-4 rounded-lg bg-[#0A737C] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{channel?.channel === "whatsapp" ? "فتح واتساب برسالة جاهزة" : channel?.channel === "telegram" ? "نسخ الطلب وفتح تيليجرام" : "لم تُضبط جهة إحالة بعد"}</button>
        {error && <p role="status" className="mt-2 text-xs text-rose-700">{error}</p>}
      </section>
    </div>, document.body)}
  </>
}
