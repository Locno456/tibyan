import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { POST as runTibyanAsk } from "../../../ask/route"
import {
  assistantTextFromTibyanResponse,
  authorizePublicApi,
  normalizeProviderUsage,
  parseChatCompletionPayload,
  publicApiError,
  readLimitedJson,
  selectedModelName,
  setNoStore,
} from "../../../../../lib/publicApi"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const unauthorized = authorizePublicApi(request, "openai")
  if (unauthorized) return unauthorized

  const parsedJson = await readLimitedJson(request, "openai")
  if (!parsedJson.ok) return parsedJson.response

  const parsedRequest = parseChatCompletionPayload(parsedJson.value)
  if (!parsedRequest.ok) return publicApiError(parsedRequest.message, 400, "openai")

  try {
    // This invokes Tibyan's existing local retrieval, read-only MCP, model, and Guard pipeline.
    const internalRequest = new NextRequest(new URL("/api/ask", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedRequest.value.payload),
    })
    const tibyanResponse = await runTibyanAsk(internalRequest)
    const tibyan = await tibyanResponse.json().catch(() => null)

    if (!tibyanResponse.ok) {
      const message = tibyan?.error?.message || tibyan?.error || "Tibyan could not complete this request."
      return publicApiError(String(message).slice(0, 300), tibyanResponse.status, "openai")
    }

    const content = assistantTextFromTibyanResponse(tibyan)
    if (!content) return publicApiError("Tibyan returned no readable answer.", 502, "openai", "empty_response")

    const metrics = tibyan?.metrics && typeof tibyan.metrics === "object" ? tibyan.metrics : {}
    const actualProvider = typeof metrics.usedProviderId === "string" ? metrics.usedProviderId : ""
    const actualModel = typeof metrics.usedModelId === "string" ? metrics.usedModelId : ""
    const responseModel = actualProvider && actualModel
      ? selectedModelName(actualProvider, actualModel)
      : selectedModelName(parsedRequest.value.selection.providerId, parsedRequest.value.selection.modelId)
    const usage = normalizeProviderUsage(metrics.modelUsage)
    const response = NextResponse.json({
      id: `chatcmpl-${randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: responseModel,
      choices: [{
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      }],
      ...(usage ? { usage } : {}),
      // Preserve Tibyan's status, citations, verification metadata, and local-source cards.
      tibyan,
    })
    return setNoStore(response)
  } catch {
    return publicApiError("Tibyan could not complete this request.", 500, "openai", "internal_error")
  }
}
