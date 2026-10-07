import {
  generateWithGemini,
  generateWithGeminiTools,
  resolveModelName,
  type GeminiToolCallRecord,
} from "./gemini"
import {
  getApiKeyForProvider,
  getProviderPublicInfo,
  isValidAIModelId,
} from "./aiProviders"
import type { AIProviderId } from "./aiProviderTypes"
import {
  mcpResultForModel,
  toGeminiFunctionDeclarations,
  type BoundMcpTool,
  type McpCallRecord,
} from "./mcp"

export interface AIProviderSelection {
  providerId: AIProviderId
  modelId: string
  apiKey: string
  providerName?: string
  modelName?: string
  supportsTools?: boolean
}

export interface AIProviderResult {
  text: string
  usage?: unknown
  providerId: AIProviderId
  providerName: string
  model: string
  toolCalls: McpCallRecord[]
  toolRounds: number
}

const CHAT_ENDPOINTS: Partial<Record<AIProviderId, string>> = {
  openai: "https://api.openai.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  zai: "https://api.z.ai/api/paas/v4/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
}

function requestWithTimeout(timeoutMs = 25_000): { signal: AbortSignal; dispose: () => void } {
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

function responseMessage(body: any, status: number, apiKey: string): string {
  const message = body?.error?.message || body?.error?.type || body?.message || `HTTP ${status}`
  return redactProviderSecrets(message, apiKey).replace(/\s+/g, " ").slice(0, 280)
}

async function postJson(url: string, apiKey: string, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Promise<any> {
  const { signal, dispose } = requestWithTimeout()
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(extraHeaders["x-api-key"] ? {} : { Authorization: `Bearer ${apiKey}` }),
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(responseMessage(data, response.status, apiKey))
    return data
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("انتهت مهلة استجابة مزود النموذج")
    throw new Error(redactProviderSecrets(error, apiKey).slice(0, 280))
  } finally {
    dispose()
  }
}

function parseToolArguments(value: unknown): Record<string, unknown> {
  let parsed = value
  if (typeof value === "string") {
    try { parsed = JSON.parse(value) } catch { throw new Error("أعاد النموذج معاملات أداة غير صالحة") }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("معاملات أداة MCP يجب أن تكون كائناً")
  return parsed as Record<string, unknown>
}

function serializeToolResult(value: unknown): string {
  try { return JSON.stringify(value) } catch { return JSON.stringify({ error: "تعذّر تحويل نتيجة الأداة إلى JSON" }) }
}

function makeToolErrorRecord(alias: string, args: Record<string, unknown>, error: unknown): McpCallRecord {
  return {
    alias,
    toolName: alias,
    providerId: "",
    providerLabel: "MCP",
    endpoint: "",
    args,
    error: String((error as any)?.message || error).slice(0, 280),
  }
}

async function executeBoundTool(
  alias: string,
  input: unknown,
  executeTool: (alias: string, args: unknown) => Promise<McpCallRecord>,
): Promise<{ record: McpCallRecord; modelValue: unknown }> {
  let args: Record<string, unknown> = {}
  try { args = parseToolArguments(input) } catch (error) {
    const record = makeToolErrorRecord(alias, args, error)
    return { record, modelValue: { error: record.error } }
  }

  try {
    const record = await executeTool(alias, args)
    const modelValue = record.error
      ? { error: record.error, source: record.providerLabel, tool: record.toolName }
      : {
          source: record.providerLabel,
          tool: record.toolName,
          result: mcpResultForModel(record.result, 14_000),
        }
    return { record, modelValue }
  } catch (error) {
    const record = makeToolErrorRecord(alias, args, error)
    return { record, modelValue: { error: record.error } }
  }
}

function compatibleToolDefinitions(tools: BoundMcpTool[]) {
  return tools.slice(0, 128).map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.alias,
      description: `${tool.providerLabel}. ${tool.description || `استرجاع قراءة فقط عبر ${tool.name}`}`.slice(0, 1_000),
      parameters: tool.inputSchema,
    },
  }))
}

function extractCompatibleText(message: any): string {
  if (typeof message?.content === "string") return message.content.trim()
  if (Array.isArray(message?.content)) {
    return message.content.map((part: any) => typeof part?.text === "string" ? part.text : "").join("\n").trim()
  }
  return ""
}

async function generateOpenAICompatible(
  selection: AIProviderSelection,
  prompt: string,
  systemInstruction: string,
  tools: BoundMcpTool[],
  executeTool: (alias: string, args: unknown) => Promise<McpCallRecord>,
  limits: { maxCalls: number; maxRounds: number; requireToolCall?: boolean },
): Promise<{ text: string; usage?: unknown; toolCalls: McpCallRecord[]; toolRounds: number }> {
  const endpoint = CHAT_ENDPOINTS[selection.providerId]
  if (!endpoint) throw new Error("واجهة المحادثة لهذا المزود غير مهيأة")
  if (!isValidAIModelId(selection.modelId)) throw new Error("معرّف النموذج غير صالح")

  const toolSpecs = selection.supportsTools === false ? [] : compatibleToolDefinitions(tools)
  const messages: any[] = [
    { role: "system", content: systemInstruction },
    { role: "user", content: prompt },
  ]
  const toolCalls: McpCallRecord[] = []
  let totalCalls = 0
  let toolRounds = 0
  let usage: unknown
  let finalText = ""

  // A final no-tool turn is allowed after the last tool round so the model can summarize evidence.
  for (let requestIndex = 0; requestIndex <= limits.maxRounds; requestIndex += 1) {
    const body: Record<string, unknown> = {
      model: selection.modelId,
      messages,
      [selection.providerId === "openai" && /^(?:gpt-5|o[134])(?:-|$)/i.test(selection.modelId) ? "max_completion_tokens" : "max_tokens"]: 800,
    }
    if (!/^gpt-5|^o[134](?:-|$)/i.test(selection.modelId)) body.temperature = 0.3
    if (toolSpecs.length && toolRounds < limits.maxRounds && totalCalls < limits.maxCalls) {
      body.tools = toolSpecs
      body.tool_choice = limits.requireToolCall && requestIndex === 0 ? "required" : "auto"
    }

    const response = await postJson(endpoint, selection.apiKey, body)
    usage = response?.usage
    const message = response?.choices?.[0]?.message
    if (!message) throw new Error("لم تُرجع واجهة النموذج رسالة قابلة للقراءة")
    finalText = extractCompatibleText(message)
    const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : []
    if (!calls.length) break

    // Keep the exact tool-call envelope required by OpenAI-compatible APIs.
    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: calls,
    })
    toolRounds += 1

    const results = await Promise.all(calls.map(async (call: any) => {
      const alias = String(call?.function?.name || "")
      if (!alias) {
        const record = makeToolErrorRecord("unknown_tool", {}, "اسم أداة MCP مفقود")
        toolCalls.push(record)
        return { role: "tool", tool_call_id: String(call?.id || "missing-id"), content: serializeToolResult({ error: record.error }) }
      }
      if (totalCalls >= limits.maxCalls) {
        const record = makeToolErrorRecord(alias, {}, "بلغت المحادثة الحد الآمن لعدد استدعاءات المصادر")
        toolCalls.push(record)
        return { role: "tool", tool_call_id: String(call?.id || alias), content: serializeToolResult({ error: record.error }) }
      }
      totalCalls += 1
      const executed = await executeBoundTool(alias, call?.function?.arguments, executeTool)
      toolCalls.push(executed.record)
      return {
        role: "tool",
        tool_call_id: String(call?.id || alias),
        content: serializeToolResult(executed.modelValue),
      }
    }))
    messages.push(...results)
  }

  return { text: finalText, usage, toolCalls, toolRounds }
}

function anthropicText(blocks: any[]): string {
  return blocks.filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim()
}

async function generateAnthropic(
  selection: AIProviderSelection,
  prompt: string,
  systemInstruction: string,
  tools: BoundMcpTool[],
  executeTool: (alias: string, args: unknown) => Promise<McpCallRecord>,
  limits: { maxCalls: number; maxRounds: number; requireToolCall?: boolean },
): Promise<{ text: string; usage?: unknown; toolCalls: McpCallRecord[]; toolRounds: number }> {
  if (!isValidAIModelId(selection.modelId)) throw new Error("معرّف النموذج غير صالح")
  const messages: any[] = [{ role: "user", content: prompt }]
  const toolCalls: McpCallRecord[] = []
  const toolsForApi = selection.supportsTools === false ? [] : tools.slice(0, 128).map((tool) => ({
    name: tool.alias,
    description: `${tool.providerLabel}. ${tool.description || `استرجاع قراءة فقط عبر ${tool.name}`}`.slice(0, 1_000),
    input_schema: tool.inputSchema,
  }))
  let totalCalls = 0
  let toolRounds = 0
  let usage: unknown
  let finalText = ""

  for (let requestIndex = 0; requestIndex <= limits.maxRounds; requestIndex += 1) {
    const body: Record<string, unknown> = {
      model: selection.modelId,
      system: systemInstruction,
      messages,
      max_tokens: 800,
      temperature: 0.3,
    }
    if (toolsForApi.length && toolRounds < limits.maxRounds && totalCalls < limits.maxCalls) {
      body.tools = toolsForApi
      if (limits.requireToolCall && requestIndex === 0) body.tool_choice = { type: "any" }
    }

    const response = await postJson("https://api.anthropic.com/v1/messages", selection.apiKey, body, {
      "x-api-key": selection.apiKey,
      "anthropic-version": "2023-06-01",
    })
    usage = response?.usage
    const blocks = Array.isArray(response?.content) ? response.content : []
    finalText = anthropicText(blocks)
    const calls = blocks.filter((block: any) => block?.type === "tool_use")
    if (!calls.length) break

    messages.push({ role: "assistant", content: blocks })
    toolRounds += 1
    const toolResults = await Promise.all(calls.map(async (call: any) => {
      const alias = String(call?.name || "")
      if (!alias) {
        const record = makeToolErrorRecord("unknown_tool", {}, "اسم أداة MCP مفقود")
        toolCalls.push(record)
        return { type: "tool_result", tool_use_id: String(call?.id || "missing-id"), is_error: true, content: record.error }
      }
      if (totalCalls >= limits.maxCalls) {
        const record = makeToolErrorRecord(alias, {}, "بلغت المحادثة الحد الآمن لعدد استدعاءات المصادر")
        toolCalls.push(record)
        return { type: "tool_result", tool_use_id: String(call?.id || alias), is_error: true, content: record.error }
      }
      totalCalls += 1
      const executed = await executeBoundTool(alias, call.input, executeTool)
      toolCalls.push(executed.record)
      return {
        type: "tool_result",
        tool_use_id: String(call.id || alias),
        ...(executed.record.error ? { is_error: true } : {}),
        content: serializeToolResult(executed.modelValue),
      }
    }))
    messages.push({ role: "user", content: toolResults })
  }

  return { text: finalText, usage, toolCalls, toolRounds }
}

export async function generateWithAIProvider(
  selection: AIProviderSelection,
  prompt: string,
  systemInstruction: string,
  tools: BoundMcpTool[] = [],
  executeTool: (alias: string, args: unknown) => Promise<McpCallRecord> = async (alias, args) => makeToolErrorRecord(alias, (args || {}) as Record<string, unknown>, "أداة MCP غير متاحة"),
  limits: { maxCalls?: number; maxRounds?: number; requireToolCall?: boolean } = {},
): Promise<AIProviderResult> {
  const providerId = selection.providerId
  const providerName = selection.providerName || getProviderPublicInfo(providerId).name
  const apiKey = selection.apiKey || getApiKeyForProvider(providerId)
  if (!apiKey) throw new Error(`مفتاح ${providerName} غير مهيأ على الخادم`)
  if (!isValidAIModelId(selection.modelId)) throw new Error("معرّف النموذج غير صالح")
  const safeLimits = {
    maxCalls: Math.max(1, Math.min(limits.maxCalls ?? 8, 16)),
    maxRounds: Math.max(1, Math.min(limits.maxRounds ?? 4, 6)),
    requireToolCall: limits.requireToolCall === true,
  }

  let result: { text: string; usage?: unknown; toolCalls: McpCallRecord[]; toolRounds: number }
  try {
    if (providerId === "google") {
    const model = resolveModelName(selection.modelId)
    const config = { apiKey, model, temperature: 0.3, maxTokens: 800 }
    const declarations = tools.length && selection.supportsTools !== false
      ? toGeminiFunctionDeclarations(tools)
      : []
    if (declarations.length) {
      const gemini = await generateWithGeminiTools(
        prompt,
        config,
        systemInstruction,
        declarations,
        executeTool as (alias: string, args: unknown) => Promise<GeminiToolCallRecord>,
        safeLimits,
      )
      result = {
        text: gemini.text,
        usage: gemini.usage,
        toolCalls: gemini.toolCalls as McpCallRecord[],
        toolRounds: gemini.toolRounds,
      }
    } else {
      const gemini = await generateWithGemini(prompt, config, systemInstruction)
      result = { text: gemini.text, usage: gemini.usage, toolCalls: [], toolRounds: 0 }
    }
    } else if (providerId === "anthropic") {
      result = await generateAnthropic(selection, prompt, systemInstruction, tools, executeTool, safeLimits)
    } else {
      result = await generateOpenAICompatible(selection, prompt, systemInstruction, tools, executeTool, safeLimits)
    }
  } catch (error) {
    throw new Error(redactProviderSecrets(error, apiKey).slice(0, 280))
  }

  return {
    ...result,
    text: result.text.trim(),
    providerId,
    providerName,
    model: selection.modelId,
  }
}

export async function probeAIProvider(
  selection: AIProviderSelection,
): Promise<{ ok: boolean; providerId: AIProviderId; providerName: string; model: string; latencyMs: number; reply?: string; error?: string }> {
  const started = Date.now()
  try {
    const result = await generateWithAIProvider(
      selection,
      "أجب بكلمة واحدة فقط: OK",
      "أنت اختبار اتصال قصير. لا تضف شرحاً أو معلومات أخرى.",
      [],
    )
    if (!result.text) throw new Error("قبل المزود الطلب لكنه لم يُرجع نصاً")
    return {
      ok: true,
      providerId: selection.providerId,
      providerName: selection.providerName || getProviderPublicInfo(selection.providerId).name,
      model: selection.modelId,
      latencyMs: Date.now() - started,
      reply: result.text.slice(0, 80),
    }
  } catch (error: any) {
    return {
      ok: false,
      providerId: selection.providerId,
      providerName: selection.providerName || getProviderPublicInfo(selection.providerId).name,
      model: selection.modelId,
      latencyMs: Date.now() - started,
      error: String(error?.message || error).slice(0, 240),
    }
  }
}
