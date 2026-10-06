const SYNC_OWNER_STORAGE_KEY = "tibyan.cloud-sync.owner.v1"
const SYNC_DEFERRED_PREFIX = "tibyan.cloud-sync.deferred."
const LOCAL_ONLY_PREFIX = "tibyan.cloud-local-only."
const DELETED_SESSIONS_PREFIX = "tibyan.cloud-deleted-sessions."

export function readSyncOwner(): string | null {
  if (typeof window === "undefined") return null
  try { return window.localStorage.getItem(SYNC_OWNER_STORAGE_KEY) } catch { return null }
}

export function writeSyncOwner(userId: string): void {
  if (typeof window === "undefined") return
  try { window.localStorage.setItem(SYNC_OWNER_STORAGE_KEY, userId) } catch { /* storage is optional */ }
}

export function isSyncDeferred(userId: string): boolean {
  if (typeof window === "undefined") return false
  try { return window.localStorage.getItem(`${SYNC_DEFERRED_PREFIX}${userId}`) === "true" } catch { return false }
}

export function setSyncDeferred(userId: string, deferred: boolean): void {
  if (typeof window === "undefined") return
  try {
    const key = `${SYNC_DEFERRED_PREFIX}${userId}`
    if (deferred) window.localStorage.setItem(key, "true")
    else window.localStorage.removeItem(key)
  } catch { /* storage is optional */ }
}

export function readLocalOnlySessionIds(userId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${LOCAL_ONLY_PREFIX}${userId}`) || "[]")
    return Array.isArray(parsed) ? Array.from(new Set(parsed.filter((id): id is string => typeof id === "string"))) : []
  } catch { return [] }
}

export function writeLocalOnlySessionIds(userId: string, ids: string[]): void {
  if (typeof window === "undefined") return
  try { window.localStorage.setItem(`${LOCAL_ONLY_PREFIX}${userId}`, JSON.stringify(Array.from(new Set(ids)))) } catch { /* storage is optional */ }
}

export function readDeletedSessionIds(userId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${DELETED_SESSIONS_PREFIX}${userId}`) || "[]")
    return Array.isArray(parsed) ? Array.from(new Set(parsed.filter((id): id is string => typeof id === "string"))) : []
  } catch { return [] }
}

export function writeDeletedSessionIds(userId: string, ids: string[]): void {
  if (typeof window === "undefined") return
  try { window.localStorage.setItem(`${DELETED_SESSIONS_PREFIX}${userId}`, JSON.stringify(Array.from(new Set(ids)))) } catch { /* storage is optional */ }
}
