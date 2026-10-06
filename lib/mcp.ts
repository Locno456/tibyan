import type { FunctionDeclaration } from "@google/generative-ai"
import { APPROVED_MCP_PROVIDERS } from "./sources"

export const MCP_PROTOCOL_VERSION = "2024-11-05"
const DISCOVERY_TTL_MS = 5 * 60 * 1000
const EMPTY_DISCOVERY_TTL_MS = 15_000
const MCP_TIMEOUT_MS = 4_500

export interface McpToolDefinition {
  name: string
  description?: string
  inputSchema: Record<string, any>
}

export interface BoundMcpTool extends McpToolDefinition {
  alias: string
  providerId: string
  providerLabel: string
  endpoint: string
}

export interface McpProviderStatus {
  id: string
  label: string
  endpoint: string
  status: "connected" | "cached" | "unavailable"
  toolCount: number
  error?: string
}

export interface McpCallRecord {
  alias: string
  toolName: string
  providerId: string
  providerLabel: string
  endpoint: string
  args: Record<string, unknown>
  result?: any
  error?: string
}

interface ProviderConfig {
  id: string
  label: string
  endpoint: string
  prefix: string
}

interface CachedCatalog {
  expiresAt: number
  tools: BoundMcpTool[]
  providers: McpProviderStatus[]
}

const ACTION_FIELDS = new Set(["action", "operation", "command", "method"])
const MUTATING_WORDS = new Set([
  "add", "create", "delete", "remove", "update", "edit", "write", "submit", "post", "put", "patch",
  "publish", "upload", "modify", "set", "change", "send", "subscribe", "vote", "like", "rate", "record",
  "insert", "upsert", "save", "store", "execute", "run", "trigger", "launch", "register", "reset", "clear",
  "revoke", "approve", "reject", "confirm", "activate", "deactivate", "disable", "enable", "cancel", "archive",
  "restore", "comment", "report", "اضف", "اضافة", "انشئ", "انشاء", "احذف", "حذف", "عدل", "تعديل", "حدث",
  "تحديث", "اكتب", "كتابة", "ارسل", "ارسال", "انشر", "نشر", "ارفع", "رفع", "سجل", "تسجيل", "اشترك", "اشتراك",
  "احفظ", "حفظ", "غير", "تغيير", "علق", "تعليق",
])
const MUTATING_TOOL_NAME_WORDS = new Set(Array.from(MUTATING_WORDS).filter((word) => !["comment", "report"].includes(word)))

let cachedCatalog: CachedCatalog | undefined

function getProviderConfigs(): ProviderConfig[] {
  const primary = process.env.ISLAMIC_CONTENT_MCP_URL?.trim() || APPROVED_MCP_PROVIDERS.islamicContent.endpoint
  const secondarySetting = process.env.TAFSIR_MCP_URL?.trim()
  const providers: ProviderConfig[] = [
    {
      id: APPROVED_MCP_PROVIDERS.islamicContent.id,
      label: APPROVED_MCP_PROVIDERS.islamicContent.name,
      endpoint: primary,
      prefix: "ic",
    },
  ]

  if (secondarySetting?.toLowerCase() !== "off" && secondarySetting?.toLowerCase() !== "disabled") {
    providers.push({
      id: APPROVED_MCP_PROVIDERS.tafsirCenter.id,
      label: APPROVED_MCP_PROVIDERS.tafsirCenter.name,
      endpoint: secondarySetting || APPROVED_MCP_PROVIDERS.tafsirCenter.endpoint,
      prefix: "tc",
    })
  }

  return providers.filter((provider) => isValidMcpEndpoint(provider.endpoint))
}

function isValidMcpEndpoint(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")) &&
      !url.username && !url.password
  } catch {
    return false
  }
}

function abortSignal(timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, dispose: () => clearTimeout(timer) }
}

function parseSsePayload(text: string): any {
  const blocks = text.split(/\r?\n\r?\n/)
  for (const block of blocks) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n")
    if (!data || data === "[DONE]") continue
    try {
      return JSON.parse(data)
    } catch {
      // Ignore SSE keep-alives and non-JSON events.
    }
  }
  return null
}

export function parseMcpResponseBody(text: string, contentType = ""): any {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (contentType.includes("text/event-stream") || trimmed.startsWith("event:") || trimmed.startsWith("data:")) {
    return parseSsePayload(trimmed)
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return parseSsePayload(trimmed)
  }
}

export class McpHttpClient {
  private sessionId?: string
  private protocolVersion = MCP_PROTOCOL_VERSION
  private initializePromise?: Promise<void>
  private requestId = 1

  constructor(
    readonly endpoint: string,
    private readonly timeoutMs = MCP_TIMEOUT_MS,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async post(payload: Record<string, unknown>, includeProtocolHeader = true): Promise<any> {
    const { signal, dispose } = abortSignal(this.timeoutMs)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    }
    if (this.sessionId) headers["MCP-Session-Id"] = this.sessionId
    if (includeProtocolHeader) headers["MCP-Protocol-Version"] = this.protocolVersion

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
        signal,
      })
      const returnedSession = response.headers.get("mcp-session-id")
      if (returnedSession) this.sessionId = returnedSession

      const bodyText = await response.text()
      if (!response.ok && response.status !== 202) {
        throw new Error(`MCP HTTP ${response.status}${bodyText ? `: ${bodyText.slice(0, 240)}` : ""}`)
      }
      if (!bodyText.trim()) return null

      const envelope = parseMcpResponseBody(bodyText, response.headers.get("content-type") || "")
      if (envelope?.error) {
        throw new Error(String(envelope.error.message || "MCP JSON-RPC error").slice(0, 240))
      }
      return envelope?.result ?? envelope
    } catch (error: any) {
      if (error?.name === "AbortError") throw new Error(`MCP timeout after ${this.timeoutMs}ms`)
      throw error
    } finally {
      dispose()
    }
  }

  async initialize(): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = (async () => {
        const result = await this.post({
          jsonrpc: "2.0",
          id: this.requestId++,
          method: "initialize",
          params: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: "tibyan", version: "1.0.0" },
          },
        }, false)
        if (result?.protocolVersion && typeof result.protocolVersion === "string") {
          this.protocolVersion = result.protocolVersion
        }

        // Stateless servers may not need a notification; failure here must not hide a successful initialize.
        try {
          await this.post({ jsonrpc: "2.0", method: "notifications/initialized" })
        } catch {
          // Continue; tools/list or tools/call will surface actual transport errors.
        }
      })()
    }
    await this.initializePromise
  }

  async request(method: string, params?: Record<string, unknown>): Promise<any> {
    await this.initialize()
    return this.post({
      jsonrpc: "2.0",
      id: this.requestId++,
      method,
      ...(params ? { params } : {}),
    })
  }

  async listTools(): Promise<McpToolDefinition[]> {
    const result = await this.request("tools/list")
    if (!result || !Array.isArray(result.tools)) throw new Error("MCP tools/list did not return a tools array")
    return result.tools
      .filter((tool: any) => tool && typeof tool.name === "string" && tool.inputSchema && typeof tool.inputSchema === "object")
      .map((tool: any) => ({
        name: tool.name,
        description: typeof tool.description === "string" ? tool.description : "",
        inputSchema: tool.inputSchema,
      }))
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    return this.request("tools/call", { name, arguments: args })
  }
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function actionWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .split(/[^a-z0-9\u0621-\u064A]+/)
    .filter(Boolean)
}

function isMutatingAction(value: unknown): boolean {
  return typeof value === "string" && actionWords(value.trim()).some((word) => MUTATING_WORDS.has(word))
}

function isMutatingToolName(value: string): boolean {
  return actionWords(value).some((word) => MUTATING_TOOL_NAME_WORDS.has(word))
}

function getActionOptions(property: any, fallbackDescription = ""): unknown[] {
  if (Array.isArray(property?.enum)) return property.enum
  const descriptions = [property?.description, fallbackDescription].filter((item) => typeof item === "string")
  for (const description of descriptions) {
    const quoted = (description.match(/[\"'`]([A-Za-z][A-Za-z0-9_-]{0,63})[\"'`]/g) || [])
      .map((entry: string) => entry.slice(1, -1))
    if (quoted.length) return quoted
  }
  return []
}

function hasSafeActionContract(schema: any, fallbackDescription: string, depth = 0): boolean {
  if (depth > 6 || !isPlainObject(schema)) return depth <= 6
  const properties = isPlainObject(schema.properties) ? schema.properties : {}
  const required = Array.isArray(schema.required) ? schema.required : []

  for (const [key, property] of Object.entries(properties)) {
    if (ACTION_FIELDS.has(key.toLowerCase())) {
      if (!isPlainObject(property) || !required.includes(key)) return false
      const options = getActionOptions(property, fallbackDescription)
      if (!options.length || options.every(isMutatingAction)) return false
    } else if (isPlainObject(property) && !hasSafeActionContract(property, fallbackDescription, depth + 1)) {
      return false
    }
  }

  if (isPlainObject(schema.items) && !hasSafeActionContract(schema.items, fallbackDescription, depth + 1)) return false
  return true
}

export function isReadOnlyMcpTool(tool: McpToolDefinition): boolean {
  return !!tool.name && !isMutatingToolName(tool.name) && hasSafeActionContract(tool.inputSchema, tool.description || "")
}

function geminiType(type: unknown): string | undefined {
  const selected = Array.isArray(type) ? type.find((item) => item !== "null") : type
  switch (selected) {
    case "string": return "STRING"
    case "integer": return "INTEGER"
    case "number": return "NUMBER"
    case "boolean": return "BOOLEAN"
    case "array": return "ARRAY"
    case "object": return "OBJECT"
    default: return undefined
  }
}

function normalizeGeminiProperty(schema: any, depth = 0): any | undefined {
  if (!isPlainObject(schema) || depth > 5) return undefined
  const type = geminiType(schema.type)
  if (!type) return undefined

  const out: Record<string, any> = { type }
  if (typeof schema.description === "string") out.description = schema.description.slice(0, 500)
  if (Array.isArray(schema.enum)) {
    const values = schema.enum.filter((item: unknown) => typeof item === "string" || typeof item === "number" || typeof item === "boolean")
    if (values.length) out.enum = values.slice(0, 100)
  }
  if (type === "OBJECT") {
    const properties: Record<string, any> = {}
    for (const [key, value] of Object.entries(schema.properties || {})) {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)) continue
      const property = normalizeGeminiProperty(value, depth + 1)
      if (property) properties[key] = property
    }
    out.properties = properties
    const required = Array.isArray(schema.required)
      ? schema.required.filter((key: unknown) => typeof key === "string" && Object.prototype.hasOwnProperty.call(properties, key))
      : []
    if (required.length) out.required = required
  }
  if (type === "ARRAY") {
    const items = normalizeGeminiProperty(schema.items, depth + 1)
    if (items) out.items = items
  }
  return out
}

function filterMutationEnums(schema: any, fallbackDescription = ""): any {
  if (!isPlainObject(schema)) return schema
  const out: Record<string, any> = { ...schema }
  if (isPlainObject(out.properties)) {
    out.properties = { ...out.properties }
    for (const [key, property] of Object.entries(out.properties)) {
      if (!isPlainObject(property)) continue
      if (ACTION_FIELDS.has(key.toLowerCase())) {
        const sourceActions = getActionOptions(property, fallbackDescription)
        const safeValues = sourceActions.filter((value: unknown) => !isMutatingAction(value))
        out.properties[key] = {
          ...property,
          enum: safeValues,
          description: safeValues.length < sourceActions.length
            ? `قراءة فقط؛ اختر إجراءً من: ${safeValues.join(", ")}`
            : property.description,
        }
      } else {
        out.properties[key] = filterMutationEnums(property, fallbackDescription)
      }
    }
  }
  if (isPlainObject(out.items)) out.items = filterMutationEnums(out.items, fallbackDescription)
  return out
}

function makeAlias(prefix: string, name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "")
  const alias = `${prefix}_${cleaned}`.slice(0, 64)
  return /^[A-Za-z_]/.test(alias) ? alias : `mcp_${alias}`.slice(0, 64)
}

function bindTools(provider: ProviderConfig, tools: McpToolDefinition[]): BoundMcpTool[] {
  const seen = new Set<string>()
  const bound: BoundMcpTool[] = []
  for (const tool of tools) {
    if (!isReadOnlyMcpTool(tool)) continue
    const inputSchema = filterMutationEnums(tool.inputSchema, tool.description || "")
    const normalized = normalizeGeminiProperty(inputSchema)
    if (!normalized || normalized.type !== "OBJECT") continue
    if (Object.entries(inputSchema.properties || {}).some(([key, value]: [string, any]) =>
      ACTION_FIELDS.has(key.toLowerCase()) && Array.isArray(value?.enum) && value.enum.length === 0
    )) continue

    const alias = makeAlias(provider.prefix, tool.name)
    if (seen.has(alias)) continue
    seen.add(alias)
    bound.push({
      ...tool,
      alias,
      providerId: provider.id,
      providerLabel: provider.label,
      endpoint: provider.endpoint,
      inputSchema,
    })
  }
  return bound
}

export function toGeminiFunctionDeclarations(tools: BoundMcpTool[]): FunctionDeclaration[] {
  return tools.slice(0, 128).map((tool) => {
    const parameters = normalizeGeminiProperty(filterMutationEnums(tool.inputSchema, tool.description || ""))
    return {
      name: tool.alias,
      description: `${tool.providerLabel}. ${tool.description || `استرجاع قراءة فقط عبر ${tool.name}`}`.slice(0, 1000),
      parameters,
    } as FunctionDeclaration
  })
}

function sanitizeValue(schema: any, value: any, path: string, depth = 0): any {
  if (depth > 6) throw new Error(`معامل متداخل بعمق غير مسموح: ${path}`)
  const type = Array.isArray(schema?.type) ? schema.type.find((item: string) => item !== "null") : schema?.type
  if (type === "string") {
    if (typeof value !== "string") throw new Error(`المعامل ${path} يجب أن يكون نصاً`)
    const result = value.slice(0, 2_000)
    if (Array.isArray(schema.enum) && schema.enum.length && !schema.enum.includes(result)) throw new Error(`قيمة غير مسموحة للمعامل ${path}`)
    const fieldName = path.split(".").pop()?.toLowerCase()
    if (fieldName && ACTION_FIELDS.has(fieldName) && isMutatingAction(result)) {
      throw new Error("تم رفض إجراء MCP ذي أثر جانبي")
    }
    return result
  }
  if (type === "integer" || type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value) || (type === "integer" && !Number.isInteger(value))) {
      throw new Error(`المعامل ${path} يجب أن يكون ${type === "integer" ? "عدداً صحيحاً" : "رقماً"}`)
    }
    if (typeof schema.minimum === "number" && value < schema.minimum) throw new Error(`قيمة ${path} أقل من الحد المسموح`)
    if (typeof schema.maximum === "number" && value > schema.maximum) throw new Error(`قيمة ${path} تتجاوز الحد المسموح`)
    return value
  }
  if (type === "boolean") {
    if (typeof value !== "boolean") throw new Error(`المعامل ${path} يجب أن يكون منطقياً`)
    return value
  }
  if (type === "array") {
    if (!Array.isArray(value)) throw new Error(`المعامل ${path} يجب أن يكون قائمة`)
    return value.slice(0, Math.min(Number(schema.maxItems) || 50, 50)).map((item, index) =>
      sanitizeValue(schema.items || {}, item, `${path}[${index}]`, depth + 1)
    )
  }
  if (type === "object") {
    if (!isPlainObject(value)) throw new Error(`المعامل ${path} يجب أن يكون كائناً`)
    const properties = isPlainObject(schema.properties) ? schema.properties : {}
    const required = Array.isArray(schema.required) ? schema.required : []
    for (const key of required) {
      if (!(key in value)) throw new Error(`المعامل المطلوب مفقود: ${path}.${key}`)
    }
    const safe: Record<string, unknown> = {}
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (key in value) safe[key] = sanitizeValue(propertySchema, value[key], `${path}.${key}`, depth + 1)
    }
    return safe
  }
  throw new Error(`مخطط غير مدعوم للمعامل ${path}`)
}

export function validateMcpArguments(schema: Record<string, any>, input: unknown): Record<string, unknown> {
  if (!isPlainObject(input)) throw new Error("معاملات الأداة يجب أن تكون كائناً")
  return sanitizeValue(schema, input, "arguments")
}

export function mcpResultForModel(result: any, maxChars = 14_000): unknown {
  let value = result
  if (isPlainObject(result) && Array.isArray(result.content)) {
    const texts = result.content
      .filter((item: any) => item?.type === "text" && typeof item.text === "string")
      .map((item: any) => item.text)
    value = result.structuredContent ?? (texts.length === 1 ? texts[0] : texts.length ? texts.join("\n") : result)
    if (typeof value === "string") {
      try { value = JSON.parse(value) } catch { /* Keep ordinary text. */ }
    }
    if (result.isError) value = { error: value }
  }

  let serialized: string
  try { serialized = JSON.stringify(value) } catch { serialized = String(value) }
  if (serialized.length <= maxChars) return value
  return { truncated: true, content: serialized.slice(0, maxChars) }
}

export function createMcpCatalogRunner(catalogTools: BoundMcpTool[], clients = new Map<string, McpHttpClient>()) {
  const toolsByAlias = new Map(catalogTools.map((tool) => [tool.alias, tool]))

  return async (alias: string, input: unknown): Promise<McpCallRecord> => {
    const tool = toolsByAlias.get(alias)
    if (!tool) throw new Error("أداة MCP غير متاحة")
    const args = validateMcpArguments(tool.inputSchema, input)
    const action = args.action
    if (isMutatingAction(action)) throw new Error("تم رفض أداة كتابة أو أثر جانبي")

    let client = clients.get(tool.providerId)
    if (!client) {
      client = new McpHttpClient(tool.endpoint)
      clients.set(tool.providerId, client)
    }

    try {
      const result = await client.callTool(tool.name, args)
      return {
        alias: tool.alias,
        toolName: tool.name,
        providerId: tool.providerId,
        providerLabel: tool.providerLabel,
        endpoint: tool.endpoint,
        args,
        result,
      }
    } catch (error: any) {
      return {
        alias: tool.alias,
        toolName: tool.name,
        providerId: tool.providerId,
        providerLabel: tool.providerLabel,
        endpoint: tool.endpoint,
        args,
        error: String(error?.message || error).slice(0, 300),
      }
    }
  }
}

export async function discoverMcpToolCatalog(): Promise<{
  tools: BoundMcpTool[]
  providers: McpProviderStatus[]
  runTool: (alias: string, args: unknown) => Promise<McpCallRecord>
}> {
  const configs = getProviderConfigs()
  const now = Date.now()
  if (cachedCatalog && now < cachedCatalog.expiresAt) {
    const cachedProviders = cachedCatalog.providers.map((provider) => ({ ...provider, status: "cached" as const }))
    return {
      tools: cachedCatalog.tools,
      providers: cachedProviders,
      runTool: createMcpCatalogRunner(cachedCatalog.tools),
    }
  }

  const discovery = await Promise.all(configs.map(async (provider) => {
    const client = new McpHttpClient(provider.endpoint)
    try {
      const listed = await client.listTools()
      const tools = bindTools(provider, listed)
      return { provider, client, tools, error: undefined as string | undefined }
    } catch (error: any) {
      return { provider, client, tools: [] as BoundMcpTool[], error: String(error?.message || error).slice(0, 180) }
    }
  }))

  const successfulIds = new Set(discovery.filter((item) => !item.error).map((item) => item.provider.id))
  let tools = discovery.flatMap((item) => item.tools)
  const statuses: McpProviderStatus[] = discovery.map((item) => ({
    id: item.provider.id,
    label: item.provider.label,
    endpoint: item.provider.endpoint,
    status: item.error ? "unavailable" : "connected",
    toolCount: item.tools.length,
    ...(item.error ? { error: item.error } : {}),
  }))

  // If one endpoint is temporarily unavailable, keep only that provider's last known read-only schemas briefly.
  if (cachedCatalog) {
    const stale = cachedCatalog.tools.filter((tool) => !successfulIds.has(tool.providerId))
    tools = [...tools, ...stale.filter((tool) => !tools.some((current) => current.alias === tool.alias))]
    for (const status of statuses) {
      if (status.status === "unavailable") {
        const previous = cachedCatalog.providers.find((provider) => provider.id === status.id)
        if (previous) status.toolCount = previous.toolCount
      }
    }
  }

  cachedCatalog = {
    expiresAt: now + (tools.length > 0 ? DISCOVERY_TTL_MS : EMPTY_DISCOVERY_TTL_MS),
    tools,
    providers: statuses,
  }

  const clients = new Map<string, McpHttpClient>()
  for (const item of discovery) clients.set(item.provider.id, item.client)
  return { tools, providers: statuses, runTool: createMcpCatalogRunner(tools, clients) }
}
