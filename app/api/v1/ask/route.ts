import { NextRequest } from "next/server"
import { POST as runTibyanAsk } from "../../ask/route"
import {
  authorizePublicApi,
  parseNativeAskPayload,
  publicApiError,
  readLimitedJson,
} from "../../../../lib/publicApi"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const unauthorized = authorizePublicApi(request)
  if (unauthorized) return unauthorized

  const parsedJson = await readLimitedJson(request)
  if (!parsedJson.ok) return parsedJson.response

  const parsedPayload = parseNativeAskPayload(parsedJson.value)
  if (!parsedPayload.ok) return publicApiError(parsedPayload.message, 400)

  try {
    // Reuse the application's existing RAG → model → MCP → Guard path, without a network hop.
    const internalRequest = new NextRequest(new URL("/api/ask", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedPayload.value),
    })
    const response = await runTibyanAsk(internalRequest)
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch {
    return publicApiError("Tibyan could not complete this request.", 500, "tibyan", "internal_error")
  }
}
