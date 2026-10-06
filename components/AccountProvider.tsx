"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"
import { isAccountType, type AccountProfile, type AccountType } from "../lib/accountTypes"
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabaseClient"
import { setSyncDeferred } from "../lib/accountStorage"

interface AccountContextValue {
  client: SupabaseClient | null
  user: User | null
  session: Session | null
  accountType: AccountType | null
  profile: AccountProfile | null
  profileError: string | null
  authLoading: boolean
  profileLoading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, accountType: AccountType) => Promise<{ error: string | null; confirmationRequired?: boolean }>
  signOut: () => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

function friendlyAuthError(error: unknown): string {
  const message = String((error as any)?.message || error || "").toLowerCase()
  if (message.includes("invalid login credentials") || message.includes("invalid email or password")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة."
  if (message.includes("user already registered") || message.includes("already been registered")) return "هذا البريد مسجّل بالفعل؛ جرّب تسجيل الدخول."
  if (message.includes("password should be at least") || message.includes("password must be at least")) return "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."
  if (message.includes("email not confirmed")) return "أكّد بريدك الإلكتروني من الرسالة التي أُرسلت إليك أولاً."
  if (message.includes("rate limit") || message.includes("too many requests")) return "أُرسلت طلبات كثيرة خلال وقت قصير؛ انتظر قليلاً ثم أعد المحاولة."
  if (message.includes("failed to fetch") || message.includes("network")) return "تعذّر الاتصال بخدمة الحسابات؛ تحقق من الاتصال وإعداد Supabase."
  return String((error as any)?.message || "حدث خطأ غير متوقع. أعد المحاولة.").slice(0, 240)
}

function profileTableError(error: unknown): string {
  const message = String((error as any)?.message || "").toLowerCase()
  if (message.includes("profiles") && (message.includes("does not exist") || message.includes("schema cache"))) {
    return "تسجيل الدخول متاح، لكن جدول profiles غير مهيأ بعد. طبّق ملف supabase/schema.sql في مشروع Supabase."
  }
  return "تعذّر تحميل بيانات الملف الشخصي؛ تحقق من إعداد قاعدة البيانات وسياسات RLS."
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => getSupabaseClient())
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!client) {
      setSession(null)
      setAuthLoading(false)
      return
    }

    let mounted = true
    const updateSession = (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id || null
      const previousUserId = lastUserIdRef.current
      if (previousUserId && previousUserId !== nextUserId) setSyncDeferred(previousUserId, true)
      lastUserIdRef.current = nextUserId
      setSession(nextSession)
      setAuthLoading(false)
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      updateSession(nextSession)
    })

    client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setProfileError(friendlyAuthError(error))
      updateSession(data.session)
    }).catch((error) => {
      if (!mounted) return
      setProfileError(friendlyAuthError(error))
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [client])

  const user = session?.user || null
  const metadataAccountType = user?.user_metadata?.account_type
  const accountType = profile?.account_type || (isAccountType(metadataAccountType) ? metadataAccountType : null)

  const refreshProfile = useCallback(async () => {
    if (!client || !user) {
      setProfile(null)
      setProfileError(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    setProfileError(null)
    const { data, error } = await client
      .from("profiles")
      .select("id, display_name, account_type, created_at")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      setProfileError(profileTableError(error))
      setProfile(null)
    } else if (data && isAccountType(data.account_type)) {
      setProfile({
        id: String(data.id),
        display_name: typeof data.display_name === "string" ? data.display_name : null,
        account_type: data.account_type,
        created_at: typeof data.created_at === "string" ? data.created_at : null,
      })
    } else {
      setProfile(null)
    }
    setProfileLoading(false)
  }, [client, user])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!client) return { error: "خدمة الحسابات غير مهيأة. أضف إعدادات Supabase أولاً." }
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    return { error: error ? friendlyAuthError(error) : null }
  }, [client])

  const signUp = useCallback(async (email: string, password: string, selectedAccountType: AccountType) => {
    if (!client) return { error: "خدمة الحسابات غير مهيأة. أضف إعدادات Supabase أولاً." }
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/account` : undefined
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { account_type: selectedAccountType },
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
      },
    })
    if (error) return { error: friendlyAuthError(error) }

    if (data.session) {
      // The SQL trigger creates the row; this refresh also covers projects where it is slightly delayed.
      window.setTimeout(() => void refreshProfile(), 250)
      return { error: null, confirmationRequired: false }
    }
    return { error: null, confirmationRequired: true }
  }, [client, refreshProfile])

  const signOut = useCallback(async () => {
    if (!client) return { error: null }
    const { error } = await client.auth.signOut()
    return { error: error ? friendlyAuthError(error) : null }
  }, [client])

  const value = useMemo<AccountContextValue>(() => ({
    client,
    user,
    session,
    accountType,
    profile,
    profileError,
    authLoading,
    profileLoading,
    isConfigured: Boolean(client && isSupabaseConfigured()),
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [client, user, session, accountType, profile, profileError, authLoading, profileLoading, signIn, signUp, signOut, refreshProfile])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error("useAccount must be used inside AccountProvider")
  return context
}
