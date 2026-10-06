import assert from "node:assert/strict"
import test from "node:test"
import { zeroHallucinationGuard } from "../lib/guard"

const docs = [{ id: "known", score: 1, payload: {
  id: "known", type: "hadith" as const, text: "من صلى الفجر في جماعة فهو في ذمة الله",
  source: "مرجع الحديث", source_url: "https://dorar.net/hadith/search",
} }]

test("generated prose attributing an unsourced hadith is blocked", () => {
  const result = zeroHallucinationGuard("قال رسول الله ﷺ: من صلى الفجر في جماعة كتب له نور في قبره", docs)
  assert.equal(result.status, "blocked")
  assert.equal(result.action, "abstain")
})

test("literal concatenation of retrieved source cards is not treated as generated attribution", () => {
  const literal = "قال رسول الله ﷺ: «من صلى الفجر في جماعة فهو في ذمة الله»"
  const original = [{ ...docs[0], payload: { ...docs[0].payload, text: literal } }]
  assert.equal(zeroHallucinationGuard(literal, original).status, "ok")
})
