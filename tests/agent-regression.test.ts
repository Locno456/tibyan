import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { POST } from "../app/api/ask/route"

async function ask(question: string, preferences: Record<string, unknown> = {}) {
  const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, ...preferences }),
  }))
  assert.equal(response.status, 200)
  return response.json()
}

test("unexpected personal-fatwa variant remains a referral even in direct mode with sources off", async () => {
  const answer = await ask("زوجي طلقني مرتين وأنا الآن في العدة، هل أرجع إليه في حالتي؟", {
    sourceModes: [], noEvidenceMode: "direct_unverified",
  })
  assert.equal(answer.level, "D")
  assert.equal(answer.status, "abstain")
  assert.equal(answer.interactionType, "referral")
  assert.equal(answer.metrics.llm, "none - referral")
  assert.deepEqual(answer.blueCards, [])
})

test("default and explicit legacy modes both return exact Quran text without a model", async () => {
  const question = "أعطني الآية 1 من سورة الفاتحة"
  const [legacy, selected] = await Promise.all([
    ask(question), ask(question, { sourceModes: ["local", "mcp"] }),
  ])
  assert.equal(legacy.status, "ok")
  assert.equal(legacy.interactionType, "quran_text")
  assert.deepEqual(selected.blueCards, legacy.blueCards)
  assert.equal(selected.metrics.retrievalSource, legacy.metrics.retrievalSource)
})

test("a source selector cannot force an exact quotation confirmation with local data off", async () => {
  const answer = await ask("هل هذا الحديث صحيح: من صلى الفجر في جماعة فهو في ذمة الله؟", { sourceModes: [] })
  assert.equal(answer.status, "abstain")
  assert.deepEqual(answer.blueCards, [])
})
