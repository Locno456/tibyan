import type {
  AIModelCatalog,
  AIModelInfo,
  AIModelSelection,
  AIProviderId,
  AIProviderInfo,
} from "./aiProviderTypes"

interface ProviderDefinition {
  id: AIProviderId
  name: string
  shortName: string
  mark: string
  color: string
  keyNames: string[]
  modelEnvNames: string[]
  listModels: (apiKey: string) => Promise<AIModelInfo[]>
}

const CATALOG_TTL_MS = 60_000
const PROVIDER_TIMEOUT_MS = 7_000
const MAX_MODELS_PER_PROVIDER = 1_200
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,199}$/
const NON_CHAT_MODEL = /(?:^|[-_/])(?:text[-_]?embedding|embedding|embed|rerank|moderation|whisper|transcrib(?:e|er|tion)|tts|speech|audio|realtime|image[-_]?generation|dall[-_]?e|sora|video)(?:$|[-_/])/i

const DEFINITIONS: ProviderDefinition[] = [
  {
    id: "google",
    name: "Google AI Studio",
    shortName: "Google",
    mark: "G",
    color: "#4285F4",
    keyNames: ["GEMINI_API_KEY", "GIMINI_API_KEY"],
    modelEnvNames: ["GEMINI_MODEL", "GOOGLE_MODEL"],
    listModels: listGoogleModels,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    shortName: "Claude",
    mark: "A",
    color: "#C15F3C",
    keyNames: ["ANTHROPIC_API_KEY"],
    modelEnvNames: ["ANTHROPIC_MODEL"],
    listModels: listAnthropicModels,
  },
  {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    mark: "O",
    color: "#168A6A",
    keyNames: ["OPENAI_API_KEY"],
    modelEnvNames: ["OPENAI_MODEL"],
    listModels: listOpenAIModels,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    shortName: "Router",
    mark: "R",
    color: "#7559B8",
    keyNames: ["OPENROUTER_API_KEY"],
    modelEnvNames: ["OPENROUTER_MODEL"],
    listModels: listOpenRouterModels,
  },
  {
    id: "groq",
    name: "Groq",
    shortName: "Groq",
    mark: "G",
    color: "#E65A24",
    keyNames: ["GROQ_API_KEY"],
    modelEnvNames: ["GROQ_MODEL"],
    listModels: listGroqModels,
  },
  {
    id: "zai",
    name: "Z.ai",
    shortName: "Z.ai",
    mark: "Z",
    color: "#3B63D9",
    keyNames: ["ZAI_API_KEY", "Z_AI_API_KEY", "ZHIPUAI_API_KEY"],
    modelEnvNames: ["ZAI_MODEL", "ZHIPUAI_MODEL"],
    listModels: listZaiModels,
  },
  {
    id: "mistral",
    name: "Mistral AI",
    shortName: "Mistral",
    mark: "M",
    color: "#D97706",
    keyNames: ["MISTRAL_API_KEY"],
    modelEnvNames: ["MISTRAL_MODEL"],
    listModels: listMistralModels,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    shortName: "DeepSeek",
    mark: "D",
    color: "#3B68C4",
    keyNames: ["DEEPSEEK_API_KEY"],
    modelEnvNames: ["DEEPSEEK_MODEL"],
    listModels: listDeepSeekModels,
  },
]

let catalogCache: { expiresAt: number; providers: AIProviderInfo[] } | undefined
let catalogRequest: Promise<AIModelCatalog> | undefined

function timeoutSignal(timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, dispose: () => clearTimeout(timer) }
}

function redactProviderSecrets(value: unknown, secret?: string): string {
  let message = String((value as any)?.message || value || "")
  if (secret && secret.length >= 4) message = message.split(secret).join("[مخفي]")
  return message
    .replace(/([?&](?:api[_-]?key|key|token)=)[^&#\s]+/gi, "$1[مخفي]")
    .replace(/(\b(?:authorization|x-api-key|x-goog-api-key)\s*[:=]\s*(?:bearer\s+)?)[^\s,;]+/gi, "$1[مخفي]")
    .replace(/\b(?:sk-(?:ant-)?[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9_-]{16,}|xai-[A-Za-z0-9_-]{16,})\b/gi, "[مخفي]")
}

function getErrorMessage(value: any, status: number, apiKey: string): string {
  const message = value?.error?.message || value?.message || value?.error || `HTTP ${status}`
  return redactProviderSecrets(message, apiKey).replace(/\s+/g, " ").slice(0, 220)
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<any> {
  const apiKey = headers["x-api-key"] || headers["x-goog-api-key"] || headers.Authorization?.replace(/^Bearer\s+/i, "") || ""
  const { signal, dispose } = timeoutSignal(PROVIDER_TIMEOUT_MS)
  try {
    const response = await fetch(url, { method: "GET", headers, cache: "no-store", signal })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new Error(getErrorMessage(body, response.status, apiKey))
    return body
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("انتهت مهلة الاتصال بواجهة نماذج المزود")
    throw new Error(redactProviderSecrets(error, apiKey).slice(0, 220))
  } finally {
    dispose()
  }
}

function bearer(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
}

function asNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : undefined
}

function modelId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const id = value.replace(/^models\//, "").trim()
  return isValidAIModelId(id) ? id : undefined
}

export function isValidAIModelId(value: unknown): value is string {
  return typeof value === "string" && MODEL_ID_PATTERN.test(value) && !/[\r\n]/.test(value)
}

/** Keeps text-generating models and excludes embedding, moderation, speech, and media-only ids. */
export function isLikelyChatModel(id: string): boolean {
  return isValidAIModelId(id) && !NON_CHAT_MODEL.test(id)
}

function normalizeModel(
  idValue: unknown,
  nameValue?: unknown,
  extras: { contextWindow?: unknown; maxOutputTokens?: unknown; supportsTools?: unknown } = {}
): AIModelInfo | null {
  const id = modelId(idValue)
  if (!id || !isLikelyChatModel(id)) return null
  const name = typeof nameValue === "string" && nameValue.trim() ? nameValue.trim() : id
  const contextWindow = asNumber(extras.contextWindow)
  const maxOutputTokens = asNumber(extras.maxOutputTokens)
  const supportsTools = typeof extras.supportsTools === "boolean" ? extras.supportsTools : undefined
  return {
    id,
    name: name.slice(0, 160),
    ...(contextWindow ? { contextWindow } : {}),
    ...(maxOutputTokens ? { maxOutputTokens } : {}),
    ...(supportsTools !== undefined ? { supportsTools } : {}),
    status: "listed",
  }
}

function rowsFrom(value: any): any[] {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.models)) return value.models
  return []
}

async function listGoogleModels(apiKey: string): Promise<AIModelInfo[]> {
  const models: AIModelInfo[] = []
  let pageToken = ""
  for (let page = 0; page < 5; page += 1) {
    const url = new URL("https://generativelanguage.googleapis.com/v1beta/models")
    url.searchParams.set("pageSize", "1000")
    if (pageToken) url.searchParams.set("pageToken", pageToken)
    const response = await fetchJson(url.toString(), { "x-goog-api-key": apiKey, Accept: "application/json" })
    for (const row of rowsFrom(response)) {
      const methods = Array.isArray(row?.supportedGenerationMethods) ? row.supportedGenerationMethods : []
      if (!methods.includes("generateContent")) continue
      const model = normalizeModel(row?.name, row?.displayName, {
        contextWindow: row?.inputTokenLimit,
        maxOutputTokens: row?.outputTokenLimit,
        supportsTools: true,
      })
      if (model) models.push(model)
    }
    pageToken = typeof response?.nextPageToken === "string" ? response.nextPageToken : ""
    if (!pageToken) break
  }
  return dedupeAndSort(models)
}

async function listAnthropicModels(apiKey: string): Promise<AIModelInfo[]> {
  const models: AIModelInfo[] = []
  let afterId = ""
  for (let page = 0; page < 4; page += 1) {
    const url = new URL("https://api.anthropic.com/v1/models")
    url.searchParams.set("limit", "1000")
    if (afterId) url.searchParams.set("after_id", afterId)
    const response = await fetchJson(url.toString(), {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      Accept: "application/json",
    })
    for (const row of rowsFrom(response)) {
      const model = normalizeModel(row?.id, row?.display_name, {
        contextWindow: row?.max_input_tokens,
        maxOutputTokens: row?.max_tokens,
        supportsTools: row?.capabilities?.tool_use?.supported,
      })
      if (model) models.push(model)
    }
    afterId = typeof response?.last_id === "string" ? response.last_id : ""
    if (!response?.has_more || !afterId) break
  }
  return dedupeAndSort(models)
}

async function listOpenAIModels(apiKey: string): Promise<AIModelInfo[]> {
  const response = await fetchJson("https://api.openai.com/v1/models", bearer(apiKey))
  return dedupeAndSort(rowsFrom(response)
    .map((row) => normalizeModel(row?.id, row?.id, {
      contextWindow: row?.context_window ?? row?.input_token_limit,
      maxOutputTokens: row?.max_output_tokens,
      supportsTools: row?.supports?.tools,
    }))
    .filter((model): model is AIModelInfo => !!model))
}

async function listOpenRouterModels(apiKey: string): Promise<AIModelInfo[]> {
  const response = await fetchJson("https://openrouter.ai/api/v1/models/user", {
    ...bearer(apiKey),
    "HTTP-Referer": "https://tibyan-demo.vercel.app/",
    "X-Title": "Tibyan",
  })
  return dedupeAndSort(rowsFrom(response)
    .filter((row) => {
      const output = row?.architecture?.output_modalities
      return !Array.isArray(output) || output.includes("text")
    })
    .map((row) => normalizeModel(row?.id, row?.name, {
      contextWindow: row?.context_length,
      maxOutputTokens: row?.top_provider?.max_completion_tokens,
      supportsTools: Array.isArray(row?.supported_parameters)
        ? row.supported_parameters.includes("tools")
        : undefined,
    }))
    .filter((model): model is AIModelInfo => !!model))
}

async function listGroqModels(apiKey: string): Promise<AIModelInfo[]> {
  const response = await fetchJson("https://api.groq.com/openai/v1/models", bearer(apiKey))
  return dedupeAndSort(rowsFrom(response)
    .filter((row) => row?.active !== false)
    .map((row) => normalizeModel(row?.id, row?.id, {
      contextWindow: row?.context_window,
      maxOutputTokens: row?.max_completion_tokens,
      supportsTools: row?.supports_tools,
    }))
    .filter((model): model is AIModelInfo => !!model))
}

async function listZaiModels(apiKey: string): Promise<AIModelInfo[]> {
  const response = await fetchJson("https://api.z.ai/api/paas/v4/models", bearer(apiKey))
  return dedupeAndSort(rowsFrom(response)
    .map((row) => normalizeModel(row?.id, row?.name || row?.id, {
      contextWindow: row?.context_window ?? row?.context_length ?? row?.max_context_length,
      maxOutputTokens: row?.max_output_tokens,
      supportsTools: row?.supports_tools,
    }))
    .filter((model): model is AIModelInfo => !!model))
}

async function listMistralModels(apiKey: string): Promise<AIModelInfo[]> {
  const response = await fetchJson("https://api.mistral.ai/v1/models", bearer(apiKey))
  return dedupeAndSort(rowsFrom(response)
    .filter((row) => row?.capabilities?.completion_chat !== false)
    .map((row) => normalizeModel(row?.id, row?.name || row?.id, {
      contextWindow: row?.max_context_length,
      maxOutputTokens: row?.max_output_tokens,
      supportsTools: row?.capabilities?.function_calling,
    }))
    .filter((model): model is AIModelInfo => !!model))
}

async function listDeepSeekModels(apiKey: string): Promise<AIModelInfo[]> {
  const response = await fetchJson("https://api.deepseek.com/models", bearer(apiKey))
  return dedupeAndSort(rowsFrom(response)
    .map((row) => normalizeModel(row?.id, row?.id, {
      contextWindow: row?.context_window ?? row?.context_length,
      maxOutputTokens: row?.max_output_tokens,
      supportsTools: row?.supports_tools,
    }))
    .filter((model): model is AIModelInfo => !!model))
}

function dedupeAndSort(models: AIModelInfo[]): AIModelInfo[] {
  const unique = new Map<string, AIModelInfo>()
  for (const model of models) if (!unique.has(model.id)) unique.set(model.id, model)
  return Array.from(unique.values())
    .sort((a, b) => a.name.localeCompare(b.name, "ar", { sensitivity: "base" }) || a.id.localeCompare(b.id))
    .slice(0, MAX_MODELS_PER_PROVIDER)
}

export function isAIProviderId(value: unknown): value is AIProviderId {
  return typeof value === "string" && DEFINITIONS.some((provider) => provider.id === value)
}

export function getApiKeyForProvider(providerId: AIProviderId): string | undefined {
  const provider = DEFINITIONS.find((item) => item.id === providerId)
  if (!provider) return undefined
  for (const keyName of provider.keyNames) {
    const value = process.env[keyName]?.trim()
    if (value) return value
  }
  return undefined
}

export function getProviderPublicInfo(providerId: AIProviderId): Pick<AIProviderInfo, "id" | "name" | "shortName" | "mark" | "color"> {
  const provider = DEFINITIONS.find((item) => item.id === providerId)!
  return {
    id: provider.id,
    name: provider.name,
    shortName: provider.shortName,
    mark: provider.mark,
    color: provider.color,
  }
}

export function getConfiguredProviderIds(): AIProviderId[] {
  return DEFINITIONS.filter((provider) => provider.keyNames.some((keyName) => !!process.env[keyName]?.trim()))
    .map((provider) => provider.id)
}

function requestedModelFor(provider: ProviderDefinition): string | undefined {
  for (const name of provider.modelEnvNames) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  if (provider.id === "google") return process.env.AI_DEFAULT_MODEL?.trim() || undefined
  return undefined
}

function modelPreference(providerId: AIProviderId, models: AIModelInfo[]): AIModelInfo | undefined {
  const preferredPatterns: Partial<Record<AIProviderId, RegExp[]>> = {
    google: [/flash-lite/i, /flash/i],
    anthropic: [/haiku/i, /sonnet/i],
    openai: [/gpt-4o-mini/i, /mini/i, /nano/i, /^gpt-/i],
    openrouter: [/:free$/i, /gpt-4o-mini/i, /:nitro$/i],
    groq: [/llama-3\.3-70b-versatile/i, /llama.*versatile/i, /llama/i],
    zai: [/glm.*air/i, /glm.*flash/i, /glm/i],
    mistral: [/ministral/i, /mistral-small/i, /mistral/i],
    deepseek: [/deepseek-chat/i, /deepseek/i],
  }
  const patterns = preferredPatterns[providerId] || []
  for (const pattern of patterns) {
    const match = models.find((model) => pattern.test(model.id) || pattern.test(model.name))
    if (match) return match
  }
  return models[0]
}

function normalizeRequestedGoogleModel(value: string): string {
  const aliases: Record<string, string> = {
    flashLite: "gemini-3.5-flash-lite",
    flash31Lite: "gemini-3.1-flash-lite",
    flash: "gemini-3.8-flash",
  }
  const withoutPrefix = value.replace(/^models\//, "")
  return aliases[withoutPrefix] || withoutPrefix
}

export function selectDefaultModel(providerId: AIProviderId, models: AIModelInfo[]): AIModelInfo | undefined {
  const provider = DEFINITIONS.find((item) => item.id === providerId)
  if (!provider || !models.length) return undefined
  const requested = requestedModelFor(provider)
  if (requested) {
    const normalized = providerId === "google" ? normalizeRequestedGoogleModel(requested) : requested
    const exact = models.find((model) => model.id === normalized)
    if (exact) return exact
  }
  return modelPreference(providerId, models)
}

export async function getAIModelCatalog(forceRefresh = false): Promise<AIModelCatalog> {
  const now = Date.now()
  if (!forceRefresh && catalogCache && now < catalogCache.expiresAt) {
    return makeCatalog(catalogCache.providers)
  }
  if (!forceRefresh && catalogRequest) return catalogRequest

  catalogRequest = (async () => {
    const configured = DEFINITIONS.filter((provider) => getApiKeyForProvider(provider.id))
    const providers = await Promise.all(configured.map(async (provider): Promise<AIProviderInfo> => {
      const apiKey = getApiKeyForProvider(provider.id)!
      const old = catalogCache?.providers.find((item) => item.id === provider.id)
      try {
        const models = await provider.listModels(apiKey)
        if (models.length === 0) throw new Error("لم تُرجع واجهة المزود أي نموذج محادثة نصي")
        return {
          id: provider.id,
          name: provider.name,
          shortName: provider.shortName,
          mark: provider.mark,
          color: provider.color,
          status: "connected",
          models,
        }
      } catch (error: any) {
        return {
          id: provider.id,
          name: provider.name,
          shortName: provider.shortName,
          mark: provider.mark,
          color: provider.color,
          status: "error",
          models: old?.models || [],
          error: redactProviderSecrets(error, apiKey).slice(0, 220),
        }
      }
    }))

    catalogCache = { expiresAt: Date.now() + CATALOG_TTL_MS, providers }
    return makeCatalog(providers)
  })()

  try {
    return await catalogRequest
  } finally {
    catalogRequest = undefined
  }
}

function makeCatalog(providers: AIProviderInfo[]): AIModelCatalog {
  const defaultSelection = chooseDefaultSelection(providers)
  return {
    checkedAt: new Date().toISOString(),
    providers: providers.map((provider) => ({ ...provider, models: provider.models.map((model) => ({ ...model })) })),
    ...(defaultSelection ? { defaultSelection } : {}),
  }
}

function chooseDefaultSelection(providers: AIProviderInfo[]): AIModelSelection | undefined {
  const configuredDefaultId = process.env.AI_DEFAULT_PROVIDER?.trim().toLowerCase()
  const available = providers.filter((provider) => provider.models.length > 0)
  const configuredDefault = available.find((provider) => provider.id === configuredDefaultId)
  const preference: AIProviderId[] = ["google", "groq", "openrouter", "openai", "anthropic", "zai", "mistral", "deepseek"]
  const provider = configuredDefault || preference.map((id) => available.find((item) => item.id === id)).find(Boolean)
  if (!provider) return undefined
  const model = selectDefaultModel(provider.id, provider.models)
  if (!model) return undefined
  return { providerId: provider.id, modelId: model.id, modelName: model.name, providerName: provider.name }
}

export async function resolveAISelection(input?: {
  providerId?: unknown
  modelId?: unknown
}): Promise<{
  providerId: AIProviderId
  modelId: string
  modelName?: string
  providerName: string
  apiKey: string
  supportsTools?: boolean
} | null> {
  if (input?.providerId != null || input?.modelId != null) {
    if (!isAIProviderId(input.providerId)) throw new Error("المزود المحدد غير معروف")
    const providerId = input.providerId
    const apiKey = getApiKeyForProvider(providerId)
    if (!apiKey) throw new Error("لا يوجد مفتاح خادم لهذا المزود؛ أضف متغير البيئة المناسب ثم أعد المحاولة")
    if (!isValidAIModelId(input.modelId)) throw new Error("معرّف النموذج غير صالح")
    const publicInfo = getProviderPublicInfo(providerId)
    const cachedProvider = catalogCache?.providers.find((item) => item.id === providerId)
    const cachedModel = cachedProvider?.models.find((model) => model.id === input.modelId)
    return {
      providerId,
      modelId: input.modelId,
      modelName: cachedModel?.name || input.modelId,
      providerName: publicInfo.name,
      apiKey,
      supportsTools: cachedModel?.supportsTools,
    }
  }

  const catalog = await getAIModelCatalog(false)
  const selection = catalog.defaultSelection
  if (!selection) return null
  const provider = catalog.providers.find((item) => item.id === selection.providerId)
  const model = provider?.models.find((item) => item.id === selection.modelId)
  const apiKey = getApiKeyForProvider(selection.providerId)
  if (!apiKey) return null
  return {
    ...selection,
    providerName: selection.providerName || provider?.name || selection.providerId,
    apiKey,
    supportsTools: model?.supportsTools,
  }
}

export function getPublicProviderStatuses(): Array<{ id: AIProviderId; name: string; configured: boolean }> {
  return DEFINITIONS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    configured: Boolean(getApiKeyForProvider(provider.id)),
  })).filter((provider) => provider.configured)
}
