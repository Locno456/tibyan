import { createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { isAIProviderId, isValidAIModelId } from "./aiProviders"
import type { AIProviderId } from "./aiProviderTypes"

const MAX_REQUEST_BYTES = 32 * 1024
const MAX_QUESTION_LENGTH = 8_000
const MAX_HISTORY_TURNS = 8
const MAX_HISTORY_TEXT_LENGTH = 1_000
const MIN_API_KEY_BYTES = 32

type ErrorFormat = "tibyan" | "openai"

export interface PublicModelSelection {
  providerId: AIProviderId
  modelId: string
}

export interface PublicAskPayload {
  question: string
  providerId?: AIProviderId
  modelId?: string
  persona?: string
  background?: string
  history?: Array<{ role: "user" | "model"; text: string }>
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string }

export function isPublicApiEnabled(): boolean {
  return process.env.TIBYAN_API_ENABLED?.trim().toLowerCase() === "true"
}

function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store", Vary: "Authorization" }
}

export function publicApiError(
  message: string,
  status: number,
  format: ErrorFormat = "tibyan",
  code?: string,
): NextResponse {
  const type = status === 401
    ? "authentication_error"
    : status === 404
      ? "not_found_error"
      : status >= 500
        ? "server_error"
        : "invalid_request_error"
  const error = format === "openai"
    ? { message, type, ...(code ? { code } : {}) }
    : { message, type, ...(code ? { code } : {}) }
  const response = NextResponse.json({ error }, { status, headers: noStoreHeaders() })
  if (status === 401) response.headers.set("WWW-Authenticate", "Bearer")
  return response
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest()
}

/** Checks the server-only feature switch and bearer key without revealing configuration. */
export function authorizePublicApi(request: Request, format: ErrorFormat = "tibyan"): NextResponse | null {
  if (!isPublicApiEnabled()) return publicApiError("Not found", 404, format, "api_disabled")

  const expected = process.env.TIBYAN_API_KEY?.trim() || ""
  if (Buffer.byteLength(expected, "utf8") < MIN_API_KEY_BYTES) {
    return publicApiError("The Tibyan API is not configured on this server.", 503, format, "api_not_configured")
  }

  const authorization = request.headers.get("authorization") || ""
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i)
  const supplied = match?.[1]?.slice(0, 512) || ""
  const valid = timingSafeEqual(digest(supplied), digest(expected))
  if (!valid) return publicApiError("A valid bearer API key is required.", 401, format, "invalid_api_key")
  return null
}

export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse }

/** Reads a bounded JSON body so the public endpoint rejects oversized payloads early. */
export async function readLimitedJson(
  request: Request,
  format: ErrorFormat = "tibyan",
): Promise<LimitedJsonResult> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()
  if (contentType !== "application/json") {
    return { ok: false, response: publicApiError("Content-Type must be application/json.", 415, format, "unsupported_media_type") }
  }

  const declaredLength = Number(request.headers.get("content-length") || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return { ok: false, response: publicApiError("The JSON request body is too large.", 413, format, "request_too_large") }
  }

  const reader = request.body?.getReader()
  if (!reader) return { ok: false, response: publicApiError("A JSON request body is required.", 400, format, "invalid_json") }

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      totalBytes += value.byteLength
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined)
        return { ok: false, response: publicApiError("The JSON request body is too large.", 413, format, "request_too_large") }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, response: publicApiError("The JSON request body could not be read.", 400, format, "invalid_json") }
  } finally {
    reader.releaseLock()
  }

  try {
    const bytes = new Uint8Array(totalBytes)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
    return { ok: true, value }
  } catch {
    return { ok: false, response: publicApiError("The request body must contain valid JSON.", 400, format, "invalid_json") }
  }
}

export function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Accepts provider:model IDs from /api/v1/models, or providerId + modelId fields. */
export function parseModelSelection(
  input: unknown,
  required = false,
): ParseResult<PublicModelSelection | undefined> {
  if (!isRecord(input)) return { ok: false, message: "The request body must be a JSON object." }

  let providerId = typeof input.providerId === "string" ? input.providerId.trim() : ""
  let modelId = typeof input.modelId === "string" ? input.modelId.trim() : ""
  const model = typeof input.model === "string" ? input.model.trim() : ""

  if (model) {
    if (providerId) {
      const qualifiedPrefix = `${providerId}:`
      const separator = model.indexOf(":")
      const modelProvider = separator > 0 ? model.slice(0, separator) : ""
      if (modelProvider && isAIProviderId(modelProvider) && modelProvider !== providerId) {
        return { ok: false, message: "The model provider does not match providerId." }
      }
      const requestedId = model.startsWith(qualifiedPrefix) ? model.slice(qualifiedPrefix.length) : model
      if (modelId && modelId !== requestedId) {
        return { ok: false, message: "The model and modelId fields do not match." }
      }
      modelId = modelId || requestedId
    } else {
      const separator = model.indexOf(":")
      if (separator <= 0 || separator === model.length - 1) {
        return { ok: false, message: "Use a model ID from /api/v1/models (provider:modelId), or send providerId and modelId separately." }
      }
      providerId = model.slice(0, separator)
      const requestedId = model.slice(separator + 1)
      if (modelId && modelId !== requestedId) {
        return { ok: false, message: "The model and modelId fields do not match." }
      }
      modelId = modelId || requestedId
    }
  }

  if (!providerId && !modelId) {
    return required
      ? { ok: false, message: "A model is required. Choose an ID from /api/v1/models." }
      : { ok: true, value: undefined }
  }
  if (!providerId || !modelId) {
    return { ok: false, message: "Choose both providerId and modelId, or use the provider:model model ID." }
  }
  if (!isAIProviderId(providerId)) return { ok: false, message: "The selected provider is not supported." }
  if (!isValidAIModelId(modelId)) return { ok: false, message: "The selected model ID is invalid." }
  return { ok: true, value: { providerId, modelId } }
}

function normalizedHistory(value: unknown): PublicAskPayload["history"] {
  if (!Array.isArray(value)) return undefined
  const turns = value
    .filter((turn) => isRecord(turn) && typeof turn.text === "string" && turn.text.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((turn: any) => ({
      role: turn.role === "user" ? "user" as const : "model" as const,
      text: turn.text.trim().slice(0, MAX_HISTORY_TEXT_LENGTH),
    }))
  return turns.length ? turns : undefined
}

export function parseNativeAskPayload(input: unknown): ParseResult<PublicAskPayload> {
  if (!isRecord(input)) return { ok: false, message: "The request body must be a JSON object." }
  const question = typeof input.question === "string" ? input.question.trim() : ""
  if (question.length < 2) return { ok: false, message: "A question of at least two characters is required." }
  if (question.length > MAX_QUESTION_LENGTH) return { ok: false, message: `The question cannot exceed ${MAX_QUESTION_LENGTH} characters.` }

  const selected = parseModelSelection(input)
  if (!selected.ok) return selected
  const history = normalizedHistory(input.history)
  return {
    ok: true,
    value: {
      question,
      ...(selected.value ? { providerId: selected.value.providerId, modelId: selected.value.modelId } : {}),
      ...(typeof input.persona === "string" ? { persona: input.persona } : {}),
      ...(typeof input.background === "string" && input.background.trim() ? { background: input.background.trim().slice(0, 400) } : {}),
      ...(history ? { history } : {}),
    },
  }
}

function messageText(value: unknown): string | null {
  if (typeof value === "string") return value
  if (!Array.isArray(value)) return null
  const parts: string[] = []
  for (const item of value) {
    if (!isRecord(item) || !["text", "input_text"].includes(String(item.type)) || typeof item.text !== "string") return null
    parts.push(item.text)
  }
  return parts.join("\n")
}

export interface ParsedChatCompletionRequest {
  payload: PublicAskPayload
  selection: PublicModelSelection
}

export function parseChatCompletionPayload(input: unknown): ParseResult<ParsedChatCompletionRequest> {
  if (!isRecord(input)) return { ok: false, message: "The request body must be a JSON object." }
  if (input.stream === true) return { ok: false, message: "Streaming responses are not supported yet; send stream:false." }
  if (!Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 24) {
    return { ok: false, message: "messages must contain between 1 and 24 entries." }
  }

  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = []
  for (const item of input.messages) {
    if (!isRecord(item) || !["user", "assistant", "system"].includes(String(item.role))) {
      return { ok: false, message: "Only text user, assistant, and system messages are supported." }
    }
    const content = messageText(item.content)
    if (content === null) return { ok: false, message: "Message content must be plain text." }
    messages.push({ role: item.role, content })
  }

  const lastUserIndex = messages.map((message) => message.role).lastIndexOf("user")
  if (lastUserIndex < 0) return { ok: false, message: "At least one user message is required." }
  const question = messages[lastUserIndex].content.trim()
  if (question.length < 2) return { ok: false, message: "The last user message must contain at least two characters." }
  if (question.length > MAX_QUESTION_LENGTH) return { ok: false, message: `The last user message cannot exceed ${MAX_QUESTION_LENGTH} characters.` }

  const selection = parseModelSelection(input, true)
  if (!selection.ok) return selection

  const history = messages
    .slice(0, lastUserIndex)
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-MAX_HISTORY_TURNS)
    .map((message) => ({
      role: message.role === "user" ? "user" as const : "model" as const,
      text: message.content.trim().slice(0, MAX_HISTORY_TEXT_LENGTH),
    }))
    .filter((turn) => turn.text)

  const metadata = isRecord(input.metadata) ? input.metadata : {}
  return {
    ok: true,
    value: {
      selection: selection.value!,
      payload: {
        question,
        providerId: selection.value!.providerId,
        modelId: selection.value!.modelId,
        ...(typeof input.persona === "string"
          ? { persona: input.persona }
          : typeof metadata.persona === "string"
            ? { persona: metadata.persona }
            : {}),
        ...(typeof input.background === "string" && input.background.trim() ? { background: input.background.trim().slice(0, 400) } : {}),
        ...(history.length ? { history } : {}),
      },
    },
  }
}

export function selectedModelName(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`
}

export function assistantTextFromTibyanResponse(value: unknown): string {
  if (!isRecord(value)) return ""
  const cards = Array.isArray(value.purpleCards) ? value.purpleCards : []
  const text = cards.find((card) => isRecord(card) && typeof card.explanation === "string")?.explanation
  return typeof text === "string" ? text.trim() : typeof value.explanation === "string" ? value.explanation.trim() : ""
}

function nonNegativeCount(value: unknown): number | undefined {
  if (typeof value !== "number" && !(typeof value === "string" && value.trim())) return undefined
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : undefined
}

/** Maps only token counts actually returned by a provider; never estimates usage. */
export function normalizeProviderUsage(value: unknown): {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
} | undefined {
  if (!isRecord(value)) return undefined
  const prompt = nonNegativeCount(value.prompt_tokens ?? value.promptTokenCount ?? value.input_tokens)
  const completion = nonNegativeCount(value.completion_tokens ?? value.candidatesTokenCount ?? value.output_tokens)
  const total = nonNegativeCount(value.total_tokens ?? value.totalTokenCount)
  if (prompt === undefined && completion === undefined && total === undefined) return undefined
  return {
    ...(prompt !== undefined ? { prompt_tokens: prompt } : {}),
    ...(completion !== undefined ? { completion_tokens: completion } : {}),
    ...(total !== undefined
      ? { total_tokens: total }
      : prompt !== undefined && completion !== undefined
        ? { total_tokens: prompt + completion }
        : {}),
  }
}

export function setNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("Vary", "Authorization")
  return response
}
