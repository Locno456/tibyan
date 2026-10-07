"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, BookOpen, CircleUserRound, Cloud, Globe, LogOut, Moon, ShieldCheck, Sprout, UserRound } from "lucide-react"
import { getAccountTypeMeta } from "../../lib/accountTypes"
import { useAccount } from "../../components/AccountProvider"
import AccountAuthForm from "../../components/AccountAuthForm"

const CATEGORY_ICONS = { Globe, Sprout, Moon, BookOpen } as const

export default function AccountPage() {
  const router = useRouter()
  const { user, accountType, profile, profileError, authLoading, profileLoading, isConfigured, signOut } = useAccount()
  const [signOutBusy, setSignOutBusy] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const accountMeta = getAccountTypeMeta(accountType)
  const CategoryIcon = accountMeta ? CATEGORY_ICONS[accountMeta.icon as keyof typeof CATEGORY_ICONS] : UserRound

  const handleSignOut = async () => {
    setSignOutBusy(true)
    setSignOutError(null)
    const result = await signOut()
    setSignOutBusy(false)
    if (result.error) setSignOutError(result.error)
    else router.replace("/")
  }

  return (
    <main dir="rtl" className="min-h-[100dvh] bg-[#F4F9F8] px-4 py-7 text-[#0A2A33] sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="tb-orb tb-orb--a" />
        <div className="tb-orb tb-orb--b" />
      </div>
      <div className="relative mx-auto w-full max-w-[760px]">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[12.5px] font-bold text-[#527078] transition hover:bg-white/70 hover:text-[#0A8F94]">
          <ArrowRight size={16} /> العودة إلى تِبْيَان
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[28px] border border-white/90 bg-white/90 shadow-[0_18px_60px_rgba(10,42,51,0.09)] backdrop-blur"
        >
          <div className="border-b border-[#DCE9E9] bg-gradient-to-l from-[#EAF8F6] via-white to-[#F7FAFC] px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A8F94] text-white shadow-[0_7px_18px_rgba(10,143,148,0.2)]">
                <CircleUserRound size={22} />
              </span>
              <div>
                <p className="text-[11px] font-extrabold tracking-wide text-[#0A8F94]">الحساب والخصوصية</p>
                <h1 className="mt-0.5 text-[23px] font-extrabold text-[#0A2A33]">حسابك في تِبْيَان</h1>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {authLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 text-[13px] font-bold text-[#718B90]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#C9DFE1] border-t-[#0A8F94]" /> جارٍ التحقق من الجلسة…
              </div>
            ) : !user ? (
              <div className="mx-auto max-w-[520px]">
                <div className="mb-5 text-center">
                  <h2 className="text-[18px] font-extrabold">دخول اختياري</h2>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-[#718B90]">يمكنك مواصلة استخدام تِبْيَان محلياً كضيف، أو تسجيل الدخول لمزامنة البيانات بعد موافقتك.</p>
                </div>
                <AccountAuthForm compact />
                {!authLoading && !isConfigured && <p className="mt-5 text-center text-[11px] leading-5 text-[#718B90]">تظل المحادثة المحلية متاحة حتى إعداد Supabase.</p>}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 rounded-2xl border border-[#D8E8E7] bg-[#F8FBFA] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0A8F94] shadow-sm">
                      <UserRound size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[#789095]">البريد الإلكتروني</p>
                      <p dir="ltr" className="mt-0.5 truncate text-left text-[14px] font-bold text-[#183F47]">{user.email || "—"}</p>
                    </div>
                  </div>
                  {profile?.created_at && (
                    <p className="text-[11px] text-[#8AA1A5]">
                      عضو منذ {new Intl.DateTimeFormat("ar", { year: "numeric", month: "long" }).format(new Date(profile.created_at))}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-[#D8E8E7] bg-white p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF8F6] text-[#0A8F94]">
                      <CategoryIcon size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-[#789095]">الفئة التي اخترتها</p>
                      <p className="mt-0.5 text-[15px] font-extrabold text-[#0A2A33]">{accountMeta?.label || "غير محددة"}</p>
                      <p className="mt-1 text-[11.5px] leading-5 text-[#718B90]">تُحفظ هذه الفئة في ملف حسابك ولا تُغيّر النصوص أو المصادر التي يستند إليها تِبْيَان.</p>
                    </div>
                    {profileLoading && <span className="mt-1 h-4 w-4 animate-spin rounded-full border-2 border-[#D1E3E2] border-t-[#0A8F94]" aria-label="جارٍ تحميل الملف" />}
                  </div>
                </div>

                {profileError && (
                  <p role="status" className="rounded-xl border border-[#E0B450]/35 bg-[#FFF9E9] px-3.5 py-3 text-[11.5px] leading-5 text-[#735D29]">{profileError}</p>
                )}

                <div className="rounded-2xl border border-[#D8E8E7] bg-[#F8FBFA] p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#0A8F94]"><Cloud size={18} /></span>
                    <div>
                      <p className="text-[13px] font-extrabold text-[#183F47]">المزامنة تحت تحكمك</p>
                      <p className="mt-1 text-[11.5px] leading-5 text-[#718B90]">لا تُرفع بيانات الجهاز عند تسجيل الدخول تلقائياً. ستظهر خطوة موافقة ومراجعة للمحادثات قبل أي دمج؛ ويمكن إيقاف المزامنة أو إبقاء محادثات على هذا الجهاز فقط.</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Link href="/" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#05495A] px-4 text-[12px] font-extrabold text-white transition hover:bg-[#0A2A33]">
                      <ShieldCheck size={15} /> إدارة المزامنة في المحادثة
                    </Link>
                    <button type="button" onClick={() => void handleSignOut()} disabled={signOutBusy} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#C9DFE1] bg-white px-4 text-[12px] font-bold text-[#526F75] transition hover:bg-[#F2F8F7] disabled:opacity-55">
                      {signOutBusy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#C9DFE1] border-t-[#0A8F94]" /> : <LogOut size={15} />}
                      تسجيل الخروج
                    </button>
                  </div>
                  {signOutError && <p role="alert" className="mt-3 text-[11.5px] text-rose-700">{signOutError}</p>}
                  <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-[#8AA1A5]"><ShieldCheck size={13} /> بعد تطبيق schema.sql، تقصر سياسات RLS الوصول إلى البيانات على صاحب الحساب.</p>
                </div>
              </div>
            )}
          </div>
        </motion.section>
        <AnimatePresence>
          {user && !accountMeta && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-[11px] text-[#82999D]">لم تُسجّل فئة لهذا الحساب؛ يمكنك التواصل مع إدارة المشروع لتحديث الملف.</motion.p>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
