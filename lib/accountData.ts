import type { AIModelSelection, AIProviderId } from "./aiProviderTypes"
import { normalizeChatSessions, type ChatSession } from "./chatHistory"
import { KNOWLEDGE_ICONS, type KnowledgeOption } from "./knowledge"

export const MAX_GUEST_CONVERSATIONS = 5

const AI_PROVIDER_IDS: AIProviderId[] = ["google", "anthropic", "openai", "openrouter", "groq", "zai", "mistral", "deepseek"]

export interface TibyanAccountData {
  version: 1
  sessions: ChatSession[]
  deletedSessionIds: string[]
  customKnowledge: KnowledgeOption[]
  selectedKnowledgeId: string | null
  modelSelection: AIModelSelection | null
  modelFallbackSelection: AIModelSelection | null
  activeSessionId: string | null
  sidebarCollapsed: boolean
}

export const EMPTY_ACCOUNT_DATA: TibyanAccountData = {
  version: 1,
  sessions: [],
  deletedSessionIds: [],
  customKnowledge: [],
  selectedKnowledgeId: null,
  modelSelection: null,
  modelFallbackSelection: null,
  activeSessionId: null,
  sidebarCollapsed: false,
}

function normalizeModelSelection(value: unknown): AIModelSelection | null {
  if (!value || typeof value !== "object") return null
  const selection = value as Record<string, unknown>
  if (!AI_PROVIDER_IDS.includes(selection.providerId as AIProviderId) || typeof selection.modelId !== "string" || !selection.modelId.trim()) {
    return null
  }
  return {
    providerId: selection.providerId as AIProviderId,
    modelId: selection.modelId.slice(0, 200),
    modelName: typeof selection.modelName === "string" ? selection.modelName.slice(0, 160) : undefined,
    providerName: typeof selection.providerName === "string" ? selection.providerName.slice(0, 100) : undefined,
  }
}

function normalizeKnowledge(value: unknown): KnowledgeOption[] {
  if (!Array.isArray(value)) return []
  const byId = new Map<string, KnowledgeOption>()
  for (const candidate of value.slice(0, 100)) {
    if (!candidate || typeof candidate !== "object") continue
    const option = candidate as Record<string, unknown>
    if (
      option.kind !== "custom" ||
      typeof option.id !== "string" ||
      !option.id.startsWith("custom_") ||
      typeof option.label !== "string" ||
      typeof option.persona !== "string" ||
      typeof option.icon !== "string" ||
      !Object.prototype.hasOwnProperty.call(KNOWLEDGE_ICONS, option.icon)
    ) continue

    byId.set(option.id, {
      id: option.id.slice(0, 120),
      kind: "custom",
      label: option.label.trim().slice(0, 80) || "معرفة مخصصة",
      hint: typeof option.hint === "string" ? option.hint.slice(0, 180) : undefined,
      icon: option.icon,
      background: typeof option.background === "string" ? option.background.slice(0, 1200) : undefined,
      persona: option.persona.slice(0, 80),
    })
  }
  return Array.from(byId.values())
}

export function normalizeAccountData(value: unknown): TibyanAccountData {
  if (!value || typeof value !== "object") return { ...EMPTY_ACCOUNT_DATA }
  const raw = value as Record<string, unknown>
  const customKnowledge = normalizeKnowledge(raw.customKnowledge)
  const allowedKnowledgeIds = new Set([...customKnowledge.map((option) => option.id), "general", "new_muslim", "non_muslim", "teen", "researcher"])
  const deletedSessionIds = Array.isArray(raw.deletedSessionIds)
    ? Array.from(new Set(raw.deletedSessionIds.filter((id): id is string => typeof id === "string").map((id) => id.slice(0, 120)).slice(0, 10_000)))
    : []

  return {
    version: 1,
    sessions: normalizeChatSessions(raw.sessions),
    deletedSessionIds,
    customKnowledge,
    selectedKnowledgeId: typeof raw.selectedKnowledgeId === "string" && allowedKnowledgeIds.has(raw.selectedKnowledgeId)
      ? raw.selectedKnowledgeId
      : null,
    modelSelection: normalizeModelSelection(raw.modelSelection),
    modelFallbackSelection: normalizeModelSelection(raw.modelFallbackSelection),
    activeSessionId: typeof raw.activeSessionId === "string" ? raw.activeSessionId : null,
    sidebarCollapsed: typeof raw.sidebarCollapsed === "boolean" ? raw.sidebarCollapsed : false,
  }
}

function updatedAt(session: ChatSession): number {
  const value = Date.parse(session.updatedAt)
  return Number.isFinite(value) ? value : 0
}

/** Merge by session id and prefer the newest copy, except for conversations explicitly kept on this device. */
export function mergeChatSessions(
  cloudSessions: ChatSession[],
  localSessions: ChatSession[],
  localOnlyIds: ReadonlySet<string> = new Set()
): ChatSession[] {
  const merged = new Map<string, ChatSession>()
  for (const session of cloudSessions) merged.set(session.id, session)
  for (const local of localSessions) {
    const cloud = merged.get(local.id)
    if (!cloud || localOnlyIds.has(local.id) || updatedAt(local) >= updatedAt(cloud)) {
      merged.set(local.id, local)
    }
  }
  return Array.from(merged.values()).sort((a, b) => updatedAt(b) - updatedAt(a))
}

function mergeKnowledge(cloud: KnowledgeOption[], local: KnowledgeOption[]): KnowledgeOption[] {
  const merged = new Map<string, KnowledgeOption>()
  for (const option of cloud) merged.set(option.id, option)
  for (const option of local) merged.set(option.id, option)
  return Array.from(merged.values())
}

export function mergeAccountData(
  localInput: TibyanAccountData,
  cloudInput: TibyanAccountData,
  localOnlyIds: ReadonlySet<string> = new Set()
): { localData: TibyanAccountData; cloudData: TibyanAccountData } {
  const local = normalizeAccountData(localInput)
  const cloud = normalizeAccountData(cloudInput)
  const deletedSessionIds = Array.from(new Set([...cloud.deletedSessionIds, ...local.deletedSessionIds]))
  const deletedIds = new Set(deletedSessionIds)
  const cloudBase = cloud.sessions.filter((session) => !localOnlyIds.has(session.id) && !deletedIds.has(session.id))
  const localToSync = local.sessions.filter((session) => !localOnlyIds.has(session.id) && !deletedIds.has(session.id))
  const mergedCloudSessions = mergeChatSessions(cloudBase, localToSync)
  const mergedLocalSessions = mergeChatSessions(mergedCloudSessions, local.sessions, localOnlyIds)
    .filter((session) => !deletedIds.has(session.id))
  const mergedKnowledge = mergeKnowledge(cloud.customKnowledge, local.customKnowledge)
  const selectedKnowledgeId = local.selectedKnowledgeId || cloud.selectedKnowledgeId
  const localHasData = hasMeaningfulAccountData(local)

  const localActive = local.sessions.find((session) => session.id === local.activeSessionId)
  const cloudActive = cloud.sessions.find((session) => session.id === cloud.activeSessionId)
  const preferredActiveId = localActive?.messages.length
    ? localActive.id
    : cloudActive?.id || localActive?.id || null
  const activeSessionId = preferredActiveId && mergedLocalSessions.some((session) => session.id === preferredActiveId)
    ? preferredActiveId
    : mergedLocalSessions[0]?.id || null

  const shared: Omit<TibyanAccountData, "sessions" | "activeSessionId" | "sidebarCollapsed"> = {
    version: 1,
    deletedSessionIds,
    customKnowledge: mergedKnowledge,
    selectedKnowledgeId,
    modelSelection: local.modelSelection || cloud.modelSelection,
    modelFallbackSelection: local.modelFallbackSelection || cloud.modelFallbackSelection,
  }

  const cloudData: TibyanAccountData = {
    ...shared,
    sessions: mergedCloudSessions,
    activeSessionId: mergedCloudSessions.some((session) => session.id === activeSessionId) ? activeSessionId : null,
    sidebarCollapsed: localHasData ? local.sidebarCollapsed : cloud.sidebarCollapsed,
  }
  const localData: TibyanAccountData = {
    ...shared,
    sessions: mergedLocalSessions,
    activeSessionId,
    sidebarCollapsed: localHasData ? local.sidebarCollapsed : cloud.sidebarCollapsed,
  }

  return { localData, cloudData }
}

export function hasMeaningfulAccountData(data: TibyanAccountData): boolean {
  return data.deletedSessionIds.length > 0 ||
    data.sessions.some((session) => session.messages.length > 0) ||
    data.customKnowledge.length > 0 ||
    data.selectedKnowledgeId !== null ||
    data.modelSelection !== null ||
    data.modelFallbackSelection !== null
}

export function canCreateGuestConversation(sessionCount: number, isAuthenticated: boolean): boolean {
  return isAuthenticated || sessionCount < MAX_GUEST_CONVERSATIONS
}
