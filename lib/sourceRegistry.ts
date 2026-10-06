import { APPROVED_MCP_PROVIDERS } from "./sources"

/** Server-owned registry. Entries are candidates, not evidence of a live connection. */
export interface McpSourceConfig {
  id: string
  label: string
  endpoint: string
  prefix: string
  envOverride?: string
  enabled?: boolean
}

const OFFICIAL_MCP_SOURCES: readonly McpSourceConfig[] = [
  {
    id: APPROVED_MCP_PROVIDERS.islamicContent.id,
    label: APPROVED_MCP_PROVIDERS.islamicContent.name,
    endpoint: APPROVED_MCP_PROVIDERS.islamicContent.endpoint,
    prefix: "ic",
    envOverride: "ISLAMIC_CONTENT_MCP_URL",
  },
  {
    id: APPROVED_MCP_PROVIDERS.tafsirCenter.id,
    label: APPROVED_MCP_PROVIDERS.tafsirCenter.name,
    endpoint: APPROVED_MCP_PROVIDERS.tafsirCenter.endpoint,
    prefix: "tc",
    envOverride: "TAFSIR_MCP_URL",
  },
]

/**
 * Add reviewed sources here; never accept a client-supplied MCP endpoint.
 * Overrides may change a path/port on the same official host (or local dev only),
 * but cannot redirect the server to an arbitrary domain or private network.
 */
export function resolveMcpSources(
  entries: readonly McpSourceConfig[] = OFFICIAL_MCP_SOURCES,
  env: Record<string, string | undefined> = process.env,
): McpSourceConfig[] {
  const seenIds = new Set<string>()
  const seenPrefixes = new Set<string>()
  return entries.flatMap((entry) => {
    if (entry.enabled === false) return []
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(entry.id) || !/^[a-z][a-z0-9_]{0,9}$/.test(entry.prefix)) return []
    if (seenIds.has(entry.id) || seenPrefixes.has(entry.prefix)) return []
    let official: URL
    try { official = new URL(entry.endpoint) } catch { return [] }
    if (official.protocol !== "https:" || official.username || official.password || official.port || !official.hostname.includes(".")) return []
    const setting = entry.envOverride ? env[entry.envOverride]?.trim() : undefined
    if (setting?.toLowerCase() === "off" || setting?.toLowerCase() === "disabled") return []
    let endpoint = entry.endpoint
    if (setting) {
      try {
        const candidate = new URL(setting)
        const localDev = env.NODE_ENV !== "production" && candidate.protocol === "http:" &&
          (candidate.hostname === "localhost" || candidate.hostname === "127.0.0.1")
        const officialHost = candidate.protocol === "https:" && candidate.hostname === official.hostname && !candidate.port
        if (!candidate.username && !candidate.password && !candidate.hash && (officialHost || localDev)) endpoint = candidate.href
      } catch { /* Invalid overrides never replace the reviewed endpoint. */ }
    }
    seenIds.add(entry.id)
    seenPrefixes.add(entry.prefix)
    return [{ ...entry, endpoint }]
  })
}
