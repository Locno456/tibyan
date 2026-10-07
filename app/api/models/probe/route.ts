import { NextRequest, NextResponse } from "next/server"
import { resolveAISelection } from "../../../../lib/aiProviders"
import { probeAIProvider } from "../../../../lib/aiRuntime"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "تعذّر قراءة بيانات الاختبار" }, { status: 400 })
  }

  try {
    const selection = await resolveAISelection({ providerId: body?.providerId, modelId: body?.modelId })
    if (!selection) return NextResponse.json({ error: "لم يُهيّأ أي مزود نموذج على الخادم" }, { status: 400 })
    const result = await probeAIProvider(selection)
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } })
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      providerId: typeof body?.providerId === "string" ? body.providerId : undefined,
      model: typeof body?.modelId === "string" ? body.modelId : undefined,
      error: String(error?.message || error).slice(0, 240),
    }, { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } })
  }
}
