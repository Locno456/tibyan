"use client"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Info, X } from "lucide-react"
import type { ChatSession } from "../lib/chatHistory"
import type { KnowledgeOption } from "../lib/knowledge"
import { conversationSnapshot } from "../lib/conversationExport"
import { getSupabaseClient } from "../lib/supabaseClient"

function tokenFor(userId: string, sessionId: string) { return `tibyan.share.${userId}.${sessionId}` }
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export default function ConversationInfo({ session, knowledge, customKnowledge, userId }: {
  session: ChatSession | null
  knowledge: KnowledgeOption
  customKnowledge: KnowledgeOption[]
  userId?: string
}) {
  const [open, setOpen] = useState(false)
  const [published, setPublished] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [token, setToken] = useState("")
  useEffect(() => {
    setPublished(false); setError(""); setToken("")
    if (!open || !session || !userId) return
    const client = getSupabaseClient()
    if (!client) return
    let cancelled = false
    client.from("tibyan_shared_conversations").select("published").eq("session_id", session.id).eq("user_id", userId).maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) setError("تعذر قراءة حالة الرابط. طبّق إعدادات المشاركة في Supabase.")
        else {
          setPublished(data?.published === true)
          setToken(data?.published ? localStorage.getItem(tokenFor(userId, session.id)) || "" : "")
        }
      })
    return () => { cancelled = true }
  }, [open, session?.id, userId])

  if (!session) return null
  const snapshot = conversationSnapshot(session, knowledge)
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/shared/${token}` : ""
  function download() {
    const payload = { ...snapshot, userKnowledge: customKnowledge.map(({ label, persona, background, hint }) => ({ label, persona, background, hint })) }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url; anchor.download = `tibyan-conversation-${session!.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48)}.json`
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function toggle() {
    if (!userId || busy) return
    const client = getSupabaseClient()
    if (!client) { setError("المشاركة تتطلب إعداد حساب Supabase."); return }
    setBusy(true); setError("")
    try {
      if (published) {
        const { error: failure } = await client.from("tibyan_shared_conversations").delete().eq("session_id", session!.id).eq("user_id", userId)
        if (failure) throw failure
        localStorage.removeItem(tokenFor(userId, session!.id)); setToken(""); setPublished(false)
      } else {
        const newToken = randomToken()
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(newToken))
        const token_hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
        const { error: failure } = await client.from("tibyan_shared_conversations").upsert({ user_id: userId, session_id: session!.id, token_hash, published: true, snapshot }, { onConflict: "user_id,session_id" })
        if (failure) throw failure
        localStorage.setItem(tokenFor(userId, session!.id), newToken)
        setToken(newToken); setPublished(true)
      }
    } catch { setError("فشلت عملية المشاركة؛ تحقق من الاتصال وجدول المشاركة وصلاحيات الحساب.") }
    finally { setBusy(false) }
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="معلومات المحادثة الحالية" title="معلومات المحادثة" className="rounded-xl border border-[#C9DFE1] p-2 text-[#0A737C] hover:bg-[#EEF6F6]"><Info size={19} /></button>
    {open && typeof document !== "undefined" && createPortal(<div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#071F27]/50 p-3 sm:p-4" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="معلومات المحادثة" dir="rtl" onClick={(event) => event.stopPropagation()} className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md min-h-0 overflow-y-auto overscroll-contain break-words rounded-2xl bg-white p-4 text-[#0A2A33] shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
        <div className="flex items-center justify-between"><h2 className="font-bold">معلومات المحادثة</h2><button type="button" aria-label="إغلاق" onClick={() => setOpen(false)}><X size={20}/></button></div>
        <p className="mt-3 break-words text-sm">{session.title} · {session.messages.length} رسائل</p>
        <p className="mt-1 text-sm">المعرفة المختارة حالياً: {knowledge.label}</p>
        <button type="button" onClick={download} className="mt-4 rounded-lg bg-[#0A737C] px-4 py-2 text-sm font-bold text-white">استخراج سياق هذه المحادثة (JSON)</button>
        <p className="mt-2 text-xs text-[#527078]">يتضمن الرسائل والمصادر والمعرفة المختارة وكل المعارف المخصصة في حسابك. راجع الملف قبل مشاركته. المعرفة هنا هي الاختيار الحالي، وليست سجلاً تاريخياً لاختيارات كل رسالة.</p>
        <div className="mt-5 border-t pt-4">
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={published} disabled={!userId || busy} onChange={toggle} /> السماح لمن لديه الرابط برؤية المحادثة</label>
          <p className="mt-2 text-xs text-[#527078]">مخصص للحساب المسجل. ينشر نسخة ثابتة من الرسائل والمعرفة المختارة فقط، ولا يتجدد تلقائياً. إيقافه يلغي الرابط فوراً؛ إعادة تفعيله تولّد رابطاً جديداً. لا تشارك بيانات حساسة.</p>
          {published && link && <button type="button" onClick={() => navigator.clipboard.writeText(link).then(() => setError("تم نسخ الرابط")).catch(() => setError("تعذر النسخ"))} className="mt-3 break-all rounded-lg border px-3 py-2 text-xs text-[#0A737C]">نسخ رابط القراءة: {link}</button>}
          {published && !link && <p className="mt-2 text-xs">الرابط أُنشئ على جهاز آخر. أوقف المشاركة وأعد تفعيلها لإنشاء رابط جديد.</p>}
          {!userId && <p className="mt-2 text-xs">الرابط العام يتطلب حساباً وخادماً دائماً مثل Supabase؛ قاعدة البيانات المحلية لا تنشر محادثاتك على الإنترنت. يمكنك تنزيلها من الزر أعلاه.</p>}
          {error && <p role="status" className="mt-2 text-xs text-rose-700">{error}</p>}
        </div>
      </section>
    </div>, document.body)}
  </>
}
