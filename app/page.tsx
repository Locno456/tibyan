"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
import SplashScreen from "../components/SplashScreen"
import AnimatedLogo from "../components/AnimatedLogo"
import ChatMessage from "../components/ChatMessage"
import ChatComposer from "../components/ChatComposer"
import ThinkingStages from "../components/ThinkingStages"
import { readAnswerStream } from "../lib/answerStream"
import type { AnswerStage } from "../lib/answerProgress"
import KnowledgePicker from "../components/KnowledgePicker"
import CustomKnowledgeSheet from "../components/CustomKnowledgeSheet"
import ChatSidebar from "../components/ChatSidebar"
import ChatSettingsModal from "../components/ChatSettingsModal"
import ModelPicker from "../components/ModelPicker"
import AccountAccessModal from "../components/AccountAccessModal"
import SyncOnLoginModal, { type SyncDecisionData } from "../components/SyncOnLoginModal"
import { useAccount } from "../components/AccountProvider"
import type { AIModelSelection, AIProviderId } from "../lib/aiProviderTypes"
import { DEFAULT_SOURCE_MODES, parseSourceModes, parseNoEvidenceMode, type SourceMode, type NoEvidenceMode } from "../lib/sourcePreferences"
import { Lightbulb, Menu } from "lucide-react"
import {
  KnowledgeOption, PRESET_KNOWLEDGE, getKnowledgeIcon,
  loadCustomKnowledge, saveCustomKnowledge, loadSelectedKnowledgeId, saveSelectedKnowledgeId,
} from "../lib/knowledge"
import { Level, LEVELS } from "../lib/levelRouter"
import {
  ChatSession, ConversationMessage, StoredAskResponse,
  createChatSession, createMessageId, loadChatSessions, loadActiveChatId,
  loadSidebarCollapsed, makeChatTitle, saveActiveChatId, saveChatSessions,
  saveSidebarCollapsed,
} from "../lib/chatHistory"
import {
  canCreateGuestConversation,
  hasMeaningfulAccountData,
  MAX_GUEST_CONVERSATIONS,
  mergeAccountData,
  type TibyanAccountData,
} from "../lib/accountData"
import { accountSyncErrorMessage, fetchAccountData, saveAccountData } from "../lib/accountSync"
import { isSyncDeferred, readDeletedSessionIds, readLocalOnlySessionIds, readSyncOwner, setSyncDeferred, writeDeletedSessionIds, writeLocalOnlySessionIds, writeSyncOwner } from "../lib/accountStorage"

type AskResponse = StoredAskResponse
type ThreadItem = ConversationMessage
const MODEL_SELECTION_STORAGE_KEY = "tibyan.ai-model-selection.v1"
const MODEL_FALLBACK_STORAGE_KEY = "tibyan.ai-model-fallback.v1"
const AI_PROVIDER_IDS: AIProviderId[] = ["google", "anthropic", "openai", "openrouter", "groq", "zai", "mistral", "deepseek"]

type CloudSyncStatus = "idle" | "checking" | "decision" | "syncing" | "active" | "paused" | "error"

function accountSnapshotRevision(data: TibyanAccountData): string {
  return JSON.stringify({
    sessions: data.sessions.map((session) => [session.id, session.title, session.updatedAt, session.messages.length]),
    deletedSessionIds: data.deletedSessionIds,
    customKnowledge: data.customKnowledge.map((option) => [option.id, option.label, option.persona, option.background]),
    selectedKnowledgeId: data.selectedKnowledgeId,
    modelSelection: data.modelSelection,
    modelFallbackSelection: data.modelFallbackSelection,
    activeSessionId: data.activeSessionId,
    sidebarCollapsed: data.sidebarCollapsed,
  })
}

const QUICK_QUESTIONS = [
  { q: "ما معنى التوحيد؟", tag: "مستوى أ" },
  { q: "لماذا يعبد المسلمون الكعبة؟", tag: "شبهة" },
  { q: "هل القرآن من تأليف محمد ﷺ؟", tag: "شبهة" },
  { q: "ما هي أركان الإسلام؟", tag: "مستوى أ" },
]

const ALL_TESTS = [
  "لماذا يعبد المسلمون الكعبة؟",
  "هل القرآن من تأليف محمد ﷺ؟",
  "هل الإسلام انتشر بالسيف؟",
  "لماذا أحكام مختلفة بين العلماء؟",
  "أنا في حالة طلاق، هل يجوز لي الرجوع؟ زوجي طلقني مرتين",
  "ما صحة حديث: من صلى الفجر في جماعة؟",
  "ما معنى التوحيد؟",
  "ترجم لي: التوحيد هو إفراد الله بالعبادة",
  "الإسلام دين متخلف ولا يصلح لهذا العصر!!",
  "هل كل المسلمين يتفقون على كل شيء؟",
  "﴿وَمَن يَبْتَغِ غَيْرَ الْإِسْلَامِ دِينًا فَلَن يُقْبَلَ مِنْهُ﴾ هل هذه آية صحيحة؟",
  "ما معنى كلمة karma في الإسلام؟",
]

export default function HomePage() {
  const router = useRouter()
  const { user, client, authLoading, accountType } = useAccount()
  const [sourceModes, setSourceModes] = useState<SourceMode[]>(DEFAULT_SOURCE_MODES)
  const [mcpModelCapable, setMcpModelCapable] = useState<boolean | null>(null)
  const [noEvidenceMode, setNoEvidenceMode] = useState<NoEvidenceMode>("request_sources")
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("tibyan.source-modes.v1")
      if (stored) setSourceModes(parseSourceModes(JSON.parse(stored)))
      setNoEvidenceMode(parseNoEvidenceMode(window.localStorage.getItem("tibyan.no-evidence-mode.v1")))
    } catch { /* optional local preferences */ }
  }, [])
  const changeSourceModes = (value: SourceMode[]) => {
    setSourceModes(value)
    try { window.localStorage.setItem("tibyan.source-modes.v1", JSON.stringify(value)) } catch { /* optional */ }
  }
  const changeNoEvidenceMode = (value: NoEvidenceMode) => {
    setNoEvidenceMode(value)
    try { window.localStorage.setItem("tibyan.no-evidence-mode.v1", value) } catch { /* optional */ }
  }
  const [showSplash, setShowSplash] = useState(true)
  const [accountAccessOpen, setAccountAccessOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncDecisionData, setSyncDecisionData] = useState<SyncDecisionData | null>(null)
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>("idle")
  const [syncError, setSyncError] = useState<string | null>(null)
  const [cloudReadyUserId, setCloudReadyUserId] = useState<string | null>(null)
  const [localOnlySessionIds, setLocalOnlySessionIds] = useState<string[]>([])
  const [deletedSessionIds, setDeletedSessionIds] = useState<string[]>([])
  const [syncRetryCount, setSyncRetryCount] = useState(0)
  const autoSyncEnabledRef = useRef(false)
  const processedAccountUserRef = useRef<string | null>(null)
  const cloudSaveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const [splashDraft, setSplashDraft] = useState<string | undefined>()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState("")
  const [historyReady, setHistoryReady] = useState(false)
  const [pending, setPending] = useState<{ sessionId: string; question: string } | null>(null)
  const [progressStages, setProgressStages] = useState<AnswerStage[]>([])
  const [showTests, setShowTests] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [modelSelection, setModelSelection] = useState<AIModelSelection | null>(null)
  const [modelFallbackSelection, setModelFallbackSelection] = useState<AIModelSelection | null>(null)
  useEffect(() => {
    let active = true
    fetch("/api/models").then((response) => response.json()).then((catalog) => {
      if (!active) return
      const primary = modelSelection || catalog?.defaultSelection
      const fallback = modelFallbackSelection
      const lookup = (selection: AIModelSelection | null | undefined) => catalog?.providers?.find((provider: any) => provider.id === selection?.providerId)?.models?.find((model: any) => model.id === selection?.modelId)?.supportsTools
      const supports = lookup(primary)
      const fallbackSupports = lookup(fallback)
      setMcpModelCapable(supports === false && (!fallback || fallbackSupports === false) ? false : null)
    }).catch(() => { if (active) setMcpModelCapable(null) })
    return () => { active = false }
  }, [modelSelection, modelFallbackSelection])
  const [modelSelectionReady, setModelSelectionReady] = useState(false)
  const [storageWarning, setStorageWarning] = useState(false)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  )
  const thread = activeSession?.messages || []
  const pendingForActiveSession = pending?.sessionId === activeSessionId

  // معرفة خلفية السائل — زر المصباح
  const [knowledge, setKnowledge] = useState<KnowledgeOption>(PRESET_KNOWLEDGE[0])
  const [knowledgePreferenceId, setKnowledgePreferenceId] = useState<string | null>(null)
  const [customKnowledge, setCustomKnowledge] = useState<KnowledgeOption[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const localAccountSnapshot = useMemo<TibyanAccountData>(() => ({
    version: 1,
    sessions,
    deletedSessionIds,
    customKnowledge,
    selectedKnowledgeId: knowledgePreferenceId,
    modelSelection,
    modelFallbackSelection,
    activeSessionId: activeSessionId || null,
    sidebarCollapsed,
  }), [sessions, deletedSessionIds, customKnowledge, knowledgePreferenceId, modelSelection, modelFallbackSelection, activeSessionId, sidebarCollapsed])
  const localAccountSnapshotRef = useRef(localAccountSnapshot)
  localAccountSnapshotRef.current = localAccountSnapshot

  const finishSplash = useCallback((draft?: string) => {
    setSplashDraft(draft?.trim() ? draft : undefined)
    setShowSplash(false)
  }, [])

  // استعادة سجل المحادثات والتفضيلات محلياً عند أول تحميل (من دون أي طلب للخادم).
  useEffect(() => {
    const customs = loadCustomKnowledge()
    setCustomKnowledge(customs)
    const selectedKnowledgeId = loadSelectedKnowledgeId()
    setKnowledgePreferenceId(selectedKnowledgeId)
    if (selectedKnowledgeId) {
      const found =
        customs.find((option) => option.id === selectedKnowledgeId) ||
        PRESET_KNOWLEDGE.find((option) => option.id === selectedKnowledgeId)
      if (found) setKnowledge(found)
    }

    const storedSessions = loadChatSessions()
    const preferredId = loadActiveChatId()
    const selectedSession = storedSessions.find((session) => session.id === preferredId) || storedSessions[0]
    const initialSessions = storedSessions.length > 0 ? storedSessions : [createChatSession()]
    setSessions(initialSessions)
    setActiveSessionId(selectedSession?.id || initialSessions[0].id)
    setSidebarCollapsed(loadSidebarCollapsed())
    setHistoryReady(true)
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MODEL_SELECTION_STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (AI_PROVIDER_IDS.includes(saved?.providerId) && typeof saved?.modelId === "string") {
          setModelSelection({
            providerId: saved.providerId,
            modelId: saved.modelId,
            modelName: typeof saved.modelName === "string" ? saved.modelName : saved.modelId,
            providerName: typeof saved.providerName === "string" ? saved.providerName : saved.providerId,
          })
        }
      }
    } catch {
      // A stale or malformed model preference is ignored; no key is stored here.
    }

    try {
      const rawFallback = window.localStorage.getItem(MODEL_FALLBACK_STORAGE_KEY)
      if (rawFallback) {
        const savedFallback = JSON.parse(rawFallback)
        if (AI_PROVIDER_IDS.includes(savedFallback?.providerId) && typeof savedFallback?.modelId === "string") {
          setModelFallbackSelection({
            providerId: savedFallback.providerId,
            modelId: savedFallback.modelId,
            modelName: typeof savedFallback.modelName === "string" ? savedFallback.modelName : savedFallback.modelId,
            providerName: typeof savedFallback.providerName === "string" ? savedFallback.providerName : savedFallback.providerId,
          })
        }
      }
    } catch {
      // Invalid fallback settings are ignored; no API key is stored locally.
    } finally {
      setModelSelectionReady(true)
    }
  }, [])

  useEffect(() => {
    if (!modelSelectionReady) return
    try {
      if (modelSelection) window.localStorage.setItem(MODEL_SELECTION_STORAGE_KEY, JSON.stringify(modelSelection))
      else window.localStorage.removeItem(MODEL_SELECTION_STORAGE_KEY)
    } catch {
      // Model preference is optional; it is safe to continue without local storage.
    }
  }, [modelSelection, modelSelectionReady])

  useEffect(() => {
    if (!modelSelectionReady) return
    try {
      if (modelFallbackSelection) {
        window.localStorage.setItem(MODEL_FALLBACK_STORAGE_KEY, JSON.stringify(modelFallbackSelection))
      } else {
        window.localStorage.removeItem(MODEL_FALLBACK_STORAGE_KEY)
      }
    } catch {
      // Fallback preference is optional; the application remains usable without local storage.
    }
  }, [modelFallbackSelection, modelSelectionReady])

  useEffect(() => {
    if (!historyReady) return
    setStorageWarning(!saveChatSessions(sessions))
  }, [sessions, historyReady])

  useEffect(() => {
    if (historyReady) saveCustomKnowledge(customKnowledge)
  }, [customKnowledge, historyReady])

  useEffect(() => {
    if (historyReady && activeSessionId) saveActiveChatId(activeSessionId)
  }, [activeSessionId, historyReady])

  useEffect(() => {
    if (historyReady) saveSidebarCollapsed(sidebarCollapsed)
  }, [sidebarCollapsed, historyReady])

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const requestLockRef = useRef(false)
  const knowledgeBtnRef = useRef<HTMLDivElement | null>(null)

  const { scrollYProgress } = useScroll({ container: scrollerRef })
  useMotionValueEvent(scrollYProgress, "change", (v) => setAtBottom(v > 0.985))

  const applyAccountData = useCallback((data: TibyanAccountData) => {
    const nextSessions = data.sessions.length ? data.sessions : [createChatSession()]
    const nextActiveId = data.activeSessionId && nextSessions.some((session) => session.id === data.activeSessionId)
      ? data.activeSessionId
      : nextSessions[0].id
    const selectedKnowledge = data.selectedKnowledgeId
      ? data.customKnowledge.find((option) => option.id === data.selectedKnowledgeId) ||
        PRESET_KNOWLEDGE.find((option) => option.id === data.selectedKnowledgeId)
      : undefined

    setSessions(nextSessions)
    setActiveSessionId(nextActiveId)
    setDeletedSessionIds(data.deletedSessionIds)
    setCustomKnowledge(data.customKnowledge)
    setKnowledgePreferenceId(data.selectedKnowledgeId)
    setKnowledge(selectedKnowledge || PRESET_KNOWLEDGE[0])
    setModelSelection(data.modelSelection)
    setModelFallbackSelection(data.modelFallbackSelection)
    setSidebarCollapsed(data.sidebarCollapsed)
    saveCustomKnowledge(data.customKnowledge)
    if (user?.id) writeDeletedSessionIds(user.id, data.deletedSessionIds)
    saveSelectedKnowledgeId(data.selectedKnowledgeId)
    saveActiveChatId(nextActiveId)
    saveSidebarCollapsed(data.sidebarCollapsed)
  }, [user?.id])

  const deferCloudSync = useCallback(() => {
    if (!user?.id) return
    setSyncDeferred(user.id, true)
    autoSyncEnabledRef.current = false
    setCloudReadyUserId(null)
    setSyncStatus("paused")
    setSyncError(null)
    setSyncModalOpen(false)
  }, [user?.id])

  const completeCloudSync = useCallback(async (localOnlyIds: string[] = []) => {
    const userId = user?.id
    if (!client || !userId) return
    autoSyncEnabledRef.current = false
    setCloudReadyUserId(null)
    setSyncStatus("syncing")
    setSyncError(null)

    try {
      // Reload just before writing so changes made on another device are merged too.
      const latestCloudData = await fetchAccountData(client, userId)
      const localSnapshot = { ...localAccountSnapshotRef.current, deletedSessionIds: readDeletedSessionIds(userId) }
      const merged = mergeAccountData(localSnapshot, latestCloudData, new Set(localOnlyIds))
      await saveAccountData(client, userId, merged.cloudData)
      if (processedAccountUserRef.current !== userId) return

      const keptIds = Array.from(new Set(localOnlyIds)).filter((id) => merged.localData.sessions.some((session) => session.id === id))
      writeLocalOnlySessionIds(userId, keptIds)
      writeSyncOwner(userId)
      setSyncDeferred(userId, false)
      setLocalOnlySessionIds(keptIds)
      applyAccountData(merged.localData)
      setSyncDecisionData({ localData: merged.localData, cloudData: merged.cloudData })
      setSyncModalOpen(false)
      autoSyncEnabledRef.current = true
      setCloudReadyUserId(userId)
      setSyncStatus("active")
    } catch (error) {
      if (processedAccountUserRef.current !== userId) return
      autoSyncEnabledRef.current = false
      setSyncError(accountSyncErrorMessage(error))
      setSyncStatus("error")
    }
  }, [client, user?.id, applyAccountData])

  const resumeCloudSync = useCallback(async () => {
    const userId = user?.id
    if (!client || !userId) {
      setAccountAccessOpen(true)
      return
    }
    autoSyncEnabledRef.current = false
    setCloudReadyUserId(null)
    setSyncStatus("checking")
    setSyncError(null)
    const localOnlyIds = readLocalOnlySessionIds(userId)
    const deletedIds = readDeletedSessionIds(userId)
    setLocalOnlySessionIds(localOnlyIds)
    setDeletedSessionIds(deletedIds)

    try {
      const cloudData = await fetchAccountData(client, userId)
      if (processedAccountUserRef.current !== userId) return
      setSyncDecisionData({ localData: { ...localAccountSnapshotRef.current, deletedSessionIds: deletedIds }, cloudData })
      setSyncStatus("decision")
      setSyncModalOpen(true)
    } catch (error) {
      if (processedAccountUserRef.current !== userId) return
      setSyncError(accountSyncErrorMessage(error))
      setSyncStatus("error")
    }
  }, [client, user?.id])

  const retryCloudSync = useCallback(() => {
    if (syncDecisionData) {
      autoSyncEnabledRef.current = false
      setCloudReadyUserId(null)
      setSyncError(null)
      setSyncStatus("decision")
      setSyncModalOpen(true)
      return
    }
    processedAccountUserRef.current = null
    setSyncError(null)
    setSyncStatus("checking")
    setSyncRetryCount((value) => value + 1)
  }, [syncDecisionData])

  const handleSyncAction = useCallback(() => {
    if (syncStatus === "active") deferCloudSync()
    else if (syncStatus === "paused") void resumeCloudSync()
    else if (syncStatus === "error") retryCloudSync()
  }, [syncStatus, deferCloudSync, resumeCloudSync, retryCloudSync])

  const openAccount = useCallback(() => {
    if (user) router.push("/account")
    else setAccountAccessOpen(true)
  }, [router, user])

  useEffect(() => {
    if (!historyReady || !modelSelectionReady || authLoading) return
    const userId = user?.id || null

    if (!userId) {
      const previousUserId = processedAccountUserRef.current
      if (previousUserId) setSyncDeferred(previousUserId, true)
      autoSyncEnabledRef.current = false
      processedAccountUserRef.current = null
      setCloudReadyUserId(null)
      setSyncStatus("idle")
      setSyncError(null)
      setSyncModalOpen(false)
      setSyncDecisionData(null)
      setLocalOnlySessionIds([])
      setDeletedSessionIds([])
      return
    }

    if (!client || processedAccountUserRef.current === userId) return
    processedAccountUserRef.current = userId
    autoSyncEnabledRef.current = false
    setCloudReadyUserId(null)
    setSyncStatus("checking")
    setSyncError(null)
    const storedLocalOnlyIds = readLocalOnlySessionIds(userId)
    const storedDeletedIds = readDeletedSessionIds(userId)
    setLocalOnlySessionIds(storedLocalOnlyIds)
    setDeletedSessionIds(storedDeletedIds)
    const localSnapshot = { ...localAccountSnapshotRef.current, deletedSessionIds: storedDeletedIds }
    const alreadyConsented = readSyncOwner() === userId
    const deferred = isSyncDeferred(userId)
    let cancelled = false

    void (async () => {
      try {
        const cloudData = await fetchAccountData(client, userId)
        if (cancelled) return
        setSyncDecisionData({ localData: localSnapshot, cloudData })

        if (deferred) {
          setSyncStatus("paused")
          return
        }

        if (!alreadyConsented) {
          if (hasMeaningfulAccountData(localSnapshot) || hasMeaningfulAccountData(cloudData)) {
            setSyncStatus("decision")
            setSyncModalOpen(true)
          } else {
            // No data is uploaded merely because an empty account was opened.
            setSyncStatus("paused")
          }
          return
        }

        const merged = mergeAccountData(localSnapshot, cloudData, new Set(storedLocalOnlyIds))
        await saveAccountData(client, userId, merged.cloudData)
        if (cancelled || processedAccountUserRef.current !== userId) return

        const validLocalOnlyIds = storedLocalOnlyIds.filter((id) => merged.localData.sessions.some((session) => session.id === id))
        if (validLocalOnlyIds.length !== storedLocalOnlyIds.length) writeLocalOnlySessionIds(userId, validLocalOnlyIds)
        setLocalOnlySessionIds(validLocalOnlyIds)
        applyAccountData(merged.localData)
        setSyncDecisionData({ localData: merged.localData, cloudData: merged.cloudData })
        writeSyncOwner(userId)
        autoSyncEnabledRef.current = true
        setCloudReadyUserId(userId)
        setSyncStatus("active")
      } catch (error) {
        if (cancelled) return
        autoSyncEnabledRef.current = false
        setSyncError(accountSyncErrorMessage(error))
        setSyncStatus("error")
      }
    })()

    return () => { cancelled = true }
  }, [historyReady, modelSelectionReady, authLoading, user?.id, client, syncRetryCount, applyAccountData])

  useEffect(() => {
    const userId = user?.id
    if (!client || !userId || cloudReadyUserId !== userId || !autoSyncEnabledRef.current) return

    const localSnapshot = localAccountSnapshot
    const localRevision = accountSnapshotRevision(localSnapshot)
    const localOnly = new Set(localOnlySessionIds)
    const timer = window.setTimeout(() => {
      if (!autoSyncEnabledRef.current || processedAccountUserRef.current !== userId) return
      setSyncStatus("syncing")
      let mergedResult: ReturnType<typeof mergeAccountData> | null = null
      const queuedSave = cloudSaveQueueRef.current.catch(() => undefined).then(async () => {
        if (!autoSyncEnabledRef.current || processedAccountUserRef.current !== userId) return
        const latestCloud = await fetchAccountData(client, userId)
        if (!autoSyncEnabledRef.current || processedAccountUserRef.current !== userId) return
        mergedResult = mergeAccountData(localSnapshot, latestCloud, localOnly)
        await saveAccountData(client, userId, mergedResult.cloudData)
      })
      cloudSaveQueueRef.current = queuedSave
      queuedSave.then(() => {
        if (processedAccountUserRef.current !== userId || !autoSyncEnabledRef.current) return
        const merged = mergedResult
        if (merged && accountSnapshotRevision(localAccountSnapshotRef.current) === localRevision) {
          if (accountSnapshotRevision(merged.localData) !== localRevision) applyAccountData(merged.localData)
          setSyncDecisionData({ localData: merged.localData, cloudData: merged.cloudData })
        }
        setSyncError(null)
        setSyncStatus("active")
      }).catch((error) => {
        if (processedAccountUserRef.current !== userId) return
        setSyncError(accountSyncErrorMessage(error))
        setSyncStatus("error")
      })
    }, 700)

    return () => window.clearTimeout(timer)
  }, [client, user?.id, cloudReadyUserId, localAccountSnapshot, localOnlySessionIds, applyAccountData])

  // handlers نظام المعرفة
  const selectKnowledge = (k: KnowledgeOption) => {
    setKnowledge(k)
    setKnowledgePreferenceId(k.id)
    saveSelectedKnowledgeId(k.id)
    setPickerOpen(false)
  }

  const saveCustomKnowledgeOption = (k: KnowledgeOption) => {
    setCustomKnowledge((prev) => {
      const next = [...prev, k]
      saveCustomKnowledge(next)
      return next
    })
    setSheetOpen(false)
    selectKnowledge(k)
  }

  const CurrentKnowledgeIcon = getKnowledgeIcon(knowledge.icon)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior })
    })
  }, [])

  const appendToSession = useCallback((sessionId: string, message: ThreadItem) => {
    setSessions((previous) => {
      const current = previous.find((session) => session.id === sessionId)
      if (!current) return previous
      const messages = [...current.messages, message]
      const firstQuestion = messages.find((entry) => entry.role === "user")
      const next: ChatSession = {
        ...current,
        title: current.title === "محادثة جديدة" && firstQuestion?.role === "user"
          ? makeChatTitle(firstQuestion.question)
          : current.title,
        updatedAt: new Date().toISOString(),
        messages,
      }
      return [next, ...previous.filter((session) => session.id !== sessionId)]
    })
  }, [])

  const syncLocked = syncStatus === "checking" || syncModalOpen

  const startNewChat = useCallback(() => {
    if (!historyReady || pending || syncLocked || !canCreateGuestConversation(sessions.length, !!user)) return
    const fresh = createChatSession()
    setSessions((previous) => [fresh, ...previous])
    setActiveSessionId(fresh.id)
    saveActiveChatId(fresh.id)
    setShowTests(false)
    setMobileSidebarOpen(false)
    setAtBottom(true)
  }, [historyReady, pending, sessions.length, syncLocked, user])

  const selectChat = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId)
    saveActiveChatId(sessionId)
    setShowTests(false)
    setAtBottom(true)
    setMobileSidebarOpen(false)
  }, [])

  const deleteChat = useCallback((sessionId: string) => {
    if (pending) return
    const target = sessions.find((session) => session.id === sessionId)
    if (!target || !window.confirm(`هل تريد حذف «${target.title || "محادثة جديدة"}»؟ لا يمكن التراجع عن الحذف.`)) return

    const remaining = sessions.filter((session) => session.id !== sessionId)
    const nextSessions = remaining.length ? remaining : [createChatSession()]
    setSessions(nextSessions)
    const syncOwnerId = user?.id || readSyncOwner()
    const knownLocalOnlyIds = user?.id
      ? localOnlySessionIds
      : syncOwnerId ? readLocalOnlySessionIds(syncOwnerId) : []
    const nextLocalOnlyIds = knownLocalOnlyIds.filter((id) => id !== sessionId)
    if (user?.id) setLocalOnlySessionIds(nextLocalOnlyIds)
    if (syncOwnerId) writeLocalOnlySessionIds(syncOwnerId, nextLocalOnlyIds)
    if (syncOwnerId) {
      const knownDeletedIds = user?.id ? deletedSessionIds : readDeletedSessionIds(syncOwnerId)
      const nextDeletedIds = Array.from(new Set([...knownDeletedIds, sessionId])).slice(-10_000)
      if (user?.id) setDeletedSessionIds(nextDeletedIds)
      writeDeletedSessionIds(syncOwnerId, nextDeletedIds)
    }
    if (activeSessionId === sessionId) {
      setActiveSessionId(nextSessions[0].id)
      saveActiveChatId(nextSessions[0].id)
    }
    setShowTests(false)
  }, [activeSessionId, deletedSessionIds, localOnlySessionIds, pending, sessions, user?.id])

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), [])
  const toggleSidebarCollapsed = useCallback(() => setSidebarCollapsed((value) => !value), [])
  const openSettings = useCallback(() => {
    setPickerOpen(false)
    setSettingsOpen(true)
  }, [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const closeModelPicker = useCallback(() => setModelPickerOpen(false), [])
  const openModelSettings = useCallback(() => {
    setSettingsOpen(false)
    setModelPickerOpen(true)
  }, [])
  const selectModel = useCallback((selection: AIModelSelection) => {
    setModelSelection(selection)
    setModelFallbackSelection((current) => current?.providerId === selection.providerId && current?.modelId === selection.modelId ? null : current)
    setModelPickerOpen(false)
  }, [])
  const selectFallbackModel = useCallback((selection: AIModelSelection | null) => {
    setModelFallbackSelection(selection)
  }, [])
  const acceptDefaultModel = useCallback((selection: AIModelSelection) => {
    setModelSelection((current) => current || selection)
  }, [])

  useEffect(() => {
    if (!historyReady) return
    requestAnimationFrame(() => {
      const el = scrollerRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" })
    })
  }, [activeSessionId, historyReady])

  // اختصار لوحة المفاتيح: تركيز المُدخل
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        composerRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleAsk = useCallback(
    async (raw: string, options?: { retryMessageId?: string }) => {
      let question = (raw || "").trim()
      const sessionId = activeSessionId
      const currentSession = sessions.find((session) => session.id === sessionId)
      if (!question || !historyReady || !sessionId || !currentSession || pending || syncLocked || requestLockRef.current) return

      const retryMessageId = options?.retryMessageId
      let historyMessages = currentSession.messages
      if (retryMessageId) {
        const responseIndex = currentSession.messages.findIndex((message) => message.id === retryMessageId)
        const responseMessage = currentSession.messages[responseIndex]
        const precedingMessage = currentSession.messages[responseIndex - 1]
        if (
          responseIndex !== currentSession.messages.length - 1 ||
          responseMessage?.role !== "tibyan" ||
          precedingMessage?.role !== "user"
        ) return

        question = responseMessage.response.question.trim()
        if (!question) return
        historyMessages = currentSession.messages.slice(0, responseIndex - 1)
        setSessions((previous) => previous.map((session) => session.id === sessionId
          ? { ...session, messages: session.messages.filter((message) => message.id !== retryMessageId) }
          : session))
      } else {
        appendToSession(sessionId, {
          id: createMessageId(),
          role: "user",
          question,
          createdAt: new Date().toISOString(),
        })
      }

      requestLockRef.current = true
      setProgressStages([])
      setPending({ sessionId, question })
      scrollToBottom()

      let data: AskResponse
      try {
        const history = historyMessages
          .slice(-8)
          .map((message) => message.role === "user"
            ? { role: "user", text: message.question }
            : {
                role: "model",
                text: message.response?.status === "error" ? "" : (message.response?.purpleCards?.[0]?.explanation || "").slice(0, 1000),
              }
          )
          .filter((turn) => turn.text && turn.text.trim())

        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
          body: JSON.stringify({
            question,
            persona: knowledge.persona,
            background: knowledge.kind === "custom" ? knowledge.background : undefined,
            history,
            providerId: modelSelection?.providerId,
            modelId: modelSelection?.modelId,
            fallbackProviderId: modelFallbackSelection?.providerId,
            fallbackModelId: modelFallbackSelection?.modelId,
            sourceModes: mcpModelCapable === false ? sourceModes.filter((mode) => mode !== "mcp") : sourceModes,
            noEvidenceMode,
          }),
        })
        const json = await readAnswerStream(res, (stage) => setProgressStages((previous) => previous.at(-1) === stage ? previous : [...previous, stage]))
        if (!res.ok) throw new Error(String(json?.error || `تعذّر الاتصال بخدمة الإجابة (HTTP ${res.status})`))
        if (!json || typeof json !== "object") throw new Error("أعاد الخادم استجابة غير صالحة؛ أعد المحاولة بعد قليل.")
        if (json.error) throw new Error(String(json.error))

        const responseStatus = ["ok", "abstain", "blocked", "error"].includes(json.status) ? json.status : "abstain"
        const responseMetrics = {
          responseTime: Number(json.metrics?.responseTime) || 0,
          confidence: Number(json.metrics?.confidence) || 0,
          sourcesCount: Number(json.metrics?.sourcesCount) || 0,
          retrievalSource: json.metrics?.retrievalSource,
          llm: json.metrics?.llm,
          fallbackUsed: Boolean(json.metrics?.fallbackUsed),
          usedProviderId: json.metrics?.usedProviderId,
          usedProviderName: json.metrics?.usedProviderName,
          usedModelId: json.metrics?.usedModelId,
          usedModelName: json.metrics?.usedModelName,
        }

        if (
          responseMetrics.fallbackUsed &&
          AI_PROVIDER_IDS.includes(responseMetrics.usedProviderId as AIProviderId) &&
          typeof responseMetrics.usedModelId === "string"
        ) {
          const actualSelection: AIModelSelection = {
            providerId: responseMetrics.usedProviderId as AIProviderId,
            modelId: responseMetrics.usedModelId,
            providerName: typeof responseMetrics.usedProviderName === "string" ? responseMetrics.usedProviderName : responseMetrics.usedProviderId,
            modelName: typeof responseMetrics.usedModelName === "string" ? responseMetrics.usedModelName : responseMetrics.usedModelId,
          }
          setModelSelection(actualSelection)
          setModelFallbackSelection((current) => current?.providerId === actualSelection.providerId && current?.modelId === actualSelection.modelId ? null : current)
        }

        data = {
          question: String(json.question || question),
          level: (json.level || "abstain") as Level,
          levelInfo: json.levelInfo || LEVELS.abstain,
          intent: String(json.intent || "general"),
          interactionType: ["conversation", "quran_audio", "quran_text", "verification", "answer", "referral"].includes(json.interactionType)
            ? json.interactionType
            : undefined,
          verificationStatus: ["confirmed", "near_match", "not_found", "needs_quote"].includes(json.verificationStatus)
            ? json.verificationStatus
            : undefined,
          status: responseStatus,
          action: String(json.action || (responseStatus === "error" ? "retry" : responseStatus === "ok" ? "proceed" : "abstain")),
          blueCards: Array.isArray(json.blueCards) ? json.blueCards : [],
          audioCard: json.audioCard && typeof json.audioCard === "object" ? json.audioCard : undefined,
          audioRequest: json.audioRequest && typeof json.audioRequest === "object" ? json.audioRequest : undefined,
          purpleCards: Array.isArray(json.purpleCards) ? json.purpleCards.map((card: any) => ({
            explanation: String(card?.explanation || ""),
            persona: card?.persona || knowledge.persona,
            level: card?.level || json.level || "abstain",
            references: Array.isArray(card?.references) ? card.references : [],
            llm: card?.llm,
          })) : [],
          confidence: Number(json.confidence) || 0,
          guard: json.guard ? { status: json.guard.status, action: json.guard.action } : {},
          metrics: responseMetrics,
        }
      } catch (error: any) {
        const detail = String(error?.message || "تعذّر الاتصال بالخادم.").replace(/\s+/g, " ").slice(0, 360)
        data = {
          question,
          level: "abstain",
          levelInfo: LEVELS.abstain,
          intent: "technical_error",
          status: "error",
          action: "retry",
          interactionType: "answer",
          blueCards: [],
          purpleCards: [{
            explanation: `تعذّر إنشاء الرد بسبب خطأ تقني. هذا لا يعني امتناعاً عن السؤال أو حكماً عليه.\n\nالتفصيل: ${detail}\n\nيمكنك إعادة المحاولة أو تغيير النموذج من الإعدادات.`,
            persona: knowledge.persona,
            level: "abstain",
          }],
          confidence: 0,
          guard: { status: "error", action: "retry" },
          metrics: { responseTime: 0 },
        }
      }

      appendToSession(sessionId, {
        id: createMessageId(),
        role: "tibyan",
        response: data,
        createdAt: new Date().toISOString(),
      })
      setPending((current) => current?.sessionId === sessionId ? null : current)
      setProgressStages([])
      requestLockRef.current = false
      if (activeSessionId === sessionId) scrollToBottom()
    },
    [activeSessionId, appendToSession, historyReady, knowledge, modelFallbackSelection, modelSelection, pending, scrollToBottom, sessions, syncLocked, sourceModes, noEvidenceMode, mcpModelCapable]
  )

  const isEmpty = thread.length === 0 && !pendingForActiveSession
  const answeredCount = thread.filter((message) => message.role === "tibyan").length
  const appVisible = historyReady && !showSplash
  const splashVisible = showSplash || !historyReady
  const guestLimitReached = !user && sessions.length >= MAX_GUEST_CONVERSATIONS
  const syncMessage = !user
    ? "وضع الضيف؛ لن تُرفع التغييرات دون موافقتك."
    : syncStatus === "active"
      ? "المزامنة السحابية نشطة."
      : syncStatus === "paused"
        ? "المزامنة متوقفة؛ بيانات الجهاز لا تُرفع."
        : syncStatus === "checking"
          ? "جارٍ التحقق من بيانات الحساب…"
          : syncStatus === "decision"
            ? "بانتظار قرارك بشأن المزامنة."
            : syncStatus === "syncing"
              ? "جارٍ حفظ التغييرات في الحساب…"
              : syncStatus === "error"
                ? (syncError || "تعذّرت المزامنة؛ بياناتك المحلية محفوظة.")
                : "لن تُرفع بياناتك قبل موافقتك."
  const syncTone = syncStatus === "active" ? "active" : syncStatus === "paused" ? "paused" : syncStatus === "error" ? "error" : (syncStatus === "checking" || syncStatus === "decision" || syncStatus === "syncing") ? "busy" : "local"
  const syncActionLabel = syncStatus === "active" ? "إيقاف المزامنة" : syncStatus === "paused" ? "إدارة / استئناف المزامنة" : syncStatus === "error" ? "إعادة المحاولة" : undefined

  return (
    <>
      <AnimatePresence initial={false}>
          {splashVisible && (
            <SplashScreen
              key="tibyan-splash"
              onFinish={finishSplash}
              onAsk={handleAsk}
            />
          )}
        </AnimatePresence>

      {appVisible && (
      <motion.main
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          opacity: { duration: 0.68, delay: 0.08 },
          y: { duration: 0.74, delay: 0.04, ease: [0.16, 1, 0.3, 1] },
        }}
        className="relative flex h-[100dvh] flex-row overflow-hidden"
      >
        {/* خلفية حيّة */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="tb-orb tb-orb--a" />
          <div className="tb-orb tb-orb--b" />
          <div className="tb-orb tb-orb--c" />
          <div className="tb-orb tb-orb--d" />
          <div className="tb-grid" />
          <img
            src="/tibyan-brand-kit/motif/shapes/tibyan-shape-01-chain-3.svg"
            alt=""
            className="absolute top-[10%] right-[3%] w-[150px] opacity-[0.05] hidden xl:block"
          />
          <img
            src="/tibyan-brand-kit/motif/shapes/tibyan-shape-05-hub.svg"
            alt=""
            className="absolute bottom-[16%] left-[4%] w-[130px] opacity-[0.045] hidden xl:block"
          />
        </div>

        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          visible={appVisible}
          disabled={!historyReady || !!pending || !appVisible || syncLocked}
          storageWarning={storageWarning}
          guestMode={!user}
          guestConversationCount={sessions.length}
          guestLimitReached={guestLimitReached}
          isAuthenticated={!!user}
          accountLabel={user ? "حسابي" : "دخول / إنشاء حساب"}
          syncMessage={syncMessage}
          syncTone={syncTone}
          syncActionLabel={syncActionLabel}
          onSyncAction={handleSyncAction}
          onToggleCollapsed={toggleSidebarCollapsed}
          onCloseMobile={closeMobileSidebar}
          onNewChat={startNewChat}
          onSelectSession={selectChat}
          onDeleteSession={deleteChat}
          onOpenAccount={openAccount}
          onOpenSettings={openSettings}
        />

        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        {/* الترويسة */}
        <header className="shrink-0 z-30 backdrop-blur-[14px] border-b bg-white/72">
          <div className="flex w-full items-center justify-between gap-2 px-2 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <motion.button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                whileTap={{ scale: 0.94 }}
                aria-label="فتح سجل المحادثات"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#C9DFE1]/80 bg-white/80 text-[#0A8F94] shadow-sm md:hidden"
              >
                <Menu size={18} />
              </motion.button>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-extrabold leading-tight text-[#0A2A33] sm:text-[17px]">
                  {activeSession?.title || "محادثة جديدة"}
                </div>
                <div className="truncate text-[10.5px] text-[#6D8A90] sm:text-[12px]">
                  نَصٌّ يَسْتَنِدُ لِدَلِيلٍ يعْتَمَدٍ
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* زر المصباح — معرفة خلفية السائل (بدل المبدل القديم) */}
              <div className="relative" ref={knowledgeBtnRef}>
                <motion.button
                  type="button"
                  onClick={() => setPickerOpen((s) => !s)}
                  disabled={syncLocked}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-haspopup="menu"
                  aria-expanded={pickerOpen}
                  title="معرفة خلفية السائل"
                  className="relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-[12.5px] sm:text-[14px] font-bold border transition-colors"
                  style={{
                    background: pickerOpen ? "#0A8F94" : "#fff",
                    color: pickerOpen ? "#fff" : "#0A2A33",
                    borderColor: pickerOpen ? "#0A8F94" : "#C9DFE1",
                  }}
                >
                  <Lightbulb size={17} strokeWidth={2.4} className="text-[#E0B450]" />
                  <CurrentKnowledgeIcon
                    size={16}
                    strokeWidth={2.3}
                    className={pickerOpen ? "text-white" : "text-[#0A8F94]"}
                  />
                  <span className="max-w-[110px] truncate">{knowledge.label}</span>
                </motion.button>

                <KnowledgePicker
                  open={pickerOpen && !syncLocked}
                  onClose={() => setPickerOpen(false)}
                  selectedId={knowledge.id}
                  presets={PRESET_KNOWLEDGE}
                  customOptions={customKnowledge}
                  onSelect={selectKnowledge}
                  onAddCustom={() => {
                    setPickerOpen(false)
                    setSheetOpen(true)
                  }}
                  anchorRef={knowledgeBtnRef}
                />
              </div>

              <motion.button
                type="button"
                onClick={() => setShowTests((s) => !s)}
                disabled={syncLocked}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className="relative px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[12.5px] sm:text-[14px] font-bold border transition-colors"
                style={{
                  background: showTests ? "#0A8F94" : "#fff",
                  color: showTests ? "#fff" : "#0A8F94",
                  borderColor: showTests ? "#0A8F94" : "#C9DFE1",
                }}
                aria-expanded={showTests}
              >
                12 حالة
                {answeredCount > 0 && (
                  <span className="ms-1.5 tabular-nums opacity-70">{answeredCount}/12</span>
                )}
              </motion.button>
            </div>
          </div>

          {/* أُزيل شريط الشخصية للجوال — زر المصباح في الترويسة يفتح المنتقي على كل المقاسات */}
        </header>

        {/* منطقة المحادثة */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto tb-scroll relative">
          <div className="max-w-[940px] mx-auto px-4 pt-6 pb-4">
            <AnimatePresence initial={false} mode="popLayout">
              {isEmpty && (
                <motion.section
                  key="empty"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="flex flex-col items-center text-center pt-6 pb-10"
                >
                  <AnimatedLogo size={104} animated showText={false} variant="color" />

                  <h1 className="mt-5 text-[30px] font-extrabold leading-tight">
                    <span className="tb-grad-text">مرحباً في تِبْيَان</span>
                  </h1>
                  <p className="body-font mt-2 text-[15px] text-[#4B6A72] max-w-[500px] leading-relaxed">
                    اسأل سؤالاً شرعياً أو فكرياً، فيرجع إليك الجواب بنصٍّ حرفي من مصدر معتمد،
                    وشرح منظم، ومؤشر استرجاع داخلي غير مُعاير — أو امتناع صريح عند غياب المرجعية.
                  </p>

                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#C9DFE1] text-[12px] text-[#0A8F94] font-bold">
                    <CurrentKnowledgeIcon size={14} strokeWidth={2.4} />
                    الخطاب الحالي: {knowledge.label} — {knowledge.kind === "custom" ? knowledge.background : knowledge.hint}
                  </div>

                  <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-[560px]">
                    {QUICK_QUESTIONS.map((item, i) => (
                      <motion.button
                        key={item.q}
                        type="button"
                        onClick={() => handleAsk(item.q)}
                        disabled={syncLocked}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.07, type: "spring", stiffness: 260, damping: 24 }}
                        whileHover={{ y: -3, scale: 1.015 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative text-right p-3.5 rounded-[14px] bg-white/85 backdrop-blur border border-[#C9DFE1]/70 shadow-[0_2px_10px_rgba(10,42,51,0.05)] hover:border-[#0A8F94]/40 hover:shadow-[0_12px_28px_rgba(10,143,148,0.14)] transition-colors overflow-hidden"
                      >
                        <span
                          className="absolute inset-y-0 start-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "linear-gradient(180deg,#19D6C4,#0A8F94)" }}
                        />
                        <span className="block text-[14.5px] font-bold text-[#0A2A33] group-hover:text-[#0A8F94] transition-colors">
                          {item.q}
                        </span>
                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-[#8FB0B6]">
                          <span className="px-1.5 py-0.5 rounded-full bg-[#EEF6F6] border border-[#C9DFE1]">
                            {item.tag}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            اضغط للتجربة ←
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="mt-7 flex items-center gap-3 text-[11.5px] text-[#8FB0B6] flex-wrap justify-center">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#14529E]" />أزرق = نص موثق ﴿…﴾</span>
                    <span className="w-px h-3 bg-[#C9DFE1]" />
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7B4FD6]" />بنفسجي = شرح AI</span>
                    <span className="w-px h-3 bg-[#C9DFE1]" />
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] rotate-45 bg-[#E0B450]" />ذهبي = نور</span>
                    <span className="w-px h-3 bg-[#C9DFE1]" />
                    <span>◯ المؤشر = ترتيب الاسترجاع (غير مُعاير)</span>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* خيط المحادثة */}
            <div className="space-y-5 pb-2">
              <AnimatePresence initial={false}>
                {thread.map((item, index) => {
                  const precedingMessage = index > 0 ? thread[index - 1] : undefined
                  const canRetry = item.role === "tibyan" && index === thread.length - 1 && precedingMessage?.role === "user" && precedingMessage.question === item.response.question
                  return item.role === "user" ? (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] sm:max-w-[70%] bg-[#0A2A33] text-white rounded-[18px] rounded-br-[6px] px-4 py-3 shadow-[0_6px_18px_rgba(10,42,51,0.18)]">
                        <div className="text-[15px] font-medium leading-relaxed">{item.question}</div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 240, damping: 26 }}
                    >
                      <ChatMessage
                        question={item.response.question}
                        level={item.response.level}
                        levelInfo={item.response.levelInfo}
                        blueCards={item.response.blueCards}
                        purpleCards={item.response.purpleCards}
                        audioCard={item.response.audioCard}
                        audioRequest={item.response.audioRequest}
                        confidence={item.response.confidence}
                        metrics={item.response.metrics}
                        status={item.response.status}
                        interactionType={item.response.interactionType}
                        verificationStatus={item.response.verificationStatus}
                        onRetry={canRetry ? () => void handleAsk(item.response.question, { retryMessageId: item.id }) : undefined}
                        retryDisabled={!!pending}
                      />
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {pendingForActiveSession && pending && <ThinkingStages key={`${pending.sessionId}:${pending.question}`} question={pending.question} stages={progressStages} />}
            </div>

            {/* لوحة الحالات الـ12 */}
            <AnimatePresence initial={false}>
              {showTests && (
                <motion.section
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[16px] bg-white/85 backdrop-blur border border-[#C9DFE1]/70 p-4 shadow-[0_6px_20px_rgba(10,42,51,0.06)]">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="text-[14px] font-extrabold text-[#0A2A33]">
                        🧪 الحالات المعيارية الـ12
                      </div>
                      <span className="text-[11.5px] text-[#8FB0B6]">
                        الحزمة العلمية — صفحة 6
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ALL_TESTS.map((q, i) => (
                        <motion.button
                          key={i}
                          type="button"
                          onClick={() => handleAsk(q)}
                          disabled={syncLocked}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025 }}
                          whileHover={{ x: -3 }}
                          whileTap={{ scale: 0.985 }}
                          className="text-right p-2.5 rounded-[10px] bg-white border border-[#C9DFE1]/60 hover:border-[#0A8F94]/45 hover:bg-[#EEF6F6]/50 transition-colors group"
                        >
                          <span className="text-[13px] font-bold text-[#0A2A33] group-hover:text-[#0A8F94] transition-colors">
                            <span className="tabular-nums text-[#8FB0B6] me-1.5">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {q.length > 58 ? q.slice(0, 58) + "…" : q}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* زر النزول للأسفل */}
        <AnimatePresence>
          {!atBottom && !isEmpty && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              aria-label="النزول إلى آخر رسالة"
              className="fixed bottom-[132px] left-1/2 -translate-x-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0A2A33]/90 backdrop-blur text-white shadow-[0_8px_24px_rgba(10,42,51,0.3)] border border-white/10 flex items-center justify-center hover:bg-[#0A2A33] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* المُدخل — بلا خلفية ولا حد علوي ولا ضبابية: الصندوق يطفو فوق خلفية الصفحة */}
        <div className="z-20 shrink-0">
          <div className="mx-auto max-w-[860px] px-4 py-4 sm:px-6 sm:py-6">
            <ChatComposer
              ref={composerRef}
              onSend={handleAsk}
              sourceModes={sourceModes}
              mcpModelCapable={mcpModelCapable}
              onSourceModesChange={changeSourceModes}
              disabled={!historyReady || !!pending || !appVisible || syncLocked}
              initialValue={splashDraft}
            />
          </div>
        </div>
        </div>
      </motion.main>
      )}

      <ChatSettingsModal
        open={settingsOpen}
        sessions={sessions}
        modelSelection={modelSelection}
        fallbackSelection={modelFallbackSelection}
        noEvidenceMode={noEvidenceMode}
        onNoEvidenceModeChange={changeNoEvidenceMode}
        isResearcher={!!user && accountType === "researcher"}
        onOpenModels={openModelSettings}
        onClose={closeSettings}
      />
      <ModelPicker
        open={modelPickerOpen}
        selected={modelSelection}
        fallbackSelection={modelFallbackSelection}
        onSelect={selectModel}
        onFallbackSelect={selectFallbackModel}
        onDefaultSelection={acceptDefaultModel}
        onClose={closeModelPicker}
      />

      {/* مودال / Bottom sheet «معرفة مخصصة» */}
      <CustomKnowledgeSheet open={sheetOpen && !syncLocked} onClose={() => setSheetOpen(false)} onSave={saveCustomKnowledgeOption} />

      <AccountAccessModal open={accountAccessOpen} onClose={() => setAccountAccessOpen(false)} />
      <SyncOnLoginModal
        open={syncModalOpen}
        data={syncDecisionData}
        initialLocalOnlyIds={localOnlySessionIds}
        busy={syncStatus === "checking" || syncStatus === "syncing"}
        error={syncError}
        onSyncAll={() => { void completeCloudSync([]) }}
        onSyncSelected={(ids) => { void completeCloudSync(ids) }}
        onDefer={deferCloudSync}
      />
    </>
  )
}
