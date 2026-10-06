import type { ChatSession } from "./chatHistory"
import type { KnowledgeOption } from "./knowledge"

export function conversationSnapshot(session: ChatSession, knowledge: KnowledgeOption) {
  return {
    version: 1,
    title: session.title,
    createdAt: session.createdAt,
    knowledge: { label: knowledge.label, persona: knowledge.persona, background: knowledge.kind === "custom" ? knowledge.background || "" : knowledge.hint || "" },
    messages: session.messages.map((message) => message.role === "user"
      ? { role: "user", text: message.question, createdAt: message.createdAt }
      : {
          role: "tibyan", createdAt: message.createdAt, status: message.response.status,
          text: (message.response.purpleCards || []).map((card) => card.explanation).filter((text): text is string => typeof text === "string").join("\n"),
          sources: (message.response.blueCards || []).map((card) => ({ text: String(card.text || ""), source: String(card.source || ""), sourceUrl: String(card.sourceUrl || card.source_url || "") })),
        }),
  }
}

export function conversationMarkdown(snapshot: ReturnType<typeof conversationSnapshot>): string {
  return [`# ${snapshot.title}`, `معرفة المستخدم: ${snapshot.knowledge.label} — ${snapshot.knowledge.background}`, ...snapshot.messages.map((message) =>
    message.role === "user" ? `## المستخدم\n${message.text}` : `## تِبْيَان (${message.status})\n${message.text}\n${message.sources?.map((source) => `- ${source.source}: ${source.text} ${source.sourceUrl}`).join("\n") || ""}`
  )].join("\n\n")
}
