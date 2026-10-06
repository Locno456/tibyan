import { NextRequest, NextResponse } from "next/server"
import { getAIModelCatalog } from "../../../lib/aiProviders"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1"
    const catalog = await getAIModelCatalog(forceRefresh)
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (error: any) {
    console.error("API /models error:", String(error?.message || error).slice(0, 220))
    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      providers: [],
      error: "تعذّر تحميل قائمة النماذج الآن. يمكنك إعادة المحاولة.",
    }, { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } })
  }
}
