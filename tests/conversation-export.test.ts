import test from "node:test"
import assert from "node:assert/strict"
import { conversationSnapshot } from "../lib/conversationExport"
import type { ChatSession } from "../lib/chatHistory"

test("exports only one conversation and selected knowledge without runtime metrics", () => {
  const session: ChatSession = { id: "one", title: "Test", createdAt: "2026-01-01", updatedAt: "2026-01-01", messages: [
    { id: "a", role: "user", question: "Question", createdAt: "2026-01-01" },
    { id: "b", role: "tibyan", createdAt: "2026-01-01", response: { question: "Question", status: "ok", level: "A", levelInfo: {}, intent: "test", action: "answer", blueCards: [{ source: "source", text: "quote", sourceUrl: "https://example.org", internal: "hidden" }], purpleCards: [{ explanation: "answer" }], confidence: 1, guard: {}, metrics: { secret: "do not export" } } },
  ] }
  const result = conversationSnapshot(session, { id: "custom_1", kind: "custom", label: "باحث", persona: "custom", icon: "Users", background: "معرفة خاصة" })
  assert.equal(result.messages.length, 2)
  assert.equal(result.knowledge.background, "معرفة خاصة")
  assert.match(JSON.stringify(result), /quote/)
  assert.doesNotMatch(JSON.stringify(result), /do not export|hidden/)
})
