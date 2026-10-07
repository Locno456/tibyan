import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { POST } from "../app/api/ask/route"
import { readAnswerStream } from "../lib/answerStream"
import { reportAnswerStage, withAnswerProgress } from "../lib/answerProgress"

test("JSON contract remains unchanged for existing API clients", async () => {
  const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "زوجي طلقني مرتين هل يجوز لي الرجوع في حالتي؟" }),
  }))
  assert.match(response.headers.get("content-type") || "", /application\/json/)
  assert.equal((await response.json()).interactionType, "referral")
})

test("streaming reports only entered stages and returns the same answer", async () => {
  const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify({ question: "زوجي طلقني مرتين هل يجوز لي الرجوع في حالتي؟" }),
  }))
  const stages: string[] = []
  const result = await readAnswerStream(response, (stage) => stages.push(stage))
  assert.equal(result.interactionType, "referral")
  assert.deepEqual(stages, ["classify"])
})

test("exact local Quran lookup reports retrieval, not a fictitious model call", async () => {
  const response = await POST(new NextRequest("https://tibyan.test/api/ask", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify({ question: "أعطني الآية 1 من سورة الفاتحة" }),
  }))
  const stages: string[] = []
  const result = await readAnswerStream(response, (stage) => stages.push(stage))
  assert.equal(result.interactionType, "quran_text")
  assert.deepEqual(stages, ["classify", "retrieve"])
})

test("progress callbacks for simultaneous requests cannot leak stages between users", async () => {
  const first: string[] = []
  const second: string[] = []
  await Promise.all([
    withAnswerProgress((stage) => first.push(stage), async () => {
      reportAnswerStage("classify")
      await new Promise((resolve) => setTimeout(resolve, 5))
      reportAnswerStage("retrieve")
    }),
    withAnswerProgress((stage) => second.push(stage), async () => {
      reportAnswerStage("web")
      await Promise.resolve()
      reportAnswerStage("generate")
    }),
  ])
  assert.deepEqual(first, ["classify", "retrieve"])
  assert.deepEqual(second, ["web", "generate"])
})

test("a dropped stream does not become a completed answer", async () => {
  const incomplete = new Response('{"type":"stage","stage":"classify"}\n', { headers: { "content-type": "application/x-ndjson" } })
  await assert.rejects(() => readAnswerStream(incomplete, () => {}), /انقطع الاتصال/)
})
