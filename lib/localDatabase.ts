import { normalizeAccountData, type TibyanAccountData } from "./accountData"

// Browser-local IndexedDB, not a server database. No authentication or public links.
const DB_NAME = "tibyan-local-v1"
const STORE_NAME = "snapshots"
const KEY = "device"

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"))
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"))
  })
}

export async function readLocalDatabase(): Promise<TibyanAccountData | null> {
  const db = await openDatabase()
  try {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(KEY)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error("IndexedDB read failed"))
    })
    return raw ? normalizeAccountData(raw) : null
  } finally { db.close() }
}

export async function writeLocalDatabase(snapshot: TibyanAccountData): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      transaction.objectStore(STORE_NAME).put(snapshot, KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error("IndexedDB write failed"))
      transaction.onabort = () => reject(transaction.error || new Error("IndexedDB write aborted"))
    })
  } finally { db.close() }
}
