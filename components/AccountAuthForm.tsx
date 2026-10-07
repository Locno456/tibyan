"use client"

import { useState, type FormEvent } from "react"
import { BookOpen, Check, Globe, LockKeyhole, Mail, Moon, Sprout, UserRound } from "lucide-react"
import { ACCOUNT_TYPES, type AccountType } from "../lib/accountTypes"
import { useAccount } from "./AccountProvider"

const CATEGORY_ICONS = { Globe, Sprout, Moon, BookOpen } as const

type AuthMode = "signin" | "signup"

export default function AccountAuthForm({
  onAuthenticated,
  compact = false,
}: {
  onAuthenticated?: () => void
  compact?: boolean
}) {
  const { isConfigured, authLoading, signIn, signUp } = useAccount()
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedType, setSelectedType] = useState<AccountType | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!isConfigured) {
      setError("لم تُضبط خدمة الحسابات بعد. راجع .env.example وإعداد Supabase.")
      return
    }
    if (mode === "signup" && !selectedType) {
      setError("اختر الفئة التي تصف خلفيتك للمتابعة.")
      return
    }
    if (mode === "signup" && password.length < 8) {
      setError("يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.")
      return
    }

    setBusy(true)
    try {
      if (mode === "signup") {
        const result = await signUp(email, password, selectedType as AccountType)
        if (result.error) {
          setError(result.error)
        } else if (result.confirmationRequired) {
          setNotice("أُنشئ الحساب. افتح رسالة التأكيد التي أُرسلت إلى بريدك، ثم سجّل الدخول هنا.")
          setMode("signin")
          setPassword("")
        } else {
          onAuthenticated?.()
        }
      } else {
        const result = await signIn(email, password)
        if (result.error) setError(result.error)
        else onAuthenticated?.()
      }
    } catch {
      setError("تعذّر إكمال الطلب. تحقق من الاتصال وإعداد Supabase ثم أعد المحاولة.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={compact ? "w-full" : "w-full max-w-[480px]"}>
      <div className="mb-5 flex rounded-2xl border border-[#C9DFE1] bg-[#F5FAF9] p-1" role="tablist" aria-label="طريقة استخدام الحساب">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          onClick={() => switchMode("signin")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-[13px] font-extrabold transition-colors ${mode === "signin" ? "bg-white text-[#0A737A] shadow-sm" : "text-[#718B90] hover:text-[#0A737A]"}`}
        >
          تسجيل الدخول
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => switchMode("signup")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-[13px] font-extrabold transition-colors ${mode === "signup" ? "bg-white text-[#0A737A] shadow-sm" : "text-[#718B90] hover:text-[#0A737A]"}`}
        >
          إنشاء حساب
        </button>
      </div>

      {!authLoading && !isConfigured && (
        <div role="status" className="mb-4 rounded-2xl border border-[#E0B450]/40 bg-[#FFF9E9] p-3.5 text-[12px] leading-6 text-[#735D29]">
          لم يتلقّ المتصفح إعداد Supabase في نسخة الموقع الحالية. تحقق من اسمَي
          <code className="mx-1 rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code>
          و
          <code className="mx-1 rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          في بيئة النشر الصحيحة على Vercel، ثم أعد بناء الموقع ونشره. إعداد SQL وحده لا يحل غياب المتغيرات. يمكنك الاستمرار محلياً دون حساب.
        </div>
      )}

      {!authLoading && !isConfigured && <a href="/" className="mb-4 inline-flex rounded-xl bg-[#0A737C] px-4 py-2 text-sm font-bold text-white">متابعة المحادثة محلياً دون حساب</a>}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mode === "signup" && (
          <fieldset>
            <legend className="mb-2.5 text-[13px] font-extrabold text-[#183F47]">كيف تصف خلفيتك؟</legend>
            <p className="mb-3 text-[11.5px] leading-5 text-[#718B90]">اختر الفئة الأقرب إليك؛ ستظهر في صفحة حسابك.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ACCOUNT_TYPES.map((type) => {
                const Icon = CATEGORY_ICONS[type.icon as keyof typeof CATEGORY_ICONS] || UserRound
                const selected = selectedType === type.id
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex min-h-[74px] items-start gap-2.5 rounded-2xl border p-3 text-right transition-colors ${selected ? "border-[#0A8F94] bg-[#EAF8F6] ring-2 ring-[#19D6C4]/20" : "border-[#D5E5E6] bg-white hover:border-[#0A8F94]/45 hover:bg-[#F7FBFA]"}`}
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-[#0A8F94] text-white" : "bg-[#EEF6F6] text-[#0A8F94]"}`}>
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-[12.5px] font-extrabold text-[#183F47]">
                        {type.label}
                        {selected && <Check size={15} className="text-[#0A8F94]" />}
                      </span>
                      <span className="mt-1 block text-[10.5px] leading-4 text-[#718B90]">{type.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold text-[#35575E]">البريد الإلكتروني</span>
          <span className="flex h-12 items-center gap-2.5 rounded-xl border border-[#C9DFE1] bg-white px-3.5 focus-within:border-[#0A8F94] focus-within:ring-2 focus-within:ring-[#19D6C4]/15">
            <Mail size={16} className="shrink-0 text-[#789398]" />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="min-w-0 flex-1 bg-transparent text-left text-[13px] text-[#183F47] outline-none placeholder:text-[#A0B3B6]"
              dir="ltr"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold text-[#35575E]">كلمة المرور</span>
          <span className="flex h-12 items-center gap-2.5 rounded-xl border border-[#C9DFE1] bg-white px-3.5 focus-within:border-[#0A8F94] focus-within:ring-2 focus-within:ring-[#19D6C4]/15">
            <LockKeyhole size={16} className="shrink-0 text-[#789398]" />
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === "signup" ? "8 أحرف على الأقل" : "••••••••"}
              className="min-w-0 flex-1 bg-transparent text-left text-[13px] tracking-wide text-[#183F47] outline-none placeholder:text-[#A0B3B6]"
              dir="ltr"
            />
          </span>
        </label>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12px] leading-5 text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-[#0A8F94]/20 bg-[#EAF8F6] px-3.5 py-2.5 text-[12px] leading-5 text-[#176A6C]">{notice}</p>}

        <button
          type="submit"
          disabled={busy || !isConfigured}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#08737A] to-[#05495A] text-[13.5px] font-extrabold text-white shadow-[0_7px_18px_rgba(10,143,148,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <UserRound size={16} />}
          {busy ? "جارٍ المعالجة…" : mode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول"}
        </button>
      </form>

      <p className="mt-4 text-center text-[10.5px] leading-5 text-[#82999D]">
        الحساب اختياري. لن تُرفع بياناتك المحلية إلى السحابة قبل موافقتك.
      </p>
    </div>
  )
}
