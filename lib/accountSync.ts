import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizeAccountData, type TibyanAccountData } from "./accountData"

export async function fetchAccountData(client: SupabaseClient, userId: string): Promise<TibyanAccountData> {
  const { data, error } = await client
    .from("tibyan_user_data")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return normalizeAccountData(data?.state)
}

export async function saveAccountData(
  client: SupabaseClient,
  userId: string,
  state: TibyanAccountData
): Promise<void> {
  const { error } = await client
    .from("tibyan_user_data")
    .upsert({ user_id: userId, state }, { onConflict: "user_id" })

  if (error) throw error
}

export function accountSyncErrorMessage(error: unknown): string {
  const message = String((error as any)?.message || error || "").toLowerCase()
  if (message.includes("tibyan_user_data") && (message.includes("does not exist") || message.includes("schema cache"))) {
    return "جدول المزامنة غير مهيأ بعد. طبّق supabase/schema.sql في مشروع Supabase ثم أعد المحاولة."
  }
  if (message.includes("row-level security") || message.includes("permission denied")) {
    return "رفضت سياسات RLS العملية؛ تحقق من تطبيق سياسات supabase/schema.sql للمستخدم المسجّل."
  }
  return "تعذّرت مزامنة بيانات الحساب. تحقّق من اتصال Supabase وسياسات الأمان ثم أعد المحاولة."
}
