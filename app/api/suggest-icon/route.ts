import { NextRequest, NextResponse } from 'next/server'
import { generateWithGemini } from '../../../lib/gemini'
import { ICON_CHOICES, keywordToIcon, suggestLabel } from '../../../lib/knowledge'

// ============================================================
//  POST /api/suggest-icon
//  يُحلّل وصف «معرفة مخصصة» (مثلاً «طبيب أسنان») ويختار أيقونة lucide تلقائياً.
//  - مع GEMINI_API_KEY: يستدعي النموذج ويعيد اسماً من القائمة المسموحة فقط.
//  - بدونه: مطابقة كلمات مفتاحية محلية (تعمل Offline).
// ============================================================

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = String(body?.text || '').trim()

    if (!text) {
      return NextResponse.json({ error: 'النص مطلوب' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    let icon = ''
    let source = 'heuristic'

    if (apiKey) {
      try {
        const prompt = `هذه خلفية/صفة شخص يسأل عن الإسلام: «${text}».
اختر أيقونة واحدة فقط تعبّر عن هذه الخلفية من القائمة التالية، وأعد اسمها حرفياً دون أي نص إضافي:
${ICON_CHOICES.join(', ')}
أجب باسم الأيقونة فقط.`

        const res = await generateWithGemini(
          prompt,
          { apiKey, model: process.env.GEMINI_MODEL || 'flashLite', temperature: 0, maxTokens: 24 },
          'أنت مصنف أيقونات. أعد اسم أيقونة واحداً فقط من القائمة، بلا شرح.'
        )

        const cleaned = res.text.trim().replace(/["'«»`]/g, '')
        const match = ICON_CHOICES.find((n) => cleaned.toLowerCase().includes(n.toLowerCase()))
        if (match) {
          icon = match
          source = `gemini-${res.model}`
        }
      } catch {
        /* سقط إلى الاستدلال المحلي */
      }
    }

    if (!icon) icon = keywordToIcon(text)

    return NextResponse.json({ icon, label: suggestLabel(text), source })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
