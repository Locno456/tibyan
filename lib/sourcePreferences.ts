export type SourceMode = "local" | "mcp" | "web"
export type NoEvidenceMode = "request_sources" | "direct_unverified"
export const DEFAULT_SOURCE_MODES: SourceMode[] = ["local", "mcp"]

/** Malformed selections fail closed; omitted selections retain legacy behaviour. */
export function parseSourceModes(value: unknown): SourceMode[] {
  if (value === undefined) return [...DEFAULT_SOURCE_MODES]
  if (!Array.isArray(value) || value.length > 3 || value.some((item) => item !== "local" && item !== "mcp" && item !== "web")) return []
  return Array.from(new Set(value)) as SourceMode[]
}

export function parseNoEvidenceMode(value: unknown): NoEvidenceMode {
  return value === "direct_unverified" ? "direct_unverified" : "request_sources"
}
