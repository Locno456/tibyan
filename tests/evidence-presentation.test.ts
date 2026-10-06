import assert from "node:assert/strict"
import test from "node:test"
import { shortenHadithForChat } from "../lib/evidencePresentation"

test("keeps short hadith text unchanged", () => {
  const text = "إنما الأعمال بالنيات\nوإنما لكل امرئ ما نوى"
  assert.equal(shortenHadithForChat(text), text)
})

test("creates a bounded word-safe preview without modifying the source string", () => {
  const text = "هذا نص حديث طويل يضم عبارات كثيرة متتابعة لشرح المعنى وتفصيله. ".repeat(10)
  const preview = shortenHadithForChat(text, 120)

  assert.ok(preview.length <= 121)
  assert.ok(preview.endsWith("…"))
  assert.ok(text.startsWith(preview.slice(0, -1)))
  assert.notEqual(preview, text)
})

test("uses a hard character boundary when the input contains no spaces", () => {
  const preview = shortenHadithForChat("ح".repeat(300), 80)
  assert.equal(preview.length, 81)
  assert.ok(preview.endsWith("…"))
})
