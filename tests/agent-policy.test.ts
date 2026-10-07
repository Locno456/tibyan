import assert from "node:assert/strict"
import test from "node:test"
import { planEvidenceSearch } from "../lib/agentPolicy"

test("no evidence forces one read-only tool call, within a bounded budget", () => {
  assert.deepEqual(planEvidenceSearch({ hasLocalEvidence: false, hasWebPreview: false, hasTools: true }), {
    evidence: "missing", requireToolCall: true, maxCalls: 6, maxRounds: 3, canAttemptGroundedAnswer: true,
  })
})

test("web search previews alone never suppress a required MCP lookup", () => {
  const plan = planEvidenceSearch({ hasLocalEvidence: false, hasWebPreview: true, hasTools: true })
  assert.equal(plan.evidence, "web_preview")
  assert.equal(plan.requireToolCall, true)
})

test("local evidence leaves tools optional and reduces work; absence of all sources fails closed", () => {
  const local = planEvidenceSearch({ hasLocalEvidence: true, hasWebPreview: true, hasTools: true })
  assert.equal(local.requireToolCall, false)
  assert.equal(local.maxCalls, 4)
  assert.equal(local.maxRounds, 2)
  assert.equal(planEvidenceSearch({ hasLocalEvidence: false, hasWebPreview: false, hasTools: false }).canAttemptGroundedAnswer, false)
  const quote = planEvidenceSearch({ hasLocalEvidence: false, hasWebPreview: false, hasTools: true, verifyingQuote: true })
  assert.equal(quote.maxCalls, 8)
  assert.equal(quote.maxRounds, 4)
})
