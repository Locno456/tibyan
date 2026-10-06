import assert from "node:assert/strict"
import test from "node:test"
import { buildSourceUrl, isDorarSearchUrl, normalizeSourceUrl } from "../lib/sourceLinks"

test("Dorar search URLs use q and do not claim to be direct records", () => {
  const link = buildSourceUrl({ type: "hadith", text: "إنما الأعمال بالنيات" })
  assert.equal(new URL(link).searchParams.get("q"), "إنما الأعمال بالنيات")
  assert.equal(isDorarSearchUrl(link), true)
  assert.equal(isDorarSearchUrl("https://dorar.net/h/AbC12345"), false)
})

test("saved old search URLs are repaired only on Dorar approved paths", () => {
  assert.equal(normalizeSourceUrl("https://dorar.net/hadith/search?s=test"), "https://dorar.net/hadith/search?q=test")
  assert.equal(normalizeSourceUrl("https://dorar.net/tafseer?s=test"), "https://dorar.net/tafseer?q=test")
  assert.equal(normalizeSourceUrl("https://example.org/hadith/search?s=test"), "https://example.org/hadith/search?s=test")
})
