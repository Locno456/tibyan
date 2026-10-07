import test from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server"
import { POST } from "../app/api/ask/route"

test("explicit request from any audience refers without irrelevant sources or model generation", async () => {
  for (const persona of ["general", "researcher", "non_muslim"]) {
    const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "هل يمكنك إحالتي إلى مختص؟", persona, sourceModes: ["local", "web", "mcp"] }),
    }))
    const result = await response.json()
    assert.equal(result.interactionType, "referral")
    assert.equal(result.status, "abstain")
    assert.deepEqual(result.blueCards, [])
    assert.deepEqual(result.sources, [])
    assert.match(result.purpleCards[0].explanation, /طلبت التحدث إلى مختص/)
  }
})

test("opted-in researcher with personal estate question is referred before retrieving evidence", async () => {
  const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "توفي أبي، كيف أقسم الميراث بيننا؟", accountType: "researcher", referralEnabled: true }),
  }))
  const result = await response.json()
  assert.equal(result.interactionType, "referral")
  assert.deepEqual(result.blueCards, [])
})
