import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { isAgentModeEnabled, resolveAgentPreferences } from "../lib/agentRollout"
import { POST } from "../app/api/ask/route"
import { GET as config } from "../app/api/agent/config/route"

test("rollback accepts only server-side false and ignores user-selected unsafe modes", () => {
  assert.equal(isAgentModeEnabled({ TIBYAN_AGENT_ENABLED: "false" }), false)
  assert.equal(isAgentModeEnabled({ TIBYAN_AGENT_ENABLED: "true" }), true)
  assert.deepEqual(resolveAgentPreferences({ sourceModes: ["web"], noEvidenceMode: "direct_unverified" }, false), {
    sourceModes: ["local", "mcp"], noEvidenceMode: "request_sources",
  })
  assert.deepEqual(resolveAgentPreferences({ sourceModes: ["web"], noEvidenceMode: "direct_unverified" }, true), {
    sourceModes: ["web"], noEvidenceMode: "direct_unverified",
  })
})

test("rollback route keeps exact local Quran path even if client tries to disable it", async () => {
  const previous = process.env.TIBYAN_AGENT_ENABLED
  process.env.TIBYAN_AGENT_ENABLED = "false"
  try {
    assert.deepEqual(await (await config()).json(), { enabled: false })
    const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "أعطني الآية 1 من سورة الفاتحة", sourceModes: [], noEvidenceMode: "direct_unverified" }),
    }))
    const result = await response.json()
    assert.equal(result.status, "ok")
    assert.equal(result.interactionType, "quran_text")
    assert.ok(result.blueCards.length > 0)
  } finally {
    if (previous === undefined) delete process.env.TIBYAN_AGENT_ENABLED
    else process.env.TIBYAN_AGENT_ENABLED = previous
  }
})
