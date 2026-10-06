export interface AgentPlan {
  evidence: "local" | "web_preview" | "missing"
  requireToolCall: boolean
  maxCalls: number
  maxRounds: number
  canAttemptGroundedAnswer: boolean
}

/** Deterministic, bounded decision; web search previews are not verified local evidence. */
export function planEvidenceSearch(input: {
  hasLocalEvidence: boolean
  hasWebPreview: boolean
  hasTools: boolean
  verifyingQuote?: boolean
}): AgentPlan {
  const evidence = input.hasLocalEvidence ? "local" : input.hasWebPreview ? "web_preview" : "missing"
  const requireToolCall = !input.hasLocalEvidence && input.hasTools
  // Quotation checks need additional attempts, but never an unbounded agent loop.
  const maxCalls = input.verifyingQuote ? 8 : input.hasLocalEvidence ? 4 : 6
  const maxRounds = input.verifyingQuote ? 4 : input.hasLocalEvidence ? 2 : 3
  return {
    evidence,
    requireToolCall,
    maxCalls,
    maxRounds,
    canAttemptGroundedAnswer: input.hasLocalEvidence || input.hasWebPreview || input.hasTools,
  }
}
