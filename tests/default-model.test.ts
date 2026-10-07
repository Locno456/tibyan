import assert from "node:assert/strict"
import test from "node:test"
import { selectDefaultModel } from "../lib/aiProviders"
import { resolveModelName } from "../lib/gemini"
import type { AIModelInfo } from "../lib/aiProviderTypes"

const model = (id: string): AIModelInfo => ({ id, name: id, status: "listed" })

test("Gemini Flash Lite latest is the first default when returned by the live catalog", () => {
  const available = [model("gemini-3.1-flash-lite"), model("gemini-flash-lite-latest"), model("gemini-2.5-flash")]
  assert.equal(selectDefaultModel("google", available)?.id, "gemini-flash-lite-latest")
  assert.equal(resolveModelName("flashLite"), "gemini-flash-lite-latest")
})

test("a catalog without the latest alias falls back to an available model", () => {
  assert.equal(selectDefaultModel("google", [model("gemini-2.5-flash-lite")])?.id, "gemini-2.5-flash-lite")
})
