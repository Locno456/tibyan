import assert from "node:assert/strict"
import test from "node:test"
import { generateWithAIProvider, type AIProviderSelection } from "../lib/aiRuntime"
import type { BoundMcpTool, McpCallRecord } from "../lib/mcp"
import { buildMcpSourceCards, hasUsableMcpEvidence } from "../lib/mcpEvidence"

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } })
}

const tool: BoundMcpTool = {
  alias: "ic_search_hadith",
  name: "search_hadith",
  description: "بحث قراءة فقط في الحديث",
  inputSchema: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
  },
  providerId: "islamic_content",
  providerLabel: "Islamic Content",
  endpoint: "https://mcp.example.test/mcp",
}

const selection = (providerId: "openai" | "anthropic" | "google"): AIProviderSelection => ({
  providerId,
  modelId: providerId === "openai"
    ? "gpt-4o-mini"
    : providerId === "anthropic"
      ? "claude-3-5-sonnet-latest"
      : "gemini-2.0-flash",
  apiKey: "test-key-not-a-credential",
  supportsTools: true,
})

async function withMockedFetch<T>(mock: typeof fetch, run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch
  globalThis.fetch = mock
  try {
    return await run()
  } finally {
    globalThis.fetch = originalFetch
  }
}

test("requires a discovered read-only MCP tool when local evidence is absent (OpenAI-compatible)", async () => {
  const requestBodies: any[] = []
  let responseIndex = 0
  const fakeFetch: typeof fetch = async (_input, init) => {
    requestBodies.push(JSON.parse(String(init?.body || "{}")))
    responseIndex += 1
    return responseIndex === 1
      ? jsonResponse({
          choices: [{
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "call_1",
                type: "function",
                function: { name: tool.alias, arguments: JSON.stringify({ query: "حديث الصيام" }) },
              }],
            },
          }],
        })
      : jsonResponse({ choices: [{ message: { role: "assistant", content: "وجدت نتيجة من المصدر." } }] })
  }

  const executedAliases: string[] = []
  const executeTool = async (alias: string, args: unknown): Promise<McpCallRecord> => {
    executedAliases.push(alias)
    return {
      alias,
      toolName: tool.name,
      providerId: tool.providerId,
      providerLabel: tool.providerLabel,
      endpoint: tool.endpoint,
      args: args as Record<string, unknown>,
      result: { content: [{ type: "text", text: "نص مصدر موثوق متعلق بالسؤال." }] },
    }
  }

  const result = await withMockedFetch(fakeFetch, () => generateWithAIProvider(
    selection("openai"),
    "لا توجد أدلة محلية؛ ابحث قبل الإجابة.",
    "استعمل المصادر فقط.",
    [tool],
    executeTool,
    { maxCalls: 2, maxRounds: 2, requireToolCall: true },
  ))

  assert.deepEqual(executedAliases, [tool.alias])
  assert.equal(requestBodies[0]?.tool_choice, "required")
  assert.equal(requestBodies[1]?.tool_choice, "auto")
  assert.equal(result.toolCalls.length, 1)
  assert.equal(result.text, "وجدت نتيجة من المصدر.")
})

test("requires a discovered read-only MCP tool on Anthropic's first turn", async () => {
  const requestBodies: any[] = []
  let responseIndex = 0
  const fakeFetch: typeof fetch = async (_input, init) => {
    requestBodies.push(JSON.parse(String(init?.body || "{}")))
    responseIndex += 1
    return responseIndex === 1
      ? jsonResponse({
          content: [{ type: "tool_use", id: "tool_1", name: tool.alias, input: { query: "حديث الصيام" } }],
        })
      : jsonResponse({ content: [{ type: "text", text: "وجدت نتيجة من المصدر." }] })
  }

  const result = await withMockedFetch(fakeFetch, () => generateWithAIProvider(
    selection("anthropic"),
    "لا توجد أدلة محلية؛ ابحث قبل الإجابة.",
    "استعمل المصادر فقط.",
    [tool],
    async (alias, args) => ({
      alias,
      toolName: tool.name,
      providerId: tool.providerId,
      providerLabel: tool.providerLabel,
      endpoint: tool.endpoint,
      args: args as Record<string, unknown>,
      result: { content: [{ type: "text", text: "نص مصدر موثوق متعلق بالسؤال." }] },
    }),
    { maxCalls: 2, maxRounds: 2, requireToolCall: true },
  ))

  assert.deepEqual(requestBodies[0]?.tool_choice, { type: "any" })
  assert.equal(requestBodies[1]?.tool_choice, undefined)
  assert.equal(result.toolCalls.length, 1)
  assert.equal(result.text, "وجدت نتيجة من المصدر.")
})

test("forces one Gemini function call, then returns to automatic tool selection", async () => {
  const requestBodies: any[] = []
  let responseIndex = 0
  const fakeFetch: typeof fetch = async (_input, init) => {
    requestBodies.push(JSON.parse(String(init?.body || "{}")))
    responseIndex += 1
    return responseIndex === 1
      ? jsonResponse({
          candidates: [{
            content: {
              role: "model",
              parts: [{ functionCall: { name: tool.alias, args: { query: "حديث الصيام" } } }],
            },
            finishReason: "STOP",
          }],
        })
      : jsonResponse({
          candidates: [{
            content: { role: "model", parts: [{ text: "وجدت نتيجة من المصدر." }] },
            finishReason: "STOP",
          }],
        })
  }

  const result = await withMockedFetch(fakeFetch, () => generateWithAIProvider(
    selection("google"),
    "لا توجد أدلة محلية؛ ابحث قبل الإجابة.",
    "استعمل المصادر فقط.",
    [tool],
    async (alias, args) => ({
      alias,
      toolName: tool.name,
      providerId: tool.providerId,
      providerLabel: tool.providerLabel,
      endpoint: tool.endpoint,
      args: args as Record<string, unknown>,
      result: { content: [{ type: "text", text: "نص مصدر موثوق متعلق بالسؤال." }] },
    }),
    { maxCalls: 2, maxRounds: 2, requireToolCall: true },
  ))

  assert.equal(requestBodies[0]?.toolConfig?.functionCallingConfig?.mode, "ANY")
  assert.equal(requestBodies[1]?.toolConfig, undefined)
  assert.deepEqual(requestBodies[1]?.contents?.map((turn: any) => turn.role), ["user", "model", "user"])
  assert.equal(requestBodies[1]?.contents?.[2]?.parts?.[0]?.functionResponse?.name, tool.alias)
  assert.equal(requestBodies[1]?.contents?.some((turn: any) => turn.role === "function"), false)
  assert.equal(result.toolCalls.length, 1)
  assert.equal(result.text, "وجدت نتيجة من المصدر.")
})

test("redacts provider credentials from upstream error text", async () => {
  const credential = "test-key-not-a-credential"
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({
    error: { message: `Authorization: Bearer ${credential} was rejected` },
  }), { status: 401, headers: { "Content-Type": "application/json" } })

  await assert.rejects(
    () => withMockedFetch(fakeFetch, () => generateWithAIProvider(
      { ...selection("openai"), apiKey: credential },
      "سؤال اختباري",
      "تعليمات اختبارية",
    )),
    (error: any) => {
      assert.equal(String(error?.message || error).includes(credential), false)
      return true
    },
  )
})

test("upstream provider outage is an error, not a fabricated source-backed answer", async () => {
  // Error status, not a successful JSON envelope.
  const errorFetch: typeof fetch = async () => new Response(JSON.stringify({ error: { message: "Service unavailable" } }), {
    status: 503, headers: { "Content-Type": "application/json" },
  })
  await assert.rejects(() => withMockedFetch(errorFetch, () => generateWithAIProvider(
    selection("openai"), "سؤال", "تعليمات", [tool],
  )), /503|Service unavailable/)
})

test("failed MCP call remains a recorded error and cannot become evidence", async () => {
  let count = 0
  const fakeFetch: typeof fetch = async () => {
    count += 1
    return count === 1
      ? jsonResponse({ choices: [{ message: { role: "assistant", content: null, tool_calls: [{
        id: "failed_call", type: "function", function: { name: tool.alias, arguments: JSON.stringify({ query: "حديث" }) },
      }] } }] })
      : jsonResponse({ choices: [{ message: { role: "assistant", content: "لم أجد دليلاً موثقاً." } }] })
  }
  const result = await withMockedFetch(fakeFetch, () => generateWithAIProvider(
    selection("openai"), "ابحث", "تعليمات", [tool], async () => { throw new Error("MCP timeout") },
    { maxCalls: 1, maxRounds: 1, requireToolCall: true },
  ))
  assert.equal(result.toolCalls.length, 1)
  assert.match(String(result.toolCalls[0].error), /MCP timeout/)
  assert.equal(hasUsableMcpEvidence(result.toolCalls), false)
  assert.deepEqual(buildMcpSourceCards(result.toolCalls, "حديث"), [])
})
