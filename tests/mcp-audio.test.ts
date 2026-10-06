import test from "node:test"
import assert from "node:assert/strict"
import {
  McpHttpClient,
  parseMcpResponseBody,
  isReadOnlyMcpTool,
  toGeminiFunctionDeclarations,
  validateMcpArguments,
} from "../lib/mcp"
import {
  detectQuranAudioRequest,
  getSurahMetadata,
  getVerifiedAyah,
  matchAudioReciter,
} from "../lib/quranAudio"
import { getAudioCdnUrl, isAllowedAudioEdition } from "../lib/quranAudioService"
import { buildMcpSourceCards, hasUsableMcpEvidence } from "../lib/mcpEvidence"

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

test("parses JSON and server-sent MCP responses", () => {
  assert.deepEqual(parseMcpResponseBody(JSON.stringify({ jsonrpc: "2.0", id: 3, result: { tools: [] } }), "application/json"), {
    jsonrpc: "2.0",
    id: 3,
    result: { tools: [] },
  })
  assert.deepEqual(parseMcpResponseBody(
    "event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"ok\":true}}\n\n",
    "text/event-stream"
  ), { jsonrpc: "2.0", id: 1, result: { ok: true } })
})

test("performs MCP initialize, initialized notification, and tools/list over POST", async () => {
  const requests: any[] = []
  const responses = [
    jsonResponse({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "mock", version: "1" } } }),
    new Response(null, { status: 202 }),
    jsonResponse({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "lookup", description: "read", inputSchema: { type: "object", properties: {} } }] } }),
  ]
  const fetchMock: typeof fetch = async (_input, init) => {
    requests.push({ method: init?.method, body: JSON.parse(String(init?.body || "{}")), headers: new Headers(init?.headers) })
    const response = responses.shift()
    if (!response) throw new Error("No mocked response")
    return response
  }

  const client = new McpHttpClient("https://mcp.example.test/mcp", 500, fetchMock)
  const tools = await client.listTools()
  assert.equal(tools.length, 1)
  assert.equal(tools[0].name, "lookup")
  assert.equal(requests.length, 3)
  assert.ok(requests.every((request) => request.method === "POST"))
  assert.equal(requests[0].body.method, "initialize")
  assert.equal(requests[1].body.method, "notifications/initialized")
  assert.equal(requests[2].body.method, "tools/list")
})

test("exposes only safe actions in Gemini's schema and rejects mutating actions at runtime", () => {
  assert.equal(isReadOnlyMcpTool({
    name: "quran_services",
    description: "Quran lookup",
    inputSchema: {
      type: "object",
      properties: { action: { type: "string", enum: ["get_aya_audio", "add_note"] } },
      required: ["action"],
    },
  }), true)
  assert.equal(isReadOnlyMcpTool({ name: "quranSubmitNote", inputSchema: { type: "object", properties: {} } }), false)
  assert.equal(isReadOnlyMcpTool({
    name: "unbounded_actions",
    inputSchema: { type: "object", properties: { action: { type: "string" } }, required: ["action"] },
  }), false)

  const declaration = toGeminiFunctionDeclarations([{
    alias: "ic_quran_services",
    name: "quran_services",
    description: "Quran lookup",
    providerId: "islamic_content",
    providerLabel: "Islamic Content",
    endpoint: "https://mcp.example.test/mcp",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", description: "One of: 'get_aya_audio', 'add_note'" },
        suraNumber: { type: "integer" },
      },
      required: ["action"],
    },
  }])[0]

  assert.deepEqual(declaration.parameters?.properties.action.enum, ["get_aya_audio"])
  assert.deepEqual(validateMcpArguments({
    type: "object",
    properties: { action: { type: "string", enum: ["get_aya_audio"] }, suraNumber: { type: "integer" } },
    required: ["action"],
  }, { action: "get_aya_audio", suraNumber: 2, unexpected: "dropped" }), { action: "get_aya_audio", suraNumber: 2 })
  assert.throws(() => validateMcpArguments({
    type: "object",
    properties: { action: { type: "string", enum: ["add_note"] } },
    required: ["action"],
  }, { action: "add_note" }), /غير مسموحة|أثر جانبي/)
})

test("empty MCP searches do not count as evidence, while cited results get a source card", () => {
  const base = {
    alias: "ic_search",
    toolName: "search_hadith",
    providerId: "islamic_content",
    providerLabel: "Islamic Content",
    endpoint: "https://mcp.example.test/mcp",
    args: {},
  }
  assert.equal(hasUsableMcpEvidence([{
    ...base,
    result: { content: [{ type: "text", text: "No results found." }] },
  }]), false)
  assert.equal(hasUsableMcpEvidence([{
    ...base,
    result: { title: "شرح المسألة", description: "ملخص من المصدر", source_url: "https://islamic-content.com/item/1" },
  }]), true)
  const cards = buildMcpSourceCards([{
    ...base,
    result: {
      title: "شرح المسألة",
      author: "اللجنة العلمية",
      description: "ملخص من المصدر",
      content: "يوضح المصدر أن حكم زكاة الفطر واجب على المسلم القادر، ويذكر مقدارها ووقت إخراجها مع إحالة إلى المرجع الأصلي.",
      source_url: "https://islamic-content.com/item/1",
    },
  }], "حكم زكاة الفطر")
  assert.equal(cards.length, 1)
  assert.match(cards[0].text, /حكم زكاة الفطر واجب/)
  assert.equal(cards[0].evidenceExcerpt, true)
  assert.match(cards[0].source, /شرح المسألة.*اللجنة العلمية/)
  assert.equal(cards[0].source_url, "https://islamic-content.com/item/1")
  assert.equal(cards[0].sourceUrlIsDirect, true)
  const fallbackCard = buildMcpSourceCards([{
    ...base,
    result: { content: "هذا مقتطف مرتبط من النتيجة، لكن الأداة لم توفر رابطاً مباشراً للمادة الأصلية." },
  }])[0]
  assert.equal(fallbackCard.sourceUrlIsDirect, false)
  assert.match(fallbackCard.source, /لم تُرجع الأداة رابطاً مباشراً/)
  assert.equal("confidence" in cards[0], false)
})

test("parses full-surah and verse-range audio requests without changing Quran text", () => {
  assert.deepEqual(detectQuranAudioRequest("أريد تلاوة سورة البقرة من الآية 255 إلى الآية 257 بصوت مشاري العفاسي"), {
    surahNumber: 2,
    fromAyah: 255,
    toAyah: 257,
    reciterQuery: "مشاري العفاسي",
  })
  assert.deepEqual(detectQuranAudioRequest("أريد مقطع صوتي لسورة الإخلاص بصوت القارئ المحدد"), {
    surahNumber: 112,
    reciterQuery: undefined,
  })

  const firstAyah = getVerifiedAyah(1, 1)
  assert.equal(firstAyah?.globalNumber, 1)
  assert.equal(firstAyah?.text, "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ")
  assert.equal(getVerifiedAyah(2, 255)?.globalNumber, 262)
  assert.equal(getSurahMetadata(2)?.ayahCount, 286)
})

test("matches known reciters and validates fixed-host audio paths", () => {
  const reciters = [
    { id: "ar.husary", name: "محمود خليل الحصري", englishName: "Husary" },
    { id: "ar.alafasy", name: "مشاري العفاسي", englishName: "Alafasy" },
  ]
  assert.equal(matchAudioReciter(reciters, "الحصري")?.id, "ar.husary")
  assert.equal(isAllowedAudioEdition("ar.alafasy"), true)
  assert.equal(isAllowedAudioEdition("https://attacker.test/audio"), false)
  assert.equal(getAudioCdnUrl("ar.alafasy", 7), "https://cdn.islamic.network/quran/audio/128/ar.alafasy/7.mp3")
  assert.throws(() => getAudioCdnUrl("../../example", 1), /غير صالح/)
})
