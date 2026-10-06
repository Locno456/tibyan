import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"
export function GET() {
  const whatsapp = process.env.TIBYAN_REFERRAL_WHATSAPP?.trim().replace(/^\+/, "") || ""
  const telegram = process.env.TIBYAN_REFERRAL_TELEGRAM?.trim().replace(/^@/, "") || ""
  const preferred = process.env.TIBYAN_REFERRAL_CHANNEL?.trim().toLowerCase()
  const whatsappValid = /^\d{8,15}$/.test(whatsapp)
  const telegramValid = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(telegram)
  const channel = preferred === "telegram" && telegramValid ? "telegram"
    : preferred === "whatsapp" && whatsappValid ? "whatsapp"
      : whatsappValid ? "whatsapp" : telegramValid ? "telegram" : null
  return NextResponse.json({ channel, destination: channel === "whatsapp" ? whatsapp : channel === "telegram" ? telegram : null }, { headers: { "Cache-Control": "no-store" } })
}
