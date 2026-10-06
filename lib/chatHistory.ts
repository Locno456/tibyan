import type { Level } from "./levelRouter"
import type { ParsedAudioRequest } from "./quranAudio"
import type { QuranAudioCard } from "./quranAudioService"

export const CHAT_HISTORY_STORAGE_KEY = "tibyan.chat-history.v1"
export const ACTIVE_CHAT_STORAGE_KEY = "tibyan.active-chat.v1"
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "tibyan.sidebar-collapsed.v1"

export interface StoredAskResponse {
  question: string
  level: Level
  levelInfo: any
  intent: string
  interactionType?: "conversation" | "quran_audio" | "quran_text" | "verification" | "answer" | "referral"
  verificationStatus?: "confirmed" | "near_match" | "not_found" | "needs_quote"
  status: "ok" | "abstain" | "blocked"
  action: string
  blueCards: any[]
  purpleCards: any[]
  audioCard?: QuranAudioCard
  audioRequest?: ParsedAudioRequest
  confidence: number
  guard: any
  metrics: any
}

export type ConversationMessage =
  | { id: string; role: "user"; question: string; createdAt: string }
  | { id: string; role: "tibyan"; response: StoredAskResponse; createdAt: string }

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ConversationMessage[]
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function createChatSession(now = new Date()): ChatSession {
  const timestamp = now.toISOString()
  return {
    id: makeId(),
    title: "محادثة جديدة",
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  }
}

export function createMessageId(): string {
  return makeId()
}

export function makeChatTitle(question: string, maxLength = 34): string {
  const clean = question.replace(/\s+/g, " ").trim()
  if (!clean) return "محادثة جديدة"
  const characters = Array.from(clean)
  return characters.length > maxLength ? `${characters.slice(0, maxLength).join("").trimEnd()}…` : clean
}

function isStoredMessage(value: any): value is ConversationMessage {
  if (!value || typeof value !== "object" || typeof value.id !== "string") return false
  if (value.role === "user") return typeof value.question === "string"
  if (value.role === "tibyan") {
    return !!value.response && typeof value.response === "object" && typeof value.response.question === "string"
  }
  return false
}

function normalizeSession(value: any): ChatSession | null {
  if (!value || typeof value !== "object" || typeof value.id !== "string") return null
  const messages = Array.isArray(value.messages) ? value.messages.filter(isStoredMessage) : []
  const now = new Date().toISOString()
  return {
    id: value.id,
    title: typeof value.title === "string" && value.title.trim() ? value.title : "محادثة جديدة",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
    messages,
  }
}

export function loadChatSessions(): ChatSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeSession)
      .filter((session): session is ChatSession => session !== null)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  } catch {
    return []
  }
}

export function saveChatSessions(sessions: ChatSession[]): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(sessions))
    return true
  } catch {
    return false
  }
}

export function loadActiveChatId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveActiveChatId(id: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, id)
  } catch {
    // فشل الحفظ لا يمنع استخدام المحادثة الحالية.
  }
}

export function loadSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed))
  } catch {
    // تفضيل العرض اختياري.
  }
}

/** ينزّل نسخة JSON كاملة من جميع المحادثات غير الفارغة إلى جهاز المستخدم. */
export function downloadChatHistory(sessions: ChatSession[]): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false

  const conversations = sessions
    .filter((session) => session.messages.length > 0)
    .map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages,
    }))

  const exportData = {
    application: "تِبْيَان",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    storage: "local browser storage",
    conversationCount: conversations.length,
    conversations,
  }

  try {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    const date = new Date().toISOString().slice(0, 10)
    anchor.href = url
    anchor.download = `tibyan-chat-history-${date}.json`
    anchor.style.display = "none"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch {
    return false
  }
}
