import test from "node:test"
import assert from "node:assert/strict"
import { IDBFactory } from "fake-indexeddb"
import { readLocalDatabase, writeLocalDatabase } from "../lib/localDatabase"
import { EMPTY_ACCOUNT_DATA } from "../lib/accountData"

test("browser-local IndexedDB persists snapshots without Supabase and replaces stale copies", async () => {
  const original = globalThis.indexedDB
  Object.defineProperty(globalThis, "indexedDB", { value: new IDBFactory(), configurable: true })
  try {
    assert.equal(await readLocalDatabase(), null)
    await writeLocalDatabase({ ...EMPTY_ACCOUNT_DATA, sessions: [{ id: "first", title: "سؤال", createdAt: "2026-01-01", updatedAt: "2026-01-01", messages: [] }] })
    assert.equal((await readLocalDatabase())?.sessions[0].id, "first")
    await writeLocalDatabase({ ...EMPTY_ACCOUNT_DATA, sessions: [], selectedKnowledgeId: "researcher" })
    const restored = await readLocalDatabase()
    assert.deepEqual(restored?.sessions, [])
    assert.equal(restored?.selectedKnowledgeId, "researcher")
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, "indexedDB")
    else Object.defineProperty(globalThis, "indexedDB", { value: original, configurable: true })
  }
})
