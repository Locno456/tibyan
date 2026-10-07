import assert from "node:assert/strict"
import test from "node:test"
import { parseSourceModes, parseNoEvidenceMode } from "../lib/sourcePreferences"
import { POST } from "../app/api/ask/route"
import { NextRequest } from "next/server"

test("source selection defaults to legacy mode and rejects unknown connector names", () => {
  assert.deepEqual(parseSourceModes(undefined), ["local", "mcp"])
  assert.deepEqual(parseSourceModes(["mcp", "mcp"]), ["mcp"])
  assert.deepEqual(parseSourceModes(["local", "web"]), ["local", "web"])
  assert.deepEqual(parseSourceModes(["local", "https://example.com"]), [])
  assert.equal(parseNoEvidenceMode("direct_unverified"), "direct_unverified")
  assert.equal(parseNoEvidenceMode("unexpected"), "request_sources")
})

test("turning off local data never returns a local Quran card", async () => {
  const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "أعطني الآية 1 من سورة الفاتحة", sourceModes: [] }),
  }))
  const data = await response.json()
  assert.deepEqual(data.blueCards, [])
  assert.equal(data.metrics.retrievalSource, "sources_disabled")
})

test("disabling all evidence sources asks for sources instead of claiming citations", async () => {
  const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "ما معنى التوحيد؟", sourceModes: [] }),
  }))
  const data = await response.json()
  assert.equal(data.status, "abstain")
  assert.deepEqual(data.blueCards, [])
  assert.equal(data.metrics.retrievalSource, "sources_disabled")
})
