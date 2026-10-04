import { NextRequest, NextResponse } from 'next/server'
import { probeGemini, resolveModelName, RETIRED_MODELS } from '../../../lib/gemini'
import verified from '../../../data/verified_texts.json'

// ============================================================
//  GET /api/health — هل الذكاء الاصطناعي يعمل فعلاً؟
//
//  بدون معاملات  : فحص إعدادات فقط (بلا اتصال خارجي)
//  ?probe=1      : فحص إعدادات + استدعاء حي فعلي للنموذج
//
//  هذا هو الجواب السريع على «كيف أتأكد أنه يعمل»:
//    curl -s localhost:3000/api/health?probe=1 | jq
// ============================================================

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const wantProbe = request.nextUrl.searchParams.get('probe') === '1'

  const apiKey = process.env.GEMINI_API_KEY || ''
  const requestedModel = process.env.GEMINI_MODEL || 'flashLite'
  const model = resolveModelName(requestedModel)

  const report: Record<string, unknown> = {
    checkedAt: new Date().toISOString(),
    // 1) هل يوجد مفتاح؟
    apiKey: {
      present: Boolean(apiKey),
      length: apiKey.length,
      prefix: apiKey ? `${apiKey.slice(0, 7)}…` : null,
      hint: apiKey
        ? undefined
        : 'لا يوجد GEMINI_API_KEY — التطبيق يعمل بقوالب محلية ثابتة. أنشئ مفتاحاً من https://aistudio.google.com/app/apikey وضعه في .env.local',
    },
    // 2) هل النموذج المختار ما زال صالحاً؟
    model: {
      requested: requestedModel,
      resolved: model,
      retired: RETIRED_MODELS.some(r => model.startsWith(r)),
      warning: RETIRED_MODELS.some(r => model.startsWith(r))
        ? `النموذج "${model}" أوقفته Google — حدّد GEMINI_MODEL=${resolveModelName('flashLite')}`
        : undefined,
    },
    // 3) صحة طبقة الاسترجاع
    retrieval: {
      verifiedTexts: Array.isArray(verified) ? verified.length : 0,
      note: 'عدد النصوص الموثقة المتاحة للاسترجاع الحرفي',
    },
  }

  // 4) الاستدعاء الحي — الدليل القاطع
  if (wantProbe) {
    if (!apiKey) {
      report.liveProbe = {
        attempted: false,
        ok: false,
        reason: 'لا يمكن الاستدعاء بدون GEMINI_API_KEY',
      }
    } else {
      report.liveProbe = { attempted: true, ...(await probeGemini(apiKey, model)) }
    }
  } else {
    report.liveProbe = { attempted: false, hint: 'أضف ?probe=1 لإجراء استدعاء حي فعلي' }
  }

  const probeResult = report.liveProbe as any
  const llmWorking =
    probeResult?.attempted === true ? Boolean(probeResult.ok) : null

  report.verdict =
    llmWorking === true
      ? 'working — النموذج اللغوي يستجيب فعلاً'
      : llmWorking === false
        ? 'broken — المفتاح موجود لكن الاستدعاء يفشل (راجع liveProbe.error)'
        : apiKey
          ? 'unverified — المفتاح موجود لكن لم يُجرَ استدعاء حي. شغّل /api/health?probe=1'
          : 'offline — لا مفتاح، الردود قوالب محلية ثابتة'

  report.elapsedMs = Date.now() - t0
  return NextResponse.json(report)
}
