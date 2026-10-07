import assert from "node:assert/strict"
import test from "node:test"
import type { ChatSession } from "../lib/chatHistory"
import {
  canCreateGuestConversation,
  EMPTY_ACCOUNT_DATA,
  mergeAccountData,
  mergeChatSessions,
} from "../lib/accountData"

function firstUserQuestion(item: ChatSession | undefined): string | undefined {
  const message = item?.messages[0]
  return message?.role === "user" ? message.question : undefined
}

function session(id: string, updatedAt: string, question = ""): ChatSession {
  const createdAt = "2026-01-01T00:00:00.000Z"
  return {
    id,
    title: id,
    createdAt,
    updatedAt,
    messages: question ? [{ id: `${id}-message`, role: "user", question, createdAt }] : [],
  }
}

test("cloud and local conversations merge by id and prefer the newest revision", () => {
  const merged = mergeChatSessions(
    [session("shared", "2026-01-02T00:00:00.000Z", "نسخة الحساب"), session("cloud-only", "2026-01-01T00:00:00.000Z")],
    [session("shared", "2026-01-03T00:00:00.000Z", "نسخة الجهاز"), session("local-only", "2026-01-04T00:00:00.000Z")]
  )

  assert.equal(merged.length, 3)
  assert.equal(firstUserQuestion(merged.find((item) => item.id === "shared")), "نسخة الجهاز")
  assert.ok(merged.some((item) => item.id === "cloud-only"))
  assert.ok(merged.some((item) => item.id === "local-only"))
})

test("a manually selected local-only conversation is not uploaded or overwritten", () => {
  const local = {
    ...EMPTY_ACCOUNT_DATA,
    sessions: [session("private", "2026-01-05T00:00:00.000Z", "يبقى محلياً"), session("share", "2026-01-04T00:00:00.000Z", "يرفع")],
    activeSessionId: "private",
  }
  const cloud = {
    ...EMPTY_ACCOUNT_DATA,
    sessions: [session("private", "2026-01-03T00:00:00.000Z", "نسخة سحابية أقدم"), session("remote", "2026-01-02T00:00:00.000Z")],
  }

  const result = mergeAccountData(local, cloud, new Set(["private"]))
  assert.deepEqual(result.cloudData.sessions.map((item) => item.id).sort(), ["remote", "share"])
  assert.equal(firstUserQuestion(result.localData.sessions.find((item) => item.id === "private")), "يبقى محلياً")
  assert.ok(result.localData.sessions.some((item) => item.id === "remote"))
})

test("deleted chat tombstones prevent deleted cloud sessions from returning on merge", () => {
  const local = {
    ...EMPTY_ACCOUNT_DATA,
    deletedSessionIds: ["deleted"],
    sessions: [session("local", "2026-01-04T00:00:00.000Z", "رسالة محلية")],
  }
  const cloud = {
    ...EMPTY_ACCOUNT_DATA,
    sessions: [session("deleted", "2026-01-05T00:00:00.000Z", "لا تعِدها"), session("remote", "2026-01-03T00:00:00.000Z")],
  }

  const result = mergeAccountData(local, cloud)
  assert.ok(!result.cloudData.sessions.some((item) => item.id === "deleted"))
  assert.ok(!result.localData.sessions.some((item) => item.id === "deleted"))
  assert.ok(result.cloudData.deletedSessionIds.includes("deleted"))
  assert.ok(result.localData.sessions.some((item) => item.id === "remote"))
})

test("guest chat creation stops at five while authenticated accounts are not capped", () => {
  assert.equal(canCreateGuestConversation(4, false), true)
  assert.equal(canCreateGuestConversation(5, false), false)
  assert.equal(canCreateGuestConversation(50, true), true)
})
