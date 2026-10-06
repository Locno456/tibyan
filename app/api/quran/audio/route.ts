import { NextRequest, NextResponse } from "next/server"
import {
  getAudioCdnUrl,
  getQuranAudioOptions,
  isAllowedAudioEdition,
  resolveQuranAudioClip,
} from "../../../../lib/quranAudioService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

function timeoutSignal(timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, dispose: () => clearTimeout(timer) }
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

async function serveAudioFile(request: NextRequest, url: URL): Promise<Response> {
  const edition = url.searchParams.get("edition") || ""
  const globalAyah = parsePositiveInteger(url.searchParams.get("ayah"))
  if (!isAllowedAudioEdition(edition) || !globalAyah || globalAyah > 6236) {
    return NextResponse.json({ error: "معرّف التلاوة أو الآية غير صالح" }, { status: 400 })
  }

  const range = request.headers.get("range")
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    return new Response(null, { status: 416, headers: { "Accept-Ranges": "bytes" } })
  }

  const { signal, dispose } = timeoutSignal(15_000)
  try {
    const upstream = await fetch(getAudioCdnUrl(edition, globalAyah), {
      method: "GET",
      headers: range ? { Range: range } : undefined,
      redirect: "error",
      cache: "no-store",
      signal,
    })

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: "تعذّر جلب ملف التلاوة من مصدر الصوت" }, { status: upstream.status === 404 ? 404 : 502 })
    }

    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
    })
    const contentLength = upstream.headers.get("content-length")
    const contentRange = upstream.headers.get("content-range")
    if (contentLength) headers.set("Content-Length", contentLength)
    if (contentRange) headers.set("Content-Range", contentRange)
    if (url.searchParams.get("download") === "1") {
      headers.set("Content-Disposition", `attachment; filename="tibyan-${edition}-${globalAyah}.mp3"`)
    }

    return new Response(upstream.body, { status: upstream.status, headers })
  } catch (error: any) {
    const message = error?.name === "AbortError" ? "انتهت مهلة الاتصال بمصدر الصوت" : "تعذّر الاتصال بمصدر الصوت"
    return NextResponse.json({ error: message }, { status: 502 })
  } finally {
    dispose()
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("mode") || "options"

  if (mode === "file") return serveAudioFile(request, url)
  if (mode !== "options") return NextResponse.json({ error: "وضع غير صالح" }, { status: 400 })

  try {
    const options = await getQuranAudioOptions()
    return NextResponse.json(options, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    })
  } catch {
    return NextResponse.json({ error: "تعذّر تحميل خيارات القراء" }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const surahNumber = Number(body?.surahNumber)
    const fromAyah = body?.fromAyah == null ? undefined : Number(body.fromAyah)
    const toAyah = body?.toAyah == null ? undefined : Number(body.toAyah)
    const reciterId = typeof body?.reciterId === "string" ? body.reciterId : ""

    if (!Number.isInteger(surahNumber) || !reciterId) {
      return NextResponse.json({ error: "السورة والقارئ مطلوبان" }, { status: 400 })
    }
    if ((fromAyah !== undefined && !Number.isInteger(fromAyah)) || (toAyah !== undefined && !Number.isInteger(toAyah))) {
      return NextResponse.json({ error: "نطاق الآيات غير صالح" }, { status: 400 })
    }

    const audioCard = await resolveQuranAudioClip({ surahNumber, fromAyah, toAyah, reciterId })
    return NextResponse.json({ audioCard }, { headers: { "Cache-Control": "no-store" } })
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "تعذّر إعداد التلاوة").slice(0, 180) }, { status: 400 })
  }
}
