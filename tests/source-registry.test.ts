import assert from "node:assert/strict"
import test from "node:test"
import { resolveMcpSources } from "../lib/sourceRegistry"

test("official MCP sources are extensible without changing the tool runner", () => {
  const sources = resolveMcpSources()
  assert.deepEqual(sources.map((source) => source.id), ["islamic_content", "tafsir_center"])
  assert.equal(new Set(sources.map((source) => source.prefix)).size, sources.length)
  assert.deepEqual(resolveMcpSources([...sources, {
    id: "reviewed_source", label: "Reviewed", endpoint: "https://example.org/mcp", prefix: "rev",
  }]).map((source) => source.id), ["islamic_content", "tafsir_center", "reviewed_source"])
})

test("server overrides cannot redirect approved MCP endpoints to arbitrary or private hosts", () => {
  for (const hostile of ["http://127.0.0.1:8080/mcp", "http://169.254.169.254/latest", "https://evil.example/mcp", "https://mcp.tafsir.net.evil.example/mcp", "https://user:pass@mcp.tafsir.net/mcp"]) {
    const sources = resolveMcpSources(undefined, { NODE_ENV: "production", TAFSIR_MCP_URL: hostile })
    assert.equal(sources[1].endpoint, "https://mcp.tafsir.net/mcp")
  }
  assert.deepEqual(resolveMcpSources(undefined, { TAFSIR_MCP_URL: "off" }).map((source) => source.id), ["islamic_content"])
  assert.equal(resolveMcpSources(undefined, { NODE_ENV: "production", TAFSIR_MCP_URL: "https://mcp.tafsir.net/alternate" })[1].endpoint, "https://mcp.tafsir.net/alternate")
})
