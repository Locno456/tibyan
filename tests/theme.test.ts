import assert from "node:assert/strict"
import test from "node:test"
import { parseThemeChoice, resolveTheme } from "../lib/theme"

test("theme selection respects explicit choice and system preference", () => {
  assert.equal(parseThemeChoice("dark"), "dark")
  assert.equal(parseThemeChoice("light"), "light")
  assert.equal(parseThemeChoice("invalid"), "system")
  assert.equal(resolveTheme("system", true), "dark")
  assert.equal(resolveTheme("system", false), "light")
  assert.equal(resolveTheme("light", true), "light")
  assert.equal(resolveTheme("dark", false), "dark")
})
