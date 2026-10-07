import { NextRequest, NextResponse } from "next/server"
import { getAIModelCatalog, getPublicProviderStatuses, resolveAISelection } from "../../../lib/aiProviders"
import { probeAIProvider } from "../../../lib/aiRuntime"
import { getIndexStats } from "../../../lib/rag"
import { discoverMcpToolCatalog } from "../../../lib/mcp"
import verified from "../../../data/verified_texts.json"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/health
 *   no query   — local configuration only
 *   ?probe=1   — perform a real, short text-generation call for the selected/default model
 *   ?mcp=1     — perform MCP initialize + tools/list (not tools/call)
 *   ?catalog=1 — refresh model catalogs from configured provider APIs
 */
export async function GET(request: NextRequest) {
  const started = Date.now()
  const params = request.nextUrl.searchParams
  const wantProbe = params.get("probe") === "1"
  const wantMcp = params.get("mcp") === "1"
  const wantCatalog = params.get("catalog") === "1"
  const providers = getPublicProviderStatuses()

  const report: Record<string, any> = {
    checkedAt: new Date().toISOString(),
    providers: providers.map((provider) => ({ id: provider.id, name: provider.name, configured: true })),
    configuredProviderCount: providers.length,
    retrieval: {
      verifiedTexts: Array.isArray(verified) ? verified.length : 0,
      index: getIndexStats(),
      note: "فهرس محلي؛ لا يدل على اتصال خارجي بالمصادر.",
    },
  }

  if (wantCatalog) {
    const catalog = await getAIModelCatalog(true)
    report.modelCatalog = {
      checkedAt: catalog.checkedAt,
      providers: catalog.providers.map((provider) => ({
        id: provider.id,
        status: provider.status,
        modelCount: provider.models.length,
        ...(provider.error ? { error: provider.error } : {}),
      })),
      defaultSelection: catalog.defaultSelection
        ? { providerId: catalog.defaultSelection.providerId, modelId: catalog.defaultSelection.modelId }
        : null,
    }
  }

  if (wantProbe) {
    try {
      const providerId = params.get("provider") || undefined
      const modelId = params.get("model") || undefined
      const selection = providerId || modelId
        ? await resolveAISelection({ providerId, modelId })
        : await resolveAISelection()
      report.liveProbe = selection
        ? { attempted: true, ...(await probeAIProvider(selection)) }
        : { attempted: false, ok: false, reason: "لا يوجد مزود ونموذج مهيأ بمفتاح على الخادم" }
    } catch (error: any) {
      report.liveProbe = {
        attempted: true,
        ok: false,
        error: String(error?.message || error).slice(0, 240),
      }
    }
  } else {
    report.liveProbe = { attempted: false, hint: "أضف ?probe=1 لإجراء اختبار توليد فعلي" }
  }

  if (wantMcp) {
    try {
      const catalog = await discoverMcpToolCatalog()
      report.mcp = {
        checked: true,
        discovery: catalog.providers.map((provider) => ({
          id: provider.id,
          status: provider.status,
          toolCount: provider.toolCount,
          ...(provider.error ? { error: provider.error } : {}),
        })),
        toolCallProbed: false,
        note: "نجاح initialize وtools/list لا يثبت نجاح tools/call؛ لم يُنفّذ اختبار أداة هنا.",
      }
    } catch (error: any) {
      report.mcp = {
        checked: true,
        toolCallProbed: false,
        error: String(error?.message || error).slice(0, 240),
      }
    }
  } else {
    report.mcp = { checked: false, hint: "أضف ?mcp=1 لإجراء initialize وtools/list؛ لا يُنفذ tools/call تلقائياً." }
  }

  const liveProbe = report.liveProbe
  report.verdict = liveProbe?.attempted === true
    ? liveProbe.ok
      ? "working — نجح اختبار توليد فعلي للنموذج المحدد"
      : "broken — فشل اختبار التوليد؛ راجع liveProbe.error"
    : providers.length
      ? "unverified — توجد مفاتيح خادم لكن لم ينجح اختبار توليد فعلي"
      : "offline — لا يوجد مفتاح مزود؛ مسارات النص القرآني المحلي وحدها لا تحتاج نموذجاً"

  report.elapsedMs = Date.now() - started
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
