import { DEFAULT_SOURCE_MODES, parseNoEvidenceMode, parseSourceModes, type NoEvidenceMode, type SourceMode } from "./sourcePreferences"

/** Opt-out rollback switch; no user input can re-enable a disabled server feature. */
export function isAgentModeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.TIBYAN_AGENT_ENABLED?.trim().toLowerCase() !== "false"
}

export function resolveAgentPreferences(
  body: Record<string, unknown>,
  enabled = isAgentModeEnabled(),
): { sourceModes: SourceMode[]; noEvidenceMode: NoEvidenceMode } {
  return enabled
    ? { sourceModes: parseSourceModes(body.sourceModes), noEvidenceMode: parseNoEvidenceMode(body.noEvidenceMode) }
    : { sourceModes: [...DEFAULT_SOURCE_MODES], noEvidenceMode: "request_sources" }
}
