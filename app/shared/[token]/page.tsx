"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getSupabaseClient } from "../../../lib/supabaseClient"

type Shared = { title: string; knowledge: { label: string; background: string }; messages: Array<{ role: string; text: string; status?: string; sources?: Array<{ text: string; source: string; sourceUrl: string }> }> }
export default function SharedConversationPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<Shared | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const client = getSupabaseClient()
    if (!client || !/^[a-f0-9]{64}$/.test(token || "")) { setLoading(false); return }
    client.rpc("get_tibyan_shared_conversation", { p_token: token }).then(({ data }) => {
      if (!active) return
      if (data && typeof data.title === "string" && Array.isArray(data.messages)) setState(data as Shared)
      setLoading(false)
    })
    return () => { active = false }
  }, [token])
  return <main dir="rtl" className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-[#0A2A33]">
    <a href="/" className="text-[#0A737C] underline">تِبْيَان</a>
    {loading ? <p className="mt-8">جارٍ تحميل المحادثة…</p> : !state ? <p className="mt-8">الرابط غير متاح أو أُلغيت المشاركة.</p> : <>
      <h1 className="mt-7 text-2xl font-bold">{state.title}</h1>
      <p className="mt-2 text-sm text-[#527078]">نسخة للقراءة فقط · معرفة المستخدم: {state.knowledge?.label} — {state.knowledge?.background}</p>
      <p className="mt-1 text-xs text-[#527078]">قد لا تعكس هذه النسخة التعديلات اللاحقة على المحادثة.</p>
      <div className="mt-6 space-y-4">{state.messages.map((message, index) => <article key={index} className="rounded-xl border border-[#C9DFE1] bg-white p-4">
        <h2 className="mb-2 font-bold">{message.role === "user" ? "المستخدم" : `تِبْيَان${message.status ? ` · ${message.status}` : ""}`}</h2>
        <p className="whitespace-pre-wrap text-sm leading-7">{message.text}</p>
        {message.role !== "user" && message.sources?.map((source, i) => <p key={i} className="mt-2 whitespace-pre-wrap border-r-2 border-[#0A737C] pr-3 text-xs">{source.source}: {source.text} {source.sourceUrl}</p>)}
      </article>)}</div>
    </>}
  </main>
}
